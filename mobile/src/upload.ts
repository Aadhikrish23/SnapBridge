import { Platform } from 'react-native';
import { getUploadUrl } from './config';
import type { CapturedImage } from './types';

export type UploadResult =
  | { success: true; filename: string }
  | { success: false; error: string };

function normalizeUri(uri: string): string {
  if (uri.startsWith('file://') || uri.startsWith('content://')) {
    return uri;
  }
  return Platform.OS === 'android' ? `file://${uri}` : uri;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return globalThis.btoa(binary);
}

async function readImageAsBase64(uri: string): Promise<string> {
  const response = await fetch(normalizeUri(uri));
  if (!response.ok) {
    throw new Error('Could not read image from device');
  }
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength === 0) {
    throw new Error('Image file is empty');
  }
  return arrayBufferToBase64(buffer);
}

export async function uploadImage(image: CapturedImage): Promise<UploadResult> {
  try {
    const base64 = await readImageAsBase64(image.uri);
    const response = await fetch(getUploadUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: base64,
        fileName: image.fileName || 'photo.jpg',
      }),
    });

    let data: { success?: boolean; filename?: string; error?: string };
    try {
      data = await response.json();
    } catch {
      return { success: false, error: 'Invalid server response' };
    }

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || `Upload failed (${response.status})`,
      };
    }

    return { success: true, filename: data.filename ?? 'image.jpg' };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Could not reach desktop server';
    return { success: false, error: message };
  }
}
