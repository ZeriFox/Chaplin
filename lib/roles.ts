export type UserRole = "user" | "admin"
export interface AppUser {
uid: string
role: UserRole
email: string
firstName?: string
lastName?: string
phone?: string
createdAt?: number
avatarUrl?: string
notifications?: {
confirmEmails?: boolean
promos?: boolean
checkinReminders?: boolean
}
}


export const isAdmin = (u?: { role?: string }) => u?.role === "admin"