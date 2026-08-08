import { initializeApp, getApps, getApp } from "firebase/app"
import {
  getAuth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  signInWithRedirect, // Using redirect instead of popup
  getRedirectResult, // To handle redirect result
  onIdTokenChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  type User,
} from "firebase/auth"
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  type Timestamp,
} from "firebase/firestore"
import { getFunctions, connectFunctionsEmulator } from "firebase/functions"
import { getStorage } from "firebase/storage"
import { setPersistence, browserLocalPersistence } from "firebase/auth"

// ---------- INIT ----------
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean)

const fallbackFirebaseConfig = {
  apiKey: "firebase-not-configured",
  authDomain: "firebase-not-configured.invalid",
  projectId: "firebase-not-configured",
  storageBucket: "firebase-not-configured.invalid",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000",
}

const app = getApps().length
  ? getApp()
  : initializeApp(isFirebaseConfigured ? firebaseConfig : fallbackFirebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const functions = getFunctions(app)
const IS_BROWSER = typeof window !== "undefined"
const IS_DEV = IS_BROWSER && window.location.hostname.includes("localhost")
const IS_PROD = !IS_DEV

const googleProvider = new GoogleAuthProvider()
// Suggerisce la scelta dell'account ad ogni login (utile se l’utente è già loggato con altro account)
googleProvider.setCustomParameters({ prompt: "select_account" })

if (IS_BROWSER && isFirebaseConfigured && process.env.NEXT_PUBLIC_USE_FUNCTIONS_EMULATOR === "true") {
  connectFunctionsEmulator(functions, "127.0.0.1", 5001)
}
// Garantisce che il redirect mantenga la sessione tra le navigazioni
if (IS_BROWSER && isFirebaseConfigured) {
  ;(async () => {
    try {
      await setPersistence(auth, browserLocalPersistence)
    } catch {}
  })()
}

// ---------- USER DOC ----------
export type UserDoc = {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  provider: string
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
  role: "user" | "admin"
  firstName?: string
  lastName?: string
  phone?: string
  notifications?: {
    confirmEmails?: boolean
    promos?: boolean
    checkinReminders?: boolean
  }
}

export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const ref = doc(db, "users", uid)
  const snap = await getDoc(ref)
  return snap.exists() ? (snap.data() as UserDoc) : null
}

async function ensureUserDoc(user: User) {
  const ref = doc(db, "users", user.uid)
  const snap = await getDoc(ref)

  const base = {
    uid: user.uid,
    email: user.email ?? "",
    displayName: user.displayName ?? "",
    photoURL: user.photoURL ?? "",
    provider: user.providerData?.[0]?.providerId ?? "password",
    updatedAt: serverTimestamp(),
  }

  if (!snap.exists()) {
    await setDoc(ref, {
      ...base,
      role: "user",
      createdAt: serverTimestamp(),
      notifications: {
        confirmEmails: true,
        promos: false,
        checkinReminders: true,
      },
    })
  } else {
    await updateDoc(ref, base)
  }
}

// ---------- AUTH ----------
export async function registerWithEmail(email: string, password: string, displayName?: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  if (displayName) {
    await ensureUserDoc({ ...cred.user, displayName } as User)
    await updateDoc(doc(db, "users", cred.user.uid), { displayName })
  } else {
    await ensureUserDoc(cred.user)
  }
  return cred.user
}

export async function loginWithEmail(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  await ensureUserDoc(cred.user)
  return cred.user
}

export async function loginWithGoogle() {
  try {
    if (IS_DEV) {
      // in dev usa popup: più affidabile con Next fast-refresh
      const { signInWithPopup } = await import("firebase/auth")
      const cred = await signInWithPopup(auth, googleProvider)
      await ensureUserDoc(cred.user)
      return cred.user
    } else {
      // in prod usa redirect
      await signInWithRedirect(auth, googleProvider)
      return null // si prosegue al redirect
    }
  } catch (e: any) {
    // propaga l'errore al caller (AuthProvider salva in sessionStorage)
    throw e
  }
}

export async function handleGoogleRedirect() {
  try {
    const result = await getRedirectResult(auth)
    if (result && result.user) {
      await ensureUserDoc(result.user)
      return result.user
    }
    return null
  } catch (error) {
    console.error("Google redirect error:", error)
    throw error
  }
}

export async function logout() {
  await signOut(auth)
}

export function onToken(cb: (token: string | null, user: User | null) => void) {
  return onIdTokenChanged(auth, async (user) => {
    if (!user) return cb(null, null)
    const token = await user.getIdToken(true)
    cb(token, user)
  })
}

export async function getCurrentIdToken(forceRefresh = false) {
  const user = auth.currentUser
  if (!user) return null
  return user.getIdToken(forceRefresh)
}

export async function secureChangePassword(email: string, currentPassword: string, newPassword: string) {
  const user = auth.currentUser
  if (!user || !user.email) throw new Error("Nessun utente autenticato")
  if (user.email !== email) throw new Error("Email non corrispondente all'utente attuale")
  const cred = EmailAuthProvider.credential(email, currentPassword)
  await reauthenticateWithCredential(user, cred)
  await updatePassword(user, newPassword)
}

export async function secureDeleteAccount(email: string, currentPassword: string) {
  const user = auth.currentUser
  if (!user || !user.email) throw new Error("Nessun utente autenticato")
  if (user.email !== email) throw new Error("Email non corrispondente all'utente attuale")
  const cred = EmailAuthProvider.credential(email, currentPassword)
  await reauthenticateWithCredential(user, cred)
  await deleteDoc(doc(db, "users", user.uid)).catch(() => {})
  await user.delete()
}

// ---------- BOOKINGS ----------
export type BookingPayload = {
  checkIn: string
  checkOut: string
  guests: number // Now represents adults only
  numberOfChildren?: number // Added children field
  firstName: string
  lastName: string
  email: string
  phone?: string
  notes?: string
  roomId: string
  roomName: string
  pricePerNight: number
  currency?: "EUR"
  totalAmount?: number
  subtotalAmount?: number
  couponCode?: string
  discountAmount?: number
  nights?: number
  status?: "pending" | "paid" | "confirmed" | "cancelled"
  origin?: "site" | "booking" | "airbnb" | "manual"
  paymentProvider?: "stripe" | "nexi"
}

const BOOKINGS_COL = "bookings"

export function computeNights(checkInISO: string, checkOutISO: string) {
  const inD = new Date(checkInISO + "T00:00:00")
  const outD = new Date(checkOutISO + "T00:00:00")
  const ms = outD.getTime() - inD.getTime()
  const nights = Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)))
  return nights
}

export function computeTotalEUR(pricePerNight: number, nights: number, taxes = 0, serviceFee = 0) {
  const subtotal = pricePerNight * nights
  return Math.max(0, Math.round((subtotal + taxes + serviceFee) * 100) / 100)
}

export async function createBooking(payload: BookingPayload) {
  if (!payload.checkIn || !payload.checkOut) throw new Error("Date mancanti")
  const nights = computeNights(payload.checkIn, payload.checkOut)
  if (nights <= 0) throw new Error("Intervallo date non valido")

  const total = payload.totalAmount ?? computeTotalEUR(payload.pricePerNight, nights)

  const colRef = collection(db, BOOKINGS_COL)
  const docRef = await addDoc(colRef, {
    ...payload,
    nights,
    totalAmount: total,
    currency: payload.currency ?? "EUR",
    status: payload.status ?? "pending",
    origin: payload.origin ?? "site",
    userId: auth.currentUser?.uid ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateBooking(
  id: string,
  patch: Partial<BookingPayload> & { status?: BookingPayload["status"] },
) {
  await updateDoc(doc(db, BOOKINGS_COL, id), {
    ...patch,
    updatedAt: serverTimestamp(),
  })
}

export async function getBookingById(id: string): Promise<(Record<string, any> & { id: string }) | null> {
  const snap = await getDoc(doc(db, BOOKINGS_COL, id))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Record<string, any> & { id: string }) : null
}

export async function listMyBookings(limitN = 50) {
  const uid = auth.currentUser?.uid
  if (!uid) return []
  const q = query(collection(db, BOOKINGS_COL), where("userId", "==", uid), orderBy("createdAt", "desc"), limit(limitN))
  const s = await getDocs(q)
  return s.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function listAllBookingsForAdmin(limitN = 100) {
  const qy = query(collection(db, BOOKINGS_COL), orderBy("createdAt", "desc"), limit(limitN))
  const s = await getDocs(qy)
  return s.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function cancelBooking(id: string) {
  const booking = await getBookingById(id)

  await updateDoc(doc(db, BOOKINGS_COL, id), {
    status: "cancelled",
    updatedAt: serverTimestamp(),
  })

  /* BEDS24 DISABLED - Unblocking dates now handled via Firebase only
  if (booking && booking.origin === "site") {
    try {
      await fetch("/api/beds24/unblock-booking-dates", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: booking.roomId, checkIn: booking.checkIn, checkOut: booking.checkOut }),
      })
    } catch (error) {
      console.error("[v0] Failed to unblock dates on Beds24:", error)
    }
  }
  */
}

export async function confirmBooking(id: string) {
  await updateDoc(doc(db, BOOKINGS_COL, id), {
    status: "confirmed",
    updatedAt: serverTimestamp(),
  })
}

// ---------- ROOMS MANAGEMENT ----------
export type RoomData = {
  id: string
  name: string
  description: string
  price: number
  capacity: number
  beds: number
  bathrooms: number
  size: number
  status: "available" | "booked" | "maintenance"
  amenities: string[]
  images: string[]
}

export async function getRoomById(roomId: string): Promise<RoomData | null> {
  const snap = await getDoc(doc(db, "rooms", roomId))
  return snap.exists() ? (snap.data() as RoomData) : null
}

export async function getAllRooms(): Promise<RoomData[]> {
  const snap = await getDocs(collection(db, "rooms"))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RoomData)
}

export async function updateRoomPrice(roomId: string, newPrice: number) {
  await updateDoc(doc(db, "rooms", roomId), {
    price: newPrice,
    updatedAt: serverTimestamp(),
  })
}

export async function updateRoomStatus(roomId: string, status: "available" | "booked" | "maintenance") {
  await updateDoc(doc(db, "rooms", roomId), {
    status,
    updatedAt: serverTimestamp(),
  })
}

// ---------- PAYMENTS ----------
type CreateCheckoutArgs = {
  bookingId: string
  amount: number
  currency: string
  successUrl: string
  cancelUrl: string
  customerEmail?: string
  metadata?: Record<string, string>
}

export async function createStripeCheckout(args: CreateCheckoutArgs): Promise<{ url: string }> {
  const response = await fetch("/api/payments/stripe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...args,
      paymentType: "full", // Changed from "deposit" to "full" - now paying 100% upfront instead of 30%
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Stripe checkout creation failed")
  }

  return response.json()
}

export async function createNexiCheckout(args: CreateCheckoutArgs): Promise<{ url: string }> {
  const response = await fetch("/api/payments/nexi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...args,
      paymentType: "full",
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Nexi checkout creation failed")
  }

  return response.json()
}

// ---------- USER MANAGEMENT ----------
export function generateRandomPassword(length = 12): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
  let password = ""
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return password
}

export async function createUserFromBooking(
  email: string,
  firstName: string,
  lastName: string,
): Promise<{ success: boolean; password?: string; error?: string }> {
  try {
    // Check if user already exists
    const usersRef = collection(db, "users")
    const q = query(usersRef, where("email", "==", email), limit(1))
    const existingUsers = await getDocs(q)

    if (!existingUsers.empty) {
      console.log("[v0] User already exists:", email)
      return { success: true } // User already exists, no need to create
    }

    // Generate random password
    const password = generateRandomPassword()

    // Create user account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    // Create user document in Firestore
    const userDocRef = doc(db, "users", user.uid)
    await setDoc(userDocRef, {
      uid: user.uid,
      email: email,
      displayName: `${firstName} ${lastName}`,
      firstName: firstName,
      lastName: lastName,
      provider: "password",
      role: "user",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      notifications: {
        confirmEmails: true,
        promos: false,
        checkinReminders: true,
      },
    })

    console.log("[v0] User account created:", email)

    return { success: true, password }
  } catch (error: any) {
    console.error("[v0] Error creating user account:", error)
    return { success: false, error: error.message }
  }
}

export async function linkBookingToUser(bookingId: string, email: string): Promise<boolean> {
  try {
    // Find user by email
    const usersRef = collection(db, "users")
    const q = query(usersRef, where("email", "==", email), limit(1))
    const userSnap = await getDocs(q)

    if (userSnap.empty) {
      console.error("[v0] User not found for email:", email)
      return false
    }

    const userId = userSnap.docs[0].id

    // Update booking with userId
    const bookingRef = doc(db, "bookings", bookingId)
    await updateDoc(bookingRef, {
      userId: userId,
      updatedAt: serverTimestamp(),
    })

    console.log("[v0] Booking linked to user:", bookingId, userId)
    return true
  } catch (error) {
    console.error("[v0] Error linking booking to user:", error)
    return false
  }
}




