import { NextResponse } from "next/server"

import { getAdminFromRequest } from "@/lib/admin-auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ReportModel } from "@/models/Report"

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  await connectToDatabase()

  const auth = await getAdminFromRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const { status, resolutionNote } = (body ?? {}) as {
    status?: string
    resolutionNote?: string
  }

  if (!status || !["open", "resolved"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  const report = await ReportModel.findById(params.id)
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 })
  }

  report.status = status
  report.resolutionNote = resolutionNote?.trim() || report.resolutionNote
  report.resolvedAt = status === "resolved" ? new Date() : undefined
  await report.save()

  return NextResponse.json({
    data: {
      id: report._id.toString(),
      status: report.status,
      resolutionNote: report.resolutionNote,
      resolvedAt: report.resolvedAt,
    },
  })
}
