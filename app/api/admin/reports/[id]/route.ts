import { NextResponse } from "next/server"

import { getAdminFromRequest } from "@/lib/admin-auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ReportModel } from "@/models/Report"
import { backend, backendProxyEnabled } from "@/lib/backend-client"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

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

  if (backendProxyEnabled) {
    const response = await backend.updateReport(id, { status, resolutionNote })
    return NextResponse.json(response)
  }

  await connectToDatabase()

  const report = await ReportModel.findById(id)
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
