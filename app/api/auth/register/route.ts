import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"
import { z } from "zod"

import { connectToDatabase } from "@/lib/mongodb"
import { UserModel } from "@/models/User"
import { sanitizeUser } from "@/lib/auth"

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  role: z.enum(["farmer", "expert"]).optional(),
  organization: z.string().max(120).optional(),
})

export async function POST(request: Request) {
  await connectToDatabase()

  const body = await request.json()
  const parsed = registerSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    )
  }

  const { email, password, name, role = "farmer", organization } = parsed.data
  const normalizedEmail = email.toLowerCase()

  const existingUser = await UserModel.findOne({ email: normalizedEmail }).lean()
  if (existingUser) {
    return NextResponse.json(
      { error: "Email already registered" },
      { status: 409 },
    )
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await UserModel.create({
    name,
    email: normalizedEmail,
    passwordHash,
    role,
    organization,
  })

  return NextResponse.json(
    {
      message: "Account created",
      data: sanitizeUser(user),
    },
    { status: 201 },
  )
}
