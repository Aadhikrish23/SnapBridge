export interface IFolderGateway {
  /**
   * Opens the directory folder in Windows Explorer.
   */
  open(folderPath: string): Promise<void>;
}
