// app/lib/gdrive.ts
// Helper untuk komunikasi dengan Google Drive API
// v1.0 - Chat 5

import { google } from 'googleapis';
import { Readable } from 'stream';

const GDRIVE_FOLDER_ID = process.env.GDRIVE_FOLDER_ID!;
const GDRIVE_OAUTH_CLIENT_ID = process.env.GDRIVE_OAUTH_CLIENT_ID!;
const GDRIVE_OAUTH_CLIENT_SECRET = process.env.GDRIVE_OAUTH_CLIENT_SECRET!;
const GDRIVE_OAUTH_REFRESH_TOKEN = process.env.GDRIVE_OAUTH_REFRESH_TOKEN!;

// ---------- AUTH (OAuth Delegation - User Personal Account) ----------
export function getOAuth2Client() {
  const oAuth2Client = new google.auth.OAuth2(
    GDRIVE_OAUTH_CLIENT_ID,
    GDRIVE_OAUTH_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );
  oAuth2Client.setCredentials({
    refresh_token: GDRIVE_OAUTH_REFRESH_TOKEN,
  });
  return oAuth2Client;
}

function getDriveClient() {
  const auth = getOAuth2Client();
  return google.drive({ version: 'v3', auth });
}

// ---------- UPLOAD ----------
export interface UploadResult {
  fileId: string;
  fileName: string;
  webViewLink: string;
  webContentLink: string;
  size: string;
  mimeType: string;
}

export async function uploadFile(
  fileName: string,
  mimeType: string,
  buffer: Buffer,
  folderId?: string
): Promise<UploadResult> {
  const drive = getDriveClient();
  const parentFolder = folderId || GDRIVE_FOLDER_ID;

  const stream = Readable.from(buffer);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [parentFolder],
      mimeType,
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id, name, webViewLink, webContentLink, size, mimeType',
  });

  // ✅ AUTO-SHARE: Set file jadi public (anyone with link can view)
  try {
    await drive.permissions.create({
      fileId: response.data.id!,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
    console.log('✅ File set to public:', response.data.id);
  } catch (permErr) {
    console.error('⚠️ Failed to set public permission:', permErr);
  }

  return {
    fileId: response.data.id!,
    fileName: response.data.name!,
    webViewLink: response.data.webViewLink!,
    webContentLink: response.data.webContentLink!,
    size: response.data.size || '0',
    mimeType: response.data.mimeType!,
  };
}

// ---------- LIST FILES ----------
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  createdTime: string;
  webViewLink: string;
}

export async function listFiles(folderId?: string): Promise<DriveFile[]> {
  const drive = getDriveClient();
  const parentFolder = folderId || GDRIVE_FOLDER_ID;

  const response = await drive.files.list({
    q: `'${parentFolder}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType, size, createdTime, webViewLink)',
    orderBy: 'createdTime desc',
    pageSize: 100,
  });

  return (response.data.files || []) as DriveFile[];
}

// ---------- DELETE ----------
export async function deleteFile(fileId: string): Promise<boolean> {
  const drive = getDriveClient();
  await drive.files.delete({ fileId });
  return true;
}

// ---------- GET FILE INFO ----------
export async function getFileInfo(fileId: string): Promise<DriveFile | null> {
  const drive = getDriveClient();
  try {
    const response = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size, createdTime, webViewLink',
    });
    return response.data as DriveFile;
  } catch {
    return null;
  }
}

// ---------- GET FILE BUFFER (untuk proxy image) ----------
export async function getFileBuffer(fileId: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    const drive = getDriveClient();

    // Ambil metadata dulu untuk tahu mimeType
    const meta = await drive.files.get({
      fileId,
      fields: 'id, mimeType',
    });

    // Download file content
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    const buffer = Buffer.from(response.data as ArrayBuffer);
    return {
      buffer,
      mimeType: meta.data.mimeType || 'application/octet-stream',
    };
  } catch (e) {
    console.error('getFileBuffer error:', e);
    return null;
  }
}


// ---------- TEST CONNECTION ----------
export async function testConnection(): Promise<{
  success: boolean;
  message: string;
  folderName?: string;
  filesCount?: number;
}> {
  try {
    const drive = getDriveClient();
    const folder = await drive.files.get({
      fileId: GDRIVE_FOLDER_ID,
      fields: 'id, name, mimeType',
    });
    const files = await listFiles();
    return {
      success: true,
      message: 'Google Drive connected successfully',
      folderName: folder.data.name || 'Unknown',
      filesCount: files.length,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Unknown error',
    };
  }
}

// ============================================================
// MCU GOOGLE DRIVE FUNCTIONS — CHAT 18
// ============================================================

/**
 * Cari subfolder berdasarkan nama di dalam parentId.
 * Kalau tidak ada → buat baru.
 * Returns: folderId (string)
 */
export async function getOrCreateFolder(
  folderName: string,
  parentFolderId: string
): Promise<string> {
  const auth = await getOAuth2Client()
  const drive = google.drive({ version: 'v3', auth })

  // Cari dulu
  const searchRes = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  })

  if (searchRes.data.files && searchRes.data.files.length > 0) {
    return searchRes.data.files[0].id!
  }

  // Buat baru
  const createRes = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id',
  })

  return createRes.data.id!
}

/**
 * Upload file MCU ke Drive dengan struktur:
 * Root BTM → BTM MCU → [Site] → [NRP - Nama] → file
 *
 * Returns: { fileId, fileUrl, folderIdKaryawan }
 */
export async function uploadMcuFile(params: {
  nrp: string
  nama: string
  site: string
  filename: string       // e.g. MCU_2026-07-15_hasil.pdf
  buffer: Buffer
  mimeType: string       // 'application/pdf' | 'image/jpeg' | 'image/png'
}): Promise<{ fileId: string; fileUrl: string; folderIdKaryawan: string }> {
  const { nrp, nama, site, filename, buffer, mimeType } = params
  const auth = await getOAuth2Client()
  const drive = google.drive({ version: 'v3', auth })

  const rootFolderId = process.env.GDRIVE_FOLDER_ID!

  // Layer 1: BTM MCU
  const mcuRootId = await getOrCreateFolder('BTM MCU', rootFolderId)

  // Layer 2: Site
  const siteFolderName = site || 'Site Tidak Diketahui'
  const siteFolderId = await getOrCreateFolder(siteFolderName, mcuRootId)

  // Layer 3: Karyawan (NRP - Nama)
  const karyawanFolderName = `${nrp} - ${nama}`
  const karyawanFolderId = await getOrCreateFolder(karyawanFolderName, siteFolderId)

  // Upload file
  const { Readable } = await import('stream')
  const stream = Readable.from(buffer)

  const uploadRes = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [karyawanFolderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id, webViewLink',
  })

  const fileId = uploadRes.data.id!
  const fileUrl = uploadRes.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`

  return { fileId, fileUrl, folderIdKaryawan: karyawanFolderId }
}

/**
 * Generate temporary view link untuk file MCU.
 * Karyawan akses via app (bukan langsung Drive).
 * Returns: link Google Drive viewer (public jika sudah di-share)
 */
export async function getMcuFileViewLink(fileId: string): Promise<string> {
  const auth = await getOAuth2Client()
  const drive = google.drive({ version: 'v3', auth })

  // Set permission: anyone with link can view
  try {
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    })
  } catch {
    // Permission mungkin sudah ada, lanjut
  }

  return `https://drive.google.com/file/d/${fileId}/view`
}


/**
 * Update folder karyawan di tabel mcu (simpan gdrive_folder_id)
 * Dipanggil setelah uploadMcuFile
 */
export async function saveMcuFolderToDb(
  mcuId: string,
  folderIdKaryawan: string
): Promise<void> {
  // Import di sini untuk hindari circular dependency
  const { supabaseAdmin } = await import('@/app/lib/supabase')
  await supabaseAdmin
    .from('mcu')
    .update({ gdrive_folder_id: folderIdKaryawan })
    .eq('id', mcuId)
}