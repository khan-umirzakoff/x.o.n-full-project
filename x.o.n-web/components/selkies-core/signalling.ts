type SignallingState = 'disconnected' | 'connecting' | 'connected';

export class WebRTCSignalling {
  private server: string;
  private peer_id: number;
  private ws_conn: WebSocket | null;
  private retry_count: number;

  public onstatus: ((message: string) => void) | null;
  public onerror: ((message: string) => void) | null;
  public ondebug: ((message: string) => void) | null;
  public onice: ((candidate: RTCIceCandidate) => void) | null;
  public onsdp: ((sdp: RTCSessionDescription) => void) | null;
  public ondisconnect: (() => void) | null;
  public state: SignallingState;

  constructor(server: string, peer_id = 1) {
    this.server = server;
    this.peer_id = peer_id;
    this.ws_conn = null;
    this.retry_count = 0;

    this.onstatus = null;
    this.onerror = null;
    this.ondebug = null;
    this.onice = null;
    this.onsdp = null;
    this.ondisconnect = null;
    this.state = 'disconnected';
  }

  private _setStatus(message: string): void {
    this.onstatus?.(message);
  }

  private _setDebug(message: string): void {
    this.ondebug?.(message);
  }

  private _setError(message: string): void {
    this.onerror?.(message);
  }

  private _setSDP(sdp: RTCSessionDescription): void {
    this.onsdp?.(sdp);
  }

  private _setICE(icecandidate: RTCIceCandidate): void {
    this.onice?.(icecandidate);
  }

  private _onServerOpen = (): void => {
    // This metadata is now sent by the React component
    this.state = 'connected';
    this.ws_conn?.send(`HELLO ${this.peer_id}`);
    this._setStatus(`Registering with server, peer ID: ${this.peer_id}`);
    this.retry_count = 0;
  };

  private _onServerError = (): void => {
    this._setError('Connection error, retry in 3 seconds.');
    this.retry_count++;
    if (this.ws_conn?.readyState === WebSocket.CLOSED) {
      setTimeout(() => {
        if (this.retry_count > 3) {
          this._setError('Could not connect after 3 retries.');
          this.disconnect();
        } else {
          this.connect();
        }
      }, 3000);
    }
  };

  private _onServerMessage = (event: MessageEvent): void => {
    this._setDebug(`server message: ${event.data}`);

    if (event.data === 'HELLO') {
      this._setStatus('Registered with server. Waiting for stream.');
      return;
    }

    if (typeof event.data === 'string' && event.data.startsWith('ERROR')) {
      this._setError(`Error from server: ${event.data}`);
      return;
    }

    try {
      const msg = JSON.parse(event.data);
      if (msg.sdp) {
        this._setSDP(new RTCSessionDescription(msg.sdp));
      } else if (msg.ice) {
        this._setICE(new RTCIceCandidate(msg.ice));
      } else {
        this._setError(`unhandled JSON message: ${event.data}`);
      }
    } catch (e) {
      this._setError(`Failed to parse message: ${event.data}`);
    }
  };

  private _onServerClose = (): void => {
    if (this.state !== 'connecting') {
      this.state = 'disconnected';
      this._setError('Server closed connection.');
      this.ondisconnect?.();
    }
  };

  public connect(): void {
    this.state = 'connecting';
    this._setStatus('Connecting to server.');

    this.ws_conn = new WebSocket(this.server);

    this.ws_conn.addEventListener('open', this._onServerOpen);
    this.ws_conn.addEventListener('error', this._onServerError);
    this.ws_conn.addEventListener('message', this._onServerMessage);
    this.ws_conn.addEventListener('close', this._onServerClose);
  }

  public disconnect(): void {
    this.ws_conn?.close();
  }

  public sendICE(ice: RTCIceCandidate): void {
    this._setDebug(`sending ice candidate: ${JSON.stringify(ice)}`);
    this.ws_conn?.send(JSON.stringify({ ice }));
  }

  public sendSDP(sdp: RTCSessionDescriptionInit): void {
    this._setDebug(`sending local sdp: ${JSON.stringify(sdp)}`);
    this.ws_conn?.send(JSON.stringify({ sdp }));
  }
}