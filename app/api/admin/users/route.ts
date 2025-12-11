import { NextResponse } from "next/server"

import { getAdminFromRequest } from "@/lib/admin-auth"
import { sanitizeUser } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { UserModel } from "@/models/User"

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export async function GET(request: Request) {
  await connectToDatabase()

  const auth = await getAdminFromRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

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
