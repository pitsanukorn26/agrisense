"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, CheckCircle, Loader2, ServerCrash, Shield, Activity } from "lucide-react"

type Status = "idle" | "loading" | "ok" | "error"

type ProbeResult = {
  status: Status
  message: string
  details?: string
}

export default function DebugPage() {
  const [health, setHealth] = useState<ProbeResult>({ status: "idle", message: "ยังไม่ได้ทดสอบ" })
  const [history, setHistory] = useState<ProbeResult>({ status: "idle", message: "ยังไม่ได้ทดสอบ" })

  useEffect(() => {
    probeHealth()
    probeHistory()
  }, [])

  const probeHealth = async () => {
    setHealth({ status: "loading", message: "กำลังตรวจสอบ..." })
    try {
      const res = await fetch("/api/health", { cache: "no-store" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || `สถานะ ${res.status}`)
      }
      const mode = json?.mode === "backend" ? "ผ่าน backend" : "โหมดโลคัล"
      setHealth({ status: "ok", message: `สุขภาพ OK (${mode})`, details: JSON.stringify(json) })
    } catch (error) {
      setHealth({
        status: "error",
        message: "ตรวจสอบสุขภาพไม่สำเร็จ",
        details: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const probeHistory = async () => {
    setHistory({ status: "loading", message: "กำลังดึงตัวอย่างประวัติ..." })
    try {
      const res = await fetch("/api/scans?limit=1", { cache: "no-store" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json?.error || `สถานะ ${res.status}`)
      }
      setHistory({
        status: "ok",
        message: "ดึงประวัติสำเร็จ",
        details: `records=${Array.isArray(json?.data) ? json.data.length : 0}`,
      })
    } catch (error) {
      setHistory({
        status: "error",
        message: "โหลดประวัติไม่สำเร็จ",
        details: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const renderProbe = (title: string, probe: ProbeResult) => {
    const icon =
      probe.status === "loading" ? (
        <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
      ) : probe.status === "ok" ? (
        <CheckCircle className="h-5 w-5 text-green-600" />
      ) : probe.status === "error" ? (
        <AlertTriangle className="h-5 w-5 text-red-600" />
      ) : (
        <Activity className="h-5 w-5 text-gray-400" />
      )

    const bg =
      probe.status === "ok"
        ? "bg-green-50 border-green-200"
        : probe.status === "error"
          ? "bg-red-50 border-red-200"
          : "bg-gray-50 border-gray-200"

    return (
      <div className={`rounded-lg border p-4 ${bg}`}>
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-sm text-gray-700">{probe.message}</p>
            {probe.details && (
              <pre className="mt-2 overflow-x-auto rounded bg-white/60 p-2 text-xs text-gray-600">
                {probe.details}
              </pre>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 flex items-center gap-2">
          <Shield className="h-6 w-6 text-emerald-600" />
          <h1 className="text-2xl font-bold text-gray-900">Debug / Health</h1>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {renderProbe("สุขภาพ API", health)}
          {renderProbe("ดึงประวัติสแกน", history)}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700"
            onClick={probeHealth}
          >
            รีเฟรชสุขภาพ
          </button>
          <button
            className="rounded-md bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm ring-1 ring-emerald-200 hover:bg-emerald-100"
            onClick={probeHistory}
          >
            ทดสอบโหลดประวัติ
          </button>
        </div>

        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
          <p className="font-semibold text-gray-900">คำอธิบาย</p>
          <ul className="list-disc space-y-1 pl-5 pt-2">
            <li>“สุขภาพ API” จะเรียก /api/health เพื่อตรวจว่าใช้ backend proxy หรือโหมดโลคัล</li>
            <li>“ดึงประวัติสแกน” จะเรียก /api/scans?limit=1 เพื่อตรวจเส้นทางประวัติ</li>
            <li>ถ้า backend ไม่ตั้งค่า BACKEND_API_URL หรือ backend ล้ม จะขึ้นสถานะ error พร้อมข้อความ</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
