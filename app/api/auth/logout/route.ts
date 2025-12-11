import { NextResponse } from "next/server"

import { getExpiredSessionCookieOptions } from "@/lib/session"

export async function POST() {
  const response = NextResponse.json({ message: "Logout successful" })
  response.cookies.set(getExpiredSessionCookieOptions())
  return response
}
