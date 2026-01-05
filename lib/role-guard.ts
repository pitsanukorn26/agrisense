import { sanitizeUser, type AuthPayload } from "@/lib/auth"
import { backendProxyEnabled } from "@/lib/backend-client"
import { getSessionFromRequest } from "@/lib/session"
import { UserModel } from "@/models/User"

type AllowedRole = "expert" | "admin"

type RoleGuardResult =
  | { ok: true; user: AuthPayload }
  | { ok: false; status: 401 | 403; message: string }

export async function requireElevatedUser(
  request: Request,
  allowedRoles: AllowedRole[] = ["expert", "admin"],
): Promise<RoleGuardResult> {
  const session = getSessionFromRequest(request)
  if (!session) {
    return { ok: false, status: 401, message: "Unauthorized" }
  }

  if (backendProxyEnabled) {
    if (!allowedRoles.includes(session.role as AllowedRole)) {
      return { ok: false, status: 403, message: "Permission denied" }
    }

    return {
      ok: true,
      user: {
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
    }
  }

  const account = await UserModel.findById(session.sub)
  if (!account) {
    return { ok: false, status: 401, message: "Session expired" }
  }

  if (!allowedRoles.includes(account.role as AllowedRole)) {
    return { ok: false, status: 403, message: "Permission denied" }
  }

  return { ok: true, user: sanitizeUser(account) }
}
