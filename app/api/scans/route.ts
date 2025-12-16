import { NextResponse } from "next/server"
import { z } from "zod"

import { backend, backendProxyEnabled } from "@/lib/backend-client"

const normalizeMetadata = (meta: any) => {
  if (!meta) return {}
  if (meta instanceof Map) return Object.fromEntries(meta.entries())
  if (typeof meta === "object" && !Array.isArray(meta)) return meta as Record<string, unknown>
  return {}
}

const pickLabel = (...values: unknown[]) => {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim()
  }
  return undefined
}

const deriveScan = (scan: any) => {
  const metadata = normalizeMetadata(scan?.metadata)
  const severity =
    scan?.severity ??
    scan?.result?.severity ??
    (metadata.severity as string | undefined) ??
    (metadata.severityLocal as string | undefined)
  const diseaseLocal =
    scan?.diseaseLocal ??
    (metadata.localeDisease as string | undefined) ??
    (metadata.diseaseLocal as string | undefined)
  const label = pickLabel(scan?.label, scan?.result?.label, metadata.label, diseaseLocal)
  const confidence =
    typeof scan?.confidence === "number"
      ? scan.confidence
      : typeof scan?.result?.confidence === "number"
        ? Math.round(scan.result.confidence * 100)
        : undefined

  return {
    id: scan?.id ?? scan?._id?.toString?.(),
    ...scan,
    metadata,
    label,
    diseaseLocal,
    severity,
    confidence,
  }
}

const urlOrDataUri = z
  .string()
  .min(1)
  .refine(
    (value) => value.startsWith("data:") || /^https?:\/\//.test(value),
    "Must be an http(s) URL or data URI",
  )

const createScanSchema = z.object({
  imageUrl: urlOrDataUri,
  thumbnailUrl: urlOrDataUri.optional(),
  userId: z.string().optional(),
  location: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      accuracy: z.number().min(0).optional(),
      name: z.string().optional(),
    })
    .optional(),
  metadata: z.record(z.unknown()).optional(),
  capturedAt: z.coerce.date().optional(),
  modelVersion: z.string().optional(),
})

export async function GET(request: Request) {
  if (!backendProxyEnabled) {
    return NextResponse.json(
      { error: "BACKEND_API_URL is not configured; please enable backend proxy." },
      { status: 500 },
    )
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.toString()
  const response = await backend.listScans(query)
  const mapped = Array.isArray(response?.data) ? response.data.map(deriveScan) : []
  return NextResponse.json({ data: mapped })
}

export async function POST(request: Request) {
  if (!backendProxyEnabled) {
    return NextResponse.json(
      { error: "BACKEND_API_URL is not configured; please enable backend proxy." },
      { status: 500 },
    )
  }

  const json = await request.json()
  const parsed = createScanSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    )
  }

  const response = await backend.createScan(parsed.data)
  return NextResponse.json(response, { status: 201 })
}
