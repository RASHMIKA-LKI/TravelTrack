// src/services/tcpSocketManager.ts
import TcpSocket from "react-native-tcp-socket";

const PORT = 8888; // The "channel number" both sides must use

class TcpSocketManager {
  private server: any = null; // Leader's server
  private client: any = null; // Member's connection to leader
  private connectedSockets: any[] = []; // List of member connections (leader only)

  // Callback functions — other code sets these to receive data
  public onMessageReceived: ((payload: any) => void) | null = null;
  public onMemberConnected: ((socketId: number) => void) | null = null;
  public onMemberDisconnected: ((socketId: number) => void) | null = null;

  // ─────────────────────────────────────────
  // LEADER: Start a server to receive from members
  // ─────────────────────────────────────────

  startServer(): void {
    this.server = TcpSocket.createServer((socket: any) => {
      console.log("✅ A member connected!");

      socket.id = Date.now(); // Give each socket a unique ID
      this.connectedSockets.push(socket);

      if (this.onMemberConnected) {
        this.onMemberConnected(socket.id);
      }

      // When data arrives from a member
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

      // When a member disconnects
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

    // Start listening on all network interfaces
    this.server.listen({ port: PORT, host: "0.0.0.0" }, () => {
      console.log(`✅ TCP Server listening on port ${PORT}`);
    });
  }

  /** Leader: Send a message to ALL connected members */
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

  /** Leader: Stop the server */
  stopServer(): void {
    if (this.server) {
      this.server.close();
      this.connectedSockets = [];
    }
  }

  // ─────────────────────────────────────────
  // MEMBER: Connect to leader's server
  // ─────────────────────────────────────────

  /** Member: Connect to the leader's IP address */
  connectToServer(leaderIp: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client = TcpSocket.createConnection(
        { port: PORT, host: leaderIp },
        () => {
          console.log("✅ Connected to leader server!");
          resolve();
        },
      );

      // When data arrives from leader
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

  /** Member: Send a message to the leader */
  send(payload: any): void {
    if (this.client) {
      this.client.write(JSON.stringify(payload));
    }
  }

  /** Member: Disconnect */
  disconnect(): void {
    if (this.client) {
      this.client.destroy();
      this.client = null;
    }
  }
}

export const tcpSocketManager = new TcpSocketManager();
