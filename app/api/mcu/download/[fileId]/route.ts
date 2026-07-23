// app/api/mcu/download/[fileId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { google } from 'googleapis'
import { getOAuth2Client } from '@/app/lib/gdrive'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const { fileId } = await params

  try {
    const authClient = await getAuthClient()
    const drive = google.drive({ version: 'v3', auth: authClient })

    // Ambil metadata
    const meta = await drive.files.get({ fileId, fields: 'name, mimeType, size' })
    const fileName = meta.data.name || 'file'
    const mimeType = meta.data.mimeType || 'application/octet-stream'

    // Download file
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    )

    const buffer = Buffer.from(response.data as ArrayBuffer)

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (err) {
    console.error('Download MCU file error:', err)
    return NextResponse.json({ error: 'File tidak dapat diakses' }, { status: 500 })
  }
}