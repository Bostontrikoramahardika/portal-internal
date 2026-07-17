// app/api/gdrive/delete/route.ts
// Hapus file dari Google Drive
// DELETE /api/gdrive/delete?fileId=xxx
// atau POST /api/gdrive/delete with body {fileId}

import { NextRequest, NextResponse } from 'next/server';
import { deleteFile } from '@/app/lib/gdrive';

export async function DELETE(req: NextRequest) {
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
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err.message || 'Delete failed',
      },
      { status: 500 }
    );
  }
}

// Support juga via POST untuk kemudahan
export async function POST(req: NextRequest) {
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
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err.message || 'Delete failed',
      },
      { status: 500 }
    );
  }
}
