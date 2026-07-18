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
function getOAuth2Client() {
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

  // File otomatis owned by user OAuth (absensimlp@gmail.com)
  // Skip permission "anyone" — set manual di UI kalau perlu public link
  // Untuk sharing internal, cukup via webViewLink (login required)

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