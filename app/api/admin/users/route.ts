import { NextResponse } from "next/server"

import { getAdminFromRequest } from "@/lib/admin-auth"
import { sanitizeUser } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { UserModel } from "@/models/User"
import { backend, backendProxyEnabled } from "@/lib/backend-client"

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export async function GET(request: Request) {
  const auth = await getAdminFromRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  if (backendProxyEnabled) {
    const { searchParams } = new URL(request.url)
    const query = searchParams.toString()
    const response = await backend.listAdminUsers(query)
    return NextResponse.json(response)
  }

  await connectToDatabase()

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")?.trim()

  const filter =
    search && search.length > 1
      ? {
          $or: [
            { name: { $regex: escapeRegex(search), $options: "i" } },
            { email: { $regex: escapeRegex(search), $options: "i" } },
          ],
        }
      : {}

  const users = await UserModel.find(filter).sort({ createdAt: -1 }).limit(200).lean()

  return NextResponse.json({
    data: users.map((user) => sanitizeUser(user)),
  })
}
