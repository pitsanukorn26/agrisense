import { NextResponse } from "next/server"
import { z } from "zod"

import { backend, backendProxyEnabled } from "@/lib/backend-client"
import { getAdminFromRequest } from "@/lib/admin-auth"
import { sanitizeUser } from "@/lib/auth"
import { recordAdminLog } from "@/lib/admin-log"
import { connectToDatabase } from "@/lib/mongodb"
import { ROOT_ADMIN_EMAIL } from "@/lib/root-admin"
import { UserModel } from "@/models/User"

const updateSchema = z.object({
  role: z.enum(["farmer", "expert", "admin"]),
})

type RouteParams = {
  params: { id: string }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await getAdminFromRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const body = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { id } = params

  if (backendProxyEnabled) {
    const response = await backend.updateAdminUserRole(id, {
      role: parsed.data.role,
      actor: {
        id: auth.admin.id,
        email: auth.admin.email,
        name: auth.admin.name,
      },
    })
    return NextResponse.json(response)
  }

  await connectToDatabase()

  const user = await UserModel.findById(id)
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const previousRole = user.role
  if (user.email === ROOT_ADMIN_EMAIL && parsed.data.role !== "admin") {
    return NextResponse.json(
      { error: "The primary administrator cannot be demoted." },
      { status: 400 },
    )
  }

  user.role = parsed.data.role
  await user.save()

  const action =
    previousRole !== "admin" && user.role === "admin"
      ? "role.promote"
      : previousRole === "admin" && user.role !== "admin"
        ? "role.demote"
        : "role.update"

  await recordAdminLog({
    actor: {
      id: auth.admin.id,
      email: auth.admin.email,
      name: auth.admin.name,
    },
    action,
    target: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    },
    metadata: {
      previousRole,
      nextRole: user.role,
    },
  })

  return NextResponse.json({
    message: "Role updated",
    data: sanitizeUser(user),
  })
}
