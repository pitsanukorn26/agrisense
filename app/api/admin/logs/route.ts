import { NextResponse } from "next/server"

import { getAdminFromRequest } from "@/lib/admin-auth"
import { connectToDatabase } from "@/lib/mongodb"
import { AdminLogModel } from "@/models/AdminLog"

const VALID_ACTIONS = ["role.promote", "role.demote", "role.update", "custom"]

export async function GET(request: Request) {
  await connectToDatabase()

  const auth = await getAdminFromRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const { searchParams } = new URL(request.url)
  const limitParam = Number.parseInt(searchParams.get("limit") ?? "25", 10)
  const limit = Number.isNaN(limitParam) ? 25 : Math.min(Math.max(limitParam, 1), 100)

  const logs = await AdminLogModel.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()

  const payload = logs.map((log) => ({
    id: log._id.toString(),
    action: log.action,
    actor: log.actor,
    target: log.target,
    metadata: log.metadata ?? {},
    createdAt: log.createdAt,
  }))

  return NextResponse.json({ data: payload })
}

export async function POST(request: Request) {
  await connectToDatabase()

  const auth = await getAdminFromRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const { action, target, metadata } = body as {
    action?: string
    target?: { id?: string; email?: string; name?: string }
    metadata?: Record<string, unknown>
  }

  if (!action || !VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  if (!target?.id) {
    return NextResponse.json({ error: "Target is required" }, { status: 400 })
  }

  const entry = await AdminLogModel.create({
    action,
    actor: {
      id: auth.admin.id,
      email: auth.admin.email,
      name: auth.admin.name,
    },
    target: {
      id: target.id,
      email: target.email,
      name: target.name,
    },
    metadata,
  })

  return NextResponse.json(
    {
      data: {
        id: entry._id.toString(),
      },
    },
    { status: 201 },
  )
}
