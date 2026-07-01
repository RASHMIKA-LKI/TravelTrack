  // src/services/tcpSocketManager.ts

type MessagePayload = {
  type: string;
  [key: string]: any;
};

class TcpSocketManager {
  /** Callback invoked whenever a message is received (set by hooks) */
  onMessageReceived: ((payload: MessagePayload) => void) | null = null;

  /**
   * LEADER: Start the TCP server and listen for incoming member connections.
   */
  startServer(): void {
    console.log('[TCPSocket] Server started — listening for member connections');
    // TODO: Member 3 implements real socket server here
  }

  /**
   * MEMBER: Connect to the leader's TCP server at the given IP.
   */
  async connectToServer(leaderIp: string): Promise<void> {
    console.log(`[TCPSocket] Connecting to leader at ${leaderIp}`);
    // TODO: Member 3 implements real TCP client connection here
  }

  /**
   * LEADER: Broadcast a message to all connected members.
   */
  broadcast(payload: MessagePayload): void {
    console.log('[TCPSocket] Broadcast:', JSON.stringify(payload));
    // TODO: Member 3 implements real broadcast here
  }

  /**
   * MEMBER: Send a message to the leader.
   */
  send(payload: MessagePayload): void {
    console.log('[TCPSocket] Send:', JSON.stringify(payload));
    // TODO: Member 3 implements real send here
  }
}

export const tcpSocketManager = new TcpSocketManager();
