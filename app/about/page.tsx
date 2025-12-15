// app/about/page.tsx
"use client"

import { Navigation } from "@/components/navigation"
import { useLanguage } from "@/components/language-provider"
import { Card, CardContent } from "@/components/ui/card"
import React from "react"

export default function AboutPage() {
  const { t } = useLanguage()

  // translate with fallback: if t(...) returns empty or just the key, use fallback text
  const tf = (key: string, fallback: string) => {
    const v = t(key)
    return !v || v === key ? fallback : v
  }

  // helper to swap to placeholder if image missing
  const onImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    if (img.src.endsWith("/images/placeholder-avatar.png")) return
    img.src = "/images/placeholder-avatar.png"
  }

  return (
    <>
      <Navigation />

      <main className="min-h-screen bg-[#f2f2f2]">
        <div className="mx-auto max-w-5xl px-4 py-10">
          {/* What is Agrisense */}
          <section>
            <h1 className="mb-4 text-2xl font-bold tracking-tight">
              {tf("about.title", "What is Agrisense")}
            </h1>

            <div className="rounded-2xl border border-gray-300 bg-emerald-50/60 p-6 shadow-sm">
              <p className="text-gray-800">
                {tf(
                  "about.p1",
                  "Agrisense is an AI-powered platform designed to help farmers and plant lovers diagnose plant diseases quickly and accurately using image analysis."
                )}
              </p>

              <p className="mt-4 text-gray-800">
                {tf(
                  "about.p2",
                  "By simply uploading a photo, users can receive insights, care tips, and preventive measures to keep their crops healthy — anytime, anywhere."
                )}
              </p>

              <p className="mt-4 text-gray-800">
                {tf(
                  "about.p3",
                  "Our mission is to empower sustainable agriculture through intelligent technology, making plant health management easy, accessible, and efficient for everyone."
                )}
              </p>
            </div>

            <div className="my-6 border-t border-gray-300" />
          </section>

          {/* Our team */}
          <section>
            <h2 className="mb-6 text-2xl font-semibold tracking-tight">
              {tf("about.team", "Our team")}
            </h2>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* member 1 */}
              <Card className="overflow-hidden border-none bg-transparent shadow-none">
                <CardContent className="flex flex-col items-center p-0">
                  <img
                    src="/images/team/pitsanukorn.jpg"
                    alt="Pitsanukorn malaipia"
                    onError={onImgError}
                    className="h-36 w-36 rounded-full object-cover ring-1 ring-gray-300"
                  />
                  <p className="mt-3 text-center text-sm font-medium text-gray-800">
                    Pitsanukorn malaipia
                  </p>
                </CardContent>
              </Card>

              {/* member 2 */}
              <Card className="overflow-hidden border-none bg-transparent shadow-none">
                <CardContent className="flex flex-col items-center p-0">
                  <img
                    src="/images/team/boonyaporn.jpg"
                    alt="Boonyaporn Sukhanon"
                    onError={onImgError}
                    className="h-36 w-36 rounded-full object-cover ring-1 ring-gray-300"
                  />
                  <p className="mt-3 text-center text-sm font-medium text-gray-800">
                    Boonyaporn Sukhanon
                  </p>
                </CardContent>
              </Card>

              {/* member 3 */}
              <Card className="overflow-hidden border-none bg-transparent shadow-none">
                <CardContent className="flex flex-col items-center p-0">
                  <img
                    src="/images/team/phuwadol.jpg"
                    alt="Phuwadol Benjagunrat"
                    onError={onImgError}
                    className="h-36 w-36 rounded-full object-cover ring-1 ring-gray-300"
                  />
                  <p className="mt-3 text-center text-sm font-medium text-gray-800">
                    Phuwadol Benjagunrat
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}
