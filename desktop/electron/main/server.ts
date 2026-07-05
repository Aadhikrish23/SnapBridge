import * as http from 'http';
import { PORT, getSaveFolder, getLocalIp } from './config';
import { ensureSaveFolder, saveImage } from './saveImage';

export type UploadHandler = (imageBuffer: Buffer, filename: string) => void;

function sendJson(res: http.ServerResponse, status: number, body: object): void {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(json),
  });
  res.end(json);
}

function parseMultipart(
  body: Buffer,
  contentType: string,
): { data: Buffer; filename?: string } | null {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^\s;]+))/i);
  if (!match) return null;

  const boundary = Buffer.from(`--${match[1] || match[2]}`, 'utf-8');
  const parts: Buffer[] = [];
  let start = 0;

  while (true) {
    const idx = body.indexOf(boundary, start);
    if (idx === -1) break;
    if (start > 0) {
      parts.push(body.subarray(start, idx));
    }
    start = idx + boundary.length;
    if (body[start] === 0x0d && body[start + 1] === 0x0a) {
      start += 2;
    }
  }

  for (const part of parts) {
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;

    const headers = part.subarray(0, headerEnd).toString('utf-8');
    if (!headers.includes('Content-Disposition')) continue;

    const filenameMatch =
      headers.match(/filename="([^"]+)"/i) || headers.match(/filename=([^;\r\n]+)/i);
    const filename = filenameMatch ? filenameMatch[1].trim() : undefined;

    let dataEnd = part.length;
    if (dataEnd >= 2 && part[dataEnd - 2] === 0x0d && part[dataEnd - 1] === 0x0a) {
      dataEnd -= 2;
    }

    return { data: part.subarray(headerEnd + 4, dataEnd), filename };
  }

  return null;
}

export function startServer(onUpload: UploadHandler): http.Server {
  ensureSaveFolder();
  const saveFolder = getSaveFolder();

  const server = http.createServer((req, res) => {
    const url = req.url?.split('?')[0];

    if (req.method === 'GET' && url === '/ping') {
      sendJson(res, 200, { status: 'ok' });
      return;
    }

    if (req.method === 'GET' && url === '/info') {
      sendJson(res, 200, { ip: getLocalIp(), port: PORT });
      return;
    }

    if (req.method === 'POST' && url === '/upload') {
      const contentType = req.headers['content-type'] || '';

      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        try {
          const body = Buffer.concat(chunks);
          let imageData: Buffer | null = null;
          let originalFilename: string | undefined;

          if (contentType.includes('application/json')) {
            const payload = JSON.parse(body.toString('utf-8')) as {
              image?: string;
              fileName?: string;
            };
            if (!payload.image) {
              sendJson(res, 400, { success: false, error: 'No image data' });
              return;
            }
            imageData = Buffer.from(payload.image, 'base64');
            originalFilename = payload.fileName;
          } else if (contentType.includes('multipart/form-data')) {
            const parsed = parseMultipart(body, contentType);
            if (!parsed || parsed.data.length === 0) {
              sendJson(res, 400, { success: false, error: 'No image found' });
              return;
            }
            imageData = parsed.data;
            originalFilename = parsed.filename;
          } else {
            sendJson(res, 400, {
              success: false,
              error: 'Expected application/json or multipart/form-data',
            });
            return;
          }

          const filename = saveImage(imageData, originalFilename);
          onUpload(imageData, filename);
          sendJson(res, 200, { success: true, filename });
        } catch (err) {
          console.error('Upload failed:', err);
          sendJson(res, 500, { success: false, error: 'Upload failed' });
        }
      });
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log('SnapBridge Server Started');
    console.log(`Address: ${getLocalIp()}:${PORT}`);
    console.log(`Save Folder: ${saveFolder}`);
  });

  return server;
}
