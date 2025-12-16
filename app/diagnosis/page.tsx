"use client"

import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"

import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useLanguage } from "@/components/language-provider"
import { useAuth } from "@/components/auth-provider"
import {
  Upload,
  Brain,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Camera,
  Clock,
  Flag,
} from "lucide-react"
import { formatDateTime } from "@/lib/date-format"

type MockResult = {
  disease: string
  diseaseLocal: string
  severity: "High" | "Medium" | "Low" | "None"
  severityLocal: string
  confidence: number
  recommendation: string
  recommendationLocal: string
}

type ScanHistoryItem = {
  id: string
  createdAt?: string
  processedAt?: string
  status: "pending" | "processing" | "completed" | "failed"
  label?: string
  diseaseLocal?: string
  confidence?: number
  severity?: string
  severityLocal?: string
  notes?: string
}

const normalizeMetadata = (meta: any) => {
  if (!meta) return {}
  if (meta instanceof Map) return Object.fromEntries(meta.entries())
  if (typeof meta === "object" && !Array.isArray(meta)) return meta as Record<string, unknown>
  return {}
}

const historyNoteTranslationMap: Record<string, string> = {
  "Plant appears healthy. Continue regular care and monitoring.": "dashboard.note.healthy",
  "Plant appears healthy. Continue regular care.": "dashboard.note.healthyShort",
  "Low severity detected. Keep monitoring and maintain good plant care practices.": "dashboard.note.lowSeverity",
  "High severity detected. Consider immediate treatment and closer monitoring.": "dashboard.note.highSeverity",
  "Medium severity detected. Monitor closely and consider targeted treatment.": "dashboard.note.mediumSeverity",
  "Medium severity detected. Monitor closely and consider targeted treatment": "dashboard.note.mediumSeverity",
}

function formatDiseaseLabel(rawLabel: string | undefined | null): string {
  if (!rawLabel) return "Unknown"
  const cleaned = rawLabel.replace(/_/g, " ").trim()
  if (!cleaned) return "Unknown"
  return cleaned
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function getThaiDiseaseName(rawLabel: string | undefined | null): string {
  if (!rawLabel) return "ไม่ทราบชื่อโรค";

  const key = rawLabel.toLowerCase().replace(/_/g, " ").trim();
  if (!key) return "ไม่ทราบชื่อโรค";

  switch (key) {
    case "bacterial leaf blight":
      return "โรคขอบใบแห้ง";

    case "brown spot":
      return "โรคใบจุดสีน้ำตาล";

    case "healthy":
      return "สุขภาพดี";

    case "leaf blast":
      return "โรคไหม้";

    case "leaf scald":
      return "โรคใบขีดโปร่งแสง";

    case "narrow brown spot":
      return "โรคใบขีดสีน้ำตาลแคบ";

    default:
      return formatDiseaseLabel(rawLabel);
  }
}

function fillTemplate(template: string, replacements: Record<string, string>) {
  return Object.entries(replacements).reduce((acc, [key, value]) => {
    const pattern = new RegExp(`\\{${key}\\}`, "g")
    return acc.replace(pattern, () => value)
  }, template)
}


export default function DiagnosisPage() {
  const { t, language } = useLanguage()
  const { user } = useAuth()

  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<MockResult | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [history, setHistory] = useState<ScanHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [historyRefresh, setHistoryRefresh] = useState(0)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [reportTarget, setReportTarget] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState("")
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [persistenceDisabled, setPersistenceDisabled] = useState(false)
  const [persistenceWarning, setPersistenceWarning] = useState<string | null>(null)

  const mockResults = useMemo<MockResult[]>(
    () => [
      {
        disease: "Leaf Blight",
        diseaseLocal: "โรคใบไหม้",
        severity: "Medium",
        severityLocal: "ปานกลาง",
        confidence: 87,
        recommendation:
          "Apply copper-based fungicide every 7-10 days. Remove affected leaves and improve air circulation.",
        recommendationLocal:
          "ใช้สารป้องกันกำจัดเชื้อราที่มีทองแดงทุก 7-10 วัน เอาใบที่เป็นโรคออก และปรับปรุงการระบายอากาศ",
      },
      {
        disease: "Healthy",
        diseaseLocal: "สุขภาพดี",
        severity: "None",
        severityLocal: "ไม่มี",
        confidence: 95,
        recommendation:
          "Plant appears healthy. Continue regular care and monitoring.",
        recommendationLocal:
          "พืชดูมีสุขภาพดี ดูแลและตรวจสอบตามปกติต่อไป",
      },
      {
        disease: "Powdery Mildew",
        diseaseLocal: "โรคราแป้ง",
        severity: "High",
        severityLocal: "สูง",
        confidence: 92,
        recommendation:
          "Immediate treatment required. Use systemic fungicide and reduce humidity around plants.",
        recommendationLocal:
          "ต้องรักษาทันที ใช้สารป้องกันกำจัดเชื้อราชนิดซึมซาบ และลดความชื้นรอบพืช",
      },
    ],
    [],
  )

  useEffect(() => {
    if (!user) {
      setHistory([])
      return
    }

    const loadHistory = async () => {
      setHistoryLoading(true)
      setHistoryError(null)
      try {
        const response = await fetch(
          `/api/scans?userId=${user.id}&limit=12`,
          {
            cache: "no-store",
          },
        )
        if (!response.ok) {
          throw new Error("Unable to load scan history")
        }
        const payload = await response.json()
        const items = Array.isArray(payload?.data) ? payload.data : []
        const mapped: ScanHistoryItem[] = items.map((scan: any) => {
          const metadata = normalizeMetadata(scan.metadata)
          const pickLabel = (...values: unknown[]) => {
            for (const v of values) {
              if (typeof v === "string" && v.trim()) return v.trim()
            }
            return undefined
          }

          const localeDisease = pickLabel(
            scan.diseaseLocal,
            metadata.localeDisease,
            metadata.diseaseLocal,
          )

          const rawLabel = pickLabel(scan.label, scan.result?.label, localeDisease)

          return {
            id: scan.id,
            createdAt: scan.createdAt,
            processedAt: scan.processedAt,
            status: scan.status,
            label: rawLabel
              ? formatDiseaseLabel(rawLabel)
              : scan.status === "completed"
                ? "ผลลัพธ์ไม่ถูกบันทึก"
                : "Pending analysis",
            // diseaseLocal is derived at render time from label
            diseaseLocal: localeDisease,
            confidence:
              typeof scan.confidence === "number"
                ? scan.confidence
                : typeof scan.result?.confidence === "number"
                  ? Math.round(scan.result.confidence * 100)
                  : undefined,
            severity:
              (scan.severity as string | undefined) ??
              (scan.result?.severity as string | undefined) ??
              (metadata.severity as string | undefined) ??
              (metadata.severityLocal as string | undefined),
            severityLocal:
              (metadata.severityLocal as string | undefined) ??
              (metadata.severity as string | undefined),
            notes: (scan.notes as string | undefined) ?? (scan.result?.notes as string | undefined),
          }
        })
        setHistory(mapped)
      } catch (error) {
        console.error(error)
        setHistoryError("ไม่สามารถโหลดประวัติการวิเคราะห์ได้ (กำลังใช้โหมดไม่บันทึกประวัติ)")
        setPersistenceDisabled(true)
        setPersistenceWarning("เซิร์ฟเวอร์บันทึกประวัติไม่ตอบสนอง กำลังวิเคราะห์แบบไม่บันทึกผล")
      } finally {
        setHistoryLoading(false)
      }
    }

    loadHistory()
  }, [user, historyRefresh])

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string)
        setResult(null)
        setScanError(null)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAnalyze = async () => {
    if (!selectedImage) return
    const isGuest = !user

    setScanError(null)
    setPersistenceWarning(null)
    setIsAnalyzing(true)

    let scanId: string | null = null
    const canPersist = !isGuest && !persistenceDisabled

    // Persist only when logged in; guests can analyze without saving history.
    if (canPersist) {
      try {
        const createResponse = await fetch("/api/scans", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageUrl: selectedImage,
            userId: user.id,
            capturedAt: new Date().toISOString(),
            metadata: {
              uploadSource: "web-app",
            },
          }),
        })

        const createPayload = await createResponse.json().catch(() => ({}))
        if (!createResponse.ok) {
          throw new Error(createPayload?.error ?? "ไม่สามารถสร้างงานวิเคราะห์ได้")
        }
        scanId = createPayload?.data?.id
      } catch (error) {
        console.error(error)
        setPersistenceDisabled(true)
        setPersistenceWarning("บันทึกประวัติไม่ได้ ระบบจะวิเคราะห์แบบไม่บันทึกผลครั้งนี้")
      }
    }

    try {
      const predictResponse = await fetch("/api/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: selectedImage,
        }),
      })

      const predictPayload = await predictResponse.json().catch(() => ({}))
      if (!predictResponse.ok) {
        const message = predictPayload?.error ?? t("diagnosis.predictError")
        setScanError(message)
        setIsAnalyzing(false)
        return
      }

      const azure = predictPayload?.data
      const predictions = Array.isArray(azure?.predictions)
        ? azure.predictions
        : []

      if (!predictions.length) {
        const randomResult =
          mockResults[Math.floor(Math.random() * mockResults.length)]
        setResult(randomResult)

        if (!isGuest && scanId) {
          try {
            await fetch(`/api/scans/${scanId}/complete`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                label: randomResult.disease,
                confidence: randomResult.confidence / 100,
                notes: randomResult.recommendation,
                severity: randomResult.severity,
                severityLocal: randomResult.severityLocal,
                localeDisease: randomResult.diseaseLocal,
                rawModelOutput: {
                  mocked: true,
                },
              }),
            })
            setHistoryRefresh((value) => value + 1)
          } catch (error) {
            console.error("Failed to update scan result", error)
          }
        }

        setIsAnalyzing(false)
        return
      }

      predictions.sort(
        (
          a: { probability?: number },
          b: { probability?: number },
        ): number => (b.probability ?? 0) - (a.probability ?? 0),
      )

      const top = predictions[0] as {
        probability?: number
        tagName?: string
      }

      const probability =
        typeof top.probability === "number" ? top.probability : 0
      const rawLabel =
        typeof top.tagName === "string" ? top.tagName : undefined
      const label = formatDiseaseLabel(rawLabel)
      const diseaseLocal = getThaiDiseaseName(rawLabel)

      let severity: MockResult["severity"] = "None"
      let severityLocal = "ไม่มี"

      if (!label.toLowerCase().includes("healthy") && probability > 0) {
        if (probability >= 0.8) {
          severity = "High"
          severityLocal = "สูง"
        } else if (probability >= 0.5) {
          severity = "Medium"
          severityLocal = "ปานกลาง"
        } else {
          severity = "Low"
          severityLocal = "ต่ำ"
        }
      }

      const confidencePercent = Math.round(probability * 100)

      let recommendation = "Plant appears healthy. Continue regular care."
      let recommendationLocal =
        "พืชดูมีสุขภาพดี ดูแลและตรวจสอบตามปกติต่อไป"

      if (severity === "High") {
        recommendation =
          "High severity detected. Consider immediate treatment and closer monitoring."
        recommendationLocal =
          "พบความรุนแรงสูง ควรรีบรักษาและติดตามอาการอย่างใกล้ชิด"
      } else if (severity === "Medium") {
        recommendation =
          "Medium severity detected. Monitor closely and consider targeted treatment."
        recommendationLocal =
          "พบความรุนแรงปานกลาง ควรเฝ้าสังเกตและพิจารณาการรักษาเฉพาะจุด"
      } else if (severity === "Low") {
        recommendation =
          "Low severity detected. Keep monitoring and maintain good plant care practices."
        recommendationLocal =
          "พบความรุนแรงต่ำ ควรเฝ้าสังเกตและดูแลพืชให้แข็งแรงต่อเนื่อง"
      }

      const computedResult: MockResult = {
        disease: label,
        diseaseLocal,
        severity,
        severityLocal,
        confidence: confidencePercent,
        recommendation,
        recommendationLocal,
      }

      setResult(computedResult)

      if (!isGuest && !persistenceDisabled && scanId) {
        // Optimistic update เพื่อให้ประวัติแสดงชื่อโรคทันทีแม้ backend บันทึกไม่สำเร็จ
        setHistory((prev) => [
          {
            id: scanId,
            createdAt: new Date().toISOString(),
            processedAt: new Date().toISOString(),
            status: "completed",
            label: formatDiseaseLabel(computedResult.disease),
            diseaseLocal: computedResult.diseaseLocal,
            confidence: computedResult.confidence,
            severity: computedResult.severity,
            severityLocal: computedResult.severityLocal,
            notes: computedResult.recommendation,
          },
          ...prev.filter((h) => h.id !== scanId),
        ])

        try {
          await fetch(`/api/scans/${scanId}/complete`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              label: computedResult.disease,
              confidence: probability,
              notes: computedResult.recommendation,
              severity: computedResult.severity,
              severityLocal: computedResult.severityLocal,
              localeDisease: computedResult.diseaseLocal,
              rawModelOutput: azure,
            }),
          })
          setHistoryRefresh((value) => value + 1)
        } catch (error) {
          console.error("Failed to update scan result", error)
        }
      }

      setIsAnalyzing(false)
    } catch (error) {
      console.error(error)
      setScanError(
        error instanceof Error ? error.message : "การวิเคราะห์ล้มเหลว กรุณาลองใหม่",
      )

      if (!isGuest && !persistenceDisabled && scanId) {
        try {
          await fetch(`/api/scans/${scanId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: "failed",
              processedAt: new Date().toISOString(),
              failureReason:
                error instanceof Error
                  ? error.message
                  : "Prediction service error",
            }),
          })
        } catch (patchError) {
          console.error("Failed to update failed scan", patchError)
        }
      }

      setIsAnalyzing(false)
    }
  }

  const openReportDialog = (scanId: string) => {
    setReportTarget(scanId)
    setReportReason("")
    setReportError(null)
    setReportDialogOpen(true)
  }

  const submitReport = async () => {
    if (!reportTarget || !reportReason.trim()) {
      setReportError("โปรดระบุรายละเอียดปัญหาที่ต้องการรายงาน")
      return
    }
    setReportSubmitting(true)
    setReportError(null)
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scanId: reportTarget,
          reason: reportReason.trim(),
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error ?? "ไม่สามารถส่งรายงานได้")
      }
      setReportDialogOpen(false)
    } catch (error) {
      console.error("Failed to submit report", error)
      setReportError(
        error instanceof Error ? error.message : "ไม่สามารถส่งรายงานได้ กรุณาลองใหม่",
      )
    } finally {
      setReportSubmitting(false)
    }
  }

  const getSeverityColor = (severity: string | undefined) => {
    if (!severity) return "outline"
    switch (severity.toLowerCase()) {
      case "high":
      case "สูง":
        return "destructive"
      case "medium":
      case "ปานกลาง":
        return "default"
      case "low":
      case "ต่ำ":
        return "secondary"
      default:
        return "outline"
    }
  }

  const getSeverityIcon = (severity: string | undefined) => {
    if (!severity) return <CheckCircle className="h-4 w-4" />
    switch (severity.toLowerCase()) {
      case "high":
      case "สูง":
        return <XCircle className="h-4 w-4" />
      case "medium":
      case "ปานกลาง":
        return <AlertTriangle className="h-4 w-4" />
      case "low":
      case "ต่ำ":
        return <CheckCircle className="h-4 w-4" />
      default:
        return <CheckCircle className="h-4 w-4" />
    }
  }

  const translateSeverity = (severity?: string | null) => {
    if (!severity) return null
    const normalized = severity.toLowerCase()

    let key: "high" | "medium" | "low" | "none" | null = null
    if (["high", "สูง"].includes(normalized)) key = "high"
    else if (["medium", "ปานกลาง"].includes(normalized)) key = "medium"
    else if (["low", "ต่ำ"].includes(normalized)) key = "low"
    else if (["none", "ไม่มี"].includes(normalized)) key = "none"

    if (!key) return severity
    const translated = t(`dashboard.severity.${key}`)
    return translated === `dashboard.severity.${key}` ? severity : translated
  }

  const translateHistoryNote = (note?: string | null) => {
    if (!note) return null
    const normalized = note.trim()
    const normalizeKey = (text: string) => text.replace(/\s+/g, " ").trim().toLowerCase()
    const normalizedNoteKey = normalizeKey(normalized)

    const directKey = Object.keys(historyNoteTranslationMap).find(
      (template) => normalizeKey(template) === normalizedNoteKey,
    )
    const fallbackKey =
      directKey ||
      Object.keys(historyNoteTranslationMap).find((template) =>
        normalizeKey(normalized).includes(normalizeKey(template)),
      )
    if (!fallbackKey) return note
    const translated = t(historyNoteTranslationMap[fallbackKey])
    return translated === historyNoteTranslationMap[fallbackKey] ? note : translated
  }

  const translateStatus = (status?: string | null) => {
    if (!status) return "-"
    const normalized = status.toLowerCase()
    const translated = t(`dashboard.status.${normalized}`)
    return translated === `dashboard.status.${normalized}` ? status : translated
  }

  const formatConfidence = (value?: number) => {
    if (typeof value !== "number") return null
    return fillTemplate(t("dashboard.confidenceShort"), { value: value.toString() })
  }

  return (
    <>
      <div className="min-h-screen bg-[#f2f2f2]">
        <Navigation />

        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-6xl">
            <h1 className="mb-2 text-center text-3xl font-bold text-gray-900">
              {t("diagnosis.title")}
            </h1>
            <p className="mb-8 text-center text-sm text-gray-500">
              {t("diagnosis.subtitle")}
            </p>

          {!user && (
            <Card className="mb-8 border border-emerald-100 bg-emerald-50/60">
              <CardHeader>
                <CardTitle>โหมดทดลองวิเคราะห์ (ผู้เยี่ยมชม)</CardTitle>
                <CardDescription>
                  ส่งภาพเพื่อดูผลวิเคราะห์ได้เลย แต่จะไม่บันทึกประวัติ หากต้องการเก็บประวัติและดูย้อนหลัง กรุณาสมัครสมาชิกหรือล็อกอิน
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-center">
                <Button asChild variant="outline" className="sm:w-auto">
                  <a href="/register">สมัครสมาชิก</a>
                </Button>
                <Button asChild className="sm:w-auto">
                  <a href="/login">เข้าสู่ระบบ</a>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 2-column top area */}
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Camera className="mr-2 h-5 w-5" />
                  {t("diagnosis.upload")}
                </CardTitle>
                <CardDescription>
                  {t("diagnosis.uploadHint")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="relative">
                    {selectedImage ? (
                      <div className="space-y-4">
                        <div className="relative rounded-lg border-2 border-green-300 bg-green-50 p-4">
                          <img
                            src={selectedImage || "/placeholder.svg"}
                            alt="Selected leaf"
                            className="mx-auto h-48 w-full rounded-lg object-cover"
                          />
                          <div className="absolute right-2 top-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setSelectedImage(null)}
                              className="bg-white/90 hover:bg-white"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-green-700">
                            ✓ {t("diagnosis.uploadSuccess")}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              document.getElementById("file-input")?.click()
                            }
                            className="mt-2"
                          >
                            Change Image
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-green-400"
                        onClick={() =>
                          document.getElementById("file-input")?.click()
                        }
                        onDragOver={(e) => {
                          e.preventDefault()
                          e.currentTarget.classList.add(
                            "border-green-400",
                            "bg-green-50",
                          )
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault()
                          e.currentTarget.classList.remove(
                            "border-green-400",
                            "bg-green-50",
                          )
                        }}
                        onDrop={(e) => {
                          e.preventDefault()
                          e.currentTarget.classList.remove(
                            "border-green-400",
                            "bg-green-50",
                          )
                          const files = e.dataTransfer.files
                          if (files.length > 0) {
                            const file = files[0]
                            if (file.type.startsWith("image/")) {
                              const reader = new FileReader()
                              reader.onload = (ev) => {
                                setSelectedImage(ev.target?.result as string)
                                setResult(null)
                                setScanError(null)
                              }
                              reader.readAsDataURL(file)
                            }
                          }
                        }}
                      >
                        <div className="space-y-4">
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-600">
                              Click to upload or drag and drop
                            </p>
                            <p className="mt-1 text-sm text-gray-400">
                              PNG, JPG up to 10MB
                            </p>
                          </div>
                          <Button variant="outline" className="mt-4">
                            <Camera className="mr-2 h-4 w-4" />
                            Select Image
                          </Button>
                        </div>
                      </div>
                    )}
                    <input
                      id="file-input"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>

                  {scanError && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                      {scanError}
                    </div>
                  )}
                  {persistenceWarning && (
                    <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-700">
                      {persistenceWarning}
                    </div>
                  )}

                  <div className="rounded-lg border border-dashed border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                    <p className="font-semibold">เคล็ดลับถ่ายภาพ</p>
                    <ul className="ml-4 list-disc space-y-1 pt-1 text-green-900">
                      <li>โฟกัสที่ใบให้คมชัด เห็นใบเต็มเฟรม</li>
                      <li>ใช้แสงสว่าง ไม่มีเงาบังหรือพื้นหลังรกรุงรัง</li>
                      <li>ถือกล้องนิ่ง ไม่สั่น ไม่เอียง เพื่อผลวิเคราะห์แม่นยำ</li>
                    </ul>
                  </div>

                  <Button
                    onClick={handleAnalyze}
                    disabled={!selectedImage || isAnalyzing}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="mr-2 h-4 w-4" />
                        {t("diagnosis.analyze")}
                      </>
                    )}
                  </Button>
                  {!user && (
                    <p className="text-xs text-gray-500">
                      {t("diagnosis.loginToSaveHint")}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            <Card>
              <CardHeader>
                <CardTitle>{t("diagnosis.result")}</CardTitle>
                <CardDescription>
                  {t("diagnosis.resultHint")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {result ? (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          {t("diagnosis.disease")}
                        </label>
                        <p className="text-lg font-semibold">
                          {result.disease} / {getThaiDiseaseName(result.disease)}
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          {t("diagnosis.severity")}
                        </label>
                        <div className="mt-1 flex items-center space-x-2">
                          <Badge
                            variant={getSeverityColor(result.severity)}
                            className="flex items-center space-x-1"
                          >
                            {getSeverityIcon(result.severity)}
                            <span>
                              {language === "th"
                                ? result.severityLocal ?? translateSeverity(result.severity) ?? result.severity
                                : translateSeverity(result.severity) ?? result.severity}
                            </span>
                          </Badge>
                        <span className="text-sm text-gray-500">
                            {formatConfidence(result.confidence) ?? "-"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        {t("diagnosis.recommendation")}
                      </label>
                      <div className="rounded-lg bg-blue-50 p-4">
                        <p className="mb-2 text-sm text-blue-800">
                          {result.recommendation}
                        </p>
                        <p className="text-sm text-blue-700">
                          {result.recommendationLocal}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
                      {user
                        ? "ผลลัพธ์นี้ถูกบันทึกลงในประวัติของคุณแล้ว"
                        : "โหมดผู้เยี่ยมชม: ผลลัพธ์นี้ไม่ถูกบันทึกในระบบ"}
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-gray-500">
                    <Brain className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                    <p>Upload an image and click analyze to see results</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* History section */}
          {user && (
            <Card className="mt-12">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HistoryIcon className="h-5 w-5" />
                  {t("diagnosis.historyTitle")}
                </CardTitle>
                <CardDescription>
                  {t("diagnosis.historyDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="flex items-center justify-center py-8 text-sm text-gray-500">
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-gray-500" />
                    กำลังโหลดข้อมูล...
                  </div>
                ) : historyError ? (
                  <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                    {historyError}
                  </div>
                ) : history.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-500">
                    ยังไม่มีประวัติการวิเคราะห์
                  </p>
                ) : (
                  <div className="space-y-4">
                    {history.map((scan) => {
                      const severitySource =
                        language === "th"
                          ? scan.severityLocal ?? scan.severity
                          : scan.severity ?? scan.severityLocal
                      const severityText =
                        translateSeverity(severitySource) ?? severitySource ?? scan.status
                      const labelFallback =
                        !scan.label && result && scan.status === "completed"
                          ? formatDiseaseLabel(result.disease)
                          : scan.label
                      const diagnosisText =
                        language === "th"
                          ? getThaiDiseaseName(labelFallback)
                          : labelFallback ?? getThaiDiseaseName(labelFallback)
                      const noteText =
                        translateHistoryNote(scan.notes ?? result?.recommendation) ??
                        scan.notes ??
                        result?.recommendation
                      const statusText = translateStatus(scan.status)
                      const timestampText = formatDateTime(scan.processedAt ?? scan.createdAt, {
                        locale: language === "en" ? "en-GB" : "th-TH",
                        fallback: "ไม่ทราบเวลา",
                      })

                      return (
                      <div
                        key={scan.id}
                        className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Clock className="h-4 w-4" />
                            <span>
                              {timestampText}
                            </span>
                          </div>
                          <p className="mt-2 text-base font-semibold">
                            {diagnosisText || "Pending analysis"}
                          </p>
                          {noteText && (
                            <p className="mt-1 text-sm text-gray-600">
                              {noteText}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={getSeverityColor(scan.severity)}>
                            {severityText ?? scan.status}
                          </Badge>
                          {formatConfidence(scan.confidence) && (
                            <span className="text-sm text-gray-500">
                              {formatConfidence(scan.confidence)}
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
                          >
                            {statusText}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-amber-700 hover:text-amber-800"
                            onClick={() => openReportDialog(scan.id)}
                          >
                            <Flag className="mr-1 h-4 w-4" />
                            รายงานปัญหา
                          </Button>
                        </div>
                      </div>
                    )})}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          </div>
        </div>
      </div>

      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>รายงานปัญหาการวิเคราะห์</DialogTitle>
            <DialogDescription>
              แจ้งปัญหาหรือผลลัพธ์ที่ไม่ถูกต้อง เพื่อให้ผู้ดูแลระบบตรวจสอบ
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="report-reason">รายละเอียด</Label>
            <Textarea
              id="report-reason"
              placeholder="เช่น ผลลัพธ์ไม่ตรงกับอาการ หรือระบบทำงานผิดพลาด"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              maxLength={400}
            />
            {reportError && (
              <div className="rounded-md bg-red-50 p-2 text-sm text-red-600">
                {reportError}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={submitReport} disabled={reportSubmitting}>
              {reportSubmitting ? "กำลังส่ง..." : "ส่งรายงาน"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function HistoryIcon({
  className,
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M3 12a9 9 0 1 0 9-9" />
      <path d="M3 4v4h4" />
      <path d="M12 7v5l3 3" />
    </svg>
  )
}
