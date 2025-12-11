
export type StoredAlert = {
  id: string
  title: string
  content: string
  image?: string | null
  createdAt: string
}

export const ALERTS_STORAGE_KEY = "agrisense-alert-feed"
export const ALERTS_UPDATED_EVENT = "agrisense-alerts-updated"
export const ALERTS_READ_STORAGE_KEY = "agrisense-alerts-read"
export const ALERTS_READ_UPDATED_EVENT = "agrisense-alerts-read-updated"
export const ALERTS_PREF_STORAGE_KEY = "agrisense-alert-prefs"
export const ALERTS_PREF_UPDATED_EVENT = "agrisense-alert-prefs-updated"

export type AlertReadMap = Record<string, string>

type AlertReadStore = Record<string, AlertReadMap>
type AlertPreferenceStore = Record<
  string,
  {
    notifications: boolean
  }
>

const DEFAULT_READ_USER = "anonymous"

function getReadStore(): AlertReadStore {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(ALERTS_READ_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const values = Object.values(parsed)
      const isLegacyFormat =
        values.length > 0 && values.every((value) => typeof value === "string")
      if (isLegacyFormat) {
        // Legacy data stored without per-user partition; migrate into anonymous bucket.
        const store = { [DEFAULT_READ_USER]: parsed as AlertReadMap }
        persistReadStore(store)
        return store
      }
      return parsed as AlertReadStore
    }
    return {}
  } catch (error) {
    console.error("Failed to parse read alerts store", error)
    return {}
  }
}

function persistReadStore(store: AlertReadStore) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(ALERTS_READ_STORAGE_KEY, JSON.stringify(store))
}

function getPreferenceStore(): AlertPreferenceStore {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(ALERTS_PREF_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as AlertPreferenceStore
    }
    return {}
  } catch (error) {
    console.error("Failed to parse alert preferences store", error)
    return {}
  }
}

function persistPreferenceStore(store: AlertPreferenceStore) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(ALERTS_PREF_STORAGE_KEY, JSON.stringify(store))
}

export function getAlertPreference(userKey: string = DEFAULT_READ_USER) {
  const store = getPreferenceStore()
  return store[userKey] ?? { notifications: true }
}

export function setAlertPreference(userKey: string, preference: { notifications: boolean }) {
  if (typeof window === "undefined") return
  const store = getPreferenceStore()
  store[userKey] = preference
  persistPreferenceStore(store)
  window.dispatchEvent(new CustomEvent(ALERTS_PREF_UPDATED_EVENT))
}

export function getStoredAlerts(): StoredAlert[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(ALERTS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed as StoredAlert[]
    }
    return []
  } catch (error) {
    console.error("Failed to parse stored alerts", error)
    return []
  }
}

export function addStoredAlert(alert: StoredAlert) {
  if (typeof window === "undefined") return
  const alerts = getStoredAlerts()
  const next = [alert, ...alerts].slice(0, 50)
  window.localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent(ALERTS_UPDATED_EVENT))
}

export function removeStoredAlert(alertId: string) {
  if (typeof window === "undefined") return
  const alerts = getStoredAlerts()
  const next = alerts.filter((alert) => alert.id !== alertId)
  window.localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent(ALERTS_UPDATED_EVENT))
  clearReadFlag(alertId)
}

export function getReadAlerts(userKey: string = DEFAULT_READ_USER): AlertReadMap {
  const store = getReadStore()
  return store[userKey] ?? {}
}

export function markAlertAsRead(alertId: string, userKey: string = DEFAULT_READ_USER, timestamp?: string) {
  if (typeof window === "undefined") return
  const store = getReadStore()
  const userMap = store[userKey] ?? {}
  if (userMap[alertId]) return
  userMap[alertId] = timestamp ?? new Date().toISOString()
  store[userKey] = userMap
  persistReadStore(store)
  window.dispatchEvent(new CustomEvent(ALERTS_READ_UPDATED_EVENT))
}

function clearReadFlag(alertId: string) {
  if (typeof window === "undefined") return
  const store = getReadStore()
  let updated = false
  Object.keys(store).forEach((userKey) => {
    if (store[userKey]?.[alertId]) {
      delete store[userKey][alertId]
      updated = true
    }
  })
  if (!updated) return
  persistReadStore(store)
  window.dispatchEvent(new CustomEvent(ALERTS_READ_UPDATED_EVENT))
}
