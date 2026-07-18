// app/api/gdrive/list/route.ts
// List semua file - REQUIRES LOGIN (any role)
// GET /api/gdrive/list?folderId=xxx (optional)
// v2.0 - Chat 5 (added auth guard)

import { NextRequest, NextResponse } from 'next/server';
import { listFiles } from '@/app/lib/gdrive';
import { requireAuth } from '@/app/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) {
    return NextResponse.json(
      { success: false, message: auth.message },
      { status: auth.status }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get('folderId') || undefined;

    const files = await listFiles(folderId);

    return NextResponse.json({
      success: true,
      count: files.length,
      files,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to list files' },
      { status: 500 }
    );
  }
}