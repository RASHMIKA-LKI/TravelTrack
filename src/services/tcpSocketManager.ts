import { NativeModules } from 'react-native';

const isDemo = !NativeModules.TcpSockets;
const PORT = 8888;
const HEARTBEAT_INTERVAL_MS = 5_000;
const CONNECTION_TIMEOUT_MS = 16_000;
const MAX_FRAME_BYTES = 64 * 1024;

type MessageHandler = (payload: any, socketId?: number) => void;
type DisconnectHandler = (memberId: string | null, socketId: number) => void;

interface ServerPeer {
  socket: any;
  socketId: number;
  memberId: string | null;
  lastPacketAt: number;
}

function nonce(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function serialize(payload: any): string {
  return JSON.stringify(payload) + '\n';
}

function makeMessageHandler(
  onMessage: (payload: any) => void,
  onProtocolError: (reason: string) => void
) {
  let buffer = '';
  return (data: Buffer | string) => {
    buffer += data.toString();
    if (buffer.length > MAX_FRAME_BYTES) {
      buffer = '';
      onProtocolError('Incoming TCP frame exceeded the 64 KiB limit.');
      return;
    }

    let boundary = buffer.indexOf('\n');
    while (boundary !== -1) {
      const raw = buffer.slice(0, boundary).trim();
      buffer = buffer.slice(boundary + 1);
      if (raw.length > MAX_FRAME_BYTES) {
        onProtocolError('Incoming TCP message exceeded the 64 KiB limit.');
        return;
      }
      if (raw) {
        try {
          onMessage(JSON.parse(raw));
        } catch {
          onProtocolError('Incoming TCP message was not valid JSON.');
          return;
        }
      }
      boundary = buffer.indexOf('\n');
    }
  };
}

class TcpSocketManagerStub {
  public onMessageReceived: MessageHandler | null = null;
  public onMemberConnected: ((socketId: number) => void) | null = null;
  public onMemberDisconnected: DisconnectHandler | null = null;
  public onClientConnectionChanged: ((connected: boolean) => void) | null = null;

  get isServerRunning(): boolean { return false; }
  get isClientConnected(): boolean { return false; }
  get connectedClientCount(): number { return 0; }
  get currentLeaderIp(): string | null { return null; }

  startServer(): Promise<void> { console.log('🎭 [DEMO] TCP server is simulated.'); return Promise.resolve(); }
  stopServer(): void {}
  broadcast(_payload: any): number { return 0; }
  sendToSocket(_socketId: number, _payload: any): boolean { return false; }
  associateSocket(_socketId: number, _memberId: string): void {}
  getMemberIdForSocket(_socketId: number): string | null { return null; }
  isMemberAssociated(_memberId: string, _exceptSocketId?: number): boolean { return false; }
  connectToServer(_leaderIp: string): Promise<void> { return Promise.resolve(); }
  send(_payload: any): boolean { return false; }
  disconnect(): void {}
}

class TcpSocketManagerReal {
  private server: any = null;
  private client: any = null;
  private peers = new Map<number, ServerPeer>();
  private _serverRunning = false;
  private _clientConnected = false;
  private _currentLeaderIp: string | null = null;
  private clientLastPacketAt = 0;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private nextSocketId = 1;

  public onMessageReceived: MessageHandler | null = null;
  public onMemberConnected: ((socketId: number) => void) | null = null;
  public onMemberDisconnected: DisconnectHandler | null = null;
  public onClientConnectionChanged: ((connected: boolean) => void) | null = null;

  get isServerRunning(): boolean { return this._serverRunning; }
  get isClientConnected(): boolean { return this._clientConnected; }
  get connectedClientCount(): number { return this.peers.size; }
  get currentLeaderIp(): string | null { return this._currentLeaderIp; }

  private ensureHeartbeat(): void {
    if (this.heartbeatInterval) return;
    this.heartbeatInterval = setInterval(() => this.runHeartbeat(), HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeatIfIdle(): void {
    if ((this._serverRunning || this._clientConnected) || !this.heartbeatInterval) return;
    clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = null;
  }

  private runHeartbeat(): void {
    const now = Date.now();
    if (this._serverRunning) {
      for (const peer of this.peers.values()) {
        if (now - peer.lastPacketAt > CONNECTION_TIMEOUT_MS) {
          try { peer.socket.destroy(); } catch (_) {}
          continue;
        }
        try { peer.socket.write(serialize({ type: 'PING', nonce: nonce(), timestamp: now })); } catch (_) {
          try { peer.socket.destroy(); } catch (_) {}
        }
      }
    }

    if (this._clientConnected) {
      if (now - this.clientLastPacketAt > CONNECTION_TIMEOUT_MS) {
        this.disconnect();
      } else {
        this.send({ type: 'PING', nonce: nonce(), timestamp: now });
      }
    }
  }

  private removePeer(socketId: number): void {
    const peer = this.peers.get(socketId);
    if (!peer) return;
    this.peers.delete(socketId);
    this.onMemberDisconnected?.(peer.memberId, socketId);
  }

  startServer(): Promise<void> {
    if (this._serverRunning || this.server) this.stopServer();
    const RawTcpSocket = require('react-native-tcp-socket');
    const TcpSocket = RawTcpSocket.default || RawTcpSocket;

    return new Promise((resolve, reject) => {
    const createAndListen = (retryCount: number) => {
      this.server = TcpSocket.createServer((socket: any) => {
        const socketId = this.nextSocketId++;
        const peer: ServerPeer = { socket, socketId, memberId: null, lastPacketAt: Date.now() };
        this.peers.set(socketId, peer);
        this.onMemberConnected?.(socketId);

        const handleData = makeMessageHandler(
          (payload) => {
            peer.lastPacketAt = Date.now();
            if (payload?.type === 'PING') {
              try { socket.write(serialize({ type: 'PONG', nonce: payload.nonce, timestamp: Date.now() })); } catch (_) {}
              return;
            }
            if (payload?.type === 'PONG') return;
            this.onMessageReceived?.(payload, socketId);
          },
          (reason) => {
            console.warn('TCP protocol error:', reason);
            try { socket.destroy(); } catch (_) {}
          }
        );
        socket.on('data', handleData);
        socket.on('close', () => this.removePeer(socketId));
        socket.on('error', () => {
          try { socket.destroy(); } catch (_) {}
          this.removePeer(socketId);
        });
      });

      this.server.listen({ port: PORT, host: '0.0.0.0' }, () => {
        this._serverRunning = true;
        this.ensureHeartbeat();
        console.log(`✅ TCP Server listening on port ${PORT}`);
        resolve();
      });

      this.server.on('error', (error: any) => {
        this._serverRunning = false;
        if (this.server) { try { this.server.close(); } catch (_) {} }
        this.server = null;
        if (retryCount < 1 && String(error?.message || '').includes('EADDRINUSE')) {
          setTimeout(() => createAndListen(retryCount + 1), 1500);
        } else {
          console.error('TCP Server error:', error?.message);
          this.stopHeartbeatIfIdle();
          reject(error);
        }
      });
    };

    createAndListen(0);
    });
  }

  associateSocket(socketId: number, memberId: string): void {
    const peer = this.peers.get(socketId);
    if (peer) peer.memberId = memberId;
  }

  getMemberIdForSocket(socketId: number): string | null {
    return this.peers.get(socketId)?.memberId ?? null;
  }

  isMemberAssociated(memberId: string, exceptSocketId?: number): boolean {
    for (const peer of this.peers.values()) {
      if (peer.socketId !== exceptSocketId && peer.memberId === memberId) return true;
    }
    return false;
  }

  sendToSocket(socketId: number, payload: any): boolean {
    const peer = this.peers.get(socketId);
    if (!peer) return false;
    try {
      peer.socket.write(serialize(payload));
      return true;
    } catch {
      try { peer.socket.destroy(); } catch (_) {}
      return false;
    }
  }

  broadcast(payload: any): number {
    if (!this._serverRunning) return 0;
    let sent = 0;
    for (const peer of this.peers.values()) {
      if (this.sendToSocket(peer.socketId, payload)) sent += 1;
    }
    return sent;
  }

  stopServer(): void {
    for (const peer of this.peers.values()) {
      try { peer.socket.destroy(); } catch (_) {}
    }
    this.peers.clear();
    if (this.server) { try { this.server.close(); } catch (_) {} }
    this.server = null;
    this._serverRunning = false;
    this.stopHeartbeatIfIdle();
  }

  connectToServer(leaderIp: string): Promise<void> {
    if (this._clientConnected || this.client) this.disconnect();
    const RawTcpSocket = require('react-native-tcp-socket');
    const TcpSocket = RawTcpSocket.default || RawTcpSocket;

    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        this.disconnect();
        reject(new Error('TCP connection timed out (15s).'));
      }, 15_000);

      this.client = TcpSocket.createConnection({ port: PORT, host: leaderIp }, () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this._clientConnected = true;
        this._currentLeaderIp = leaderIp;
        this.clientLastPacketAt = Date.now();
        this.ensureHeartbeat();
        this.onClientConnectionChanged?.(true);
        resolve();
      });

      const handleData = makeMessageHandler(
        (payload) => {
          this.clientLastPacketAt = Date.now();
          if (payload?.type === 'PING') {
            this.send({ type: 'PONG', nonce: payload.nonce, timestamp: Date.now() });
            return;
          }
          if (payload?.type === 'PONG') return;
          this.onMessageReceived?.(payload);
        },
        (reason) => {
          console.warn('TCP protocol error:', reason);
          this.disconnect();
        }
      );
      this.client.on('data', handleData);
      this.client.on('close', () => this.handleClientClosed());
      this.client.on('error', (error: any) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(error);
        }
        this.handleClientClosed();
      });
    });
  }

  private handleClientClosed(): void {
    const wasConnected = this._clientConnected;
    this._clientConnected = false;
    this.client = null;
    if (wasConnected) this.onClientConnectionChanged?.(false);
    this.stopHeartbeatIfIdle();
  }

  send(payload: any): boolean {
    if (!this._clientConnected || !this.client) return false;
    try {
      this.client.write(serialize(payload));
      return true;
    } catch {
      this.disconnect();
      return false;
    }
  }

  disconnect(): void {
    const wasConnected = this._clientConnected;
    if (this.client) { try { this.client.destroy(); } catch (_) {} }
    this.client = null;
    this._clientConnected = false;
    this._currentLeaderIp = null;
    if (wasConnected) this.onClientConnectionChanged?.(false);
    this.stopHeartbeatIfIdle();
  }
}

export const tcpSocketManager: TcpSocketManagerStub | TcpSocketManagerReal = isDemo
  ? new TcpSocketManagerStub()
  : new TcpSocketManagerReal();
