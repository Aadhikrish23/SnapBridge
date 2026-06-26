import * as http from 'http';

export type HttpHandler = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  correlationId: string
) => void | Promise<void>;

export class Router {
  private routes = new Map<string, HttpHandler>();

  /**
   * Registers a path and HTTP method with an endpoint handler.
   */
  public register(method: string, path: string, handler: HttpHandler): void {
    const key = `${method.toUpperCase()}:${path}`;
    this.routes.set(key, handler);
  }

  /**
   * Dispatches the incoming request to the registered handler if found.
   * Returns true if route was matched and handled, false otherwise.
   */
  public dispatch(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    correlationId: string
  ): boolean {
    const method = req.method?.toUpperCase() || '';
    const parsedUrl = new URL(req.url || '', 'http://localhost'); // strip query parameters for route matching
    const key = `${method}:${parsedUrl.pathname}`;
    
    const handler = this.routes.get(key);
    if (handler) {
      handler(req, res, correlationId);
      return true;
    }
    return false;
  }
}
