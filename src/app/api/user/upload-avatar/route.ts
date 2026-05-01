import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { resolveUploadsPath } from "@/lib/uploadStorage";
import { validateSameOrigin } from "@/lib/requestSecurity";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

function getR2Client(): S3Client | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

async function uploadToR2(buffer: ArrayBuffer, key: string, mimeType: string): Promise<string> {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (!client || !bucket || !publicUrl) throw new Error("R2 not configured");
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: Buffer.from(buffer),
      ContentType: mimeType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  return `${publicUrl}/${key}`;
}

export async function POST(request: NextRequest) {
  try {
    const sameOriginError = validateSameOrigin(request);
    if (sameOriginError) {
      return sameOriginError;
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("avatar") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed" },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB" },
        { status: 400 }
      );
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = path.extname(file.name);
    const filename = `${user.id}-${timestamp}${ext}`;

    const bytes = await file.arrayBuffer();
    let imageUrl: string;

    const hasR2 = !!(getR2Client() && process.env.R2_BUCKET_NAME && process.env.R2_PUBLIC_URL);
    const hasPersistentUploadsDir = !!process.env.UPLOADS_DIR?.trim();

    if (process.env.NODE_ENV === "production" && !hasR2 && !hasPersistentUploadsDir) {
      return NextResponse.json(
        { error: "Avatar storage is not configured for production" },
        { status: 500 }
      );
    }

    if (hasR2) {
      const r2Key = `avatars/${filename}`;
      imageUrl = await uploadToR2(bytes, r2Key, file.type || "application/octet-stream");
    } else {
      const uploadDir = resolveUploadsPath("avatars");
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }
      const filepath = path.join(uploadDir, filename);
      await writeFile(filepath, Buffer.from(bytes));
      imageUrl = `/uploads/avatars/${filename}`;
    }

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: { image: imageUrl },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      imageUrl,
    });
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return NextResponse.json(
      { error: "Failed to upload avatar" },
      { status: 500 }
    );
  }
}
