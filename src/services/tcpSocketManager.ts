// src/services/tcpSocketManager.ts
class TcpSocketManager {
  broadcast(payload: any): void {
    console.log('TCP Broadcast:', payload);
  }
  send(payload: any): void {
    console.log('TCP Send:', payload);
  }
}

export const tcpSocketManager = new TcpSocketManager();
