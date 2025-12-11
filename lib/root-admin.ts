import bcrypt from "bcryptjs"

import { UserModel } from "@/models/User"

export const ROOT_ADMIN_EMAIL = (process.env.ROOT_ADMIN_EMAIL ?? "AgrisenAdmin@agrisen.com").toLowerCase()
const ROOT_ADMIN_PASSWORD = process.env.ROOT_ADMIN_PASSWORD ?? "AgrisenAdmin1"
const ROOT_ADMIN_NAME = process.env.ROOT_ADMIN_NAME ?? "Agrisen Admin"
const ROOT_ADMIN_ORG = process.env.ROOT_ADMIN_ORG ?? "Agrisen HQ"

export async function ensureRootAdmin() {
  let admin = await UserModel.findOne({ email: ROOT_ADMIN_EMAIL })

  if (!admin) {
    const passwordHash = await bcrypt.hash(ROOT_ADMIN_PASSWORD, 12)
    admin = await UserModel.create({
      name: ROOT_ADMIN_NAME,
      email: ROOT_ADMIN_EMAIL,
      passwordHash,
      role: "admin",
      plan: "enterprise",
      organization: ROOT_ADMIN_ORG,
    })
    return admin
  }

  let hasChanges = false

  if (admin.role !== "admin") {
    admin.role = "admin"
    hasChanges = true
  }

  const matches = await bcrypt.compare(ROOT_ADMIN_PASSWORD, admin.passwordHash).catch(() => false)
  if (!matches) {
    admin.passwordHash = await bcrypt.hash(ROOT_ADMIN_PASSWORD, 12)
    hasChanges = true
  }

  if (hasChanges) {
    await admin.save()
  }

  return admin
}
