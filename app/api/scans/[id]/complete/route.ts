import { NextResponse } from "next/server"
import { isValidObjectId } from "mongoose"
import { z } from "zod"

import { connectToDatabase } from "@/lib/mongodb"
import { ScanModel } from "@/models/Scan"
import {
  dataApiEnabled,
  dataApiFindOneAndUpdate,
  toObjectId,
} from "@/lib/data-api"
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

const SCANS_COLLECTION = "scans"

const normalizeId = (value: unknown) => {
  if (!value) return ""
  if (typeof value === "string") return value
  if (typeof value === "object" && value !== null && "$oid" in (value as Record<string, unknown>)) {
    const oid = (value as { $oid?: unknown }).$oid
    if (typeof oid === "string") return oid
  }
  try {
    // @ts-expect-error allow toString fallback
    return value.toString?.() ?? ""
  } catch {
    return ""
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  if (backendProxyEnabled) {
    const response = await backend.completeScan(id, update)
    if (!response?.data) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 })
    }
    return NextResponse.json({
      message: "Scan completed",
      data: response.data,
    })
  }

  if (dataApiEnabled) {
    const scan = await dataApiFindOneAndUpdate(
      SCANS_COLLECTION,
      { _id: toObjectId(id) },
      { $set: update },
    )

    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 })
    }

    return NextResponse.json({
      message: "Scan completed",
      data: {
        id: normalizeId((scan as any)?._id),
        status: scan.status,
        processedAt: scan.processedAt,
        result: scan.result,
        metadata: scan.metadata,
      },
    })
  }

  await connectToDatabase()

  const scan = await ScanModel.findByIdAndUpdate(id, { $set: update }, { new: true }).lean()

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
