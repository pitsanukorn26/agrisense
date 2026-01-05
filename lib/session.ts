import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"

type SessionPayload = {
  sub: string
  email: string
  role: "farmer" | "expert" | "admin"
  iat: number
  nonce?: string
  name?: string
  organization?: string
  plan?: "free" | "pro" | "enterprise"
  avatarUrl?: string
  createdAt?: string
  updatedAt?: string
}

const SESSION_SECRET =
  process.env.AUTH_SESSION_SECRET ??
  process.env.NEXTAUTH_SECRET ??
  process.env.AUTH_SECRET ??
  "agrisense-dev-secret"

export const SESSION_COOKIE_NAME = process.env.AUTH_SESSION_COOKIE ?? "agrisense-session"

const SESSION_TTL_RAW = process.env.AUTH_SESSION_TTL_SECONDS
const SESSION_TTL_INPUT = SESSION_TTL_RAW ? Number.parseInt(SESSION_TTL_RAW, 10) : NaN

export const SESSION_MAX_AGE_SECONDS =
  Number.isNaN(SESSION_TTL_INPUT) || SESSION_TTL_INPUT <= 0
    ? null
    : Math.max(300, SESSION_TTL_INPUT)

const isSecureEnv = process.env.NODE_ENV === "production"

function base64UrlEncode(data: string) {
  return Buffer.from(data).toString("base64url")
}

function base64UrlDecode(data: string) {
  return Buffer.from(data, "base64url").toString("utf8")
}

function sign(input: string) {
  return createHmac("sha256", SESSION_SECRET).update(input).digest("base64url")
}

function parseCookieHeader(header: string | null) {
  if (!header) return {}
  return header.split(";").reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rawValue] = part.split("=")
    if (!rawKey) return acc
    const key = rawKey.trim()
    if (!key) return acc
    acc[key] = decodeURIComponent(rawValue.join("=").trim())
    return acc
  }, {})
}

export function getSessionCookieOptions(token: string) {
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isSecureEnv,
    path: "/",
    ...(SESSION_MAX_AGE_SECONDS ? { maxAge: SESSION_MAX_AGE_SECONDS } : {}),
  }
}

export function getExpiredSessionCookieOptions() {
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isSecureEnv,
    path: "/",
    maxAge: 0,
  }
}

export function signSessionToken(payload: SessionPayload) {
  const body = JSON.stringify({
    ...payload,
    nonce: payload.nonce ?? randomBytes(6).toString("hex"),
  })
  const encoded = base64UrlEncode(body)
  const signature = sign(encoded)
  return `${encoded}.${signature}`
}

export function verifySessionToken(token: string | null | undefined): SessionPayload | null {
  if (!token) return null
  const [encoded, signature] = token.split(".")
  if (!encoded || !signature) return null
  const expected = sign(encoded)
  const sigBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (sigBuffer.length !== expectedBuffer.length) {
    return null
  }
  if (!timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as SessionPayload
    if (!payload?.sub || !payload?.role) {
      return null
    }
    return payload
  } catch {
    return null
  }
}

export function getSessionFromRequest(request: Request) {
  const header = request.headers.get("authorization")
  if (header?.toLowerCase().startsWith("bearer ")) {
    const token = header.slice(7).trim()
    const session = verifySessionToken(token)
    if (session) {
      return session
    }
  }

  const cookies = parseCookieHeader(request.headers.get("cookie"))
  const cookieToken = cookies[SESSION_COOKIE_NAME]
  return verifySessionToken(cookieToken)
}
