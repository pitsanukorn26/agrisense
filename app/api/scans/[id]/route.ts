import { NextResponse } from "next/server"
import { isValidObjectId } from "mongoose"
import { z } from "zod"

import { connectToDatabase } from "@/lib/mongodb"
import { ScanModel } from "@/models/Scan"
import {
  dataApiEnabled,
  dataApiFindOne,
  dataApiFindOneAndDelete,
  dataApiFindOneAndUpdate,
  toObjectId,
} from "@/lib/data-api"
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

const mapScan = (scan: any) => {
  if (!scan) return null
  const { _id, ...rest } = scan
  return {
    id: normalizeId(_id),
    _id,
    ...rest,
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid scan id" }, { status: 400 })
  }

  if (backendProxyEnabled) {
    const response = await backend.getScan(id)
    if (!response?.data) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 })
    }
    return NextResponse.json({ data: response.data })
  }

  if (dataApiEnabled) {
    const scan = await dataApiFindOne(SCANS_COLLECTION, { _id: toObjectId(id) })

    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 })
    }

    return NextResponse.json({
      data: mapScan(scan),
    })
  }

  await connectToDatabase()

  const scan = await ScanModel.findById(id).lean()

  if (!scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 })
  }

  return NextResponse.json({
    data: {
      id: scan._id.toString(),
      ...scan,
    },
  })
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

  if (backendProxyEnabled) {
    const response = await backend.updateScan(id, update)
    if (!response?.data) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 })
    }
    return NextResponse.json({
      message: "Scan updated",
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
      message: "Scan updated",
      data: mapScan(scan),
    })
  }

  await connectToDatabase()

  const scan = await ScanModel.findByIdAndUpdate(id, { $set: update }, { new: true }).lean()

  if (!scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 })
  }

  return NextResponse.json({
    message: "Scan updated",
    data: {
      id: scan._id.toString(),
      ...scan,
    },
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

  if (backendProxyEnabled) {
    const response = await backend.deleteScan(id)
    if ((response as any)?.error) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 })
    }
    return NextResponse.json({ message: "Scan deleted" })
  }

  if (dataApiEnabled) {
    const scan = await dataApiFindOneAndDelete(SCANS_COLLECTION, { _id: toObjectId(id) })

    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 })
    }

    return NextResponse.json({
      message: "Scan deleted",
    })
  }

  await connectToDatabase()

  const scan = await ScanModel.findByIdAndDelete(id).lean()

  if (!scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 })
  }

  return NextResponse.json({
    message: "Scan deleted",
  })
}
