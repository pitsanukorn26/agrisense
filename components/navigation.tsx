"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, BookOpen, Home, Info, Leaf, LogIn, Shield } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { useAuth } from "@/components/auth-provider"
import { useLanguage } from "@/components/language-provider"
import {
  ALERTS_READ_UPDATED_EVENT,
  ALERTS_PREF_UPDATED_EVENT,
  ALERTS_UPDATED_EVENT,
  getAlertPreference,
  getReadAlerts,
  getStoredAlerts,
  markAlertAsRead,
  type AlertReadMap,
  type StoredAlert,
} from "@/lib/alerts-storage"
import { formatDateTime } from "@/lib/date-format"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import clsx from "clsx"

function userInitials(name?: string, email?: string) {
  const source = name?.trim() || email || ""
  if (!source) return "?"
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Navigation() {
  const pathname = usePathname()
  const { language, setLanguage, t } = useLanguage()
  const { user, logout } = useAuth()
  const dateLocale = language === "en" ? "en-GB" : "th-TH"
  const [alerts, setAlerts] = useState<StoredAlert[]>([])
  const [readMap, setReadMap] = useState<AlertReadMap>({})
  const [alertsAllowed, setAlertsAllowed] = useState(true)
  const [isAlertPopoverOpen, setAlertPopoverOpen] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<StoredAlert | null>(null)

  const isActive = (href: string) => pathname === href

  const itemClass = (active: boolean) =>
    clsx(
      "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
      active
        ? "bg-white/20 text-white font-semibold"
        : "text-white hover:bg-white/10"
    )

  const readUserKey = useMemo(
    () => user?.id ?? user?.email ?? "anonymous",
    [user?.id, user?.email],
  )

  useEffect(() => {
    if (typeof window === "undefined") return

    const syncAlerts = () => setAlerts(getStoredAlerts())
    const syncRead = () => setReadMap(getReadAlerts(readUserKey))
    const syncPref = () => setAlertsAllowed(getAlertPreference(readUserKey).notifications)

    syncAlerts()
    syncRead()
    syncPref()

    const handleUpdate = () => syncAlerts()
    const handleReadUpdate = () => syncRead()
    const handlePrefUpdate = () => syncPref()

    window.addEventListener("storage", handleUpdate)
    window.addEventListener(ALERTS_UPDATED_EVENT, handleUpdate as EventListener)
    window.addEventListener(ALERTS_READ_UPDATED_EVENT, handleReadUpdate as EventListener)
    window.addEventListener(ALERTS_PREF_UPDATED_EVENT, handlePrefUpdate as EventListener)

    return () => {
      window.removeEventListener("storage", handleUpdate)
      window.removeEventListener(ALERTS_UPDATED_EVENT, handleUpdate as EventListener)
      window.removeEventListener(ALERTS_READ_UPDATED_EVENT, handleReadUpdate as EventListener)
      window.removeEventListener(ALERTS_PREF_UPDATED_EVENT, handlePrefUpdate as EventListener)
    }
  }, [readUserKey])

  const readAlertIds = useMemo(() => new Set(Object.keys(readMap)), [readMap])

  const unreadAlerts = useMemo(
    () => alerts.filter((alert) => !readAlertIds.has(alert.id)),
    [alerts, readAlertIds],
  )

  const readAlerts = useMemo(() => {
    return alerts
      .filter((alert) => readAlertIds.has(alert.id))
      .sort((a, b) => {
        const aTime = readMap[a.id] ? new Date(readMap[a.id]).getTime() : new Date(a.createdAt).getTime()
        const bTime = readMap[b.id] ? new Date(readMap[b.id]).getTime() : new Date(b.createdAt).getTime()
        return bTime - aTime
      })
  }, [alerts, readAlertIds, readMap])

  const unreadCount = unreadAlerts.length

  const openAlert = (alert: StoredAlert, shouldMarkRead = false) => {
    setAlertPopoverOpen(false)
    setSelectedAlert(alert)
    if (shouldMarkRead) {
      const timestamp = new Date().toISOString()
      markAlertAsRead(alert.id, readUserKey, timestamp)
      setReadMap((prev) => {
        if (prev[alert.id]) return prev
        return {
          ...prev,
          [alert.id]: timestamp,
        }
      })
    }
  }

  return (
    <>
    <nav className="sticky top-0 z-50 w-full bg-[#55AC68] shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* ซ้าย: โลโก้ + เมนู */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <Leaf className="h-6 w-6 text-white" />
            <span className="text-lg font-semibold text-white">AgriSense</span>
          </Link>

          {/* เมนู */}
          <div className="flex items-center gap-2">
            <Link href="/" className={itemClass(isActive("/"))}>
              <Home className="h-4 w-4" />
              <span>{t("nav.home")}</span>
            </Link>
            <Link href="/knowledge" className={itemClass(isActive("/knowledge"))}>
              <BookOpen className="h-4 w-4" />
              <span>{t("nav.knowledge")}</span>
          </Link>
          <Link href="/about" className={itemClass(isActive("/about"))}>
            <Info className="h-4 w-4" />
            <span>{t("nav.about")}</span>
          </Link>
            {user?.role === "admin" && (
              <Link href="/admin" className={itemClass(isActive("/admin"))}>
                <Shield className="h-4 w-4" />
                <span>{t("nav.admin")}</span>
              </Link>
            )}
          </div>
        </div>

        {/* ขวา: ปุ่มภาษา + Login/Register */}
        <div className="flex items-center gap-3">
          {/* ปุ่มภาษา */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLanguage("th")}
            className={clsx(
              "text-xs",
              language === "th"
                ? "bg-white text-green-700 font-semibold"
                : "bg-transparent border-white text-white hover:bg-white/20",
            )}
          >
            🇹🇭 ไทย
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLanguage("en")}
            className={clsx(
              "text-xs",
              language === "en"
                ? "bg-white text-green-700 font-semibold"
                : "bg-transparent border-white text-white hover:bg-white/20",
            )}
          >
            🇺🇸 EN
          </Button>

          {/* ปุ่ม Login + Register */}
          {!user ? (
            <>
              <Link href="/login">
                <Button
                  size="sm"
                  className="border-none text-[#333] font-semibold"
                  style={{ backgroundColor: "#CED7B8" }}
                >
                  <LogIn className="mr-1 h-4 w-4" />
                  {t("nav.login")}
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  size="sm"
                  className="border-none text-[#333] font-semibold"
                  style={{ backgroundColor: "#CED7B8" }}
                >
                  {t("nav.register")}
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Popover open={isAlertPopoverOpen} onOpenChange={setAlertPopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label={t("nav.alerts")}
                    className="relative rounded-full border border-white/60 p-2 text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <Bell className="h-4 w-4" />
                    {alertsAllowed && unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0">
                  <div className="border-b px-4 py-2">
                    <p className="text-sm font-semibold text-gray-900">{t("nav.alerts")}</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {!alertsAllowed ? (
                      <p className="px-4 py-6 text-sm text-gray-500">{t("nav.alertsDisabled")}</p>
                    ) : unreadAlerts.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-gray-500">{t("nav.alertsEmpty")}</p>
                    ) : (
                      unreadAlerts.slice(0, 5).map((alert) => (
                        <button
                          type="button"
                          key={alert.id}
                          onClick={() => openAlert(alert, true)}
                          className="w-full border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50"
                        >
                          <p className="text-sm font-semibold text-gray-900">{alert.title}</p>
                          <p className="text-xs text-gray-500">
                            {formatDateTime(alert.createdAt, {
                              locale: dateLocale,
                              fallback: "-",
                            })}
                          </p>
                        </button>
                      ))
                    )}
                    <div className="border-t px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {t("nav.alertsHistory")}
                    </div>
                    {readAlerts.length === 0 ? (
                      <p className="px-4 pb-4 text-sm text-gray-500">{t("nav.alertsHistoryEmpty")}</p>
                    ) : (
                      readAlerts.slice(0, 5).map((alert) => (
                        <button
                          type="button"
                          key={`history-${alert.id}`}
                          onClick={() => openAlert(alert)}
                          className="w-full border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50"
                        >
                          <p className="text-sm font-semibold text-gray-900">{alert.title}</p>
                          <p className="text-xs text-gray-500">
                            {formatDateTime(alert.createdAt, {
                              locale: dateLocale,
                              fallback: "-",
                            })}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <Link
                href="/dashboard"
                aria-label={t("dashboard.profile")}
                className="rounded-full outline-none ring-offset-2 transition-shadow focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-[#55AC68]"
              >
                <Avatar className="h-10 w-10 border-2 border-white bg-[#4A8F58]/30 text-sm font-semibold text-white hover:opacity-90">
                  {user?.avatarUrl && (
                    <AvatarImage
                      src={user.avatarUrl}
                      alt={user.name ? `${user.name} avatar` : "User avatar"}
                      className="object-cover"
                    />
                  )}
                  <AvatarFallback className="bg-[#CED7B8] text-[#2F5233] text-sm font-semibold">
                    {userInitials(user.name, user.email)}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="bg-white text-green-700 font-semibold"
              >
                {t("nav.logout")}
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
    <AlertPreviewDialog alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
    </>
  )
}

function AlertPreviewDialog({
  alert,
  onClose,
}: {
  alert: StoredAlert | null
  onClose: () => void
}) {
  const { t, language } = useLanguage()
  const locale = language === "en" ? "en-GB" : "th-TH"
  const formattedDate = useMemo(() => {
    if (!alert) return ""
    return formatDateTime(alert.createdAt, {
      locale,
      fallback: alert.createdAt,
    })
  }, [alert, locale])

  return (
    <Dialog
      open={Boolean(alert)}
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        {alert && (
          <>
            <DialogHeader>
              <DialogTitle>{alert.title}</DialogTitle>
              <DialogDescription className="text-xs uppercase tracking-wide text-gray-500">
                {t("nav.alertsDetail.published")}: {formattedDate}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-700 whitespace-pre-line">{alert.content}</p>
              {alert.image && (
                <img
                  src={alert.image}
                  alt={alert.title}
                  className="w-full rounded-md object-cover"
                />
              )}
              <Button type="button" className="w-full" onClick={onClose}>
                {t("common.close")}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
