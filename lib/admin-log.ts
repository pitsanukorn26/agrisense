import { AdminLogModel } from "@/models/AdminLog"

type AdminIdentity = {
  id: string
  email: string
  name?: string
}

type TargetIdentity = {
  id: string
  email?: string
  name?: string
}

type AdminLogInput = {
  actor: AdminIdentity
  action: "role.promote" | "role.demote" | "role.update" | "custom"
  target: TargetIdentity
  metadata?: Record<string, unknown>
}

export async function recordAdminLog(entry: AdminLogInput) {
  await AdminLogModel.create({
    actor: entry.actor,
    action: entry.action,
    target: entry.target,
    metadata: entry.metadata,
  })
}
