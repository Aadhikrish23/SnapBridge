import { shell } from 'electron';
import { IFolderGateway } from '../../domain/IFolderGateway';

export class ElectronFolderGateway implements IFolderGateway {
  public async open(folderPath: string): Promise<void> {
    const errorMsg = await shell.openPath(folderPath);
    if (errorMsg) {
      throw new Error(errorMsg);
    }
  }
}
