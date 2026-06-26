export interface INetworkServer {
  /**
   * Starts the background HTTP server on the specified port.
   */
  start(port: number): Promise<void>;

  /**
   * Stops the server and releases all active connections.
   */
  stop(): Promise<void>;

  /**
   * Returns true if the server is currently listening.
   */
  isListening(): boolean;
}
