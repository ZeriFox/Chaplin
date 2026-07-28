"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { onIdTokenChanged, type User as FirebaseUser } from "firebase/auth"
import {
  auth,
  db,
  registerWithEmail,
  loginWithEmail,
  loginWithGoogle,
  handleGoogleRedirect, // Import new redirect handler
  logout as fbLogout,
} from "../lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { useRef } from "react"

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
  login: (email: string, password: string) => Promise<boolean>
  loginWithGoogleProvider: () => Promise<{ success: boolean; error?: any }>
  register: (name: string, email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
  isCheckingRedirect: boolean // New state to track redirect check
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ---------- COOKIE HELPERS ----------
function setRoleCookie(role: "user" | "admin" | "") {
  // Persisto 7 giorni; SameSite=Lax per evitare loop.
  const maxAge = 60 * 60 * 24 * 7
  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:"
  const secure = isHttps ? "Secure; " : ""
  if (role) {
    document.cookie = `app_role=${role}; Path=/; Max-Age=${maxAge}; ${secure}SameSite=Lax`
  } else {
    // clear
    document.cookie = `app_role=; Path=/; Max-Age=0; ${secure}SameSite=Lax`
  }
}

// ---------- HELPERS ----------
async function readUserRole(uid: string): Promise<AppRole> {
  try {
    const snap = await getDoc(doc(db, "users", uid))
    if (!snap.exists()) {
      return "user"
    }
    const raw = (snap.data()?.role as string | undefined) ?? "user"
    // normalizza: qualunque valore non "admin" diventa "user"
    return raw === "admin" ? "admin" : "user"
  } catch (error) {
    console.error("Error reading user role:", error)
    return "user"
  }
}

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

// ---------- PROVIDER ----------
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCheckingRedirect, setIsCheckingRedirect] = useState(true) // Track redirect check
  const hasCheckedRedirectRef = useRef(false)
  useEffect(() => {
    if (hasCheckedRedirectRef.current) return
    hasCheckedRedirectRef.current = true

    const checkRedirect = async () => {
      console.log("[v0] Checking for Google redirect result...")
      try {
        const fbUser = await handleGoogleRedirect()
        if (fbUser) {
          console.log("[v0] Google redirect successful, user:", fbUser.email)
          const [idToken, role] = await Promise.all([fbUser.getIdToken(true), readUserRole(fbUser.uid)])
          setUser(firebaseToAppUser(fbUser, idToken, role))
          setRoleCookie(role)
          sessionStorage.removeItem("google_auth_error")
        } else {
          console.log("[v0] No redirect result found")
        }
      } catch (error: any) {
        console.error("[v0] Google redirect error:", error)
        if (error?.code) sessionStorage.setItem("google_auth_error", error.code)
      } finally {
        setIsCheckingRedirect(false)
      }
    }

    checkRedirect()
  }, [])

  // Sottoscrizione token/utente
  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (fbUser) => {
      try {
        if (!fbUser) {
          setUser(null)
          setRoleCookie("")
          setIsLoading(false)
          return
        }
        const [idToken, role] = await Promise.all([fbUser.getIdToken(false), readUserRole(fbUser.uid)])
        setUser(firebaseToAppUser(fbUser, idToken, role))
        setRoleCookie(role)
      } catch (e) {
        console.error("onIdTokenChanged error", e)
        setUser(null)
        setRoleCookie("")
      } finally {
        setIsLoading(false)
      }
    })
    return () => unsub()
  }, [])

  const refreshToken = async () => {
    if (!auth.currentUser) return
    const [idToken, role] = await Promise.all([auth.currentUser.getIdToken(true), readUserRole(auth.currentUser.uid)])
    setUser(firebaseToAppUser(auth.currentUser, idToken, role))
    setRoleCookie(role) // <--- cookie aggiornato
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      const fbUser = await loginWithEmail(email, password)
      const [idToken, role] = await Promise.all([fbUser.getIdToken(true), readUserRole(fbUser.uid)])
      setUser(firebaseToAppUser(fbUser, idToken, role))
      setRoleCookie(role) // <--- cookie aggiornato
      return true
    } catch (e) {
      console.error("login error", e)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const loginWithGoogleProvider = async (): Promise<{ success: boolean; error?: any }> => {
    try {
      sessionStorage.removeItem("google_auth_error")
      const fbUser = await loginWithGoogle() // popup (dev) ritorna user, redirect (prod) ritorna null
      if (fbUser) {
        const [idToken, role] = await Promise.all([fbUser.getIdToken(true), readUserRole(fbUser.uid)])
        setUser(firebaseToAppUser(fbUser, idToken, role))
        setRoleCookie(role)
      }
      return { success: true }
    } catch (e: any) {
      if (e?.code) sessionStorage.setItem("google_auth_error", e.code)
      console.error("[auth] Google login error:", e)
      return { success: false, error: e }
    }
  }

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      const fbUser = await registerWithEmail(email, password)
      const [idToken, role] = await Promise.all([fbUser.getIdToken(true), readUserRole(fbUser.uid)])
      setUser(firebaseToAppUser(fbUser, idToken, role))
      setRoleCookie(role) // <--- cookie aggiornato
      return true
    } catch (e) {
      console.error("register error", e)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    await fbLogout()
    setUser(null)
    setRoleCookie("") // <--- clear
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
      isCheckingRedirect, // Expose redirect check state
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

