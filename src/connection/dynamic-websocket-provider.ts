import { GLSPWebSocketOptions, GLSPWebSocketProvider } from '@eclipse-glsp/protocol';

export class DynamicGLSPWebSocketProvider extends GLSPWebSocketProvider {
  constructor(
    protected override url: string,
    protected authToken?: string,
    options?: GLSPWebSocketOptions
  ) {
    super(url, options);
  }

  protected override createWebSocket(url: string): WebSocket {
    if (this.authToken) return new WebSocket(url, this.authToken);
    return new WebSocket(url);
  }
}
