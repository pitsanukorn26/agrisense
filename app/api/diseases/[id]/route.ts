import { NextResponse } from "next/server"
import { Types } from "mongoose"

import { backend, backendProxyEnabled } from "@/lib/backend-client"
import { connectToDatabase } from "@/lib/mongodb"
import { requireElevatedUser } from "@/lib/role-guard"
import { DiseaseProfileModel } from "@/models/DiseaseProfile"
import { diseaseInputSchema } from "@/lib/validators/disease"

const partialDiseaseSchema = diseaseInputSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  "At least one field is required",
)

function serialize(record: any) {
  return {
    id: record._id.toString(),
    crop: record.crop,
    nameTh: record.commonNameTh,
    nameEn: record.commonNameEn ?? "",
    pathogenType: record.pathogenType ?? "",
    overview: record.overview ?? "",
    symptoms: record.symptoms ?? [],
    causes: record.causes ?? [],
    triggers: record.triggers ?? [],
    prevention: record.prevention ?? [],
    treatment: record.treatment ?? [],
    severity: record.severity ?? 3,
    spreadRisk: record.spreadRisk ?? "medium",
    tags: record.tags ?? [],
    updatedAt: record.updatedAt,
    reviewedAt: record.reviewedAt,
    reviewedBy: record.reviewedBy?.toString(),
    sources: (record.sources ?? []).map((ref: { label: string; url: string }) => ({
      label: ref.label,
      url: ref.url,
    })),
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireElevatedUser(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  if (backendProxyEnabled) {
    const response = await backend.getDisease(params.id)
    return NextResponse.json(response)
  }

  await connectToDatabase()

  if (!Types.ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: "Invalid identifier" }, { status: 400 })
  }

  const record = await DiseaseProfileModel.findById(params.id).lean()
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ data: serialize(record) })
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireElevatedUser(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  if (backendProxyEnabled) {
    const json = await request.json().catch(() => null)
    const parsed = partialDiseaseSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 })
    }

    const response = await backend.updateDisease(params.id, {
      ...parsed.data,
      reviewedBy: auth.user.id,
    })
    return NextResponse.json(response)
  }

  await connectToDatabase()

  if (!Types.ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: "Invalid identifier" }, { status: 400 })
  }

  const json = await request.json().catch(() => null)
  const parsed = partialDiseaseSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 })
  }

  const payload = parsed.data

  const update: Record<string, unknown> = {
    reviewedBy: auth.user.id,
    reviewedAt: new Date(),
  }

  if (payload.crop) update.crop = payload.crop
  if (payload.nameTh) update.commonNameTh = payload.nameTh
  if (payload.nameEn !== undefined) update.commonNameEn = payload.nameEn
  if (payload.pathogenType !== undefined) update.pathogenType = payload.pathogenType
  if (payload.overview !== undefined) update.overview = payload.overview
  if (payload.symptoms) update.symptoms = payload.symptoms
  if (payload.causes) update.causes = payload.causes
  if (payload.triggers) update.triggers = payload.triggers
  if (payload.prevention) update.prevention = payload.prevention
  if (payload.treatment) update.treatment = payload.treatment
  if (payload.severity !== undefined) update.severity = payload.severity
  if (payload.spreadRisk) update.spreadRisk = payload.spreadRisk
  if (payload.tags) update.tags = payload.tags
  if (payload.sources) update.sources = payload.sources

  const updated = await DiseaseProfileModel.findByIdAndUpdate(params.id, update, { new: true }).lean()

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ data: serialize(updated) })
}
