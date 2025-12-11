"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"

interface User {
  id: string
  name?: string
  email: string
  role: "farmer" | "expert" | "admin"
  organization?: string
  plan: "free" | "pro" | "enterprise"
  avatarUrl?: string
  createdAt?: string
  updatedAt?: string
}

type AuthSuccess = {
  success: true
  user: User
}

type AuthFailure = {
  success: false
  message?: string
}

type AuthResult = AuthSuccess | AuthFailure

function normalizeUser(next?: User | null): User | null {
  if (!next) return null
  return {
    ...next,
    plan: next.plan ?? "free",
  }
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<AuthResult>
  register: (
    name: string,
    email: string,
    password: string,
    organization?: string,
  ) => Promise<AuthResult>
  logout: () => void
  refreshUser: (user: User) => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const bootstrapSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      })

      if (!response.ok) {
        setUser(null)
        return
      }

      const payload = await response.json().catch(() => ({}))
      const nextUser = payload?.data as User | undefined
      setUser(normalizeUser(nextUser ?? null))
    } catch (error) {
      console.error("Failed to load session", error)
      setUser(null)
    }
  }, [])

  useEffect(() => {
    let active = true

    ;(async () => {
      await bootstrapSession()
      if (active) {
        setIsLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [bootstrapSession])

  const login = async (email: string, password: string): Promise<AuthResult> => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        return {
          success: false,
          message: data?.error ?? "Unable to login",
        }
      }

      const rawUser = data?.data as User | undefined
      if (!rawUser?.id) {
        return {
          success: false,
          message: "Invalid session payload",
        }
      }

      const nextUser = normalizeUser(rawUser)!
      setUser(nextUser)

      return {
        success: true,
        user: nextUser,
      }
    } catch (error) {
      console.error("Login failed", error)
      return {
        success: false,
        message: "Network error",
      }
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (
    name: string,
    email: string,
    password: string,
    organization?: string,
  ): Promise<AuthResult> => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          name,
          email,
          password,
          organization,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        return {
          success: false,
          message: data?.error ?? "Unable to register",
        }
      }

      const nextUser = data?.data as User

      return {
        success: true,
        user: nextUser,
      }
    } catch (error) {
      console.error("Registration failed", error)
      return {
        success: false,
        message: "Network error",
      }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    void fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    }).catch((error) => {
      console.error("Logout failed", error)
    })
  }

  const refreshUser = (next: User) => {
    setUser(normalizeUser(next))
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, refreshUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
