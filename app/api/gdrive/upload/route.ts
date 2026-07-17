// app/api/gdrive/upload/route.ts
// Upload file ke Google Drive
// POST /api/gdrive/upload
// Body: FormData with "file" field

import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/app/lib/gdrive';

// Naikkan limit body untuk file besar (default 4MB di Next.js)
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 detik timeout

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const customName = formData.get('fileName') as string | null;
    const folderId = formData.get('folderId') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      );
    }

    // Validasi ukuran file (max 50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, message: 'File too large (max 50MB)' },
        { status: 400 }
      );
    }

    // Convert File → Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload ke Drive
    const fileName = customName || file.name;
    const result = await uploadFile(
      fileName,
      file.type || 'application/octet-stream',
      buffer,
      folderId || undefined
    );

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      data: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err.message || 'Upload failed',
      },
      { status: 500 }
    );
  }
}