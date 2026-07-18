// app/api/gdrive/delete/route.ts
// Hapus file dari Google Drive - SUPER ADMIN ONLY
// DELETE /api/gdrive/delete?fileId=xxx
// POST /api/gdrive/delete with body {fileId}
// v2.0 - Chat 5 (added auth guard)

import { NextRequest, NextResponse } from 'next/server';
import { deleteFile } from '@/app/lib/gdrive';
import { requireSuperAdmin } from '@/app/lib/auth';

export async function DELETE(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) {
    return NextResponse.json(
      { success: false, message: auth.message },
      { status: auth.status }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json(
        { success: false, message: 'fileId required' },
        { status: 400 }
      );
    }

    await deleteFile(fileId);

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
      fileId,
      deleted_by: auth.session.nrp,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Delete failed' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) {
    return NextResponse.json(
      { success: false, message: auth.message },
      { status: auth.status }
    );
  }

  try {
    const body = await req.json();
    const fileId = body.fileId;

    if (!fileId) {
      return NextResponse.json(
        { success: false, message: 'fileId required in body' },
        { status: 400 }
      );
    }

    await deleteFile(fileId);

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
      fileId,
      deleted_by: auth.session.nrp,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Delete failed' },
      { status: 500 }
    );
  }
}