import { NextResponse } from "next/server"
import { isValidObjectId } from "mongoose"
import { z } from "zod"

import { connectToDatabase } from "@/lib/mongodb"
import { ScanModel } from "@/models/Scan"

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
  { params }: { params: { id: string } },
) {
  await connectToDatabase()

  if (!isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Invalid scan id" }, { status: 400 })
  }

  const scan = await ScanModel.findById(params.id).lean()

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
  { params }: { params: { id: string } },
) {
  await connectToDatabase()

  if (!isValidObjectId(params.id)) {
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

  const scan = await ScanModel.findByIdAndUpdate(
    params.id,
    { $set: update },
    { new: true },
  ).lean()

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
  { params }: { params: { id: string } },
) {
  await connectToDatabase()

  if (!isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Invalid scan id" }, { status: 400 })
  }

  const scan = await ScanModel.findByIdAndDelete(params.id).lean()

  if (!scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 })
  }

  return NextResponse.json({
    message: "Scan deleted",
  })
}
