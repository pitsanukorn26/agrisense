import { NextResponse } from "next/server"

import { getAdminFromRequest } from "@/lib/admin-auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ReportModel } from "@/models/Report"

export async function GET(request: Request) {
  await connectToDatabase()

  const auth = await getAdminFromRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const { searchParams } = new URL(request.url)
  const statusFilter = searchParams.get("status")
  const limitParam = Number.parseInt(searchParams.get("limit") || "100", 10)
  const limit = Number.isNaN(limitParam) ? 100 : Math.min(Math.max(limitParam, 1), 200)

  const filter =
    statusFilter && ["open", "resolved"].includes(statusFilter)
      ? { status: statusFilter }
      : {}

  const reports = await ReportModel.find(filter)
    .sort({ status: 1, createdAt: -1 })
    .limit(limit)
    .populate("scan")
    .populate("createdBy")
    .lean()

  return NextResponse.json({
    data: reports.map((report) => ({
      id: report._id?.toString(),
      scanId: (report.scan as { _id?: unknown } | null)?._id?.toString(),
      status: report.status,
      reason: report.reason,
      resolutionNote: report.resolutionNote,
      createdAt: report.createdAt,
      resolvedAt: report.resolvedAt,
      reporter: report.createdBy
        ? {
            id: (report.createdBy as { _id?: unknown })._id?.toString(),
            email: (report.createdBy as { email?: string }).email,
            name: (report.createdBy as { name?: string }).name,
          }
        : null,
    })),
  })
}
