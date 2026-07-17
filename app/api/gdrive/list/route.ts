// app/api/gdrive/list/route.ts
// List semua file di folder Google Drive
// GET /api/gdrive/list?folderId=xxx (optional)

import { NextRequest, NextResponse } from 'next/server';
import { listFiles } from '@/app/lib/gdrive';

export async function GET(req: NextRequest) {
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
      {
        success: false,
        message: err.message || 'Failed to list files',
      },
      { status: 500 }
    );
  }
}