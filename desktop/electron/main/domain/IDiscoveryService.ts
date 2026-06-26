export interface IDiscoveryService {
  /**
   * Starts advertising the SnapBridge service on the local network.
   */
  start(port: number): void;

  /**
   * Stops advertising the service.
   */
  stop(): void;

  /**
   * Returns whether the service is currently advertising.
   */
  isAdvertising(): boolean;
}
