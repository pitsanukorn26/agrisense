"use client"

import Image from "next/image"
import type { ChangeEvent } from "react"
import { useEffect, useMemo, useState } from "react"

import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  ALERTS_PREF_UPDATED_EVENT,
  ALERTS_UPDATED_EVENT,
  getAlertPreference,
  getStoredAlerts,
  setAlertPreference,
  type StoredAlert,
} from "@/lib/alerts-storage"
import { formatDateTime } from "@/lib/date-format"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useLanguage } from "@/components/language-provider"
import { useAuth } from "@/components/auth-provider"
import { toast } from "@/hooks/use-toast"
import {
  User,
  History,
  Settings,
  TrendingUp,
  AlertTriangle,
  Loader2,
  Clock,
  Leaf,
  Eye,
  Trash2,
} from "lucide-react"

type ScanSummary = {
  id: string
  createdAt?: string
  processedAt?: string
  status: "pending" | "processing" | "completed" | "failed"
  label?: string
  diseaseLocal?: string
  severity?: string
  confidence?: number
  notes?: string
}

type ScanLocation = {
  lat?: number
  lng?: number
  accuracy?: number
  name?: string
}

type ScanDetail = ScanSummary & {
  capturedAt?: string
  imageUrl?: string
  thumbnailUrl?: string
  metadata?: Record<string, unknown> | null
  modelVersion?: string
  failureReason?: string
  location?: ScanLocation | null
  rawModelOutput?: unknown
}

const MAX_AVATAR_BYTES = 4 * 1024 * 1024
const ACCEPTED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"]
type SeverityLevel = "high" | "medium" | "low" | "none"
type StatusLevel = "pending" | "processing" | "completed" | "failed"

const severityAliases: Record<string, SeverityLevel> = {
  high: "high",
  "สูง": "high",
  medium: "medium",
  "ปานกลาง": "medium",
  low: "low",
  "ต่ำ": "low",
  none: "none",
  "ไม่มี": "none",
  healthy: "low",
}

const statusAliases: Record<string, StatusLevel> = {
  pending: "pending",
  processing: "processing",
  completed: "completed",
  failed: "failed",
}

const noteTranslationMap: Record<string, string> = {
  "Plant appears healthy. Continue regular care and monitoring.": "dashboard.note.healthy",
  "Plant appears healthy. Continue regular care.": "dashboard.note.healthyShort",
  "Low severity detected. Keep monitoring and maintain good plant care practices.": "dashboard.note.lowSeverity",
  "High severity detected. Consider immediate treatment and closer monitoring.": "dashboard.note.highSeverity",
  "Medium severity detected. Monitor closely and consider targeted treatment.": "dashboard.note.mediumSeverity",
  "Medium severity detected. Monitor closely and consider targeted treatment": "dashboard.note.mediumSeverity",
}

function initialsFromName(name?: string, email?: string) {
  const source = name?.trim() || email || ""
  if (!source) return "?"
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const mapSeverityKey = (severity?: string | null): SeverityLevel | null => {
  if (!severity) return null
  const normalized = severity.toLowerCase()
  if (normalized.includes("high") || normalized.includes("สูง")) return "high"
  if (normalized.includes("medium") || normalized.includes("ปานกลาง")) return "medium"
  if (
    normalized.includes("low") ||
    normalized.includes("ต่ำ") ||
    normalized.includes("none") ||
    normalized.includes("ไม่มี")
  )
    return normalized.includes("none") || normalized.includes("ไม่มี") ? "none" : "low"
  const key = severityAliases[normalized as keyof typeof severityAliases]
  return key ?? null
}

function severityVariant(severity?: string) {
  const key = mapSeverityKey(severity)
  switch (key) {
    case "high":
      return "destructive"
    case "medium":
      return "default"
    case "low":
    case "none":
      return "secondary"
    default:
      return "outline"
  }
}

function severityIcon(severity?: string) {
  const key = mapSeverityKey(severity)
  switch (key) {
    case "high":
      return <AlertTriangle className="h-4 w-4" />
    case "medium":
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    case "low":
    case "none":
    default:
      return <Leaf className="h-4 w-4 text-green-600" />
  }
}

function normalizeMetadata(metadata: unknown): Record<string, unknown> | null {
  if (!metadata) return null
  if (metadata instanceof Map) {
    return Object.fromEntries(metadata.entries())
  }
  if (typeof metadata === "object" && !Array.isArray(metadata)) {
    return Object.fromEntries(Object.entries(metadata as Record<string, unknown>))
  }
  return null
}

function formatMetadataValue(value: unknown) {
  if (value === null || value === undefined) return "-"
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function buildScanDetailFromApi(scan: any): ScanDetail {
  const metadata = normalizeMetadata(scan?.metadata ?? null)

  const severity =
    (scan?.severity as string | undefined) ??
    (scan?.result?.severity as string | undefined) ??
    (metadata?.["severity"] as string | undefined) ??
    (metadata?.["severityLocal"] as string | undefined)

  const diseaseLocal =
    (scan?.diseaseLocal as string | undefined) ??
    (metadata?.["localeDisease"] as string | undefined) ??
    (metadata?.["diseaseLocal"] as string | undefined)

  const label =
    (scan?.label as string | undefined) ??
    (scan?.result?.label as string | undefined) ??
    diseaseLocal

  const confidence =
    typeof scan?.confidence === "number"
      ? scan.confidence
      : typeof scan?.result?.confidence === "number"
        ? Math.round(scan.result.confidence * 100)
        : undefined

  return {
    id: scan?.id ?? scan?._id?.toString?.(),
    createdAt: scan?.createdAt ?? undefined,
    processedAt: scan?.processedAt ?? undefined,
    capturedAt: scan?.capturedAt ?? undefined,
    status: scan?.status ?? "pending",
    label,
    diseaseLocal,
    severity,
    confidence,
    notes: scan?.notes ?? scan?.result?.notes,
    imageUrl: scan?.imageUrl,
    thumbnailUrl: scan?.thumbnailUrl,
    modelVersion: scan?.modelVersion,
    failureReason: scan?.failureReason,
    metadata,
    location: scan?.location ?? null,
    rawModelOutput: scan?.rawModelOutput,
  }
}

function fillTemplate(template: string, replacements: Record<string, string>) {
  return Object.entries(replacements).reduce((acc, [key, value]) => {
    const pattern = new RegExp(`\\{${key}\\}`, "g")
    return acc.replace(pattern, () => value)
  }, template)
}

export default function DashboardPage() {
  const { t, language } = useLanguage()
  const { user, refreshUser } = useAuth()
  const dateLocale = language === "en" ? "en-GB" : "th-TH"

  const translateStatus = (status?: string) => {
    if (!status) return "-"
    const normalized = status.toLowerCase()
    const key = statusAliases[normalized as keyof typeof statusAliases]
    if (!key) return status
    const translated = t(`dashboard.status.${key}`)
    return translated === `dashboard.status.${key}` ? status : translated
  }

  const translateSeverity = (severity?: string) => {
    if (!severity) return null
    const normalized = severity.toLowerCase()
    const key = severityAliases[normalized as keyof typeof severityAliases]
    if (!key) return severity
    const translated = t(`dashboard.severity.${key}`)
    return translated === `dashboard.severity.${key}` ? severity : translated
  }

  const formatConfidence = (value?: number) => {
    if (typeof value !== "number") return null
    return fillTemplate(t("dashboard.confidenceShort"), { value: value.toString() })
  }

  const translateRole = (role?: string | null) => {
    if (!role) return t("dashboard.defaultRole")
    const key = role.toLowerCase()
    const translated = t(`dashboard.role.${key}`)
    return translated === `dashboard.role.${key}`
      ? role.charAt(0).toUpperCase() + role.slice(1)
      : translated
  }

  const translatePlan = (plan?: string | null) => {
    if (!plan) return t("dashboard.plan.free")
    const key = plan.toLowerCase()
    const translated = t(`dashboard.plan.${key}`)
    return translated === `dashboard.plan.${key}` ? plan : translated
  }

  const translateMetadataKey = (key: string) => {
    const normalized = key.toLowerCase()
    switch (normalized) {
      case "localedisease":
        return t("dashboard.metadata.localeDisease")
      case "severity":
        return t("dashboard.metadata.severity")
      case "severitylocal":
        return t("dashboard.metadata.severityLocal")
      default:
        return key
    }
  }

  const translateNote = (note?: string | null) => {
    if (!note) return null
    const normalized = note.trim()
    const normalizeKey = (text: string) => text.replace(/\s+/g, " ").trim().toLowerCase()
    const normalizedNoteKey = normalizeKey(normalized)

    const directKey = Object.keys(noteTranslationMap).find(
      (template) => normalizeKey(template) === normalizedNoteKey,
    )
    const fallbackKey =
      directKey ||
      Object.keys(noteTranslationMap).find((template) =>
        normalizeKey(normalized).includes(normalizeKey(template)),
      )
    if (!fallbackKey) return note
    const translated = t(noteTranslationMap[fallbackKey])
    return translated === noteTranslationMap[fallbackKey] ? note : translated
  }

  const formatDiagnosis = (label?: string, local?: string) => {
    const thai = (local ?? "").trim()
    const english = (label ?? "").trim()

    if (language === "th") {
      return thai || english || ""
    }

    return english || thai || ""
  }

  const [alertsEnabled, setAlertsEnabled] = useState(true)
  const [alertFeed, setAlertFeed] = useState<StoredAlert[]>([])
  const [scans, setScans] = useState<ScanSummary[]>([])
  const [loadingScans, setLoadingScans] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [detailScan, setDetailScan] = useState<ScanDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ScanSummary | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const resetAvatarForm = () => {
    setAvatarError(null)
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview)
    }
    setAvatarPreview(null)
    setAvatarFile(null)
    setAvatarUploading(false)
  }

  const handleProfileDialogChange = (open: boolean) => {
    setProfileDialogOpen(open)
    if (!open) {
      resetAvatarForm()
    }
  }

  const handleCloseDetailDialog = () => {
    setDetailDialogOpen(false)
    setDetailError(null)
    setDetailScan(null)
  }

  const handleViewDetails = async (scanId: string) => {
    if (!scanId) return
    const baseScan = scans.find((scan) => scan.id === scanId) ?? null
    setDetailScan(baseScan ?? null)
    setDetailError(null)
    setDetailDialogOpen(true)
    setDetailLoading(true)

    try {
      const response = await fetch(`/api/scans/${scanId}`, { cache: "no-store" })
      if (!response.ok) {
        throw new Error("Failed to fetch scan detail")
      }
      const payload = await response.json()
      const data = payload?.data
      if (data) {
        // merge base values to avoid losing label/severity/confidence if backend returns partial
        setDetailScan((prev) => {
          const merged = buildScanDetailFromApi(data)
          return {
            ...prev,
            ...merged,
            label: merged.label ?? prev?.label ?? baseScan?.label,
            diseaseLocal: merged.diseaseLocal ?? prev?.diseaseLocal ?? baseScan?.diseaseLocal,
            severity: merged.severity ?? prev?.severity ?? baseScan?.severity,
            confidence: merged.confidence ?? prev?.confidence ?? baseScan?.confidence,
            notes: merged.notes ?? prev?.notes ?? baseScan?.notes,
          }
        })
      }
    } catch (error) {
      console.error(error)
      setDetailError(t("dashboard.errorLoadDetail"))
    } finally {
      setDetailLoading(false)
    }
  }

  const handleRequestDelete = (scan: ScanSummary) => {
    setDeleteError(null)
    setDeleteTarget(scan)
  }

  const handleDeleteDialogChange = (open: boolean) => {
    if (!open && !isDeleting) {
      setDeleteTarget(null)
      setDeleteError(null)
    }
  }

  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setAvatarError(null)
    if (!file) {
      return
    }
    if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
      const message = t("dashboard.avatarErrorTypeDescription")
      setAvatarError(message)
      toast({
        title: t("dashboard.avatarErrorTypeTitle"),
        description: message,
        variant: "destructive",
      })
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      const message = t("dashboard.avatarErrorSizeDescription")
      setAvatarError(message)
      toast({
        title: t("dashboard.avatarErrorSizeTitle"),
        description: message,
        variant: "destructive",
      })
      return
    }
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview)
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleUploadAvatar = async () => {
    if (!user) {
      const message = t("dashboard.avatarErrorNotLoggedInDescription")
      setAvatarError(message)
      toast({
        title: t("dashboard.avatarErrorNotLoggedInTitle"),
        description: message,
        variant: "destructive",
      })
      return
    }
    if (!avatarFile) {
      const message = t("dashboard.avatarErrorNoFileDescription")
      setAvatarError(message)
      toast({
        title: t("dashboard.avatarErrorNoFileTitle"),
        description: message,
        variant: "destructive",
      })
      return
    }

    setAvatarError(null)
    setAvatarUploading(true)
    try {
      const formData = new FormData()
      formData.append("userId", user.id)
      formData.append("file", avatarFile)

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.error ?? t("dashboard.avatarFailDescription"))
      }

      if (payload?.data) {
        refreshUser(payload.data)
      }

      handleProfileDialogChange(false)
      toast({
        title: t("dashboard.avatarSuccessTitle"),
        description: t("dashboard.avatarSuccessDescription"),
      })
    } catch (error) {
      console.error(error)
      const fallback = t("dashboard.avatarFailDescription")
      const message =
        error instanceof Error && error.message ? error.message : fallback
      setAvatarError(message)
      toast({
        title: t("dashboard.avatarFailTitle"),
        description: message,
        variant: "destructive",
      })
    } finally {
      setAvatarUploading(false)
    }
  }

  const confirmDeleteScan = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      const response = await fetch(`/api/scans/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        throw new Error("Failed to delete scan")
      }
      setScans((prev) => prev.filter((scan) => scan.id !== deleteTarget.id))
      if (detailScan?.id === deleteTarget.id) {
        handleCloseDetailDialog()
      }
      setDeleteTarget(null)
    } catch (error) {
      console.error(error)
      setDeleteError(t("dashboard.errorDelete"))
    } finally {
      setIsDeleting(false)
    }
  }

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview)
      }
    }
  }, [avatarPreview])

  useEffect(() => {
    if (!user) {
      setScans([])
      return
    }

    const controller = new AbortController()

    const load = async () => {
      setLoadingScans(true)
      setScanError(null)
      try {
        const response = await fetch(`/api/scans?userId=${user.id}&limit=8`, {
          cache: "no-store",
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error("Unable to load scan history")
        }
        const payload = await response.json()
        const items = Array.isArray(payload?.data) ? payload.data : []
        const mapped: ScanSummary[] = items.map((scan: any) => {
          const metadata = (scan.metadata as Record<string, unknown> | undefined) ?? {}

          const severity =
            (scan.severity as string | undefined) ??
            (scan.result?.severity as string | undefined) ??
            (metadata.severity as string | undefined) ??
            (metadata.severityLocal as string | undefined)

          const pickLabel = (...values: unknown[]) => {
            for (const v of values) {
              if (typeof v === "string" && v.trim()) return v.trim()
            }
            return undefined
          }

          const localLabel = pickLabel(
            scan.diseaseLocal,
            metadata.localeDisease,
            metadata.diseaseLocal,
          )

          const englishLabel = pickLabel(scan.label, scan.result?.label, metadata.label, localLabel)

          const confidence =
            typeof scan.confidence === "number"
              ? scan.confidence
              : typeof scan.result?.confidence === "number"
                ? Math.round(scan.result.confidence * 100)
                : undefined

          return {
            id: scan.id,
            createdAt: scan.createdAt,
            processedAt: scan.processedAt,
            status: scan.status,
            label: englishLabel ?? localLabel ?? (scan.status === "completed" ? "ผลลัพธ์ไม่ถูกบันทึก" : undefined),
            severity,
            diseaseLocal: localLabel,
            confidence,
            notes: (scan.notes as string | undefined) ?? (scan.result?.notes as string | undefined),
          }
        })

        setScans(mapped)
      } catch (error) {
        if (controller.signal.aborted) return
        console.error(error)
        setScanError(t("dashboard.errorLoadHistory"))
      } finally {
        if (!controller.signal.aborted) {
          setLoadingScans(false)
        }
      }
    }

    load()

    return () => controller.abort()
  }, [t, user])

  useEffect(() => {
    if (typeof window === "undefined") return
    const syncAlerts = () => setAlertFeed(getStoredAlerts())
    syncAlerts()
    const handler = () => syncAlerts()
    window.addEventListener("storage", handler)
    window.addEventListener(ALERTS_UPDATED_EVENT, handler as EventListener)
    return () => {
      window.removeEventListener("storage", handler)
      window.removeEventListener(ALERTS_UPDATED_EVENT, handler as EventListener)
    }
  }, [])

  const alertPrefKey = useMemo(() => user?.id ?? user?.email ?? "anonymous", [user?.id, user?.email])

  useEffect(() => {
    if (typeof window === "undefined") return
    const syncPref = () => {
      const pref = getAlertPreference(alertPrefKey)
      setAlertsEnabled(pref.notifications)
    }
    syncPref()
    const handler = () => syncPref()
    window.addEventListener(ALERTS_PREF_UPDATED_EVENT, handler as EventListener)
    return () => {
      window.removeEventListener(ALERTS_PREF_UPDATED_EVENT, handler as EventListener)
    }
  }, [alertPrefKey])

  const handleAlertsToggle = (enabled: boolean) => {
    setAlertsEnabled(enabled)
    if (typeof window !== "undefined") {
      setAlertPreference(alertPrefKey, { notifications: enabled })
    }
  }

  const stats = useMemo(() => {
    if (!scans.length) {
      return {
        total: 0,
        completed: 0,
        healthy: 0,
        highRisk: 0,
      }
    }

    const completed = scans.filter((scan) => scan.status === "completed")
    const healthy = completed.filter((scan) => {
      const severity = scan.severity?.toLowerCase()
      const label = scan.label?.toLowerCase()
      return (
        severity === "none" ||
        severity === "ต่ำ" ||
        (label && label.includes("healthy"))
      )
    })
    const highRisk = completed.filter((scan) => {
      const severity = scan.severity?.toLowerCase()
      return severity === "high" || severity === "สูง"
    })

    return {
      total: scans.length,
      completed: completed.length,
      healthy: healthy.length,
      highRisk: highRisk.length,
    }
  }, [scans])

  const showAuthenticatedContent = Boolean(user)
  const metadataEntries = detailScan?.metadata ? Object.entries(detailScan.metadata) : []
  const currentAvatarPreview = avatarPreview ?? user?.avatarUrl ?? null
  const deleteConfirmationText = deleteTarget
    ? fillTemplate(t("dashboard.deleteConfirmDescription"), {
        result:
          formatDiagnosis(deleteTarget.label, deleteTarget.diseaseLocal) ||
          deleteTarget.label ||
          deleteTarget.id ||
          "",
      })
    : ""

  const deriveLabel = (scan?: ScanDetail | null) => {
    if (!scan) return null
    const meta = scan.metadata as Record<string, any> | undefined
    return (
      scan.label ||
      scan.result?.label ||
      meta?.localeDisease ||
      meta?.diseaseLocal ||
      scan.diseaseLocal ||
      null
    )
  }

  const deriveSeverity = (scan?: ScanDetail | null) => {
    if (!scan) return null
    const meta = scan.metadata as Record<string, any> | undefined
    return scan.severity || scan.result?.severity || meta?.severity || meta?.severityLocal || null
  }

  const deriveConfidence = (scan?: ScanDetail | null) => {
    if (!scan) return null
    if (typeof scan.confidence === "number") return scan.confidence
    if (typeof scan.result?.confidence === "number")
      return Math.round(scan.result.confidence * 100)
    return null
  }

  const derivedLabel = deriveLabel(detailScan)
  const derivedSeverity = deriveSeverity(detailScan)
  const derivedConfidence = deriveConfidence(detailScan)

  const detailDiagnosis =
    derivedLabel && detailScan
      ? formatDiagnosis(derivedLabel, detailScan.diseaseLocal) ||
        formatDiagnosis(detailScan.label, detailScan.diseaseLocal) ||
        t("dashboard.pendingAnalysis")
      : detailScan
        ? formatDiagnosis(detailScan.label, detailScan.diseaseLocal) || t("dashboard.pendingAnalysis")
        : t("dashboard.pendingAnalysis")
  const detailStatus = detailScan ? translateStatus(detailScan.status) : "-"
  const detailSeverity =
    derivedSeverity && detailScan
      ? translateSeverity(derivedSeverity) ?? derivedSeverity ?? "-"
      : detailScan
        ? translateSeverity(detailScan.severity) ?? detailScan.severity ?? "-"
        : "-"
  const detailConfidence =
    detailScan && derivedConfidence !== null
      ? formatConfidence(derivedConfidence) ?? "-"
      : detailScan
        ? formatConfidence(detailScan.confidence) ?? "-"
        : "-"
  const detailNoteDisplay =
    detailScan ? translateNote(detailScan.notes) ?? detailScan.notes ?? null : null
  const detailCreatedAt = formatDateTime(detailScan?.createdAt, {
    locale: dateLocale,
    fallback: "-",
  })
  const detailProcessedAt = formatDateTime(detailScan?.processedAt, {
    locale: dateLocale,
    fallback: "-",
  })
  const detailCapturedAt = formatDateTime(detailScan?.capturedAt, {
    locale: dateLocale,
    fallback: "-",
  })

  const heroTitle =
    user?.role === "admin" ? t("dashboard.adminProfilesTitle") : t("dashboard.title")
  const heroSubtitle = showAuthenticatedContent
    ? t("dashboard.profileDescription")
    : t("dashboard.loginPromptDescription")

  const heroSection = (
    <section className="relative isolate min-h-[20rem] w-full overflow-hidden bg-gray-900 sm:min-h-[22rem] lg:min-h-[360px]">
      <Image
        src="/rice-bg.jpg"
        alt="Rice field background"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/70" />
      <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-start px-4 py-10 text-white sm:py-12">
        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
          {t("dashboard.profile")}
        </span>
        <h1 className="text-3xl font-bold text-white sm:text-4xl">{heroTitle}</h1>
        <p className="mt-2 max-w-2xl text-base text-white/80 sm:text-lg">{heroSubtitle}</p>
        {showAuthenticatedContent && user?.createdAt && (
          <p className="mt-3 text-sm text-white/70 sm:text-base" suppressHydrationWarning>
            {t("dashboard.memberSince")}{" "}
            {formatDateTime(user.createdAt, {
              locale: dateLocale,
              fallback: "-",
              options: { year: "numeric", month: "2-digit", day: "2-digit" },
            })}
          </p>
        )}
      </div>
    </section>
  )

  if (!showAuthenticatedContent) {
    return (
      <div className="min-h-screen bg-[#f2f2f2]">
        <Navigation />
        {heroSection}
        <div className="container relative z-10 mx-auto -mt-24 px-4 pb-10 sm:-mt-36 sm:pb-12">
          <div className="mx-auto max-w-4xl space-y-8">
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle>{t("dashboard.loginPromptTitle")}</CardTitle>
                <CardDescription>{t("dashboard.loginPromptDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-600">{t("dashboard.loginPromptHint")}</p>
                <div className="flex gap-2">
                  <Button asChild variant="outline">
                    <a href="/register">{t("nav.register")}</a>
                  </Button>
                  <Button asChild>
                    <a href="/login">{t("nav.login")}</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-[#f2f2f2]">
        <Navigation />
        {heroSection}

        <div className="container relative z-10 mx-auto -mt-24 px-4 pb-10 sm:-mt-36 sm:pb-12">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-1 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {t("dashboard.profile")}
                    </CardTitle>
                  <CardDescription className="text-base text-gray-600">
                    {t("dashboard.profileDescription")}
                  </CardDescription>
                </CardHeader>
                  <CardContent className="space-y-4">
                  <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                    <Avatar className="h-16 w-16">
                      {user?.avatarUrl && (
                        <AvatarImage
                          src={user.avatarUrl}
                          alt={user.name ? `${user.name} avatar` : "User avatar"}
                          className="object-cover"
                        />
                      )}
                      <AvatarFallback>{initialsFromName(user?.name, user?.email)}</AvatarFallback>
                    </Avatar>
                      <div className="space-y-0.5">
                      <h3 className="text-xl font-semibold break-words">
                        {user?.name || user?.email || t("dashboard.anonymousUser")}
                      </h3>
                      <p className="text-base text-gray-600">
                        {translateRole(user?.role)}
                      </p>
                        <p className="text-base text-gray-500 break-words">{user?.email}</p>
                      </div>
                    </div>

                    <div id="alerts" className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-medium">{t("dashboard.alerts")}</span>
                        <Switch checked={alertsEnabled} onCheckedChange={handleAlertsToggle} />
                      </div>
                      <div className="space-y-2">
                        {alertFeed.length === 0 ? (
                          <p className="text-base text-gray-500">{t("dashboard.alertsEmpty")}</p>
                        ) : (
                          alertFeed.slice(0, 3).map((alert) => (
                            <div
                              key={alert.id}
                              className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
                            >
                                <p className="text-base font-semibold text-gray-900">{alert.title}</p>
                                <p className="text-sm text-gray-500">
                                  <span suppressHydrationWarning>
                                    {formatDateTime(alert.createdAt, {
                                      locale: dateLocale,
                                      fallback: t("dashboard.unknownTime"),
                                    })}
                                  </span>
                                </p>
                              </div>
                          ))
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-base font-medium">{t("dashboard.profilePlan")}</span>
                        <Badge variant="outline">{translatePlan(user?.plan ?? "free")}</Badge>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full text-base"
                      onClick={() => handleProfileDialogChange(true)}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      {t("dashboard.manageProfile")}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    {t("dashboard.statsCardTitle")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{t("dashboard.statsTotal")}</span>
                    <span className="font-semibold text-gray-900">{stats.total}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{t("dashboard.statsCompleted")}</span>
                    <span className="font-semibold text-gray-900">{stats.completed}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{t("dashboard.statsHealthy")}</span>
                    <span className="font-semibold text-green-600">{stats.healthy}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{t("dashboard.statsHighRisk")}</span>
                    <span className="font-semibold text-red-600">{stats.highRisk}</span>
                  </div>
                </CardContent>
              </Card>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    {t("dashboard.historyTitle")}
                  </CardTitle>
                  <CardDescription>{t("dashboard.historyDescription")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingScans ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("dashboard.loadingScans")}
                    </div>
                  ) : scanError ? (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{scanError}</div>
                  ) : scans.length === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-500">{t("dashboard.historyEmpty")}</div>
                  ) : (
                      <div className="space-y-4">
                    {scans.map((scan) => {
                      const severityLabel = translateSeverity(scan.severity)
                      const statusLabel = translateStatus(scan.status)
                      const confidenceLabel = formatConfidence(scan.confidence)
                      const diagnosisText =
                          formatDiagnosis(scan.label, scan.diseaseLocal) ||
                          (scan.status === "completed"
                            ? t("dashboard.resultNotSaved")
                            : t("dashboard.pendingAnalysis"))
                        const noteText = translateNote(scan.notes) ?? scan.notes
                        const timestampText = formatDateTime(scan.processedAt ?? scan.createdAt, {
                          locale: dateLocale,
                          fallback: t("dashboard.unknownTime"),
                        })
                        return (
                          <div
                            key={scan.id}
                            className="flex flex-col gap-3 rounded-lg border p-4 transition hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Clock className="h-4 w-4" />
                                <span suppressHydrationWarning>
                                  {timestampText}
                                </span>
                              </div>
                              <p className="mt-2 text-base font-semibold text-gray-900">
                                {diagnosisText}
                              </p>
                              {noteText && (
                                <p className="mt-1 text-sm text-gray-600 line-clamp-2">{noteText}</p>
                              )}
                            </div>
                            <div className="flex flex-col gap-3 sm:h-full sm:min-w-[320px] sm:items-end sm:justify-between">
                              <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3">
                                <Badge
                                  variant={severityVariant(scan.severity)}
                                  className="flex items-center gap-1 sm:whitespace-nowrap"
                                >
                                  {severityIcon(scan.severity)}
                                  {severityLabel ?? statusLabel}
                                </Badge>
                                {confidenceLabel && (
                                  <span className="text-sm text-gray-500 shrink-0 sm:whitespace-nowrap">
                                    {confidenceLabel}
                                  </span>
                                )}
                                <Badge
                                  variant={
                                    scan.status === "completed"
                                      ? "secondary"
                                      : scan.status === "failed"
                                        ? "destructive"
                                        : "outline"
                                  }
                                  className="sm:whitespace-nowrap"
                                >
                                  {statusLabel}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-2 sm:justify-end">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleViewDetails(scan.id)}
                                  className="flex items-center gap-2"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  {t("dashboard.viewDetails")}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleRequestDelete(scan)}
                                  className="flex items-center gap-2"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  {t("dashboard.deleteResult")}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    )}
                  </CardContent>
                </Card>

              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={profileDialogOpen} onOpenChange={handleProfileDialogChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("dashboard.profileDialogTitle")}</DialogTitle>
            <DialogDescription>{t("dashboard.profileDialogDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                {currentAvatarPreview && (
                  <AvatarImage
                    src={currentAvatarPreview}
                    alt={t("dashboard.profileDialogTitle")}
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="text-base font-semibold">
                  {initialsFromName(user?.name, user?.email)}
                </AvatarFallback>
              </Avatar>
              <p className="text-sm text-gray-600">{t("dashboard.profileDialogGuideline")}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t("dashboard.profileDialogInputLabel")}</label>
              <input
                type="file"
                accept={ACCEPTED_AVATAR_TYPES.join(",")}
                onChange={handleAvatarFileChange}
                className="mt-2 w-full cursor-pointer rounded-md border border-dashed border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-[#55AC68] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
              />
              <p className="mt-1 text-xs text-gray-500">{t("dashboard.profileDialogInputHelp")}</p>
            </div>
            {avatarError && (
              <div className="rounded-md bg-red-50 p-2 text-sm text-red-600">{avatarError}</div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleProfileDialogChange(false)}
              disabled={avatarUploading}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleUploadAvatar} disabled={!avatarFile || avatarUploading}>
              {avatarUploading ? t("dashboard.uploadingAvatar") : t("dashboard.profileDialogSave")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseDetailDialog()
          }
        }}
      >
      <DialogContent className="max-h-[90vh] w-[calc(100%-1.5rem)] overflow-y-auto p-4 sm:max-w-2xl sm:p-6">
          <DialogHeader>
            <DialogTitle>{t("dashboard.detailDialogTitle")}</DialogTitle>
            <DialogDescription>{t("dashboard.detailDialogDescription")}</DialogDescription>
          </DialogHeader>
          {detailError && (
            <div className="rounded-md bg-red-50 p-2 text-sm text-red-600">{detailError}</div>
          )}
          {detailScan ? (
            <div className="space-y-4">
              {detailLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("dashboard.loadingScans")}
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-gray-500">{t("dashboard.detailResult")}</p>
                  <p className="text-base font-semibold text-gray-900 break-words">{detailDiagnosis}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">{t("dashboard.detailStatus")}</p>
                  <p className="text-base font-semibold text-gray-900 break-words">{detailStatus}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">{t("dashboard.detailSeverity")}</p>
                  <p className="text-base font-semibold text-gray-900 break-words">{detailSeverity}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">{t("dashboard.detailConfidence")}</p>
                  <p className="text-base font-semibold text-gray-900 break-words">{detailConfidence}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">{t("dashboard.detailSubmittedAt")}</p>
                  <p className="text-sm text-gray-900">
                    <span suppressHydrationWarning>
                      {detailCreatedAt}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">{t("dashboard.detailProcessedAt")}</p>
                  <p className="text-sm text-gray-900">
                    <span suppressHydrationWarning>
                      {detailProcessedAt}
                    </span>
                  </p>
                </div>
                {detailScan.capturedAt && (
                  <div>
                    <p className="text-xs uppercase text-gray-500">{t("dashboard.detailCapturedAt")}</p>
                    <p className="text-sm text-gray-900">
                      <span suppressHydrationWarning>
                        {detailCapturedAt}
                      </span>
                    </p>
                  </div>
                )}
                {detailScan.modelVersion && (
                  <div>
                    <p className="text-xs uppercase text-gray-500">{t("dashboard.detailModelVersion")}</p>
                    <p className="text-sm text-gray-900">{detailScan.modelVersion}</p>
                  </div>
                )}
              </div>
              {detailScan.location && (detailScan.location.name || detailScan.location.lat) && (
                <div>
                  <p className="text-xs uppercase text-gray-500">{t("dashboard.detailLocation")}</p>
                  <p className="text-sm font-medium text-gray-900">
                    {detailScan.location.name ??
                      `${detailScan.location.lat ?? "-"}, ${detailScan.location.lng ?? "-"}`}
                  </p>
                  {typeof detailScan.location.accuracy === "number" && (
                    <p className="text-xs text-gray-500">
                      {fillTemplate(t("dashboard.detailLocationAccuracy"), {
                        meters: detailScan.location.accuracy.toString(),
                      })}
                    </p>
                  )}
                </div>
              )}
              {detailScan.failureReason && detailScan.status === "failed" && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 break-words">
                  {t("dashboard.detailFailureReason")} {detailScan.failureReason}
                </div>
              )}
              {detailNoteDisplay && (
                <div>
                  <p className="text-xs uppercase text-gray-500">{t("dashboard.detailNotes")}</p>
                  <p className="text-sm text-gray-800 break-words">{detailNoteDisplay}</p>
                </div>
              )}
              {detailScan.imageUrl && (
                <div>
                  <p className="text-xs uppercase text-gray-500">{t("dashboard.detailImage")}</p>
                  <img
                    src={detailScan.thumbnailUrl ?? detailScan.imageUrl}
                    alt={t("dashboard.detailImage")}
                    className="mt-2 h-48 w-full rounded-lg object-cover sm:h-56"
                  />
                  <a
                    href={detailScan.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs font-semibold text-green-700 underline"
                  >
                    {t("dashboard.detailOpenFullImage")}
                  </a>
                </div>
              )}
              {metadataEntries.length > 0 && (
                <div>
                  <p className="text-xs uppercase text-gray-500">{t("dashboard.detailMetadata")}</p>
                  <div className="mt-2 space-y-2 rounded-md border bg-gray-50 p-3 text-xs text-gray-700">
                    {metadataEntries.map(([key, value]) => (
                      <div
                        key={key}
                        className="flex flex-col items-start gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                      >
                        <span className="font-semibold text-gray-900">
                          {translateMetadataKey(key)}
                        </span>
                        <span className="flex-1 text-left text-gray-700 break-words sm:text-right">
                          {formatMetadataValue(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {detailScan.rawModelOutput && (
                <details className="rounded-md border p-3 text-xs text-gray-700">
                  <summary className="cursor-pointer font-semibold text-gray-900">
                    {t("dashboard.detailRawData")}
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words text-[11px]">
                    {JSON.stringify(detailScan.rawModelOutput, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">{t("dashboard.detailEmptyState")}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDetailDialog}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent className="w-[calc(100%-1.5rem)] max-w-sm p-4 sm:max-w-md sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dashboard.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{deleteConfirmationText}</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <div className="rounded-md bg-red-50 p-2 text-sm text-red-600">{deleteError}</div>
          )}
          <AlertDialogFooter className="gap-2 sm:gap-3">
            <AlertDialogCancel disabled={isDeleting} className="w-full sm:w-auto">
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteScan}
              disabled={isDeleting}
              className="w-full sm:w-auto"
            >
              {isDeleting ? t("dashboard.deletingStatus") : t("dashboard.deleteConfirmAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
