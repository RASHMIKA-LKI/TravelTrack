// src/services/tcpSocketManager.ts
//
// In demo mode (Expo Go), react-native-tcp-socket is not available.
// We export a no-op stub instead of crashing on import.
// In a real APK build the full implementation is used.

import { NativeModules } from 'react-native';
import { LocationPayload, SOSPayload, ChatPayload } from '../types/payloads';

const isDemo = !NativeModules.TcpSockets;

const PORT = 8888;

// ─────────────────────────────────────────────────────────────────────────────
// NDJSON helpers (only needed in real mode but defined either way)
// ─────────────────────────────────────────────────────────────────────────────

function makeMessageHandler(onMessage: (payload: any) => void) {
  let buffer = '';
  return (data: Buffer | string) => {
    buffer += data.toString();
    let boundary = buffer.indexOf('\n');
    while (boundary !== -1) {
      const raw = buffer.slice(0, boundary).trim();
      buffer = buffer.slice(boundary + 1);
      if (raw.length > 0) {
        try {
          onMessage(JSON.parse(raw));
        } catch (e) {
          console.warn('⚠️ Failed to parse TCP message:', e, 'Raw:', raw.slice(0, 100));
        }
      }
      boundary = buffer.indexOf('\n');
    }
  };
}

function serialize(payload: any): string {
  return JSON.stringify(payload) + '\n';
}

// ─────────────────────────────────────────────────────────────────────────────
// DEMO STUB — all methods are no-ops
// ─────────────────────────────────────────────────────────────────────────────

class TcpSocketManagerStub {
  public onMessageReceived: ((payload: any) => void) | null = null;
  public onMemberConnected: ((socketId: number) => void) | null = null;
  public onMemberDisconnected: ((socketId: number) => void) | null = null;

  get isServerRunning(): boolean { return false; }
  get isClientConnected(): boolean { return false; }

  startServer(): void { console.log('🎭 [DEMO] tcpSocketManager.startServer() — no-op'); }
  stopServer(): void {}
  broadcast(_payload: any): void {}
  connectToServer(_leaderIp: string): Promise<void> { return Promise.resolve(); }
  send(_payload: any): void {}
  disconnect(): void {}
}

// ─────────────────────────────────────────────────────────────────────────────
// REAL IMPLEMENTATION
// ─────────────────────────────────────────────────────────────────────────────

class TcpSocketManagerReal {
  private server: any = null;
  private client: any = null;
  private connectedSockets: any[] = [];
  private _serverRunning = false;
  private _clientConnected = false;

  public onMessageReceived: ((payload: any) => void) | null = null;
  public onMemberConnected: ((socketId: number) => void) | null = null;
  public onMemberDisconnected: ((socketId: number) => void) | null = null;

  get isServerRunning(): boolean { return this._serverRunning; }
  get isClientConnected(): boolean { return this._clientConnected; }

  startServer(): void {
    if (this._serverRunning) {
      console.warn('⚠️ TCP server already running — stopping old one first.');
      this.stopServer();
    }

    // Lazy-require to avoid crashing at module load time
    const RawTcpSocket = require('react-native-tcp-socket');
    const TcpSocket = RawTcpSocket.default || RawTcpSocket;

    this.server = TcpSocket.createServer((socket: any) => {
      console.log('✅ A member connected via TCP!');
      socket.id = Date.now();
      this.connectedSockets.push(socket);
      if (this.onMemberConnected) this.onMemberConnected(socket.id);

      const handleData = makeMessageHandler((payload) => {
        if (this.onMessageReceived) this.onMessageReceived(payload);
      });
      socket.on('data', handleData);
      socket.on('close', () => {
        this.connectedSockets = this.connectedSockets.filter(s => s.id !== socket.id);
        if (this.onMemberDisconnected) this.onMemberDisconnected(socket.id);
        console.log('Member disconnected. Remaining sockets:', this.connectedSockets.length);
      });
      socket.on('error', (err: any) => {
        console.error('Member socket error:', err?.message);
        this.connectedSockets = this.connectedSockets.filter(s => s.id !== socket.id);
      });
    });

    this.server.listen({ port: PORT, host: '0.0.0.0' }, () => {
      this._serverRunning = true;
      console.log(`✅ TCP Server listening on port ${PORT}`);
    });

    this.server.on('error', (err: any) => {
      console.error('TCP Server error:', err?.message);
      // Mark server as stopped immediately so the next startServer() call
      // doesn't think it is still running and skip the guard.
      this._serverRunning = false;
      if (this.server) { try { this.server.close(); } catch (_) {} this.server = null; }
    });
  }

  broadcast(payload: any): void {
    if (!this._serverRunning) return;
    const message = serialize(payload);
    const dead: number[] = [];
    this.connectedSockets.forEach(socket => {
      try { socket.write(message); } catch (e) {
        console.warn('⚠️ Failed to write to member socket:', e);
        dead.push(socket.id);
      }
    });
    if (dead.length > 0) {
      this.connectedSockets = this.connectedSockets.filter(s => !dead.includes(s.id));
    }
  }

  stopServer(): void {
    this.connectedSockets.forEach(socket => { try { socket.destroy(); } catch (_) {} });
    this.connectedSockets = [];
    if (this.server) { try { this.server.close(); } catch (_) {} this.server = null; }
    this._serverRunning = false;
    console.log('TCP server stopped.');
  }

  connectToServer(leaderIp: string): Promise<void> {
    if (this._clientConnected || this.client) this.disconnect();
    const RawTcpSocket = require('react-native-tcp-socket');
    const TcpSocket = RawTcpSocket.default || RawTcpSocket;
    return new Promise((resolve, reject) => {
      let settled = false;

      // 15-second timeout so we never hang forever if the leader is unreachable
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          this.disconnect();
          reject(new Error('TCP connection timed out (15s). Make sure the leader device is running and nearby.'));
        }
      }, 15000);

      this.client = TcpSocket.createConnection({ port: PORT, host: leaderIp }, () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this._clientConnected = true;
        console.log('✅ Connected to leader TCP server!');
        resolve();
      });
      const handleData = makeMessageHandler((payload) => {
        if (this.onMessageReceived) this.onMessageReceived(payload);
      });
      this.client.on('data', handleData);
      this.client.on('close', () => { this._clientConnected = false; });
      this.client.on('error', (err: any) => {
        console.error('Client TCP error:', err?.message);
        this._clientConnected = false;
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
      });
    });
  }

  send(payload: any): void {
    if (!this._clientConnected || !this.client) {
      console.warn('⚠️ Tried to send TCP message but not connected. Skipping.');
      return;
    }
    try { this.client.write(serialize(payload)); } catch (e) {
      console.warn('Failed to send TCP message:', e);
    }
  }

  disconnect(): void {
    if (this.client) { try { this.client.destroy(); } catch (_) {} this.client = null; }
    this._clientConnected = false;
  }
}

// Export the right instance based on availability of the native module
export const tcpSocketManager: TcpSocketManagerStub | TcpSocketManagerReal = isDemo
  ? new TcpSocketManagerStub()
  : new TcpSocketManagerReal();
