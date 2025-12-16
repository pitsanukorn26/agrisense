import { NextResponse } from "next/server"
import { isValidObjectId } from "mongoose"
import { z } from "zod"

import { backend, backendProxyEnabled } from "@/lib/backend-client"

const completeSchema = z.object({
  label: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
  severity: z.string().optional(),
  severityLocal: z.string().optional(),
  localeDisease: z.string().optional(),
  rawModelOutput: z.unknown().optional(),
  processedAt: z.coerce.date().optional(),
})

export async function POST(
  request: Request,
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

  const json = await request.json()
  const parsed = completeSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { label, confidence, notes, severity, severityLocal, localeDisease, rawModelOutput, processedAt } =
    parsed.data

  const payload = {
    label,
    confidence,
    notes,
    severity,
    severityLocal,
    localeDisease,
    rawModelOutput,
    processedAt: processedAt ?? new Date(),
  }

  const response = await backend.completeScan(id, payload)
  if (!response?.data) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 })
  }
  return NextResponse.json({
    message: "Scan completed",
    data: response.data,
  })
}
