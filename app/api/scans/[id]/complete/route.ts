import { NextResponse } from "next/server"
import { isValidObjectId } from "mongoose"
import { z } from "zod"

import { connectToDatabase } from "@/lib/mongodb"
import { ScanModel } from "@/models/Scan"

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
  await connectToDatabase()

  const { id } = await params
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid scan id" }, { status: 400 })
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

  const update: Record<string, unknown> = {
    status: "completed",
    processedAt: processedAt ?? new Date(),
  }

  update.result = {
    label,
    confidence,
    notes,
  }

  update.metadata = {
    localeDisease,
    severity,
    severityLocal,
  }

  if (rawModelOutput !== undefined) {
    update.rawModelOutput = rawModelOutput
  }

  const scan = await ScanModel.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true },
  ).lean()

  if (!scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 })
  }

  return NextResponse.json({
    message: "Scan completed",
    data: {
      id: scan._id.toString(),
      status: scan.status,
      processedAt: scan.processedAt,
      result: scan.result,
      metadata: scan.metadata,
    },
  })
}
