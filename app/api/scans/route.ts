import { NextResponse } from "next/server"
import { z } from "zod"

import { connectToDatabase } from "@/lib/mongodb"
import { ScanModel } from "@/models/Scan"
import { backend, backendProxyEnabled } from "@/lib/backend-client"

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
  if (backendProxyEnabled) {
    const { searchParams } = new URL(request.url)
    const query = searchParams.toString()
    const response = await backend.listScans(query)
    return NextResponse.json({ data: response.data })
  }

  await connectToDatabase()

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const userId = searchParams.get("userId")
  const limitParam = Number.parseInt(searchParams.get("limit") ?? "20", 10)

  const limit = Number.isNaN(limitParam) ? 20 : Math.min(limitParam, 100)

  const filter: Record<string, unknown> = {}
  if (status) {
    filter.status = status
  }
  if (userId) {
    filter.user = userId
  }

  const scans = await ScanModel.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()

  const payload = scans.map((scan) => ({
    id: scan._id.toString(),
    ...scan,
  }))

  return NextResponse.json({ data: payload })
}

export async function POST(request: Request) {
  if (backendProxyEnabled) {
    const json = await request.json()
    const response = await backend.createScan(json)
    return NextResponse.json(response, { status: 201 })
  }

  await connectToDatabase()

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

  const { userId, ...rest } = parsed.data

  const scan = await ScanModel.create({
    ...rest,
    user: userId,
  })

  return NextResponse.json(
    {
      message: "Scan queued",
      data: {
        id: scan._id.toString(),
        status: scan.status,
        createdAt: scan.createdAt,
      },
    },
    { status: 201 },
  )
}
