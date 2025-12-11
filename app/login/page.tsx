"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Leaf, Mail, Lock, Eye, EyeOff } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { useLanguage } from "@/components/language-provider"

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-white">Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  )
}

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isLoading } = useAuth()
  const { t } = useLanguage()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const hasRegistered = searchParams.get("registered") === "1"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!email || !password) return setError(t("auth.fillFieldsError"))
    const result = await login(email, password)
    if (result.success) {
      router.push(result.user.role === "admin" ? "/admin" : "/dashboard")
    } else {
      setError(result.message ?? t("auth.invalidError"))
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

      {/* Navbar ขาวทึบ (ชั้นบนสุด) */}
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
            <h1 className="text-2xl font-bold text-white drop-shadow">{t("auth.welcomeTitle")}</h1>
            <p className="mt-2 text-gray-200 drop-shadow">{t("auth.welcomeSubtitle")}</p>
          </div>

          <Card className="rounded-2xl bg-white/95 shadow-xl backdrop-blur-sm">
            <CardHeader>
              <CardTitle>{t("auth.loginTitle")}</CardTitle>
              <CardDescription>{t("auth.loginDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Password</label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && <div className="text-sm text-red-600">{error}</div>}
                {!error && hasRegistered && (
                  <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
                    {t("auth.accountCreated")}
                  </div>
                )}

                <Button className="w-full bg-green-600 hover:bg-green-700" disabled={isLoading} type="submit">
                  {isLoading ? t("auth.signingIn") : t("auth.signIn")}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  {t("auth.noAccount")}{" "}
                  <Link href="/register" className="font-medium text-green-600 hover:text-green-700">
                    {t("auth.signUpHere")}
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
