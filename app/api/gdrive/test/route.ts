// app/api/gdrive/test/route.ts
// Test endpoint untuk verifikasi koneksi Google Drive
// GET /api/gdrive/test

import { NextResponse } from 'next/server';
import { testConnection } from '@/app/lib/gdrive';

export async function GET() {
  try {
    const result = await testConnection();
    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err.message || 'Server error',
        stack: err.stack,
      },
      { status: 500 }
    );
  }
}
