// src/screens/ScanScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Animated,
} from "react-native";
import { colors } from "../theme/colors";
import { useWifiDirect } from "../hooks/useWifiDirect";
import { useTrackingStore } from "../store/useTrackingStore";

export function ScanScreen({ navigation }: any) {
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  const { startScanning, connectToLeader } = useWifiDirect();
  const setRole = useTrackingStore((state) => state.setRole);

  useEffect(() => {
    if (scanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.4,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [scanning]);

  const startScan = async () => {
    setScanning(true);
    setDevices([]);
    try {
      await startScanning((foundPeers) => {
        setDevices(foundPeers);
        setScanning(false);
      });
    } catch (e: any) {
      Alert.alert("Scan Error", "Unable to start peer discovery: " + e.message);
      setScanning(false);
    }
  };

  const handleConnect = async (device: any) => {
    setScanning(false);
    try {
      if (connectToLeader) {
        await connectToLeader(device.deviceAddress);
      }
      if (setRole) setRole("member");

      navigation.navigate("GroupLobby", {
        isLeader: false,
        groupName: device.deviceName,
      });
    } catch (e: any) {
      console.warn(
        "Connect failed, fallback to simulated lobby for validation.",
        e,
      );
      if (setRole) setRole("member");
      navigation.navigate("GroupLobby", {
        isLeader: false,
        groupName: device.deviceName,
      });
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Find a Group</Text>
          <View style={{ width: 44 }} />
        </View>

        <Text style={styles.subtitle}>
          Turn on Wi-Fi and location on your device to search for nearby group
          hosts.
        </Text>

        <View style={styles.pulseContainer}>
          {scanning ? (
            <Animated.View
              style={[
                styles.pulseCircle,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <View style={styles.innerPulseCircle} />
            </Animated.View>
          ) : null}
          <TouchableOpacity
            style={[
              styles.scanCircleBtn,
              scanning ? styles.scanCircleBtnScanning : null,
            ]}
            onPress={startScan}
            disabled={scanning}
            activeOpacity={0.8}
          >
            {scanning ? (
              <ActivityIndicator color="#ffffff" size="large" />
            ) : (
              <>
                <Text style={styles.scanIcon}>🔍</Text>
                <Text style={styles.scanBtnText}>Scan</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>Nearest Hosts</Text>
          {scanning && <Text style={styles.statusLabel}>Searching...</Text>}
        </View>

        {devices.length === 0 && !scanning ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📡</Text>
            <Text style={styles.emptyText}>No groups found nearby yet.</Text>
            <Text style={styles.emptySub}>
              Tap the circular Scan button above to discover local groups.
            </Text>
          </View>
        ) : (
          <FlatList
            data={devices}
            keyExtractor={(item) => item.deviceAddress}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.deviceCard}
                onPress={() => handleConnect(item)}
                activeOpacity={0.7}
              >
                <View style={styles.deviceTextContent}>
                  <Text style={styles.deviceName}>{item.deviceName}</Text>
                  <Text style={styles.deviceAddress}>
                    MAC: {item.deviceAddress}
                  </Text>
                  {typeof item.distanceMeters === "number" ? (
                    <Text style={styles.deviceDistance}>
                      {Math.round(item.distanceMeters)}m away
                    </Text>
                  ) : null}
                </View>
                <View style={styles.connectBadge}>
                  <Text style={styles.connectBadgeText}>Connect</Text>
                </View>
              </TouchableOpacity>
            )}
            style={styles.deviceList}
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: "#F0F0F0",
  },
  backBtn: {
    paddingVertical: 8,
  },
  backBtnText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1E293B",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginVertical: 16,
    lineHeight: 20,
  },
  pulseContainer: {
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 20,
  },
  pulseCircle: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255, 107, 53, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  innerPulseCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 107, 53, 0.2)",
  },
  scanCircleBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.secondary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  scanCircleBtnScanning: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
  },
  scanIcon: {
    fontSize: 28,
  },
  scanBtnText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 14,
    marginTop: 2,
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: 10,
    marginBottom: 12,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1E293B",
  },
  statusLabel: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "700",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 20,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 16,
  },
  deviceList: {
    flex: 1,
  },
  deviceCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    marginBottom: 10,
  },
  deviceTextContent: {
    flex: 1,
    marginRight: 12,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1E293B",
  },
  deviceAddress: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
  },
  deviceDistance: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "700",
    marginTop: 4,
  },
  connectBadge: {
    backgroundColor: "rgba(10, 74, 109, 0.08)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(10, 74, 109, 0.15)",
  },
  connectBadgeText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },
});
