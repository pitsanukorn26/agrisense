import { NextResponse } from "next/server"
import { isValidObjectId } from "mongoose"
import { z } from "zod"

import { backend, backendProxyEnabled } from "@/lib/backend-client"

const secondaryFindingSchema = z.object({
  label: z.string(),
  confidence: z.number().min(0).max(1).optional(),
})

const resultSchema = z.object({
  diseaseId: z.string().optional(),
  label: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
  secondaryFindings: z.array(secondaryFindingSchema).optional(),
})

const updateScanSchema = z.object({
  status: z.enum(["pending", "processing", "completed", "failed"]).optional(),
  failureReason: z.string().optional(),
  processedAt: z.coerce.date().optional(),
  result: resultSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
  rawModelOutput: z.unknown().optional(),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid scan id" }, { status: 400 })
  }

  if (!backendProxyEnabled) {
    return NextResponse.json(
      { error: "BACKEND_API_URL is not configured; please enable backend proxy." },
      { status: 500 },
    )
  }

  const response = await backend.getScan(id)
  if (!response?.data) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 })
  }
  return NextResponse.json({ data: response.data })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid scan id" }, { status: 400 })
  }

  const json = await request.json()
  const parsed = updateScanSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const update: Record<string, unknown> = {}

  if (parsed.data.status) update.status = parsed.data.status
  if (parsed.data.failureReason) update.failureReason = parsed.data.failureReason
  if (parsed.data.processedAt) update.processedAt = parsed.data.processedAt
  if (parsed.data.metadata) update.metadata = parsed.data.metadata
  if (parsed.data.rawModelOutput !== undefined) update.rawModelOutput = parsed.data.rawModelOutput

  if (parsed.data.result) {
    const { diseaseId, ...result } = parsed.data.result
    update.result = {
      ...result,
      disease: diseaseId,
    }
  }

  if (!backendProxyEnabled) {
    return NextResponse.json(
      { error: "BACKEND_API_URL is not configured; please enable backend proxy." },
      { status: 500 },
    )
  }

  const response = await backend.updateScan(id, update)
  if (!response?.data) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 })
  }
  return NextResponse.json({
    message: "Scan updated",
    data: response.data,
  })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid scan id" }, { status: 400 })
  }

  if (!backendProxyEnabled) {
    return NextResponse.json(
      { error: "BACKEND_API_URL is not configured; please enable backend proxy." },
      { status: 500 },
    )
  }

  const response = await backend.deleteScan(id)
  if ((response as any)?.error) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 })
  }
  return NextResponse.json({ message: "Scan deleted" })
}
