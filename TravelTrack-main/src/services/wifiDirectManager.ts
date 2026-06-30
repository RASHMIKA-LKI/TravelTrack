import {
  initialize,
  createGroup,
  removeGroup,
  stopDiscoveringPeers,
  connect,
  getConnectionInfo,
  subscribeOnPeersUpdates,
  subscribeOnConnectionInfoUpdates,
  unsubscribeFromPeersUpdates,
  unsubscribeFromConnectionInfoUpdates,
} from "react-native-wifi-p2p";

class WifiDirectManager {
  private peersSubscription: any = null;
  private connectionSubscription: any = null;

  async startHosting(): Promise<void> {
    try {
      await initialize();
      await createGroup();
      console.log("✅ Wi-Fi Direct group created. Waiting for members...");
    } catch (error) {
      console.error("❌ Failed to create group:", error);
      throw error;
    }
  }

  async stopHosting(): Promise<void> {
    await removeGroup();
    console.log("Group stopped.");
  }

  async startScanning(onPeersFound: (peers: any[]) => void): Promise<void> {
    await initialize();

    this.peersSubscription = subscribeOnPeersUpdates(({ devices }: any) => {
      console.log("Found nearby devices:", devices);
      ~onPeersFound(devices);
    });
  }

  async stopScanning(): Promise<void> {
    await stopDiscoveringPeers();
    if (this.peersSubscription) {
      unsubscribeFromPeersUpdates(this.peersSubscription);
    }
  }

  async connectToLeader(deviceAddress: string): Promise<string> {
    try {
      await connect(deviceAddress);
      return new Promise((resolve, reject) => {
        this.connectionSubscription = subscribeOnConnectionInfoUpdates(
          (connectionInfo: any) => {
            const leaderIp = connectionInfo.groupOwnerAddress;
            console.log("✅ Connected! Leader IP:", leaderIp);
            unsubscribeFromConnectionInfoUpdates(this.connectionSubscription);
            resolve(leaderIp);
          },
        );
        setTimeout(() => reject(new Error("Connection timed out")), 15000);
      });
    } catch (error) {
      console.error("❌ Failed to connect:", error);
      throw error;
    }
  }

  async leaveGroup(): Promise<void> {
    await removeGroup();
  }
}

export const wifiDirectManager = new WifiDirectManager();
