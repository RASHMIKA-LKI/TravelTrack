import TcpSocket from "react-native-tcp-socket";

const PORT = 8888;

class TcpSocketManager {
  private server: any = null;
  private client: any = null;
  private connectedSockets: any[] = [];

  public onMessageReceived: ((payload: any) => void) | null = null;
  public onMemberConnected: ((socketId: number) => void) | null = null;
  public onMemberDisconnected: ((socketId: number) => void) | null = null;

  startServer(): void {
    this.server = TcpSocket.createServer((socket: any) => {
      console.log("✅ A member connected!");

      socket.id = Date.now();
      this.connectedSockets.push(socket);

      if (this.onMemberConnected) {
        this.onMemberConnected(socket.id);
      }

      socket.on("data", (data: any) => {
        try {
          const payload = JSON.parse(data.toString());
          if (this.onMessageReceived) {
            this.onMessageReceived(payload);
          }
        } catch (e) {
          console.warn("Failed to parse message:", e);
        }
      });

      socket.on("close", () => {
        this.connectedSockets = this.connectedSockets.filter(
          (s) => s.id !== socket.id,
        );
        if (this.onMemberDisconnected) {
          this.onMemberDisconnected(socket.id);
        }
      });

      socket.on("error", (err: any) => console.error("Socket error:", err));
    });

    this.server.listen({ port: PORT, host: "0.0.0.0" }, () => {
      console.log(`✅ TCP Server listening on port ${PORT}`);
    });
  }

  broadcast(payload: any): void {
    const message = JSON.stringify(payload);
    this.connectedSockets.forEach((socket) => {
      try {
        socket.write(message);
      } catch (e) {
        console.warn("Failed to send to socket:", e);
      }
    });
  }

  stopServer(): void {
    if (this.server) {
      this.server.close();
      this.connectedSockets = [];
    }
  }

  connectToServer(leaderIp: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client = TcpSocket.createConnection(
        { port: PORT, host: leaderIp },
        () => {
          console.log("✅ Connected to leader server!");
          resolve();
        },
      );

      this.client.on("data", (data: any) => {
        try {
          const payload = JSON.parse(data.toString());
          if (this.onMessageReceived) {
            this.onMessageReceived(payload);
          }
        } catch (e) {
          console.warn("Failed to parse message:", e);
        }
      });

      this.client.on("error", (err: any) => {
        console.error("Client error:", err);
        reject(err);
      });
    });
  }

  send(payload: any): void {
    if (this.client) {
      this.client.write(JSON.stringify(payload));
    }
  }

  disconnect(): void {
    if (this.client) {
      this.client.destroy();
      this.client = null;
    }
  }
}

export const tcpSocketManager = new TcpSocketManager();
