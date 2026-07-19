import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

function getDriveClient() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GDRIVE_OAUTH_CLIENT_ID,
    process.env.GDRIVE_OAUTH_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  )
  oAuth2Client.setCredentials({
    refresh_token: process.env.GDRIVE_OAUTH_REFRESH_TOKEN,
  })
  return google.drive({ version: 'v3', auth: oAuth2Client })
}

export async function GET() {
  // DEBUG: cek env dulu
  const envCheck = {
    has_client_id: !!process.env.GDRIVE_OAUTH_CLIENT_ID,
    has_client_secret: !!process.env.GDRIVE_OAUTH_CLIENT_SECRET,
    has_refresh_token: !!process.env.GDRIVE_OAUTH_REFRESH_TOKEN,
    has_folder_id: !!process.env.GDRIVE_FOLDER_ID,
    folder_id_preview: process.env.GDRIVE_FOLDER_ID?.substring(0, 10) + '...',
  }

  try {
    const drive = getDriveClient()
    const folderId = process.env.GDRIVE_FOLDER_ID!

    const list = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name)',
      pageSize: 1000,
    })

    const files = list.data.files || []
    let success = 0
    let failed = 0
    const errors: any[] = []

    for (const f of files) {
      try {
        await drive.permissions.create({
          fileId: f.id!,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        })
        success++
      } catch (e: any) {
        failed++
        errors.push({ name: f.name, error: e.message })
      }
    }

    return NextResponse.json({
      success: true,
      env: envCheck,
      total: files.length,
      shared: success,
      failed,
      errors: errors.slice(0, 5),
    })
  } catch (err: any) {
    return NextResponse.json({ 
      success: false, 
      env: envCheck,
      error: err.message 
    }, { status: 500 })
  }
}