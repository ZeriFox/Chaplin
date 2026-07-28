import { NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, firstName, lastName, password } = body

    if (!email || !firstName || !lastName) {
      return NextResponse.json({ error: "Missing required fields: email, firstName, lastName" }, { status: 400 })
    }

    const db = getAdminDb()
    const auth = getAdminAuth()

    // Check if user already exists
    let uid = ""
    let isNewUser = false
    let userPassword = password

    try {
      const existingUser = await auth.getUserByEmail(email)
      uid = existingUser.uid
      console.log("[Create User] User already exists:", uid)
    } catch {
      // User doesn't exist, create new one
      isNewUser = true

      // Generate password if not provided
      if (!userPassword) {
        const generatePassword = () => {
          const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
          let pwd = ""
          for (let i = 0; i < 12; i++) {
            pwd += charset.charAt(Math.floor(Math.random() * charset.length))
          }
          return pwd
        }
        userPassword = generatePassword()
      }

      const newUser = await auth.createUser({
        email,
        password: userPassword,
        displayName: `${firstName} ${lastName}`.trim(),
      })
      uid = newUser.uid

      await db.doc(`users/${uid}`).set({
        uid,
        email,
        displayName: `${firstName} ${lastName}`.trim(),
        firstName,
        lastName,
        provider: "password",
        role: "user",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        notifications: {
          confirmEmails: true,
          promos: false,
          checkinReminders: true,
        },
      })

      console.log("[Create User] New user created:", uid)
    }

    return NextResponse.json({
      success: true,
      uid,
      isNewUser,
      password: isNewUser ? userPassword : undefined,
    })
  } catch (error: any) {
    console.error("[Create User Error]:", error)
    return NextResponse.json({ error: error.message || "Failed to create user" }, { status: 500 })
  }
}
