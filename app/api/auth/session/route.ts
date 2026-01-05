import { NextResponse } from "next/server"

import { sanitizeUser } from "@/lib/auth"
import { backendProxyEnabled } from "@/lib/backend-client"
import { getSessionFromRequest } from "@/lib/session"
import { connectToDatabase } from "@/lib/mongodb"
import { UserModel } from "@/models/User"

export async function GET(request: Request) {
  const session = getSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (backendProxyEnabled) {
    return NextResponse.json({
      data: {
        id: session.sub,
        email: session.email,
        role: session.role,
        name: session.name,
        organization: session.organization,
        plan: session.plan ?? "free",
        avatarUrl: session.avatarUrl,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
    })
  }

  await connectToDatabase()

  const user = await UserModel.findById(session.sub)
  if (!user) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 })
  }

  return NextResponse.json({ data: sanitizeUser(user) })
}
