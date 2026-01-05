import { NextResponse } from "next/server"
import { isValidObjectId } from "mongoose"

import { connectToDatabase } from "@/lib/mongodb"
import { UserModel } from "@/models/User"
import { sanitizeUser } from "@/lib/auth"
import { backend, backendProxyEnabled } from "@/lib/backend-client"
import { uploadBuffer } from "@/src/services/storage-service"

const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4MB
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"]

export async function POST(request: Request) {
  try {
    if (backendProxyEnabled) {
      const formData = await request.formData()
      const response = await backend.uploadAvatar(formData)
      return NextResponse.json(response)
    }

    const formData = await request.formData()
    const userId = formData.get("userId")
    const file = formData.get("file")

    if (typeof userId !== "string" || !isValidObjectId(userId)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 })
    }

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Missing file upload" }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File is too large (max 4MB)" }, { status: 400 })
    }

    await connectToDatabase()

    const user = await UserModel.findById(userId)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const { default: sharp } = await import("sharp")
    const optimized = await sharp(buffer)
      .rotate()
      .resize(512, 512, { fit: "cover" })
      .webp({ quality: 80 })
      .toBuffer()

    const uploadedUrl = await uploadBuffer(optimized, `avatars/${userId}`, "image/webp")

    user.avatarUrl = uploadedUrl
    await user.save()

    return NextResponse.json({
      message: "Avatar updated",
      data: sanitizeUser(user),
    })
  } catch (error) {
    console.error("Failed to upload avatar", error)
    return NextResponse.json({ error: "Unable to upload avatar" }, { status: 500 })
  }
}
