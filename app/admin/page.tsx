"use client"

import type React from "react"
import type { LucideIcon } from "lucide-react"
import {
  ChevronRight,
  Crown,
  Flag,
  Loader2,
  LogIn,
  RefreshCw,
  ShieldCheck,
  ShieldHalf,
  Users,
} from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"

import { Navigation } from "@/components/navigation"
import { DiseaseLibraryDialog } from "@/components/disease-library-dialog"
import { useAuth } from "@/components/auth-provider"
import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import {
  ALERTS_UPDATED_EVENT,
  addStoredAlert,
  getStoredAlerts,
  removeStoredAlert,
  type StoredAlert,
} from "@/lib/alerts-storage"
import { formatDateTime } from "@/lib/date-format"

type Role = "farmer" | "expert" | "admin"

type AdminUser = {
  id: string
  name?: string
  email: string
  role: Role
  organization?: string
  plan: "free" | "pro" | "enterprise"
  createdAt?: string
}

type AdminLogEntry = {
  id: string
  actor: {
    id: string
    email: string
    name?: string
  }
  action: "role.promote" | "role.demote" | "role.update" | "custom"
  target: {
    id: string
    email?: string
    name?: string
  }
  metadata?: Record<string, unknown>
  createdAt?: string
}

type AdminReport = {
  id: string
  scanId?: string
  status: "open" | "resolved"
  reason: string
  resolutionNote?: string
  createdAt?: string
  resolvedAt?: string
  reporter?: {
    id?: string
    email?: string
    name?: string
  } | null
}

type QuickLinkItem = {
  id: string
  label: string
  description: string
  href?: string
  onSelect?: () => void
}

const PRIMARY_ADMIN_EMAIL = "AgrisenAdmin@agrisen.com"
const PRIMARY_ADMIN_EMAIL_SAFE = PRIMARY_ADMIN_EMAIL.toLowerCase()

export default function AdminPage() {
  const { user, isLoading } = useAuth()
  const { t, language } = useLanguage()
  const dateLocale = language === "en" ? "en-GB" : "th-TH"

  const [users, setUsers] = useState<AdminUser[]>([])
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const [logs, setLogs] = useState<AdminLogEntry[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [logError, setLogError] = useState<string | null>(null)
  const [reports, setReports] = useState<AdminReport[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportsError, setReportsError] = useState<string | null>(null)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [isDiseaseDialogOpen, setDiseaseDialogOpen] = useState(false)
  const [isRoleDialogOpen, setRoleDialogOpen] = useState(false)
  const [isAlertDialogOpen, setAlertDialogOpen] = useState(false)

  const summary = useMemo(() => {
    const totalUsers = users.length
    const totalAdmins = users.filter((item) => item.role === "admin").length
    return {
      totalUsers,
      totalAdmins,
    }
  }, [users])

  const quickLinks = useMemo(
    () => [
      {
        id: "analysis",
        label: t("admin.quickLinks.logs"),
        description: t("admin.quickLinks.logsDesc"),
        href: "#admin-logs",
      },
      {
        id: "alert-broadcast",
        label: t("admin.quickLinks.alerts"),
        description: t("admin.quickLinks.alertsDesc"),
        onSelect: () => setAlertDialogOpen(true),
      },
      {
        id: "disease-knowledge",
        label: t("admin.quickLinks.diseases"),
        description: t("admin.quickLinks.diseasesDesc"),
        onSelect: () => setDiseaseDialogOpen(true),
      },
      {
        id: "reports",
        label: "การรายงานปัญหา",
        description: "ตรวจสอบคำขอที่ถูกรีพอร์ตจากผู้ใช้",
        href: "#admin-reports",
      },
      {
        id: "role-manager",
        label: t("admin.quickLinks.roles"),
        description: t("admin.quickLinks.rolesDesc"),
        onSelect: () => setRoleDialogOpen(true),
      },
    ],
    [setAlertDialogOpen, setDiseaseDialogOpen, setRoleDialogOpen, t],
  )

  const formatLogAction = (log: AdminLogEntry) => {
    switch (log.action) {
      case "role.promote":
        return t("admin.log.action.promote")
      case "role.demote":
        return t("admin.log.action.demote")
      case "role.update":
        return t("admin.log.action.update")
      default:
        if (log.metadata && (log.metadata as { type?: string }).type === "alert.publish") {
          return t("admin.log.action.alertPublish")
        }
        return t("admin.log.action.custom")
    }
  }

  const loadUsers = useCallback(async () => {
    if (user?.role !== "admin") return
    try {
      const response = await fetch(`/api/admin/users`, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error ?? t("admin.loadError"))
      }

      const records = Array.isArray(payload?.data) ? payload.data : []
      setUsers(records)
      setLastSynced(new Date())
    } catch (error) {
      console.error("Failed to load admin users", error)
    }
  }, [t, user?.role])

  const loadLogs = useCallback(async () => {
    if (user?.role !== "admin") return
    setLoadingLogs(true)
    setLogError(null)
    try {
      const response = await fetch(`/api/admin/logs?limit=25`, {
        credentials: "same-origin",
        cache: "no-store",
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error ?? t("admin.logLoadError"))
      }
      const records = Array.isArray(payload?.data) ? payload.data : []
      setLogs(records)
    } catch (error) {
      console.error("Failed to load admin logs", error)
      setLogError(error instanceof Error ? error.message : t("admin.logLoadError"))
    } finally {
      setLoadingLogs(false)
    }
  }, [t, user?.role])

  const loadReports = useCallback(async () => {
    if (user?.role !== "admin") return
    setReportsLoading(true)
    setReportsError(null)
    try {
      const response = await fetch(`/api/admin/reports?limit=100`, {
        credentials: "same-origin",
        cache: "no-store",
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error ?? "ไม่สามารถโหลดรายการรายงานได้")
      }
      const records = Array.isArray(payload?.data) ? payload.data : []
      setReports(records)
    } catch (error) {
      console.error("Failed to load reports", error)
      setReportsError(error instanceof Error ? error.message : "ไม่สามารถโหลดรายการรายงานได้")
    } finally {
      setReportsLoading(false)
    }
  }, [user?.role])

  const handleResolveReport = useCallback(
    async (reportId: string) => {
      setResolvingId(reportId)
      try {
        const response = await fetch(`/api/admin/reports/${reportId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            status: "resolved",
            resolutionNote: "Reviewed by admin",
          }),
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload?.error ?? "ไม่สามารถอัปเดตรายงานได้")
        }
        await loadReports()
      } catch (error) {
        console.error("Failed to resolve report", error)
        setReportsError(error instanceof Error ? error.message : "ไม่สามารถอัปเดตรายงานได้")
      } finally {
        setResolvingId(null)
      }
    },
    [loadReports],
  )

  useEffect(() => {
    if (user?.role === "admin") {
      void loadUsers()
      void loadLogs()
      void loadReports()
    }
  }, [user?.role, loadUsers, loadLogs, loadReports])

  if (isLoading) {
    return (
      <AdminShell>
        <div className="flex h-[50vh] flex-col items-center justify-center text-gray-500">
          <Loader2 className="mb-3 h-8 w-8 animate-spin" />
          <p>{t("common.loading")}</p>
        </div>
      </AdminShell>
    )
  }

  if (!user) {
    return (
      <AdminShell>
        <GateCard
          icon={LogIn}
          title={t("admin.loginRequiredTitle")}
          description={t("admin.loginRequiredDescription")}
          action={
            <Button asChild>
              <Link href="/login">{t("nav.login")}</Link>
            </Button>
          }
        />
      </AdminShell>
    )
  }

  if (user.role !== "admin") {
    return (
      <AdminShell>
        <GateCard
          icon={ShieldHalf}
          title={t("admin.noPermissionTitle")}
          description={t("admin.noPermissionDescription")}
          action={
            <Button asChild variant="outline">
              <Link href="/dashboard">{t("nav.dashboard")}</Link>
            </Button>
          }
        />
      </AdminShell>
    )
  }

  return (
    <AdminShell>
      <section className="relative overflow-hidden rounded-3xl bg-emerald-900 text-white shadow-lg">
        <div className="absolute inset-0">
          <div className="h-full w-full bg-[url('/rice-bg.jpg')] bg-cover bg-center opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/90 to-emerald-700/70" />
        </div>
        <div className="relative px-6 py-16 pb-24 sm:px-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-white/70">
            {t("admin.heroLabel")}
          </p>
          <h1 className="mt-2 text-4xl font-bold">{t("admin.heroTitle")}</h1>
          <p className="mt-3 max-w-3xl text-white/80">{t("admin.heroSubtitle")}</p>
            <div className="mt-6 flex flex-wrap gap-4 text-sm text-white/80">
              <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
                <Crown className="h-4 w-4 text-amber-300" />
                <span>{t("admin.primaryAccountLabel")}</span>
              </div>
            <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
              <RefreshCw className={`h-4 w-4 ${!lastSynced ? "animate-spin" : ""}`} />
              {lastSynced ? lastSynced.toLocaleTimeString() : t("common.loading")}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <SettingsCard
          title={t("admin.settingsPanelTitle")}
          subtitle={t("admin.settingsPanelSubtitle")}
          items={quickLinks}
        />
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <SummaryCard
          icon={Users}
          label={t("admin.metrics.users")}
          value={summary.totalUsers}
          tone="default"
        />
      <SummaryCard
        icon={ShieldCheck}
        label={t("admin.metrics.admins")}
        value={summary.totalAdmins}
        tone="success"
      />
    </section>

      <Card id="admin-reports" className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-amber-600" />
            คำขอที่ถูกรายงาน
          </CardTitle>
          <CardDescription>ตรวจสอบคำขอวิเคราะห์ที่ผู้ใช้แจ้งปัญหา</CardDescription>
          <p className="text-sm text-gray-400">ปิดรายงานเมื่อดำเนินการเสร็จ เพื่อลดคิวที่รอ</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {reportsError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {reportsError}
            </div>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>คำขอ</TableHead>
                  <TableHead>เหตุผล</TableHead>
                  <TableHead>ผู้รายงาน</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">การจัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.length === 0 && !reportsLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-gray-500">
                      ไม่มีรายงานที่รออยู่
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="text-sm text-gray-700">
                        {report.scanId ? `Scan ${report.scanId}` : "ไม่พบคำขอ"}
                        <div className="text-xs text-gray-400">
                          {formatDateTime(report.createdAt, {
                            locale: dateLocale,
                            fallback: "—",
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-700 max-w-xs">
                        <div className="line-clamp-3">{report.reason}</div>
                        {report.resolutionNote && (
                          <div className="mt-1 text-xs text-gray-500">หมายเหตุ: {report.resolutionNote}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        <div>{report.reporter?.name ?? report.reporter?.email ?? "ไม่ระบุ"}</div>
                        {report.reporter?.email && (
                          <div className="text-xs text-gray-500">{report.reporter.email}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        <Badge
                          variant={report.status === "resolved" ? "secondary" : "outline"}
                          className={report.status === "resolved" ? "bg-green-50 text-green-700" : ""}
                        >
                          {report.status === "resolved" ? "ปิดงาน" : "รอตรวจสอบ"}
                        </Badge>
                        {report.resolvedAt && (
                          <div className="text-xs text-gray-400">
                            ปิดเมื่อ{" "}
                            {formatDateTime(report.resolvedAt, {
                              locale: dateLocale,
                              fallback: "—",
                            })}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={report.status === "resolved" || resolvingId === report.id}
                          onClick={() => void handleResolveReport(report.id)}
                        >
                          {resolvingId === report.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              กำลังปิด
                            </>
                          ) : report.status === "resolved" ? (
                            "ปิดแล้ว"
                          ) : (
                            "ปิดรายงาน"
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {reportsLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              กำลังโหลดรายการรายงาน...
            </div>
          )}
        </CardContent>
      </Card>


      <Card id="admin-logs" className="mt-8">
        <CardHeader>
          <CardTitle>{t("admin.logTitle")}</CardTitle>
          <CardDescription>{t("admin.logDescription")}</CardDescription>
          <p className="text-sm text-gray-400">{t("admin.logRetentionNote")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {logError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {logError}
            </div>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.log.table.actor")}</TableHead>
                  <TableHead>{t("admin.log.table.action")}</TableHead>
                  <TableHead>{t("admin.log.table.target")}</TableHead>
                  <TableHead>{t("admin.log.table.timestamp")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 && !loadingLogs ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-sm text-gray-500">
                      {t("admin.log.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">
                            {log.actor.name ?? log.actor.email}
                          </span>
                          <span className="text-xs text-gray-500">{log.actor.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {formatLogAction(log)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {log.target.name ?? log.target.email ?? t("admin.log.unknownTarget")}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDateTime(log.createdAt, {
                          locale: dateLocale,
                          fallback: "—",
                        })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {loadingLogs && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("admin.log.loading")}
            </div>
          )}
        </CardContent>
      </Card>

      <DiseaseLibraryDialog
        open={isDiseaseDialogOpen}
        onOpenChange={setDiseaseDialogOpen}
        canManage={user?.role === "admin"}
      />
      <AlertCenterDialog
        open={isAlertDialogOpen}
        onOpenChange={setAlertDialogOpen}
        onLogCreated={() => void loadLogs()}
      />
      <RoleManagerDialog
        open={isRoleDialogOpen}
        onOpenChange={setRoleDialogOpen}
        canManage={user?.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL_SAFE}
        users={users}
        onRefresh={() => void loadUsers()}
      />
    </AdminShell>
  )
}

function SettingsCard({
  title,
  subtitle,
  items,
}: {
  title: string
  subtitle: string
  items: QuickLinkItem[]
}) {
  return (
    <Card className="h-full border-0 bg-white shadow-lg ring-1 ring-black/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-gray-900">{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="divide-y divide-gray-100 p-0">
        {items.map((item) => {
          const content = (
            <>
              <div>
                <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500">{item.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </>
          )

          if (item.onSelect) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onSelect}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-gray-50"
              >
                {content}
              </button>
            )
          }

          return (
            <Link
              key={item.id}
              href={item.href ?? "#"}
              className="flex items-center justify-between px-4 py-3 text-left transition hover:bg-gray-50"
            >
              {content}
            </Link>
          )
        })}
      </CardContent>
    </Card>
  )
}

function getInitials(name?: string | null, email?: string | null) {
  const source = name || email || ""
  if (!source) return "AD"
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

type RoleManagerDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  canManage: boolean
  users: AdminUser[]
  onRefresh?: () => void
}

type AlertCenterDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLogCreated?: () => void
}

function AlertCenterDialog({ open, onOpenChange, onLogCreated }: AlertCenterDialogProps) {
  const { t, language } = useLanguage()
  const dialogLocale = language === "en" ? "en-GB" : "th-TH"
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [alerts, setAlerts] = useState<StoredAlert[]>([])
  const [view, setView] = useState<"list" | "compose">("list")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const resetComposer = useCallback(() => {
    setTitle("")
    setContent("")
    setImagePreview(null)
  }, [])

  useEffect(() => {
    if (!open) {
      setView("list")
      resetComposer()
      return
    }

    const syncAlerts = () => {
      setAlerts(getStoredAlerts())
    }

    syncAlerts()
    const handler = () => syncAlerts()
    window.addEventListener(ALERTS_UPDATED_EVENT, handler as EventListener)
    return () => {
      window.removeEventListener(ALERTS_UPDATED_EVENT, handler as EventListener)
    }
  }, [open, resetComposer])

  useEffect(() => {
    if (view === "list") {
      resetComposer()
    }
  }, [view, resetComposer])

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setImagePreview(null)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim() || !content.trim()) {
      toast({
        variant: "destructive",
        title: t("admin.alertComposer.error"),
      })
      return
    }

    setIsSubmitting(true)
    try {
      const alert = {
        id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
        title: title.trim(),
        content: content.trim(),
        image: imagePreview,
        createdAt: new Date().toISOString(),
      }
      addStoredAlert(alert)
      void fetch("/api/admin/logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          action: "custom",
          target: {
            id: "alert-center",
            name: "Alert center",
          },
          metadata: {
            type: "alert.publish",
            title: alert.title,
          },
        }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to log alert action")
          }
          onLogCreated?.()
        })
        .catch((error) => {
          console.error(error)
        })
      toast({
        title: t("admin.alertComposer.success"),
      })
      setView("list")
    } catch (error) {
      console.error("Failed to publish alert", error)
      toast({
        variant: "destructive",
        title: t("admin.alertComposer.error"),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = (alertId: string) => {
    setDeletingId(alertId)
    try {
      removeStoredAlert(alertId)
      toast({
        title: t("admin.alertCenter.deleteSuccess"),
      })
    } catch (error) {
      console.error("Failed to delete alert", error)
      toast({
        variant: "destructive",
        title: t("admin.alertCenter.deleteError"),
      })
    } finally {
      setDeletingId(null)
    }
  }

  const formatTimestamp = useCallback((timestamp: string) => {
    return formatDateTime(timestamp, {
      locale: dialogLocale,
      fallback: timestamp,
      options: { dateStyle: "medium", timeStyle: "short" },
    })
  }, [dialogLocale])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {view === "list" ? t("admin.alertCenter.title") : t("admin.alertComposer.title")}
          </DialogTitle>
          <DialogDescription>
            {view === "list"
              ? t("admin.alertCenter.description")
              : t("admin.alertComposer.description")}
          </DialogDescription>
        </DialogHeader>

        {view === "list" ? (
          <>
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-gray-700">{t("admin.alertCenter.listTitle")}</p>
              <Button type="button" onClick={() => setView("compose")}>
                {t("admin.alertCenter.newAlert")}
              </Button>
            </div>
            <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-1">
              {alerts.length === 0 ? (
                <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                  {t("admin.alertCenter.empty")}
                </div>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-base font-semibold text-gray-900">{alert.title}</p>
                        <p className="mt-1 text-sm text-gray-600">{alert.content}</p>
                        <p className="mt-2 text-xs uppercase tracking-wide text-gray-400">
                          {t("admin.alertCenter.publishedLabel")}: {formatTimestamp(alert.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {alert.image && (
                          <img
                            src={alert.image}
                            alt=""
                            className="h-16 w-16 rounded-md object-cover"
                          />
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => handleDelete(alert.id)}
                          disabled={deletingId === alert.id}
                        >
                          {deletingId === alert.id ? t("common.loading") : t("common.delete")}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setView("list")}
                disabled={isSubmitting}
              >
                {t("admin.alertCenter.backToList")}
              </Button>
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase text-gray-500">
                {t("admin.alertComposer.topic")}
              </Label>
              <Input
                className="mt-1"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={120}
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase text-gray-500">
                {t("admin.alertComposer.body")}
              </Label>
              <Textarea
                className="mt-1 min-h-[140px]"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase text-gray-500">
                {t("admin.alertComposer.image")}
              </Label>
              <Input
                className="mt-1"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Alert preview"
                  className="mt-3 max-h-48 w-full rounded-md object-cover"
                />
              )}
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? t("common.loading") : t("admin.alertComposer.publish")}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function RoleManagerDialog({ open, onOpenChange, canManage, users, onRefresh }: RoleManagerDialogProps) {
  const { t } = useLanguage()
  const [search, setSearch] = useState("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setSearch("")
      onRefresh?.()
    }
  }, [open, onRefresh])

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return users
    return users.filter((record) => {
      const name = record.name?.toLowerCase() ?? ""
      const email = record.email.toLowerCase()
      return name.includes(term) || email.includes(term)
    })
  }, [search, users])

  const handleRoleChange = async (target: AdminUser, nextRole: Role) => {
    if (!canManage || target.role === nextRole || isPrimaryAdminEmail(target.email)) {
      return
    }

    setUpdatingId(target.id)
    try {
      const response = await fetch(`/api/admin/users/${target.id}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ role: nextRole }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error ?? t("admin.roleManager.saveError"))
      }

      const desc =
        nextRole === "admin"
          ? `${target.email} ${t("admin.roleManager.grantedAdmin")}`
          : `${target.email} ${t("admin.roleManager.revokedAdmin")}`
      toast({
        title: t("admin.roleManager.saveSuccess"),
        description: desc,
      })
      onRefresh?.()
    } catch (error) {
      console.error("Failed to update role", error)
      toast({
        variant: "destructive",
        title: t("admin.roleManager.saveError"),
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          setSearch("")
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("admin.roleManager.title")}</DialogTitle>
          <DialogDescription>{t("admin.roleManager.subtitle")}</DialogDescription>
        </DialogHeader>

        {!canManage ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900">
            {t("admin.roleManager.permissionWarning")}
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              placeholder={t("admin.roleManager.searchPlaceholder")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.table.name")}</TableHead>
                    <TableHead>{t("admin.table.email")}</TableHead>
                    <TableHead>{t("admin.table.role")}</TableHead>
                    <TableHead>{t("admin.table.access")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-sm text-gray-500">
                        {t("admin.emptyState")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((record) => {
                      const normalizedRole = record.role === "admin" ? "admin" : "farmer"
                      const disableSelect =
                        updatingId === record.id || isPrimaryAdminEmail(record.email)
                      return (
                        <TableRow key={record.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900">{record.name ?? "—"}</span>
                              {record.organization && (
                                <span className="text-xs text-gray-500">{record.organization}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              {record.email}
                              {isPrimaryAdminEmail(record.email) && (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                                  {t("admin.primaryBadge")}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="capitalize text-sm text-gray-700">
                            {normalizedRole === "admin" ? t("admin.role.admin") : t("admin.role.user")}
                          </TableCell>
                          <TableCell className="text-right">
                            <Select
                              value={normalizedRole}
                              onValueChange={(value) =>
                                handleRoleChange(record, value === "admin" ? "admin" : "farmer")
                              }
                              disabled={disableSelect}
                            >
                              <SelectTrigger className="w-[150px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="farmer">{t("admin.role.user")}</SelectItem>
                                <SelectItem value="admin">{t("admin.role.admin")}</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-gray-500">{t("admin.roleManager.auditHint")}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: LucideIcon
  label: string
  value: number
  tone?: "default" | "success" | "muted"
}) {
  const toneClass =
    tone === "success"
      ? "bg-green-50 text-green-700"
      : tone === "muted"
        ? "bg-gray-100 text-gray-600"
        : "bg-white text-gray-900"

  return (
    <Card className="border border-gray-200">
      <CardContent className="flex items-center gap-4 py-6">
        <div className={`rounded-full p-3 ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function GateCard({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <Card className="mx-auto max-w-lg border border-green-100">
      <CardHeader className="space-y-3 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
          <Icon className="h-6 w-6 text-green-700" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {action && <CardContent className="flex justify-center">{action}</CardContent>}
    </Card>
  )
}

function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      <Navigation />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">{children}</div>
    </div>
  )
}

function isPrimaryAdminEmail(email?: string | null) {
  return email?.toLowerCase() === PRIMARY_ADMIN_EMAIL_SAFE
}
