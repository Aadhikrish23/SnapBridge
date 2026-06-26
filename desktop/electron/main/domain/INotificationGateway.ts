export interface INotificationGateway {
  /**
   * Displays an OS balloon or system notification with the given title and body.
   */
  show(title: string, body: string): void;
}
