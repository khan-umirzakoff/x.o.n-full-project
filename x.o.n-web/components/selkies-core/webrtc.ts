import { Input } from './input';
import { WebRTCSignalling } from './signalling';

// This is a simplified version of the WebRTCDemo class, focusing on the core logic
// needed for the React component integration. The original's stats and debug
// functionalities are kept but could be expanded or removed as needed.

// --- START: Type definitions for WebRTC Stats ---
interface ConnectionStats {
  general: GeneralStats;
  video: VideoStats;
  audio: AudioStats;
  data: DataChannelStats;
  reports?: any;
  allReports?: RTCStatsReport[];
}

interface GeneralStats {
  bytesReceived: number;
  bytesSent: number;
  connectionType: string;
  currentRoundTripTime: number | null;
  availableReceiveBandwidth: number;
  packetsReceived: number;
  packetsLost: number;
}

interface VideoStats {
  bytesReceived: number;
  decoder: string;
  frameHeight: number;
  frameWidth: number;
  framesPerSecond: number;
  packetsReceived: number;
  packetsLost: number;
  codecName: string;
  jitterBufferDelay: number;
  jitterBufferEmittedCount: number;
  jitter?: number; // Added for compatibility with StatsPanel
}

interface AudioStats {
  bytesReceived: number;
  packetsReceived: number;
  packetsLost: number;
  codecName: string;
  jitterBufferDelay: number;
  jitterBufferEmittedCount: number;
  jitter?: number; // Added for compatibility with StatsPanel
}

interface DataChannelStats {
  bytesReceived: number;
  bytesSent: number;
  messagesReceived: number;
  messagesSent: number;
}
// --- END: Type definitions for WebRTC Stats ---


export class WebRTCPlayer {
  private signalling: WebRTCSignalling;
  private element: HTMLVideoElement;

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
  public onclipboardcontent: ((content: string) => void) | null;
  public oncursorchange: ((handle: number, curdata: string, hotspot: { x: number, y: number }, override: string) => void) | null;
  public onsystemaction: ((action: string) => void) | null;
  public ongpustats: ((stats: any) => void) | null;
  public onsystemstats: ((stats: any) => void) | null;
  public onlatencymeasurement: ((latency: number) => void) | null;


  // INPUT lifecycle guard to avoid multiple attachments
  private inputAttached: boolean;
  private cursor_cache: Map<number, string>;


  constructor(
    signalling: WebRTCSignalling,
    element: HTMLVideoElement
  ) {
    this.signalling = signalling;
    this.element = element;

    this.forceTurn = false;
    this.rtcPeerConfig = {
      iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
    };
    this.peerConnection = null;
    this._connected = false;
    this.send_channel = null;
    this.cursor_cache = new Map();

    this.input = new Input(this.element, (data: string) => {
      if (this._connected && this.send_channel?.readyState === 'open') {
        this.send_channel.send(data);
      }
    });
    this.inputAttached = false;

    // Initialize callbacks
    this.onstatus = null;
    this.ondebug = null;
    this.onerror = null;
    this.onconnectionstatechange = null;
    this.ondatachannelopen = null;
    this.ondatachannelclose = null;
    this.onplaystreamrequired = null;
    this.onclipboardcontent = null;
    this.oncursorchange = null;
    this.onsystemaction = null;
    this.ongpustats = null;
    this.onsystemstats = null;
    this.onlatencymeasurement = null;


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
    this.peerConnection?.addIceCandidate(icecandidate).catch(this._setError.bind(this));
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
    if (this.peerConnection?.signalingState === 'closed') {
        this._setDebug('Connection is already closed, ignoring SDP offer.');
        return;
    }
    this.peerConnection?.setRemoteDescription(sdp).then(() => {
      this._setDebug('Creating answer');
      this.peerConnection?.createAnswer()
        .then(this._onLocalSDP)
        .catch(() => this._setError('Error creating local SDP'));
    });
  };

  private _onLocalSDP = (local_sdp: RTCLocalSessionDescriptionInit) => {
    // --- START: SDP Manipulation ---
    if (local_sdp.sdp) {
        // Set sps-pps-idr-in-keyframe=1
        if (!(/[^-]sps-pps-idr-in-keyframe=1[^\d]/gm.test(local_sdp.sdp)) && (/[^-]packetization-mode=/gm.test(local_sdp.sdp))) {
            console.log("Overriding WebRTC SDP to include sps-pps-idr-in-keyframe=1");
            if (/[^-]sps-pps-idr-in-keyframe=\d+/gm.test(local_sdp.sdp)) {
                local_sdp.sdp = local_sdp.sdp.replace(/sps-pps-idr-in-keyframe=\d+/gm, 'sps-pps-idr-in-keyframe=1');
            } else {
                local_sdp.sdp = local_sdp.sdp.replace('packetization-mode=', 'sps-pps-idr-in-keyframe=1;packetization-mode=');
            }
        }
        if (local_sdp.sdp.indexOf('multiopus') === -1) {
            // Override SDP to enable stereo on WebRTC Opus with Chromium, must be munged before the Local Description
            if (!(/[^-]stereo=1[^\d]/gm.test(local_sdp.sdp)) && (/[^-]useinbandfec=/gm.test(local_sdp.sdp))) {
                console.log("Overriding WebRTC SDP to allow stereo audio");
                if (/[^-]stereo=\d+/gm.test(local_sdp.sdp)) {
                    local_sdp.sdp = local_sdp.sdp.replace(/stereo=\d+/gm, 'stereo=1');
                } else {
                    local_sdp.sdp = local_sdp.sdp.replace('useinbandfec=', 'stereo=1;useinbandfec=');
                }
            }
            // OPUS_FRAME: Override SDP to reduce packet size to 10 ms
            if (!(/[^-]minptime=10[^\d]/gm.test(local_sdp.sdp)) && (/[^-]useinbandfec=/gm.test(local_sdp.sdp))) {
                console.log("Overriding WebRTC SDP to allow low-latency audio packet");
                if (/[^-]minptime=\d+/gm.test(local_sdp.sdp)) {
                    local_sdp.sdp = local_sdp.sdp.replace(/minptime=\d+/gm, 'minptime=10');
                } else {
                    local_sdp.sdp = local_sdp.sdp.replace('useinbandfec=', 'minptime=10;useinbandfec=');
                }
            }
        }
    }
    // --- END: SDP Manipulation ---

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
    this.send_channel.onopen = () => {
      // Attach input listeners when data channel is ready to send
      if (!this.inputAttached) {
        this.input.attach();
        this.inputAttached = true;
      }
      this.ondatachannelopen?.();
    };
    this.send_channel.onclose = () => {
      // Detach input when channel closes
      if (this.inputAttached) {
        this.input.detach();
        this.inputAttached = false;
      }
      this.ondatachannelclose?.();
    };
  };

  private _onPeerDataChannelMessage = (event: MessageEvent) => {
    // Attempt to parse message as JSON
    let msg;
    try {
        msg = JSON.parse(event.data);
    } catch (e) {
        // Special case for clipboard, which may not be JSON
        if (event.data.startsWith("cw,")) {
            const content = event.data.substring(3);
            this.onclipboardcontent?.(content);
        } else {
            this._setError(`error parsing data channel message as JSON: ${event.data}`);
        }
        return;
    }

    this._setDebug(`data channel message: ${event.data}`);

    const { type, data } = msg;

    switch (type) {
        case 'pipeline':
            this._setStatus(data.status);
            break;
        case 'gpu_stats':
            this.ongpustats?.(data);
            break;
        case 'clipboard':
            if (data?.content) {
                const text = atob(data.content); // Assuming base64ToString utility will be added
                this._setDebug(`received clipboard contents, length: ${data.content.length}`);
                this.onclipboardcontent?.(text);
            }
            break;
        case 'cursor':
            if (data) {
                const { curdata, handle, hotspot, override } = data;
                this._setDebug(`received new cursor contents, handle: ${handle}, hotspot: ${JSON.stringify(hotspot)} image length: ${curdata.length}`);
                this.oncursorchange?.(handle, curdata, hotspot, override);
            }
            break;
        case 'system':
            if (data?.action) {
                this._setDebug(`received system msg, action: ${data.action}`);
                this.onsystemaction?.(data.action);
            }
            break;
        case 'ping':
            this._setDebug(`received server ping: ${JSON.stringify(data)}`);
            this.sendDataChannelMessage(`pong,${new Date().getTime() / 1000}`);
            break;
        case 'system_stats':
            this._setDebug(`received systems stats: ${JSON.stringify(data)}`);
            this.onsystemstats?.(data);
            break;
        case 'latency_measurement':
            this.onlatencymeasurement?.(data.latency_ms);
            break;
        default:
            this._setError(`Unhandled message received: ${type}`);
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
        // Ensure input listeners are removed on disconnect-like states
        if (this.inputAttached) {
          this.input.detach();
          this.inputAttached = false;
        }
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
    this.inputAttached = false;
    this.send_channel?.close();
    this.peerConnection?.close();
    this.signalling.disconnect();
    this._connected = false;
  }

  /**
   * Attempts to reset the webrtc connection by:
   *   1. Closing the data channel gracefully.
   *   2. Closing the RTC Peer Connection gracefully.
   *   3. Reconnecting to the signaling server.
   */
  public reset() {
      if (!this.peerConnection) {
          this.connect();
          return;
      }
      // Clear cursor cache.
      this.cursor_cache = new Map();

      const signalState = this.peerConnection.signalingState;
      if (this.send_channel?.readyState === "open") {
          this.send_channel.close();
      }
      this.peerConnection.close();

      if (signalState !== "stable") {
          setTimeout(() => {
              this.connect();
          }, 3000);
      } else {
          this.connect();
      }
  }

  /**
   * Gets connection stats. returns new promise.
   */
  public async getConnectionStats(): Promise<ConnectionStats | null> {
    if (!this.peerConnection) {
        return null;
    }
    const pc = this.peerConnection;

    return new Promise((resolve, reject) => {
        pc.getStats().then((stats: RTCStatsReport) => {
            const connectionDetails: ConnectionStats = {
                general: { bytesReceived: 0, bytesSent: 0, connectionType: "NA", currentRoundTripTime: null, availableReceiveBandwidth: 0, packetsReceived: 0, packetsLost: 0 },
                video: { bytesReceived: 0, decoder: "NA", frameHeight: 0, frameWidth: 0, framesPerSecond: 0, packetsReceived: 0, packetsLost: 0, codecName: "NA", jitterBufferDelay: 0, jitterBufferEmittedCount: 0 },
                audio: { bytesReceived: 0, packetsReceived: 0, packetsLost: 0, codecName: "NA", jitterBufferDelay: 0, jitterBufferEmittedCount: 0 },
                data: { bytesReceived: 0, bytesSent: 0, messagesReceived: 0, messagesSent: 0 },
                allReports: Array.from(stats.values()),
            };

            const reports: any = {
                transports: {},
                candidatePairs: {},
                selectedCandidatePairId: null,
                remoteCandidates: {},
                codecs: {},
                videoRTP: null,
                audioRTP: null,
            };

            stats.forEach((report: any) => {
                if (report.type === "transport") {
                    reports.transports[report.id] = report;
                } else if (report.type === "candidate-pair" && report.selected) {
                    reports.candidatePairs[report.id] = report;
                    reports.selectedCandidatePairId = report.id;
                } else if (report.type === "inbound-rtp") {
                    if (report.kind === "video") reports.videoRTP = report;
                    else if (report.kind === "audio") reports.audioRTP = report;
                } else if (report.type === "remote-candidate") {
                    reports.remoteCandidates[report.id] = report;
                } else if (report.type === "codec") {
                    reports.codecs[report.id] = report;
                }
            });

            const { videoRTP, audioRTP, codecs, transports, candidatePairs, selectedCandidatePairId, remoteCandidates } = reports;

            if (videoRTP) {
                connectionDetails.video = {
                    ...connectionDetails.video,
                    bytesReceived: videoRTP.bytesReceived,
                    decoder: videoRTP.decoderImplementation || "unknown",
                    frameHeight: videoRTP.frameHeight,
                    frameWidth: videoRTP.frameWidth,
                    framesPerSecond: videoRTP.framesPerSecond,
                    packetsReceived: videoRTP.packetsReceived,
                    packetsLost: videoRTP.packetsLost,
                    jitter: videoRTP.jitter,
                    codecName: codecs[videoRTP.codecId]?.mimeType.split("/")[1].toUpperCase() || "NA",
                    jitterBufferDelay: videoRTP.jitterBufferDelay,
                    jitterBufferEmittedCount: videoRTP.jitterBufferEmittedCount,
                };
            }

            if (audioRTP) {
                connectionDetails.audio = {
                    ...connectionDetails.audio,
                    bytesReceived: audioRTP.bytesReceived,
                    packetsReceived: audioRTP.packetsReceived,
                    packetsLost: audioRTP.packetsLost,
                    jitter: audioRTP.jitter,
                    codecName: codecs[audioRTP.codecId]?.mimeType.split("/")[1].toUpperCase() || "NA",
                    jitterBufferDelay: audioRTP.jitterBufferDelay,
                    jitterBufferEmittedCount: audioRTP.jitterBufferEmittedCount,
                };
            }

            const transport = Object.keys(transports).length > 0 ? transports[Object.keys(transports)[0]] : null;
            if (transport) {
                connectionDetails.general.bytesReceived = transport.bytesReceived;
                connectionDetails.general.bytesSent = transport.bytesSent;
            }

            const candidatePair = selectedCandidatePairId ? candidatePairs[selectedCandidatePairId] : null;
            if (candidatePair) {
                connectionDetails.general.availableReceiveBandwidth = candidatePair.availableIncomingBitrate || 0;
                connectionDetails.general.currentRoundTripTime = candidatePair.currentRoundTripTime || null;
                const remoteCandidate = remoteCandidates[candidatePair.remoteCandidateId];
                if (remoteCandidate) {
                    connectionDetails.general.connectionType = remoteCandidate.candidateType;
                }
            }

            connectionDetails.general.packetsReceived = (connectionDetails.video.packetsReceived || 0) + (connectionDetails.audio.packetsReceived || 0);
            connectionDetails.general.packetsLost = (connectionDetails.video.packetsLost || 0) + (connectionDetails.audio.packetsLost || 0);

            resolve(connectionDetails);
        }).catch(reject);
    });
  }
}