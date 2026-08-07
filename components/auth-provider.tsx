"use client"

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { onIdTokenChanged, signInWithEmailAndPassword, type User as FirebaseUser } from "firebase/auth"
import {
  auth,
  registerWithEmail,
  loginWithGoogle,
  handleGoogleRedirect,
  logout as fbLogout,
} from "../lib/firebase"

export type AppRole = "user" | "admin"

export interface AppUser {
  uid: string
  email: string
  displayName?: string | null
  photoURL?: string | null
  role: AppRole
  idToken?: string
}

export type PendingAdminOtp = {
  challengeId: string
  method: "email" | "sms"
  maskedDestination: string
  expiresInSeconds?: number
}

type SessionResult =
  | { requiresOtp: false; user: AppUser }
  | { requiresOtp: true; pending: PendingAdminOtp }

export type AdminLoginResult = {
  success: boolean
  requiresOtp?: boolean
  error?: string
}

interface AuthContextType {
  user: AppUser | null
  isLoading: boolean
  login: (email: string, password: string, requiredRole?: AppRole) => Promise<boolean>
  adminLogin: (email: string, password: string) => Promise<AdminLoginResult>
  verifyAdminOtp: (otp: string) => Promise<AdminLoginResult>
  resendAdminOtp: () => Promise<AdminLoginResult>
  pendingAdminOtp: PendingAdminOtp | null
  loginWithGoogleProvider: () => Promise<{ success: boolean; error?: any }>
  register: (name: string, email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
  isCheckingRedirect: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function firebaseToAppUser(fbUser: FirebaseUser, idToken: string, role: AppRole): AppUser {
  return {
    uid: fbUser.uid,
    email: fbUser.email ?? "",
    displayName: fbUser.displayName,
    photoURL: fbUser.photoURL,
    role,
    idToken,
  }
}

async function requestServerSession(fbUser: FirebaseUser, forceRefresh = false): Promise<SessionResult> {
  const idToken = await fbUser.getIdToken(forceRefresh)
  const response = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: idToken }),
    cache: "no-store",
    credentials: "include",
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || "Impossibile creare la sessione autenticata")
  }

  if (data.requiresOtp) {
    return {
      requiresOtp: true,
      pending: {
        challengeId: String(data.challengeId || ""),
        method: data.method === "sms" ? "sms" : "email",
        maskedDestination: String(data.maskedDestination || ""),
        expiresInSeconds: Number(data.expiresInSeconds || 600),
      },
    }
  }

  const role: AppRole = data.role === "admin" ? "admin" : "user"
  return { requiresOtp: false, user: firebaseToAppUser(fbUser, idToken, role) }
}

async function clearServerSession() {
  await fetch("/api/session", {
    method: "DELETE",
    cache: "no-store",
    credentials: "include",
  }).catch(() => undefined)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [pendingAdminOtp, setPendingAdminOtp] = useState<PendingAdminOtp | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCheckingRedirect, setIsCheckingRedirect] = useState(true)
  const hasCheckedRedirectRef = useRef(false)
  const explicitLoginRef = useRef(false)

  useEffect(() => {
    if (hasCheckedRedirectRef.current) return
    hasCheckedRedirectRef.current = true

    const checkRedirect = async () => {
      try {
        const fbUser = await handleGoogleRedirect()
        if (fbUser) {
          const result = await requestServerSession(fbUser, true)
          if (result.requiresOtp) {
            setPendingAdminOtp(result.pending)
            setUser(null)
          } else {
            setUser(result.user)
            setPendingAdminOtp(null)
          }
          sessionStorage.removeItem("google_auth_error")
        }
      } catch (error: any) {
        console.error("[auth] Google redirect error", error)
        if (error?.code) sessionStorage.setItem("google_auth_error", error.code)
      } finally {
        setIsCheckingRedirect(false)
      }
    }

    checkRedirect()
  }, [])

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (fbUser) => {
      if (explicitLoginRef.current) return

      try {
        if (!fbUser) {
          setUser(null)
          setPendingAdminOtp(null)
          return
        }

        const result = await requestServerSession(fbUser, false)
        if (result.requiresOtp) {
          setPendingAdminOtp(result.pending)
          setUser(null)
        } else {
          setUser(result.user)
          setPendingAdminOtp(null)
        }
      } catch (error) {
        console.error("[auth] Token/session synchronization failed", error)
        setUser(null)
        setPendingAdminOtp(null)
        await fbLogout().catch(() => undefined)
        await clearServerSession()
      } finally {
        setIsLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const refreshToken = async () => {
    if (!auth.currentUser) return
    const result = await requestServerSession(auth.currentUser, true)
    if (result.requiresOtp) {
      setPendingAdminOtp(result.pending)
      setUser(null)
    } else {
      setUser(result.user)
      setPendingAdminOtp(null)
    }
  }

  const adminLogin = async (email: string, password: string): Promise<AdminLoginResult> => {
    explicitLoginRef.current = true
    setIsLoading(true)
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password)
      const result = await requestServerSession(credential.user, true)

      if (result.requiresOtp) {
        setPendingAdminOtp(result.pending)
        setUser(null)
        return { success: true, requiresOtp: true }
      }

      if (result.user.role !== "admin") {
        await clearServerSession()
        await fbLogout()
        setUser(null)
        return { success: false, error: "L’account non dispone dei privilegi amministratore" }
      }

      setPendingAdminOtp(null)
      setUser(result.user)
      return { success: true, requiresOtp: false }
    } catch (error) {
      console.error("[auth] Admin login failed", error)
      await clearServerSession()
      await fbLogout().catch(() => undefined)
      setPendingAdminOtp(null)
      setUser(null)
      return { success: false, error: error instanceof Error ? error.message : "Accesso non riuscito" }
    } finally {
      explicitLoginRef.current = false
      setIsLoading(false)
    }
  }

  const verifyAdminOtp = async (otp: string): Promise<AdminLoginResult> => {
    const fbUser = auth.currentUser
    if (!fbUser || !pendingAdminOtp) return { success: false, error: "Richiesta OTP non disponibile" }

    setIsLoading(true)
    try {
      const token = await fbUser.getIdToken(true)
      const response = await fetch("/api/session/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ token, challengeId: pendingAdminOtp.challengeId, otp }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Codice OTP non valido")

      const refreshedToken = await fbUser.getIdToken(true)
      setUser(firebaseToAppUser(fbUser, refreshedToken, "admin"))
      setPendingAdminOtp(null)
      return { success: true, requiresOtp: false }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Codice OTP non valido" }
    } finally {
      setIsLoading(false)
    }
  }

  const resendAdminOtp = async (): Promise<AdminLoginResult> => {
    const fbUser = auth.currentUser
    if (!fbUser) return { success: false, error: "Accedi nuovamente con email e password" }

    setIsLoading(true)
    try {
      const result = await requestServerSession(fbUser, true)
      if (!result.requiresOtp) {
        setUser(result.user)
        setPendingAdminOtp(null)
        return { success: true, requiresOtp: false }
      }
      setPendingAdminOtp(result.pending)
      return { success: true, requiresOtp: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Invio OTP non riuscito" }
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string, requiredRole?: AppRole): Promise<boolean> => {
    explicitLoginRef.current = true
    setIsLoading(true)
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password)
      const result = await requestServerSession(credential.user, true)
      if (result.requiresOtp) {
        setPendingAdminOtp(result.pending)
        setUser(null)
        return false
      }

      if (requiredRole && result.user.role !== requiredRole) {
        await clearServerSession()
        await fbLogout()
        setUser(null)
        return false
      }

      setUser(result.user)
      setPendingAdminOtp(null)
      return true
    } catch (error) {
      console.error("[auth] Login failed", error)
      await clearServerSession()
      await fbLogout().catch(() => undefined)
      setUser(null)
      setPendingAdminOtp(null)
      return false
    } finally {
      explicitLoginRef.current = false
      setIsLoading(false)
    }
  }

  const loginWithGoogleProvider = async (): Promise<{ success: boolean; error?: any }> => {
    try {
      sessionStorage.removeItem("google_auth_error")
      const fbUser = await loginWithGoogle()
      if (fbUser) {
        const result = await requestServerSession(fbUser, true)
        if (result.requiresOtp) {
          setPendingAdminOtp(result.pending)
          setUser(null)
        } else {
          setUser(result.user)
        }
      }
      return { success: true }
    } catch (error: any) {
      if (error?.code) sessionStorage.setItem("google_auth_error", error.code)
      console.error("[auth] Google login error", error)
      return { success: false, error }
    }
  }

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      const fbUser = await registerWithEmail(email, password, name)
      const result = await requestServerSession(fbUser, true)
      if (result.requiresOtp) return false
      setUser(result.user)
      return true
    } catch (error) {
      console.error("[auth] Registration failed", error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    await clearServerSession()
    await fbLogout()
    setUser(null)
    setPendingAdminOtp(null)
  }

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading,
      login,
      adminLogin,
      verifyAdminOtp,
      resendAdminOtp,
      pendingAdminOtp,
      loginWithGoogleProvider,
      register,
      logout,
      refreshToken,
      isCheckingRedirect,
    }),
    [user, isLoading, pendingAdminOtp, isCheckingRedirect],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
