import { clipboard, nativeImage } from 'electron';

export function copyImageToClipboard(imageBuffer: Buffer): void {
  const image = nativeImage.createFromBuffer(imageBuffer);
  clipboard.writeImage(image);
}
