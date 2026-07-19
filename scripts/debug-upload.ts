export {}

// @ts-ignore
const fs = require('fs')
// @ts-ignore
const dotenv = require('dotenv')
// @ts-ignore
const { google } = require('googleapis')
// @ts-ignore
const { Readable } = require('stream')

dotenv.config({ path: '.env.local' })

async function debugUpload() {
  console.log('🔍 Debug Upload GDrive\n')

  const GDRIVE_FOLDER_ID = process.env.GDRIVE_FOLDER_ID
  const GDRIVE_OAUTH_CLIENT_ID = process.env.GDRIVE_OAUTH_CLIENT_ID
  const GDRIVE_OAUTH_CLIENT_SECRET = process.env.GDRIVE_OAUTH_CLIENT_SECRET
  const GDRIVE_OAUTH_REFRESH_TOKEN = process.env.GDRIVE_OAUTH_REFRESH_TOKEN

  console.log('ENV Check:')
  console.log(`  GDRIVE_FOLDER_ID         : ${GDRIVE_FOLDER_ID ? '✅ ADA' : '❌ MISSING'}`)
  console.log(`  GDRIVE_OAUTH_CLIENT_ID   : ${GDRIVE_OAUTH_CLIENT_ID ? '✅ ADA' : '❌ MISSING'}`)
  console.log(`  GDRIVE_OAUTH_CLIENT_SECRET: ${GDRIVE_OAUTH_CLIENT_SECRET ? '✅ ADA' : '❌ MISSING'}`)
  console.log(`  GDRIVE_OAUTH_REFRESH_TOKEN: ${GDRIVE_OAUTH_REFRESH_TOKEN ? '✅ ADA' : '❌ MISSING'}`)

  if (!GDRIVE_FOLDER_ID || !GDRIVE_OAUTH_CLIENT_ID || !GDRIVE_OAUTH_CLIENT_SECRET || !GDRIVE_OAUTH_REFRESH_TOKEN) {
    console.log('\n❌ Ada env yang missing!')
    return
  }

  // Setup OAuth2
  const oAuth2Client = new google.auth.OAuth2(
    GDRIVE_OAUTH_CLIENT_ID,
    GDRIVE_OAUTH_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  )
  oAuth2Client.setCredentials({ refresh_token: GDRIVE_OAUTH_REFRESH_TOKEN })
  const drive = google.drive({ version: 'v3', auth: oAuth2Client })

  // Test 1: Cek akses folder
  console.log('\nTest 1: Cek akses folder GDrive...')
  try {
    const folder = await drive.files.get({
      fileId: GDRIVE_FOLDER_ID,
      fields: 'id, name',
    })
    console.log(`  ✅ Folder: "${folder.data.name}"`)
  } catch (e: any) {
    console.log(`  ❌ ERROR: ${e.message}`)
    return
  }

  // Test 2: Upload gambar
  const testFile = './imports/test-image-2.png'
  if (!fs.existsSync(testFile)) {
    console.log(`\n❌ File test tidak ada, jalankan dulu: npm run debug:image`)
    return
  }

  console.log('\nTest 2: Upload gambar test...')
  try {
    const buffer = fs.readFileSync(testFile)
    const stream = Readable.from(buffer)

    const res = await drive.files.create({
      requestBody: {
        name: `TEST_UPLOAD_${Date.now()}.png`,
        parents: [GDRIVE_FOLDER_ID],
      },
      media: {
        mimeType: 'image/png',
        body: stream,
      },
      fields: 'id, name, webViewLink',
    })

    console.log(`  ✅ UPLOAD BERHASIL!`)
    console.log(`  File ID  : ${res.data.id}`)
    console.log(`  Link     : ${res.data.webViewLink}`)
    console.log(`\n✅ GDrive setup PERFECT! Siap import partbook.`)
  } catch (e: any) {
    console.log(`  ❌ Upload ERROR: ${e.message}`)
  }
}

debugUpload().catch(err => {
  console.error('FATAL:', err.message)
})