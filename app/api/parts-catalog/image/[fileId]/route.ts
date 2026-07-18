import { NextRequest, NextResponse } from 'next/server'
import { getFileBuffer } from '@/app/lib/gdrive'

export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params

  if (!fileId) {
    return NextResponse.json({ error: 'fileId wajib' }, { status: 400 })
  }

  const result = await getFileBuffer(fileId)
  if (!result) {
    return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 })
  }

  return new NextResponse(new Uint8Array(result.buffer), {
    status: 200,
    headers: {
      'Content-Type': result.mimeType,
      'Cache-Control': 'public, max-age=86400',
    },
  })
}