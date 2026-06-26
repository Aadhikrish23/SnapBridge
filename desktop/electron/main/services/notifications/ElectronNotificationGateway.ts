import { Notification } from 'electron';
import { INotificationGateway } from '../../domain/INotificationGateway';

export class ElectronNotificationGateway implements INotificationGateway {
  public show(title: string, body: string): void {
    const notification = new Notification({
      title,
      body,
      silent: true,
    });
    notification.show();
  }
}
