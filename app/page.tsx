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
      <section className="relative z-10 flex flex-col items-center justify-center px-6 pt-20 pb-0 text-center flex-grow">
        {/* โลโก้ใหญ่ขึ้นและชิดข้อความ */}
        <Image
          src="/logo.png"
          alt="AgriSense Logo"
          width={320}
          height={300}
          style={{ marginBottom: "12px" }}
          priority
        />

        <p className="mt-1 mb-1 text-2xl text-green-300 font-semibold">
          {t("home.subtitle")}
        </p>
        <p className="mb-8 max-w-2xl leading-relaxed text-gray-100">
          {t("home.description")}
        </p>

        <Link href="/diagnosis">
          <Button className="bg-green-600 hover:bg-green-700 text-white shadow-lg mt-2 mb-16 px-6 py-5 text-base font-semibold">
            🌿 {t("home.start")} →
          </Button>
        </Link>
      </section>

      {/* 🌱 Feature Cards */}
      <section className="relative z-10 -mt-6 mx-auto grid max-w-5xl gap-6 px-4 sm:grid-cols-3 mb-48">
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
              p-8 text-center shadow-md text-gray-900
            "
          >
            <div className="flex justify-center mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                {item.icon}
              </div>
            </div>
            <h3 className="mb-3 text-xl font-semibold text-gray-900">
              {item.title}
            </h3>
            <p className="text-gray-600">{item.desc}</p>
          </div>
        ))}
      </section>

      {/* 🖤 Footer */}
      <footer className="relative z-10 bg-black/80 py-6 text-center text-gray-200">
        <p className="text-sm opacity-80">
          © 2025 AgriSense — Empowering Smart Farming with AI
        </p>
      </footer>
    </div>
  )
}
