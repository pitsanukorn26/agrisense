import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { azureBlobConfig, getAzureContainerClient } from "@/src/config/azure-blob"

const {
  S3_ENDPOINT,
  S3_REGION,
  S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY,
  S3_BUCKET,
  PUBLIC_ASSET_BASE,
} = process.env

const s3Enabled = Boolean(S3_BUCKET && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY)

const s3Client = s3Enabled
  ? new S3Client({
      region: S3_REGION ?? "auto",
      endpoint: S3_ENDPOINT,
      credentials: {
        accessKeyId: S3_ACCESS_KEY_ID as string,
        secretAccessKey: S3_SECRET_ACCESS_KEY as string,
      },
      forcePathStyle: true,
    })
  : null

const publicBase = PUBLIC_ASSET_BASE?.replace(/\/$/, "")

function buildKey(prefix: string, contentType: string) {
  const safePrefix = prefix.replace(/\/$/, "")
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 8)
  const ext = contentType.includes("png")
    ? ".png"
    : contentType.includes("jpeg")
      ? ".jpg"
      : contentType.includes("webp")
        ? ".webp"
        : ""
  return `${safePrefix ? `${safePrefix}/` : ""}${timestamp}-${random}${ext}`
}

export async function uploadBuffer(buffer: Buffer, keyPrefix: string, contentType: string) {
  const key = buildKey(keyPrefix, contentType)

  if (azureBlobConfig.enabled) {
    const container = getAzureContainerClient()
    const blob = container.getBlockBlobClient(key)
    await blob.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: contentType },
    })

    const base =
      publicBase ??
      `https://${azureBlobConfig.account}.blob.core.windows.net/${azureBlobConfig.container}`

    return `${base.replace(/\/$/, "")}/${key}${azureBlobConfig.sas ?? ""}`
  }

  if (s3Enabled && s3Client) {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    )

    const base =
      publicBase ??
      (S3_ENDPOINT
        ? `${S3_ENDPOINT.replace(/\/$/, "")}/${S3_BUCKET}`
        : S3_BUCKET
          ? `https://${S3_BUCKET}.s3.${S3_REGION ?? "us-east-1"}.amazonaws.com`
          : "")

    return `${base.replace(/\/$/, "")}/${key}`
  }

  throw new Error("No storage backend configured")
}
