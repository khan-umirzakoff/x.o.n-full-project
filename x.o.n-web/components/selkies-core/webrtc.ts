import { Input } from './input';
import { WebRTCSignalling } from './signalling';
import { base64ToString } from './util';

// This is a simplified version of the WebRTCDemo class, focusing on the core logic
// needed for the React component integration. The original's stats and debug
// functionalities are kept but could be expanded or removed as needed.

export class WebRTCPlayer {
  private signalling: WebRTCSignalling;
  private element: HTMLVideoElement;
  private peer_id: number;

  public forceTurn: boolean;
  public rtcPeerConfig: RTCConfiguration;
  public peerConnection: RTCPeerConnection | null;
  private _connected: boolean;
  private send_channel: RTCDataChannel | null;
  public input: Input;

  // Callbacks
  public onstatus: ((message: string) => void) | null;
  public ondebug: ((message: string) => void) | null;
  public onerror: ((message: string) => void) | null;
  public onconnectionstatechange: ((state: RTCPeerConnectionState) => void) | null;
  public ondatachannelopen: (() => void) | null;
  public ondatachannelclose: (() => void) | null;
  public onplaystreamrequired: (() => void) | null;

  constructor(
    signalling: WebRTCSignalling,
    element: HTMLVideoElement,
    peer_id: number
  ) {
    this.signalling = signalling;
    this.element = element;
    this.peer_id = peer_id;

    this.forceTurn = false;
    this.rtcPeerConfig = {
      iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
    };
    this.peerConnection = null;
    this._connected = false;
    this.send_channel = null;

    this.input = new Input(this.element, (data: string) => {
      if (this._connected && this.send_channel?.readyState === 'open') {
        this.send_channel.send(data);
      }
    });

    // Initialize callbacks
    this.onstatus = null;
    this.ondebug = null;
    this.onerror = null;
    this.onconnectionstatechange = null;
    this.ondatachannelopen = null;
    this.ondatachannelclose = null;
    this.onplaystreamrequired = null;

    // Bind signalling server callbacks.
    this.signalling.onsdp = this._onSDP.bind(this);
    this.signalling.onice = this._onSignallingICE.bind(this);
  }

  private _setStatus(message: string) {
    this.onstatus?.(message);
  }

  private _setDebug(message: string) {
    this.ondebug?.(message);
  }

  private _setError(message: string) {
    this.onerror?.(message);
  }

  private _onSignallingICE(icecandidate: RTCIceCandidate) {
    this._setDebug(`received ice candidate from signalling server: ${JSON.stringify(icecandidate)}`);
    this.peerConnection?.addIceCandidate(icecandidate).catch(this._setError);
  }

  private _onPeerICE = (event: RTCPeerConnectionIceEvent) => {
    if (event.candidate) {
      this.signalling.sendICE(event.candidate);
    }
  };

  private _onSDP = (sdp: RTCSessionDescription) => {
    if (sdp.type !== 'offer') {
      this._setError('received SDP was not type offer.');
      return;
    }
    this._setDebug('Received remote SDP offer');
    this.peerConnection?.setRemoteDescription(sdp).then(() => {
      this._setDebug('Creating answer');
      this.peerConnection?.createAnswer()
        .then(this._onLocalSDP)
        .catch(() => this._setError('Error creating local SDP'));
    });
  };

  private _onLocalSDP = (local_sdp: RTCLocalSessionDescriptionInit) => {
    this._setDebug('Created local SDP');
    this.peerConnection?.setLocalDescription(local_sdp).then(() => {
      this._setDebug('Sending SDP answer');
      if (this.peerConnection?.localDescription) {
        this.signalling.sendSDP(this.peerConnection.localDescription);
      }
    });
  };

  private _ontrack = (event: RTCTrackEvent) => {
    this._setStatus(`Received incoming ${event.track.kind} stream from peer`);
    if (event.streams && event.streams[0]) {
        this.element.srcObject = event.streams[0];
        this.playStream();
    }
  };

  private _onPeerDataChannel = (event: RTCDataChannelEvent) => {
    this._setStatus(`Peer data channel created: ${event.channel.label}`);
    this.send_channel = event.channel;
    this.send_channel.onmessage = this._onPeerDataChannelMessage;
    this.send_channel.onopen = () => this.ondatachannelopen?.();
    this.send_channel.onclose = () => this.ondatachannelclose?.();
  };

  private _onPeerDataChannelMessage = (event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data);
      // Handle different message types from the server (simplified)
      if (msg.type === 'ping') {
        this.sendDataChannelMessage(`pong,${new Date().getTime() / 1000}`);
      }
    } catch (e) {
      // Ignore non-json messages for now
    }
  };

  private _handleConnectionStateChange = () => {
    const state = this.peerConnection?.connectionState;
    if (state) {
        this.onconnectionstatechange?.(state);
    }
    switch (state) {
      case 'connected':
        this._setStatus('Connection complete');
        this._connected = true;
        break;
      case 'disconnected':
      case 'failed':
      case 'closed':
        this._setError(`Peer connection ${state}`);
        this.send_channel?.close();
        this._connected = false;
        break;
    }
  };

  public sendDataChannelMessage(message: string) {
    if (this.send_channel?.readyState === 'open') {
      this.send_channel.send(message);
    } else {
      this._setError('Attempt to send data channel message before channel was open.');
    }
  }

  public playStream() {
    this.element.load();
    this.element.play().catch(() => {
        this.onplaystreamrequired?.();
    });
  }

  public connect() {
    this.peerConnection = new RTCPeerConnection(this.rtcPeerConfig);
    this.peerConnection.ontrack = this._ontrack;
    this.peerConnection.onicecandidate = this._onPeerICE;
    this.peerConnection.ondatachannel = this._onPeerDataChannel;
    this.peerConnection.onconnectionstatechange = this._handleConnectionStateChange;

    if (this.forceTurn) {
      this._setStatus('Forcing use of TURN server');
      const config = this.peerConnection.getConfiguration();
      config.iceTransportPolicy = 'relay';
      this.peerConnection.setConfiguration(config);
    }
    this.signalling.connect();
  }

  public disconnect() {
    this.input.detach();
    this.send_channel?.close();
    this.peerConnection?.close();
    this.signalling.disconnect();
    this._connected = false;
  }
}