"use server"

import { sanitizeUser, type AuthPayload } from "@/lib/auth"
import { getSessionFromRequest } from "@/lib/session"
import { UserModel } from "@/models/User"

type AdminResult =
  | { ok: true; admin: AuthPayload }
  | { ok: false; status: 401 | 403; message: string }

export async function getAdminFromRequest(request: Request): Promise<AdminResult> {
  const session = getSessionFromRequest(request)
  if (!session) {
    return { ok: false, status: 401, message: "Missing or invalid session" }
  }

  const admin = await UserModel.findById(session.sub)
  if (!admin || admin.role !== "admin") {
    return { ok: false, status: 403, message: "Admin privileges required" }
  }

  return { ok: true, admin: sanitizeUser(admin) }
}
