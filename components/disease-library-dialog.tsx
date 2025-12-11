"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, BookOpenCheck, Loader2, Plus, RefreshCw } from "lucide-react"

import { useLanguage } from "@/components/language-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type DiseaseRecord = {
  id: string
  crop: "durian" | "sugarcane" | "rice"
  nameTh: string
  nameEn?: string
  pathogenType?: string
  overview?: string
  symptoms: string[]
  causes: string[]
  triggers: string[]
  prevention: string[]
  treatment: string[]
  severity: number
  spreadRisk: "low" | "medium" | "high"
  updatedAt?: string
  tags: string[]
  sources: Array<{ label: string; url: string }>
}

const cropOptions: Array<{ value: DiseaseRecord["crop"] | "all"; label: string }> = [
  { value: "all", label: "diseases.filters.all" },
  { value: "durian", label: "diseases.filters.durian" },
  { value: "sugarcane", label: "diseases.filters.sugarcane" },
  { value: "rice", label: "diseases.filters.rice" },
]

type DiseaseLibraryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  canManage: boolean
}

export function DiseaseLibraryDialog({ open, onOpenChange, canManage }: DiseaseLibraryDialogProps) {
  const { t } = useLanguage()
  const [records, setRecords] = useState<DiseaseRecord[]>([])
  const [crop, setCrop] = useState<"all" | DiseaseRecord["crop"]>("all")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formFields, setFormFields] = useState({
    crop: "durian" as "durian" | "sugarcane" | "rice",
    nameTh: "",
    nameEn: "",
    pathogenType: "",
    overview: "",
    severity: 3,
    spreadRisk: "medium" as "low" | "medium" | "high",
    symptoms: "",
    causes: "",
    treatment: "",
    prevention: "",
    triggers: "",
    tags: "",
    sources: "",
  })

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(handle)
  }, [search])

  const resetForm = () =>
    setFormFields({
      crop: "durian",
      nameTh: "",
      nameEn: "",
      pathogenType: "",
      overview: "",
      severity: 3,
      spreadRisk: "medium",
      symptoms: "",
      causes: "",
      treatment: "",
      prevention: "",
      triggers: "",
      tags: "",
      sources: "",
    })

  const severityTone = (score: number) => {
    if (score >= 4) return "bg-red-100 text-red-700 border-red-200"
    if (score >= 3) return "bg-amber-100 text-amber-800 border-amber-200"
    return "bg-emerald-100 text-emerald-700 border-emerald-200"
  }

  const spreadTone = useMemo(
    () => ({
      high: { label: t("diseases.spread.high"), className: "text-red-600" },
      medium: { label: t("diseases.spread.medium"), className: "text-amber-600" },
      low: { label: t("diseases.spread.low"), className: "text-emerald-600" },
    }),
    [t],
  )

  useEffect(() => {
    if (!canManage || !open) return
    let isCancelled = false

    const loadRecords = async () => {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (crop !== "all") {
        params.set("crop", crop)
      }
      if (debouncedSearch) {
        params.set("search", debouncedSearch)
      }

      try {
        const response = await fetch(`/api/diseases${params.toString() ? `?${params}` : ""}`, {
          cache: "no-store",
          credentials: "same-origin",
        })

        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload?.error ?? "Unable to load diseases")
        }

        if (!isCancelled) {
          setRecords(Array.isArray(payload?.data) ? payload.data : [])
        }
      } catch (fetchError) {
        console.error("Failed to load diseases", fetchError)
        if (!isCancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Unable to load diseases")
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    void loadRecords()

    return () => {
      isCancelled = true
    }
  }, [canManage, crop, debouncedSearch, open, refreshToken])

  const toList = (value: string) =>
    value
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter(Boolean)

  const parseTags = (value: string) =>
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)

  const parseSources = (value: string) =>
    value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [label, url] = line.split("|").map((part) => part.trim())
        return label && url ? { label, url } : null
      })
      .filter((entry): entry is { label: string; url: string } => Boolean(entry))

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)

    const symptoms = toList(formFields.symptoms)
    const causes = toList(formFields.causes)
    const treatment = toList(formFields.treatment)

    if (!formFields.nameTh || symptoms.length === 0 || causes.length === 0 || treatment.length === 0) {
      setSubmitError(t("diseases.form.missingRequired"))
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/diseases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          crop: formFields.crop,
          nameTh: formFields.nameTh,
          nameEn: formFields.nameEn || undefined,
          pathogenType: formFields.pathogenType || undefined,
          overview: formFields.overview || undefined,
          severity: formFields.severity,
          spreadRisk: formFields.spreadRisk,
          symptoms,
          causes,
          treatment,
          prevention: toList(formFields.prevention),
          triggers: toList(formFields.triggers),
          tags: parseTags(formFields.tags),
          sources: parseSources(formFields.sources),
        }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to create disease")
      }

      resetForm()
      setShowCreateForm(false)
      setRefreshToken((prev) => prev + 1)
    } catch (error) {
      console.error("Failed to create disease", error)
      setSubmitError(error instanceof Error ? error.message : t("diseases.form.genericError"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const cropLabel = (value: DiseaseRecord["crop"]) => {
    const option = cropOptions.find((item) => item.value === value)
    return option ? t(option.label) : value
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          setSearch("")
          setShowCreateForm(false)
          setSubmitError(null)
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader className="space-y-3">
          <DialogTitle>{t("diseases.title")}</DialogTitle>
          <DialogDescription>{t("diseases.subtitle")}</DialogDescription>
        </DialogHeader>

        {!canManage ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900">
            {t("diseases.accessDeniedDescription")}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex-1">
                <Label className="text-xs uppercase text-gray-500">{t("diseases.searchLabel")}</Label>
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("diseases.searchPlaceholder")}
                  className="mt-1"
                />
              </div>
              <div className="md:w-56">
                <Label className="text-xs uppercase text-gray-500">{t("diseases.cropLabel")}</Label>
                <Select value={crop} onValueChange={(value) => setCrop(value as typeof crop)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cropOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(option.label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setRefreshToken((prev) => prev + 1)}
                  disabled={loading}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  {t("common.refresh")}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowCreateForm((prev) => !prev)
                    setSubmitError(null)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t("diseases.addRecord")}
                </Button>
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <AlertTriangle className="mr-2 inline h-4 w-4" />
                {error}
              </div>
            )}

            {showCreateForm && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("diseases.form.title")}</CardTitle>
                  <CardDescription>{t("diseases.form.description")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{t("diseases.cropLabel")}</Label>
                        <Select
                          value={formFields.crop}
                          onValueChange={(value) =>
                            setFormFields((previous) => ({ ...previous, crop: value as typeof previous.crop }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {cropOptions
                              .filter((option) => option.value !== "all")
                              .map((option) => (
                                <SelectItem key={option.value} value={option.value as string}>
                                  {t(option.label)}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t("diseases.form.severity")}</Label>
                        <Input
                          type="number"
                          min={1}
                          max={5}
                          value={formFields.severity}
                          onChange={(event) =>
                            setFormFields((previous) => ({
                              ...previous,
                              severity: Number(event.target.value ?? 3),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("diseases.form.spreadRisk")}</Label>
                        <Select
                          value={formFields.spreadRisk}
                          onValueChange={(value) =>
                            setFormFields((previous) => ({ ...previous, spreadRisk: value as typeof previous.spreadRisk }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">{t("diseases.spread.low")}</SelectItem>
                            <SelectItem value="medium">{t("diseases.spread.medium")}</SelectItem>
                            <SelectItem value="high">{t("diseases.spread.high")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t("diseases.form.pathogenType")}</Label>
                        <Input
                          value={formFields.pathogenType}
                          onChange={(event) =>
                            setFormFields((previous) => ({ ...previous, pathogenType: event.target.value }))
                          }
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{t("diseases.form.nameTh")}</Label>
                        <Input
                          required
                          value={formFields.nameTh}
                          onChange={(event) =>
                            setFormFields((previous) => ({ ...previous, nameTh: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("diseases.form.nameEn")}</Label>
                        <Input
                          value={formFields.nameEn}
                          onChange={(event) =>
                            setFormFields((previous) => ({ ...previous, nameEn: event.target.value }))
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>{t("diseases.form.overview")}</Label>
                      <Textarea
                        value={formFields.overview}
                        onChange={(event) =>
                          setFormFields((previous) => ({ ...previous, overview: event.target.value }))
                        }
                        rows={3}
                      />
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{t("diseases.symptoms")}</Label>
                        <Textarea
                          value={formFields.symptoms}
                          onChange={(event) =>
                            setFormFields((previous) => ({ ...previous, symptoms: event.target.value }))
                          }
                          rows={4}
                          placeholder={t("diseases.form.listPlaceholder")}
                        />
                        <p className="text-xs text-gray-500">{t("diseases.form.listHelper")}</p>
                      </div>
                      <div className="space-y-2">
                        <Label>{t("diseases.causes")}</Label>
                        <Textarea
                          value={formFields.causes}
                          onChange={(event) =>
                            setFormFields((previous) => ({ ...previous, causes: event.target.value }))
                          }
                          rows={4}
                          placeholder={t("diseases.form.listPlaceholder")}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>{t("diseases.treatment")}</Label>
                      <Textarea
                        value={formFields.treatment}
                        onChange={(event) =>
                          setFormFields((previous) => ({ ...previous, treatment: event.target.value }))
                        }
                        rows={4}
                      />
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{t("diseases.prevention")}</Label>
                        <Textarea
                          value={formFields.prevention}
                          onChange={(event) =>
                            setFormFields((previous) => ({ ...previous, prevention: event.target.value }))
                          }
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("diseases.form.triggers")}</Label>
                        <Textarea
                          value={formFields.triggers}
                          onChange={(event) =>
                            setFormFields((previous) => ({ ...previous, triggers: event.target.value }))
                          }
                          rows={3}
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{t("diseases.form.tags")}</Label>
                        <Input
                          value={formFields.tags}
                          onChange={(event) =>
                            setFormFields((previous) => ({ ...previous, tags: event.target.value }))
                          }
                          placeholder="leaf spot, bacterial"
                        />
                        <p className="text-xs text-gray-500">{t("diseases.form.tagsHelper")}</p>
                      </div>
                      <div className="space-y-2">
                        <Label>{t("diseases.form.sources")}</Label>
                        <Textarea
                          value={formFields.sources}
                          onChange={(event) =>
                            setFormFields((previous) => ({ ...previous, sources: event.target.value }))
                          }
                          rows={3}
                          placeholder="DOA Thailand | https://example.go.th/article"
                        />
                        <p className="text-xs text-gray-500">{t("diseases.form.sourcesHelper")}</p>
                      </div>
                    </div>

                    {submitError && <p className="text-sm text-red-600">{submitError}</p>}

                    <DialogFooter className="flex flex-col justify-between gap-3 sm:flex-row">
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={isSubmitting}
                        onClick={() => {
                          setShowCreateForm(false)
                          resetForm()
                          setSubmitError(null)
                        }}
                      >
                        {t("common.cancel")}
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? t("common.loading") : t("diseases.form.submit")}
                      </Button>
                    </DialogFooter>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              {loading && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("diseases.loading")}
                </div>
              )}

              {!loading && records.length === 0 ? (
                <Card className="border border-gray-200">
                  <CardContent className="py-10 text-center text-sm text-gray-500">
                    {t("diseases.empty")}
                  </CardContent>
                </Card>
              ) : (
                records.map((record) => {
                  const spread = spreadTone[record.spreadRisk]
                  return (
                    <Card key={record.id}>
                      <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <CardTitle className="text-lg text-gray-900">{record.nameTh}</CardTitle>
                            {record.nameEn && (
                              <CardDescription className="text-sm text-gray-600">
                                {record.nameEn}
                              </CardDescription>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge className="bg-emerald-50 text-emerald-700">{cropLabel(record.crop)}</Badge>
                            <Badge className={`border ${severityTone(record.severity)}`}>
                              {t("diseases.severityLabel", { score: record.severity })}
                            </Badge>
                            <Badge variant="outline" className={spread.className}>
                              {spread.label}
                            </Badge>
                          </div>
                        </div>
                        {record.overview && (
                          <p className="mt-2 text-sm text-gray-600">{record.overview}</p>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {record.symptoms.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold text-gray-700">{t("diseases.symptoms")}</p>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                              {record.symptoms.map((entry) => (
                                <li key={entry}>{entry}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {record.causes.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold text-gray-700">{t("diseases.causes")}</p>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                              {record.causes.map((entry) => (
                                <li key={entry}>{entry}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {record.treatment.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold text-gray-700">{t("diseases.treatment")}</p>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                              {record.treatment.map((entry) => (
                                <li key={entry}>{entry}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {record.prevention.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold text-gray-700">{t("diseases.prevention")}</p>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                              {record.prevention.map((entry) => (
                                <li key={entry}>{entry}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {record.sources.length > 0 && (
                          <div className="flex flex-wrap gap-3 text-sm">
                            {record.sources.map((source) => (
                              <a
                                key={`${record.id}-${source.url}`}
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-emerald-700 underline hover:text-emerald-900"
                              >
                                <BookOpenCheck className="h-4 w-4" />
                                {source.label}
                              </a>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
