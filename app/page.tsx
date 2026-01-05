"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Zap, Smartphone, DollarSign } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

// ✅ ฟังก์ชันนับตัวเลขเคลื่อนไหว
function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0)
  const raf = useRef<number | null>(null)
  useEffect(() => {
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      setValue(Math.round(target * p))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [target, duration])
  return value
}

export default function HomePage() {
  const { t } = useLanguage()
  const totalDiag = useCountUp(10000)
  const accuracy = useCountUp(95)
  const diseases = useCountUp(50)

  return (
        <div className="relative min-h-screen text-white flex flex-col">
      {/* 🥬 พื้นหลัง */}
      <Image
        src="/rows of green leafy vegetables 2.jpg"
        alt="Vegetable background"
        fill
        priority
        className="object-cover -z-10"
      />
      <div className="absolute inset-0 bg-black/60 -z-10" />

      {/* 🌿 Navigation */}
      <Navigation />

      {/* 🏠 Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center px-4 pt-16 pb-6 text-center flex-grow sm:px-6 sm:pt-20 sm:pb-0">
        {/* โลโก้ใหญ่ขึ้นและชิดข้อความ */}
        <Image
          src="/logo.png"
          alt="AgriSense Logo"
          width={320}
          height={300}
          className="mb-3 h-auto w-full max-w-[240px] sm:max-w-[320px]"
          priority
        />

        <div className="mx-auto mb-8 max-w-xl space-y-2 text-center sm:max-w-2xl sm:space-y-3">
          <p className="text-xl font-semibold text-green-300 sm:text-2xl">
            {t("home.subtitle")}
          </p>
          <p className="whitespace-pre-line text-base leading-relaxed text-gray-100 sm:text-lg">
            {t("home.description")}
          </p>
        </div>

        <div className="cta-orbit mt-2 mb-10 w-full max-w-xs sm:mb-16 sm:w-auto">
          <Link href="/diagnosis">
            <Button className="w-full rounded-full bg-green-600 px-12 py-7 text-xl font-semibold text-white shadow-2xl ring-1 ring-white/30 transition-transform hover:scale-[1.03] hover:bg-green-700 focus-visible:scale-[1.03] sm:px-14 sm:py-8 sm:text-2xl">
              🌿 {t("home.start")} →
            </Button>
          </Link>
        </div>
      </section>

      {/* 🌱 Feature Cards */}
      <section className="relative z-10 -mt-4 mx-auto grid max-w-5xl gap-6 px-4 sm:-mt-6 sm:grid-cols-2 lg:grid-cols-3 mb-16 sm:mb-48">
        {[
          {
            icon: <Zap className="h-8 w-8 text-green-600" />,
            title: t("home.features.fast"),
            desc: t("home.features.fast.desc"),
          },
          {
            icon: <Smartphone className="h-8 w-8 text-green-600" />,
            title: t("home.features.remote"),
            desc: t("home.features.remote.desc"),
          },
          {
            icon: <DollarSign className="h-8 w-8 text-green-600" />,
            title: t("home.features.cost"),
            desc: t("home.features.cost.desc"),
          },
        ].map((item, index) => (
          <div
            key={index}
            className="
              rounded-2xl border border-black/10
              bg-white/95 backdrop-blur-sm
              p-6 text-center shadow-md text-gray-900 sm:p-8
            "
          >
            <div className="flex justify-center mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                {item.icon}
              </div>
            </div>
            <h3 className="mb-3 text-lg font-semibold text-gray-900 sm:text-xl">
              {item.title}
            </h3>
            <p className="text-sm text-gray-600 sm:text-base">{item.desc}</p>
          </div>
        ))}
      </section>

      {/* 🖤 Footer */}
      <footer className="relative z-10 bg-black/80 py-6 text-center text-gray-200">
        <p className="text-xs opacity-80 sm:text-sm">
          © 2025 AgriSense — Empowering Smart Farming with AI
        </p>
      </footer>
    </div>
  )
}
