// app/api/gdrive/upload/route.ts
// Upload file ke Google Drive - SUPER ADMIN ONLY
// POST /api/gdrive/upload
// Body: FormData with "file" field
// v2.0 - Chat 5 (added auth guard)

import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/app/lib/gdrive';
import { requireSuperAdmin } from '@/app/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // ===== AUTH GUARD =====
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) {
    return NextResponse.json(
      { success: false, message: auth.message },
      { status: auth.status }
    );
  }

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

    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, message: 'File too large (max 50MB)' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

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
      uploaded_by: auth.session.nrp,
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