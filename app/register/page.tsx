"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Leaf, Mail, Lock, Eye, EyeOff, User } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { useLanguage } from "@/components/language-provider"

export default function RegisterPage() {
  const router = useRouter()
  const { register, isLoading } = useAuth()
  const { t } = useLanguage()

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState("")

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!form.name || !form.email || !form.password || !form.confirmPassword)
      return setError(t("auth.fillFieldsError"))
    if (form.password !== form.confirmPassword)
      return setError(t("auth.passwordMismatch"))
    if (form.password.length < 6)
      return setError(t("auth.passwordTooShort"))

    const result = await register(form.name, form.email, form.password)
    if (result.success) {
      router.push("/login?registered=1")
    } else {
      setError(result.message ?? t("auth.registerFailed"))
    }
  }

  return (
    <div className="relative min-h-screen">
      {/* BG image + overlay (ชั้นล่างสุด) */}
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: "url('/rice-bg.jpg')" }}
      />
      <div className="absolute inset-0 -z-10 bg-black/45" />

      {/* Navbar ขาวทึบ */}
      <div className="relative z-[999]">
        <Navigation />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-green-100 p-3">
                <Leaf className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white drop-shadow">{t("auth.registerTitle")}</h1>
            <p className="mt-2 text-gray-200 drop-shadow">{t("auth.registerSubtitle")}</p>
          </div>

          <Card className="rounded-2xl bg-white/95 shadow-xl backdrop-blur-sm">
            <CardHeader>
              <CardTitle>{t("auth.registerCardTitle")}</CardTitle>
              <CardDescription>{t("auth.registerCardDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-4">
                {/* Username */}
                <div>
                  <label className="text-sm font-medium text-gray-700">{t("auth.fullNameLabel")}</label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      name="name"
                      value={form.name}
                      onChange={onChange}
                      className="pl-10"
                      placeholder={t("auth.fullNamePlaceholder")}
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="text-sm font-medium text-gray-700">{t("auth.emailLabel")}</label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={onChange}
                      className="pl-10"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="text-sm font-medium text-gray-700">{t("auth.passwordLabel")}</label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type={showPass ? "text" : "password"}
                      name="password"
                      value={form.password}
                      onChange={onChange}
                      className="pl-10 pr-10"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="text-sm font-medium text-gray-700">{t("auth.confirmPasswordLabel")}</label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type={showConfirm ? "text" : "password"}
                      name="confirmPassword"
                      value={form.confirmPassword}
                      onChange={onChange}
                      className="pl-10 pr-10"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && <div className="text-sm text-red-600">{error}</div>}

                <Button className="w-full bg-green-600 hover:bg-green-700" disabled={isLoading} type="submit">
                  {isLoading ? t("auth.registering") : t("auth.registerButton")}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  {t("auth.haveAccount")}{" "}
                  <Link href="/login" className="font-medium text-green-600 hover:text-green-700">
                    {t("auth.signInHere")}
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
