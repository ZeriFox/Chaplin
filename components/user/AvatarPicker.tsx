"use client"
import Image from "next/image"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { storage, db } from "@/lib/firebase"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { doc, updateDoc } from "firebase/firestore"
import { useAuth } from "@/components/auth-provider"


const PRESET = [
"/avatars/a1.png",
"/avatars/a2.png",
"/avatars/a3.png",
"/avatars/a4.png",
"/avatars/a5.png",
"/avatars/a6.png",
"/avatars/a7.png",
"/avatars/a8.png",
"/avatars/a9.png",
"/avatars/a10.png",
]


export default function AvatarPicker() {
const { user } = useAuth()
const [current, setCurrent] = useState<string | undefined>(user?.avatarUrl)


const apply = async (src: string) => {
if (!user) return
await updateDoc(doc(db, "users", user.uid), { avatarUrl: src })
setCurrent(src)
}


return (
<div className="grid grid-cols-5 gap-2">
{PRESET.map((src) => (
<button key={src} className={`rounded-lg overflow-hidden border ${current === src ? "ring-2 ring-primary" : ""}`} onClick={() => apply(src)}>
<Image src={src} alt="avatar" width={64} height={64} />
</button>
))}
</div>
)
}