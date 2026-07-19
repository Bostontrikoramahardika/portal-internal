import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET() {
  // 1. DIAGNOSA: Cek nama-nama variabel yang terdaftar di Vercel
  const allKeys = Object.keys(process.env);
  const foundKeys = allKeys.filter(k => k.includes('DRIVE'));

  const config = {
    clientId: process.env.GDRIVE_OAUTH_CLIENT_ID,
    clientSecret: process.env.GDRIVE_OAUTH_CLIENT_SECRET,
    refreshToken: process.env.GDRIVE_OAUTH_REFRESH_TOKEN, // <-- INI YANG FALSE
    folderId: process.env.GDRIVE_FOLDER_ID              // <-- INI YANG FALSE
  };

  try {
    // 2. VALIDASI: Jika ada yang kosong, tampilkan daftar nama yang ada di Vercel
    if (!config.refreshToken || !config.folderId) {
      return NextResponse.json({
        success: false,
        error: "Variabel Lingkungan Tidak Lengkap",
        nama_yang_terdeteksi_di_vercel: foundKeys,
        nama_yang_seharusnya: [
          "GDRIVE_OAUTH_REFRESH_TOKEN",
          "GDRIVE_FOLDER_ID"
        ]
      }, { status: 400 });
    }

    // 3. LOGIKA UTAMA: Sharing File
    const oAuth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      'https://developers.google.com/oauthplayground'
    );
    oAuth2Client.setCredentials({ refresh_token: config.refreshToken });
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    const list = await drive.files.list({
      q: `'${config.folderId}' in parents and trashed = false`,
      fields: 'files(id, name)',
      pageSize: 1000,
    });

    const files = list.data.files || [];
    let successCount = 0;

    for (const f of files) {
      try {
        await drive.permissions.create({
          fileId: f.id!,
          requestBody: { role: 'reader', type: 'anyone' },
        });
        successCount++;
      } catch (e) { /* skip error individual file */ }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil share ${successCount} file ke publik.`,
      total_files: files.length
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}