import type { HydratedDocument } from "mongoose"

import type { User } from "@/models/User"

type LeanUser = User & {
  _id: unknown
}

export type AuthPayload = {
  id: string
  name?: string
  email: string
  role: User["role"]
  organization?: string
  plan: User["plan"]
  avatarUrl?: string
  createdAt?: string
  updatedAt?: string
}

export function sanitizeUser(
  user: HydratedDocument<User> | LeanUser,
): AuthPayload {
  const record = typeof (user as HydratedDocument<User>).toObject === "function"
    ? (user as HydratedDocument<User>).toObject()
    : (user as LeanUser)

  const { passwordHash, _id, createdAt, updatedAt, ...rest } = record

  return {
    id: _id?.toString(),
    ...rest,
    plan: (rest as Partial<AuthPayload>).plan ?? "free",
    createdAt: createdAt ? new Date(createdAt).toISOString() : undefined,
    updatedAt: updatedAt ? new Date(updatedAt).toISOString() : undefined,
  } as AuthPayload
}
