import { NextResponse } from "next/server"

export const runtime = "nodejs"

type AzurePrediction = {
  probability?: number
  tagId?: string
  tagName?: string
}

type AzurePredictionResponse = {
  id?: string
  project?: string
  iteration?: string
  created?: string
  predictions?: AzurePrediction[]
}

function dataUrlToBuffer(dataUrl: string): Buffer {
  if (!dataUrl.startsWith("data:")) {
    throw new Error("Expected data URL")
  }

  const commaIndex = dataUrl.indexOf(",")
  if (commaIndex === -1) {
    throw new Error("Invalid data URL")
  }

  const base64 = dataUrl.slice(commaIndex + 1)
  return Buffer.from(base64, "base64")
}

export async function POST(request: Request) {
  const endpoint = process.env.AZURE_CUSTOM_VISION_ENDPOINT
  const predictionKey = process.env.AZURE_CUSTOM_VISION_PREDICTION_KEY

  if (!endpoint || !predictionKey) {
    return NextResponse.json(
      { error: "Prediction service is not configured" },
      { status: 500 },
    )
  }

  let image: string | undefined

  try {
    const body = await request.json().catch(() => null)
    if (body && typeof body.image === "string" && body.image.length > 0) {
      image = body.image
    }
  } catch {
    // fall through to validation error below
  }

  if (!image) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        details: "Expected JSON body with non-empty 'image' data URL string",
      },
      { status: 400 },
    )
  }

  let buffer: Buffer
  try {
    buffer = dataUrlToBuffer(image)
  } catch (error) {
    return NextResponse.json(
      {
        error: "Invalid image data",
        details:
          error instanceof Error ? error.message : "Unable to parse data URL",
      },
      { status: 400 },
    )
  }

  try {
    const azureResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Prediction-Key": predictionKey,
        "Content-Type": "application/octet-stream",
      },
      body: buffer,
    })

    const azureJson = (await azureResponse
      .json()
      .catch(() => null)) as AzurePredictionResponse | null

    if (!azureResponse.ok) {
      return NextResponse.json(
        {
          error: "Prediction request failed",
          status: azureResponse.status,
          body: azureJson ?? undefined,
        },
        { status: 502 },
      )
    }

    return NextResponse.json({
      data: azureJson,
    })
  } catch (error) {
    console.error("Prediction route error:", error)
    return NextResponse.json(
      {
        error: "Unexpected error during prediction",
      },
      { status: 500 },
    )
  }
}

