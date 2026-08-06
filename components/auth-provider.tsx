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

interface AuthContextType {
  user: AppUser | null
  isLoading: boolean
  login: (email: string, password: string, requiredRole?: AppRole) => Promise<boolean>
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

async function establishServerSession(fbUser: FirebaseUser, forceRefresh = false): Promise<AppUser> {
  const idToken = await fbUser.getIdToken(forceRefresh)
  const response = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: idToken }),
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("Impossibile creare la sessione autenticata")
  }

  const data = (await response.json()) as { role?: AppRole }
  const role: AppRole = data.role === "admin" ? "admin" : "user"
  return firebaseToAppUser(fbUser, idToken, role)
}

async function clearServerSession() {
  await fetch("/api/session", { method: "DELETE", cache: "no-store" }).catch(() => undefined)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCheckingRedirect, setIsCheckingRedirect] = useState(true)
  const hasCheckedRedirectRef = useRef(false)

  useEffect(() => {
    if (hasCheckedRedirectRef.current) return
    hasCheckedRedirectRef.current = true

    const checkRedirect = async () => {
      try {
        const fbUser = await handleGoogleRedirect()
        if (fbUser) {
          const appUser = await establishServerSession(fbUser, true)
          setUser(appUser)
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
    const unsub = onIdTokenChanged(auth, async (fbUser) => {
      try {
        if (!fbUser) {
          setUser(null)
          setIsLoading(false)
          return
        }

        const appUser = await establishServerSession(fbUser, false)
        setUser(appUser)
      } catch (error) {
        console.error("[auth] Token/session synchronization failed", error)
        setUser(null)
        await fbLogout().catch(() => undefined)
        await clearServerSession()
      } finally {
        setIsLoading(false)
      }
    })

    return () => unsub()
  }, [])

  const refreshToken = async () => {
    if (!auth.currentUser) return
    const appUser = await establishServerSession(auth.currentUser, true)
    setUser(appUser)
  }

  const login = async (email: string, password: string, requiredRole?: AppRole): Promise<boolean> => {
    try {
      setIsLoading(true)
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password)
      const appUser = await establishServerSession(credential.user, true)

      if (requiredRole && appUser.role !== requiredRole) {
        await fbLogout()
        await clearServerSession()
        setUser(null)
        return false
      }

      setUser(appUser)
      return true
    } catch (error) {
      console.error("[auth] Login failed", error)
      await fbLogout().catch(() => undefined)
      await clearServerSession()
      setUser(null)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const loginWithGoogleProvider = async (): Promise<{ success: boolean; error?: any }> => {
    try {
      sessionStorage.removeItem("google_auth_error")
      const fbUser = await loginWithGoogle()
      if (fbUser) {
        const appUser = await establishServerSession(fbUser, true)
        setUser(appUser)
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
      const appUser = await establishServerSession(fbUser, true)
      setUser(appUser)
      return true
    } catch (error) {
      console.error("[auth] Registration failed", error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    await fbLogout()
    await clearServerSession()
    setUser(null)
  }

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading,
      login,
      loginWithGoogleProvider,
      register,
      logout,
      refreshToken,
      isCheckingRedirect,
    }),
    [user, isLoading, isCheckingRedirect],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
