export type FormatDateTimeConfig = {
  locale?: string
  options?: Intl.DateTimeFormatOptions
  fallback?: string
}

const DEFAULT_LOCALE = "th-TH"

const DEFAULT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
}

const resolveLocale = (locale?: string) => {
  const baseLocale =
    locale || (typeof navigator !== "undefined" ? navigator.language : DEFAULT_LOCALE)
  const lowered = baseLocale.toLowerCase()
  if (lowered.includes("th")) {
    // Force Gregorian calendar and Arabic numerals for Thai locale to avoid Buddhist year offsets.
    return `${baseLocale}-u-nu-latn-ca-gregory`
  }
  if (lowered.includes("ca-gregory")) {
    return baseLocale
  }
  return baseLocale
}

export const formatDateTime = (
  value?: string | number | Date | null,
  config?: FormatDateTimeConfig,
) => {
  const fallback = config?.fallback ?? "-"
  if (value === null || value === undefined) return fallback

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return fallback

  const locale = resolveLocale(config?.locale)
  const baseOptions = config?.options ? { ...config.options } : { ...DEFAULT_OPTIONS }

  const options: Intl.DateTimeFormatOptions = {
    ...baseOptions,
    hour12: baseOptions.hour12 ?? false,
    timeZone: baseOptions.timeZone ?? "Asia/Bangkok",
    numberingSystem: baseOptions.numberingSystem ?? "latn",
    calendar: "gregory",
  }

  return new Intl.DateTimeFormat(locale, options).format(date)
}
