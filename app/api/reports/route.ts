import { NextResponse } from "next/server"

import { backend, backendProxyEnabled } from "@/lib/backend-client"
import { getSessionFromRequest } from "@/lib/session"
import { connectToDatabase } from "@/lib/mongodb"
import { ReportModel } from "@/models/Report"
import { ScanModel } from "@/models/Scan"

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const { scanId, reason } = (body ?? {}) as { scanId?: string; reason?: string }
  if (!scanId || typeof scanId !== "string") {
    return NextResponse.json({ error: "รหัสคำขอไม่ถูกต้อง" }, { status: 400 })
  }
  if (!reason || typeof reason !== "string" || !reason.trim()) {
    return NextResponse.json({ error: "กรุณาระบุเหตุผลในการรายงาน" }, { status: 400 })
  }

  const session = getSessionFromRequest(request)
  const createdBy = session?.sub

  if (backendProxyEnabled) {
    const response = await backend.createReport({
      scanId,
      reason: reason.trim(),
      createdBy: createdBy ?? undefined,
    })
    return NextResponse.json(response, { status: 201 })
  }

  await connectToDatabase()

  const scan = await ScanModel.findById(scanId)
  if (!scan) {
    return NextResponse.json({ error: "ไม่พบคำขอวิเคราะห์ที่ต้องการรายงาน" }, { status: 404 })
  }

  const report = await ReportModel.create({
    scan: scan._id,
    createdBy: createdBy ?? undefined,
    reason: reason.trim(),
  })

  return NextResponse.json(
    {
      data: {
        id: report._id.toString(),
        status: report.status,
      },
    },
    { status: 201 },
  )
}
