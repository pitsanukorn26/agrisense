import { NextResponse } from "next/server"
import { backend, backendProxyEnabled } from "@/lib/backend-client"
import { connectToDatabase } from "@/lib/mongodb"
import { requireElevatedUser } from "@/lib/role-guard"
import { DiseaseProfileModel } from "@/models/DiseaseProfile"
import { diseaseInputSchema, supportedCrops } from "@/lib/validators/disease"

const CROPS = new Set(supportedCrops)

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function serializeDisease(record: any) {
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
    updatedAt: record.updatedAt,
    tags: record.tags ?? [],
    sources: (record.sources ?? []).map((ref: { label: string; url: string }) => ({
      label: ref.label,
      url: ref.url,
    })),
  }
}

export async function GET(request: Request) {
  const auth = await requireElevatedUser(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  if (backendProxyEnabled) {
    const { searchParams } = new URL(request.url)
    const query = searchParams.toString()
    const response = await backend.listDiseases(query)
    return NextResponse.json(response)
  }

  await connectToDatabase()

  const { searchParams } = new URL(request.url)
  const crop = searchParams.get("crop")?.toLowerCase()
  const search = searchParams.get("search")?.trim()
  const limitParam = Number.parseInt(searchParams.get("limit") ?? "100", 10)
  const limit = Number.isNaN(limitParam) ? 100 : Math.min(Math.max(limitParam, 1), 200)

  const filter: Record<string, unknown> = {}

  if (crop && CROPS.has(crop)) {
    filter.crop = crop
  }

  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i")
    filter.$or = [
      { commonNameTh: pattern },
      { commonNameEn: pattern },
      { overview: pattern },
      { symptoms: pattern },
      { causes: pattern },
      { tags: pattern },
    ]
  }

  const diseases = await DiseaseProfileModel.find(filter)
    .sort({ severity: -1, updatedAt: -1 })
    .limit(limit)
    .lean()

  return NextResponse.json({ data: diseases.map(serializeDisease) })
}

export async function POST(request: Request) {
  const auth = await requireElevatedUser(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const body = await request.json().catch(() => null)
  const parsed = diseaseInputSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 })
  }

  const payload = parsed.data

  if (backendProxyEnabled) {
    const response = await backend.createDisease({
      ...payload,
      reviewedBy: auth.user.id,
    })
    return NextResponse.json(response, { status: 201 })
  }

  await connectToDatabase()

  const created = await DiseaseProfileModel.create({
    crop: payload.crop,
    commonNameTh: payload.nameTh,
    commonNameEn: payload.nameEn,
    pathogenType: payload.pathogenType,
    overview: payload.overview,
    symptoms: payload.symptoms,
    causes: payload.causes,
    triggers: payload.triggers ?? [],
    prevention: payload.prevention ?? [],
    treatment: payload.treatment ?? [],
    severity: payload.severity ?? 3,
    spreadRisk: payload.spreadRisk ?? "medium",
    tags: payload.tags ?? [],
    sources: payload.sources ?? [],
    reviewedBy: auth.user.id,
    reviewedAt: new Date(),
  })

  return NextResponse.json({ data: serializeDisease(created) }, { status: 201 })
}
