import { clipboard, nativeImage } from 'electron';
import { IClipboard } from '../../domain/IClipboard';

export class ElectronClipboard implements IClipboard {
  public writeImage(filePath: string): void {
    const image = nativeImage.createFromPath(filePath);
    if (image.isEmpty()) {
      throw new Error(`Failed to load image into native wrapper from: ${filePath}`);
    }
    clipboard.writeImage(image);
  }
}
