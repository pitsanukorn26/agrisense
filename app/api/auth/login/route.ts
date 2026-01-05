import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"
import { z } from "zod"

import { backend, backendProxyEnabled } from "@/lib/backend-client"
import { ensureRootAdmin } from "@/lib/root-admin"
import { getSessionCookieOptions, signSessionToken } from "@/lib/session"
import { sanitizeUser } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { UserModel } from "@/models/User"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(100),
})

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = loginSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { email, password } = parsed.data
  const normalizedEmail = email.toLowerCase()

  if (backendProxyEnabled) {
    try {
      const response = await backend.login({ email: normalizedEmail, password })
      const user = response?.data

      if (!user?.id) {
        return NextResponse.json(
          { error: "Invalid session payload" },
          { status: 502 },
        )
      }

      const sessionToken = signSessionToken({
        sub: user.id,
        email: user.email,
        role: user.role,
        iat: Date.now(),
        name: user.name,
        organization: user.organization,
        plan: user.plan ?? "free",
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })

      const responseJson = NextResponse.json({
        message: "Login successful",
        data: user,
      })

      responseJson.cookies.set(getSessionCookieOptions(sessionToken))

      return responseJson
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to login"
      const status =
        typeof (error as { status?: number }).status === "number"
          ? (error as { status?: number }).status
          : 502
      return NextResponse.json({ error: message }, { status })
    }
  }

  await connectToDatabase()
  await ensureRootAdmin()

  const user = await UserModel.findOne({ email: normalizedEmail })

  if (!user) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 },
    )
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash)

  if (!isMatch) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 },
    )
  }

  const sessionToken = signSessionToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
    iat: Date.now(),
  })

  const response = NextResponse.json({
    message: "Login successful",
    data: sanitizeUser(user),
  })

  response.cookies.set(getSessionCookieOptions(sessionToken))

  return response
}
