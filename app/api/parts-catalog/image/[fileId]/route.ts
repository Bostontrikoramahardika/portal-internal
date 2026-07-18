import { NextRequest, NextResponse } from 'next/server'
import { getFileBuffer } from '@/app/lib/gdrive'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const { fileId } = params

    if (!fileId) {
      return new NextResponse('fileId wajib', { status: 400 })
    }

    const result = await getFileBuffer(fileId)

    if (!result) {
      return new NextResponse('File tidak ditemukan', { status: 404 })
    }

    const buffer = Buffer.isBuffer(result.buffer) 
      ? result.buffer 
      : Buffer.from(result.buffer)

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': result.mimeType || 'image/jpeg',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err: any) {
    console.error('Image proxy error:', err)
    return new NextResponse('Server error: ' + err.message, { status: 500 })
  }
}