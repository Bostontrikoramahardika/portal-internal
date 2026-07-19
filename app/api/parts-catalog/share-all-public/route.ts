import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getDriveClient() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GDRIVE_OAUTH_CLIENT_ID!,
    process.env.GDRIVE_OAUTH_CLIENT_SECRET!,
    'https://developers.google.com/oauthplayground'
  )
  oAuth2Client.setCredentials({
    refresh_token: process.env.GDRIVE_OAUTH_REFRESH_TOKEN!,
  })
  return google.drive({ version: 'v3', auth: oAuth2Client })
}

export async function GET() {
  try {
    const drive = getDriveClient()
    const folderId = process.env.GDRIVE_FOLDER_ID!

    // List semua file di folder
    const list = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name)',
      pageSize: 1000,
    })

    const files = list.data.files || []
    const results: any[] = []

    for (const f of files) {
      try {
        await drive.permissions.create({
          fileId: f.id!,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        })
        results.push({ id: f.id, name: f.name, status: '✅ shared' })
      } catch (e: any) {
        results.push({ id: f.id, name: f.name, status: `⚠️ ${e.message}` })
      }
    }

    return NextResponse.json({
      success: true,
      total: files.length,
      results,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}