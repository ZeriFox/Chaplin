"use client"
import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Calendar, UserIcon, Settings, Shield, Sparkles, Eye, CheckCircle2 } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { RequireUser } from "@/components/route-guards"
import { db, secureChangePassword, logout } from "@/lib/firebase"
import { collection, doc, getDoc, getDocs, query, where, updateDoc } from "firebase/firestore"
import { safe } from "@/lib/safe-defaults"
import { useLanguage } from "@/components/language-provider"
import Image from "next/image"
import { toast } from "sonner"
import { UserServicesRequests } from "@/components/user-services-requests"

interface Booking {
  id: string
  roomName: string
  checkIn: string
  checkOut: string
  status: "paid" | "confirmed" | "completed" | "upcoming" | "cancelled" | "pending"
  totalAmount: number
  nights: number
  cancelledAt?: string
  refundAmount?: number
  penalty?: number
}

export default function UserPage() {
  return (
    <RequireUser>
      <UserInner />
    </RequireUser>
  )
}

function UserInner() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const highlightBookingId = searchParams.get("highlight")

  const [isEditing, setIsEditing] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [bookingsCompleted, setBookingsCompleted] = useState<Booking[]>([])
  const [bookingsUpcoming, setBookingsUpcoming] = useState<Booking[]>([])
  const [bookingsCancelled, setBookingsCancelled] = useState<Booking[]>([])
  const [notif, setNotif] = useState({ confirmEmails: true, promos: true, checkinReminders: true })

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
  })
  const [changingPassword, setChangingPassword] = useState(false)

  const [deleteData, setDeleteData] = useState({
    email: "",
    phone: "",
    currentPassword: "",
  })
  const [deletingAccount, setDeletingAccount] = useState(false)

  const [editedProfile, setEditedProfile] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
  })

  const [loadingBookings, setLoadingBookings] = useState(true)
  const [bookingsError, setBookingsError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      console.log("[v0] No user available, skipping bookings load")
      setLoadingBookings(false)
      return
    }
    ;(async () => {
      try {
        console.log("[v0] =====LOADING USER PROFILE =====")
        console.log("[v0] User UID:", user.uid)
        console.log("[v0] User email:", user.email)

        const snap = await getDoc(doc(db, "users", user.uid))
        const data = snap.data() || {}
        console.log("[v0] User profile data:", data)
        setProfile(data)
        setEditedProfile({
          firstName: data?.firstName || "",
          lastName: data?.lastName || "",
          phone: data?.phone || "",
          address: data?.address || "",
        })
        setNotif({
          confirmEmails: data?.notifications?.confirmEmails ?? true,
          promos: data?.notifications?.promos ?? true,
          checkinReminders: data?.notifications?.checkinReminders ?? true,
        })

        console.log("[v0] =====LOADING BOOKINGS =====")
        console.log("[v0] Searching bookings for user:", user.uid)
        setLoadingBookings(true)
        setBookingsError(null)

        // Try to find bookings by userId
        const qsByUserId = query(collection(db, "bookings"), where("userId", "==", user.uid))
        console.log("[v0] Executing query by userId...")
        const resByUserId = await getDocs(qsByUserId)
        console.log("[v0] Query by userId completed. Found:", resByUserId.docs.length, "bookings")

        let all: Booking[] = resByUserId.docs.map((d) => {
          const bookingData = { id: d.id, ...d.data() } as any
          console.log("[v0] Booking (by userId):", {
            id: bookingData.id,
            roomName: bookingData.roomName,
            checkIn: bookingData.checkIn,
            checkOut: bookingData.checkOut,
            status: bookingData.status,
            userId: bookingData.userId,
            email: bookingData.email,
          })
          return bookingData
        })

        // If no bookings found by userId, try by email
        if (all.length === 0 && user.email) {
          console.log("[v0] No bookings found by userId, trying by email:", user.email)
          const qsByEmail = query(collection(db, "bookings"), where("email", "==", user.email))
          console.log("[v0] Executing query by email...")
          const resByEmail = await getDocs(qsByEmail)
          console.log("[v0] Query by email completed. Found:", resByEmail.docs.length, "bookings")

          all = resByEmail.docs.map((d) => {
            const bookingData = { id: d.id, ...d.data() } as any
            console.log("[v0] Booking (by email):", {
              id: bookingData.id,
              roomName: bookingData.roomName,
              checkIn: bookingData.checkIn,
              checkOut: bookingData.checkOut,
              status: bookingData.status,
              userId: bookingData.userId,
              email: bookingData.email,
            })
            return bookingData
          })
        }

        console.log("[v0] Total bookings found:", all.length)

        if (all.length === 0) {
          console.log("[v0] ⚠️ No bookings found for this user")
          console.log("[v0] User UID:", user.uid)
          console.log("[v0] User email:", user.email)
          console.log("[v0] Please check if bookings exist in Firestore with matching userId or email")
        }

        all.sort((a, b) => b.checkIn.localeCompare(a.checkIn))

        const today = new Date().toISOString().split("T")[0]
        const upcoming = all.filter((b) => {
          const isUpcoming = b.checkOut > today // Changed >= to > so check-out day moves to completed
          const isNotCancelled = b.status !== "cancelled"
          const isNotCompleted = b.status !== "completed"
          console.log("[v0] Booking", b.id, "classification:", {
            checkOut: b.checkOut,
            today,
            isUpcoming,
            status: b.status,
            isNotCancelled,
            isNotCompleted,
            willBeIncluded: isUpcoming && isNotCancelled && isNotCompleted,
          })
          return isUpcoming && isNotCancelled && isNotCompleted
        })
        const completed = all.filter((b) => b.checkOut <= today || b.status === "completed") // Changed < to <=
        const cancelled = all.filter((b) => b.status === "cancelled")

        console.log("[v0] Total bookings:", all.length)
        console.log("[v0] Upcoming:", upcoming.length)
        console.log("[v0] Completed:", completed.length)
        console.log("[v0] Cancelled:", cancelled.length)

        setBookingsCompleted(completed)
        setBookingsUpcoming(upcoming)
        setBookingsCancelled(cancelled)
        setLoadingBookings(false)
      } catch (error: any) {
        console.error("[v0] ❌ ERROR loading bookings:", error)
        console.error("[v0] Error message:", error.message)
        console.error("[v0] Error stack:", error.stack)
        setBookingsError(error.message || "Errore durante il caricamento delle prenotazioni")
        setLoadingBookings(false)
      }
    })()
  }, [user])

  const formatPrice = (amount: number) => {
    return Number.parseFloat(amount.toString()).toFixed(2)
  }

  const getRoomImage = (roomName: string) => {
    if (!roomName) {
      return "/images/room-1.jpg"
    }

    const lowerName = roomName.toLowerCase()
    if (lowerName.includes("familiare") || lowerName.includes("balcone")) {
      return "/images/room-2.jpg"
    }
    return "/images/room-1.jpg"
  }

  const handleSaveProfile = async () => {
    if (!user) return
    try {
      const response = await fetch("/api/users/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          ...editedProfile,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update profile")
      }

      setProfile({ ...profile, ...editedProfile })
      setIsEditing(false)
      toast.success(t("profileUpdatedSuccess"))
    } catch (error: any) {
      console.error("[v0] Error updating profile:", error)
      toast.error(error.message || t("errorUpdatingProfile"))
    }
  }

  const handleChangePassword = async () => {
    if (!user?.email) return
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast.error(t("fillAllFields"))
      return
    }
    if (passwordData.newPassword.length < 6) {
      toast.error(t("newPasswordMinLength"))
      return
    }

    setChangingPassword(true)
    try {
      await secureChangePassword(user.email, passwordData.currentPassword, passwordData.newPassword)

      const response = await fetch("/api/users/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to change password")
      }

      toast.success(t("passwordChangedSuccess"))
      setPasswordData({ currentPassword: "", newPassword: "" })
    } catch (error: any) {
      console.error("[v0] Error changing password:", error)
      if (error.message.includes("wrong-password") || error.message.includes("auth/wrong-password")) {
        toast.error(t("currentPasswordWrong"))
      } else {
        toast.error(error.message || t("errorChangingPassword"))
      }
    } finally {
      setChangingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user?.email) return
    if (!deleteData.email || !deleteData.currentPassword) {
      toast.error(t("fillAllRequiredFields"))
      return
    }
    if (deleteData.email !== user.email) {
      toast.error(t("emailDoesNotMatch"))
      return
    }

    const confirmed = confirm(t("confirmDeleteAccount"))
    if (!confirmed) return

    setDeletingAccount(true)
    try {
      await secureChangePassword(deleteData.email, deleteData.currentPassword, deleteData.currentPassword)

      const response = await fetch("/api/users/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          email: deleteData.email,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete account")
      }

      await logout()
      toast.success(t("accountDeletedSuccess"))
      router.push("/")
    } catch (error: any) {
      console.error("[v0] Error deleting account:", error)
      if (error.message.includes("wrong-password")) {
        toast.error(t("wrongPassword"))
      } else {
        toast.error(error.message || t("errorDeletingAccount"))
      }
    } finally {
      setDeletingAccount(false)
    }
  }

  const handleSaveNotifications = async () => {
    if (!user) return
    try {
      await updateDoc(doc(db, "users", user.uid), {
        notifications: notif,
      })
      toast.success(t("preferenceSavedSuccess"))
    } catch (error) {
      toast.error(t("errorSavingPreferences"))
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="pt-20 pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-4xl font-cinzel font-bold text-roman-gradient mb-2">{t("myAccount")}</h1>
            <p className="text-muted-foreground">{t("manageProfile")}</p>
          </div>

          <div className="grid lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <div className="w-32 h-32 mx-auto mb-4 relative">
                      <Image
                        src="/default-avatar.jpg"
                        alt="Avatar"
                        fill
                        className="rounded-full object-cover border-4 border-primary/20"
                      />
                    </div>
                    <h3 className="font-semibold text-lg">
                      {safe.text(
                        `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim(),
                        user?.displayName || "Utente",
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground break-words px-2">{safe.text(user?.email, "")}</p>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>{t("memberSince")}</span>
                      <span className="font-medium">
                        {profile?.createdAt?.toDate ? profile.createdAt.toDate().toLocaleDateString("it-IT") : "N/D"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("phone")}</span>
                      <span className="font-medium">{safe.text(profile?.phone || bookingsUpcoming[0]?.phone)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("address")}</span>
                      <span className="font-medium">{safe.text(profile?.address)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-3">
              <Tabs defaultValue="profile" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="profile" className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4" /> {t("profile")}
                  </TabsTrigger>
                  <TabsTrigger value="bookings" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> {t("bookings")}
                  </TabsTrigger>
                  <TabsTrigger value="services" className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> Servizi
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" /> {t("settings")}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="font-cinzel text-primary">{t("personalInfo")}</CardTitle>
                        <CardDescription>{t("editData")}</CardDescription>
                      </div>
                      <Button variant="outline" onClick={() => setIsEditing((v) => !v)}>
                        {isEditing ? t("cancel") : t("edit")}
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label>{t("firstName")}</Label>
                          <Input
                            value={editedProfile.firstName}
                            onChange={(e) => setEditedProfile({ ...editedProfile, firstName: e.target.value })}
                            disabled={!isEditing}
                          />
                        </div>
                        <div>
                          <Label>{t("lastName")}</Label>
                          <Input
                            value={editedProfile.lastName}
                            onChange={(e) => setEditedProfile({ ...editedProfile, lastName: e.target.value })}
                            disabled={!isEditing}
                          />
                        </div>
                        <div>
                          <Label>{t("email")}</Label>
                          <Input value={user?.email ?? ""} disabled />
                        </div>
                        <div>
                          <Label>{t("phone")}</Label>
                          <Input
                            value={editedProfile.phone}
                            onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                            disabled={!isEditing}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>{t("address")}</Label>
                          <Input
                            value={editedProfile.address}
                            onChange={(e) => setEditedProfile({ ...editedProfile, address: e.target.value })}
                            disabled={!isEditing}
                          />
                        </div>
                      </div>
                      {isEditing && (
                        <div className="flex gap-2">
                          <Button onClick={handleSaveProfile}>{t("saveChanges")}</Button>
                          <Button variant="outline" onClick={() => setIsEditing(false)}>
                            {t("cancel")}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="bookings" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-cinzel text-primary">{t("upcomingBookings")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loadingBookings ? (
                        <p className="text-sm text-muted-foreground">{t("loading")}</p>
                      ) : bookingsError ? (
                        <div className="text-sm text-destructive">
                          <p className="font-semibold">{t("error")}:</p>
                          <p>{bookingsError}</p>
                        </div>
                      ) : bookingsUpcoming.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("noUpcomingBookings")}</p>
                      ) : (
                        bookingsUpcoming.map((b) => (
                          <div
                            key={b.id}
                            className={`border rounded-lg overflow-hidden mb-4 transition-all cursor-pointer hover:shadow-lg ${
                              highlightBookingId === b.id ? "ring-2 ring-primary" : ""
                            }`}
                            onClick={() => router.push(`/user/booking/${b.id}`)}
                          >
                            <div className="grid md:grid-cols-[200px_1fr] gap-4">
                              <div className="relative h-48 md:h-full">
                                <Image
                                  src={getRoomImage(b.roomName) || "/placeholder.svg"}
                                  alt={b.roomName}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              <div className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <h3 className="font-semibold text-lg mb-1">{b.roomName}</h3>
                                    <p className="text-sm text-muted-foreground">
                                      {new Date(b.checkIn).toLocaleDateString("it-IT")} →{" "}
                                      {new Date(b.checkOut).toLocaleDateString("it-IT")} · {b.nights}{" "}
                                      {b.nights === 1 ? t("night") : t("nights")}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <Badge variant="default" className="mb-2">
                                      {b.status === "paid" ? t("paid") : t("confirmed")}
                                    </Badge>
                                    <p className="text-lg font-bold text-primary">€{formatPrice(b.totalAmount)}</p>
                                    <Button size="sm" variant="ghost" className="mt-2">
                                      <Eye className="h-4 w-4 mr-1" />
                                      {t("viewBooking")}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="font-cinzel text-primary">{t("completedBookings")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loadingBookings ? (
                        <p className="text-sm text-muted-foreground">{t("loading")}</p>
                      ) : bookingsCompleted.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("noCompletedBookings")}</p>
                      ) : (
                        bookingsCompleted.map((b) => (
                          <div
                            key={b.id}
                            className="border rounded-lg overflow-hidden mb-4 cursor-pointer hover:shadow-lg transition-all"
                            onClick={() => router.push(`/user/booking/${b.id}`)}
                          >
                            <div className="grid md:grid-cols-[200px_1fr] gap-4">
                              <div className="relative h-48 md:h-full">
                                <Image
                                  src={getRoomImage(b.roomName) || "/placeholder.svg"}
                                  alt={b.roomName}
                                  fill
                                  className="object-cover grayscale"
                                />
                              </div>
                              <div className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <h3 className="font-semibold text-lg mb-1">{b.roomName}</h3>
                                    <p className="text-sm text-muted-foreground">
                                      {new Date(b.checkIn).toLocaleDateString("it-IT")} →{" "}
                                      {new Date(b.checkOut).toLocaleDateString("it-IT")} · {b.nights}{" "}
                                      {b.nights === 1 ? t("night") : t("nights")}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <Badge variant="secondary" className="mb-2">
                                      {t("completed")}
                                    </Badge>
                                    <p className="text-lg font-bold">€{formatPrice(b.totalAmount)}</p>
                                    <Button size="sm" variant="ghost" className="mt-2">
                                      <Eye className="h-4 w-4 mr-1" />
                                      {t("viewBooking")}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="font-cinzel text-primary">{t("cancelledBookings")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loadingBookings ? (
                        <p className="text-sm text-muted-foreground">{t("loading")}</p>
                      ) : bookingsCancelled.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("noCancelledBookings")}</p>
                      ) : (
                        bookingsCancelled.map((b) => (
                          <div
                            key={b.id}
                            className="border border-destructive/30 rounded-lg overflow-hidden mb-4 cursor-pointer hover:shadow-lg transition-all opacity-75"
                            onClick={() => router.push(`/user/booking/${b.id}`)}
                          >
                            <div className="grid md:grid-cols-[200px_1fr] gap-4">
                              <div className="relative h-48 md:h-full">
                                <Image
                                  src={getRoomImage(b.roomName) || "/placeholder.svg"}
                                  alt={b.roomName}
                                  fill
                                  className="object-cover grayscale"
                                />
                              </div>
                              <div className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <h3 className="font-semibold text-lg mb-1">{b.roomName}</h3>
                                    <p className="text-sm text-muted-foreground">
                                      {new Date(b.checkIn).toLocaleDateString("it-IT")} →{" "}
                                      {new Date(b.checkOut).toLocaleDateString("it-IT")} · {b.nights}{" "}
                                      {b.nights === 1 ? t("night") : t("nights")}
                                    </p>
                                    {b.cancelledAt && (
                                      <p className="text-destructive text-sm">
                                        {t("cancelledOn")} {new Date(b.cancelledAt).toLocaleDateString("it-IT")}
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <Badge variant="destructive" className="mb-2">
                                      {t("cancelled")}
                                    </Badge>
                                    <p className="text-lg font-bold line-through text-muted-foreground">
                                      €{formatPrice(b.totalAmount)}
                                    </p>
                                    {b.refundAmount !== undefined && (
                                      <p className="text-sm text-[#c9a84c] font-semibold">
                                        {t("refundAmount")}: €{formatPrice(b.refundAmount)}
                                      </p>
                                    )}
                                    {b.penalty !== undefined && b.penalty > 0 && (
                                      <p className="text-sm text-destructive">
                                        {t("penalty")}: €{formatPrice(b.penalty)}
                                      </p>
                                    )}
                                    <Button size="sm" variant="ghost" className="mt-2">
                                      <Eye className="h-4 w-4 mr-1" />
                                      {t("viewBooking")}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="services">
                  <UserServicesRequests />
                </TabsContent>

                <TabsContent value="settings" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-cinzel text-primary flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        {t("notifications")}
                      </CardTitle>
                      <CardDescription>{t("enableDisableAlerts")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                          <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">{t("bookingConfirmationEmail")}</p>
                            <p className="text-sm text-muted-foreground">{t("bookingConfirmationEmailDesc")}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                          <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">{t("checkInReminder")}</p>
                            <p className="text-sm text-muted-foreground">{t("checkInReminderDesc")}</p>
                          </div>
                        </div>

                        <div className="border-t pt-3 mt-3">
                          <label className="flex items-center justify-between cursor-pointer p-3 hover:bg-muted/50 rounded-lg transition-colors">
                            <div>
                              <p className="font-medium">{t("specialOffers")}</p>
                              <p className="text-sm text-muted-foreground">{t("specialOffersDesc")}</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={notif.promos}
                              onChange={(e) => setNotif((v) => ({ ...v, promos: e.target.checked }))}
                              className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                          </label>
                        </div>
                      </div>

                      <Button onClick={handleSaveNotifications} className="w-full">
                        {t("savePreferences")}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="font-cinzel text-primary flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        {t("privacySecurity")}
                      </CardTitle>
                      <CardDescription>{t("changePasswordOrDelete")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold">{t("changePassword")}</h4>
                        <div className="space-y-3">
                          <div>
                            <Label>{t("currentPassword")}</Label>
                            <Input
                              type="password"
                              value={passwordData.currentPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>{t("newPassword")}</Label>
                            <Input
                              type="password"
                              value={passwordData.newPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            />
                          </div>
                          <Button onClick={handleChangePassword} disabled={changingPassword}>
                            {changingPassword ? t("loading") : t("changePassword")}
                          </Button>
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <h4 className="font-semibold text-destructive mb-4">{t("deleteAccount")}</h4>
                        <div className="space-y-3">
                          <div>
                            <Label>{t("email")}</Label>
                            <Input
                              type="email"
                              value={deleteData.email}
                              onChange={(e) => setDeleteData({ ...deleteData, email: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>{t("currentPassword")}</Label>
                            <Input
                              type="password"
                              value={deleteData.currentPassword}
                              onChange={(e) => setDeleteData({ ...deleteData, currentPassword: e.target.value })}
                            />
                          </div>
                          <Button variant="destructive" onClick={handleDeleteAccount} disabled={deletingAccount}>
                            {deletingAccount ? t("loading") : t("deleteAccount")}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}
