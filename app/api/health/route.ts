import { NextResponse } from "next/server"

import { backend, backendProxyEnabled } from "@/lib/backend-client"

export async function GET() {
  if (backendProxyEnabled) {
    try {
      const backendHealth = await backend.health().catch((error) => {
        const message = error instanceof Error ? error.message : "Unknown backend error"
        throw new Error(message)
      })
      return NextResponse.json({
        ok: true,
        mode: "backend",
        backend: backendHealth ?? null,
      })
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          mode: "backend",
          error: error instanceof Error ? error.message : "Backend health failed",
        },
        { status: 502 },
      )
    }
  }

  return NextResponse.json({
    ok: true,
    mode: "local",
  })
}
