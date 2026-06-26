export interface IClipboard {
  /**
   * Reads the image file at the specified path and writes it to the system clipboard.
   */
  writeImage(filePath: string): void;
}
