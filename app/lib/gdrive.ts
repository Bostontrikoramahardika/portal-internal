// app/lib/gdrive.ts
// Helper untuk komunikasi dengan Google Drive API
// v1.0 - Chat 5

import { google } from 'googleapis';
import { Readable } from 'stream';
import path from 'path';

const GDRIVE_FOLDER_ID = process.env.GDRIVE_FOLDER_ID!;
const GDRIVE_CREDENTIALS_PATH = process.env.GDRIVE_CREDENTIALS_PATH || './gdrive-credentials.json';

// ---------- AUTH ----------
function getAuth() {
  const keyFilePath = path.resolve(process.cwd(), GDRIVE_CREDENTIALS_PATH.replace('./', ''));
  return new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
}

function getDriveClient() {
  const auth = getAuth();
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

  // Buat file bisa diakses via link (Anyone with link can view)
  await drive.permissions.create({
    fileId: response.data.id!,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

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