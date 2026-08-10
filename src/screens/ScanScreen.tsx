// src/screens/ScanScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { useWifiDirect } from '../hooks/useWifiDirect';
import { useTrackingStore } from '../store/useTrackingStore';
import { isDemoMode } from '../utils/isDemoMode';
import { startDemo, DEMO_PEERS } from '../services/demoService';
import { CameraView, useCameraPermissions } from 'expo-camera';

const DEMO = isDemoMode();

export function ScanScreen({ navigation }: any) {
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const qrLockedRef = useRef(false);

  const { startScanning, connectToLeader } = useWifiDirect();
  const setRole = useTrackingStore((state) => state.setRole);

  const handleQRScanned = async (scannedModel: string) => {
    // Expo camera may emit the same barcode for several frames. One scan must
    // produce one discovery session, never several competing P2P requests.
    if (qrLockedRef.current) return;
    qrLockedRef.current = true;
    setShowScanner(false);
    if (!scannedModel) return;

    // ── DEMO MODE ───────────────────────────────────────────────
    if (DEMO || scannedModel === 'DEMO_PEER') {
      startDemo();
      setRole('member');
      navigation.navigate('GroupLobby', { isLeader: false, groupName: "Demo QR Trip (Kandy)" });
      return;
    }
    // ──────────────────────────────────────────────────────────

    if (!scannedModel.startsWith('traveltrack:group:')) {
      qrLockedRef.current = false;
      Alert.alert('Invalid invitation', 'Scan the QR code shown in the leader’s TravelTrack lobby.');
      return;
    }

    // The QR code confirms the invitation but cannot safely contain a volatile
    // Wi-Fi Direct MAC address. Show the discovered hosts and let the traveller
    // choose the nearby leader instead of guessing from a model name.
    await startScan();
  };

  const openScanner = async () => {
    if (!permission) return;
    if (!permission.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Permission Required', 'Camera permission is needed to scan QR codes.');
        return;
      }
    }
    qrLockedRef.current = false;
    setShowScanner(true);
  };

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
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [scanning]);

  const startScan = async () => {
    setScanning(true);
    setDevices([]);

    // ── DEMO MODE ───────────────────────────────────────────────
    if (DEMO) {
      setTimeout(() => {
        setDevices(DEMO_PEERS);
        setScanning(false);
      }, 2200);
      return;
    }
    // ──────────────────────────────────────────────────────────

    try {
      if (startScanning) {
        await startScanning((foundPeers) => {
          setDevices(foundPeers);
          setScanning(false);
        });
      }
    } catch (e: any) {
      Alert.alert('Scan Error', 'Unable to start peer discovery: ' + e.message);
      setScanning(false);
    }
  };

  const handleConnect = async (device: any) => {
    setScanning(false);

    // ── DEMO MODE ───────────────────────────────────────────────
    if (DEMO) {
      startDemo();
      setRole('member');
      navigation.navigate('GroupLobby', { isLeader: false, groupName: device.deviceName });
      return;
    }
    // ──────────────────────────────────────────────────────────

    try {
      if (connectToLeader) {
        await connectToLeader(device.deviceAddress);
      }
      if (setRole) setRole('member');
      navigation.navigate('GroupLobby', { isLeader: false, groupName: device.deviceName });
    } catch (e: any) {
      Alert.alert(
        'Connection Failed',
        'Could not connect to the group leader. Make sure both devices have Wi-Fi and Location turned on, and that the leader has already created a group.\n\nError: ' + e.message,
        [{ text: 'OK' }]
      );
    }
  };

  if (showScanner) {
    return (
      <SafeAreaView style={styles.scannerSafe}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={({ data }) => handleQRScanned(data)}
        />
        
        {/* Scanner Overlay UI */}
        <View style={styles.scannerOverlay}>
          <View style={styles.scannerTargetFrame} />
          <Text style={styles.scannerTip}>Align the Leader's QR Code inside the frame</Text>
          
          <TouchableOpacity style={styles.closeScannerBtn} onPress={() => setShowScanner(false)}>
            <Text style={styles.closeScannerBtnText}>Cancel Scan</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Find a Group</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* ── Demo Banner ── */}
        {DEMO && (
          <View style={styles.demoBanner}>
            <Text style={styles.demoBannerText}>🎭 DEMO MODE — Tap Scan to see simulated groups</Text>
          </View>
        )}

        <Text style={styles.subtitle}>
          {DEMO
            ? 'Tap the Scan button to discover simulated nearby groups.'
            : 'Turn on Wi-Fi and location on your device to search for nearby group hosts.'}
        </Text>

        <View style={styles.pulseContainer}>
          {scanning ? (
            <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.innerPulseCircle} />
            </Animated.View>
          ) : null}
          <TouchableOpacity
            style={[styles.scanCircleBtn, scanning ? styles.scanCircleBtnScanning : null]}
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

        {/* Scan via QR Code Option */}
        <View style={styles.qrOptionContainer}>
          <TouchableOpacity style={styles.qrScanBtn} onPress={openScanner}>
            <Text style={styles.qrScanBtnIcon}>📷</Text>
            <Text style={styles.qrScanBtnText}>Scan Leader QR Code</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>Nearby Hosts</Text>
          {scanning && <Text style={styles.statusLabel}>Searching...</Text>}
        </View>

        {devices.length === 0 && !scanning ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📡</Text>
            <Text style={styles.emptyText}>No groups found nearby yet.</Text>
            <Text style={styles.emptySub}>Tap the circular Scan button above to discover local groups.</Text>
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
                  <Text style={styles.deviceAddress}>MAC: {item.deviceAddress}</Text>
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
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
  },
  backBtn: {
    paddingVertical: 8,
  },
  backBtnText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginVertical: 16,
    lineHeight: 20,
  },
  pulseContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  pulseCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerPulseCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
  },
  scanCircleBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
    marginTop: 2,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 10,
    marginBottom: 12,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  statusLabel: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
  },
  deviceList: {
    flex: 1,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  deviceTextContent: {
    flex: 1,
    marginRight: 12,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  deviceAddress: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  connectBadge: {
    backgroundColor: 'rgba(10, 74, 109, 0.08)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(10, 74, 109, 0.15)',
  },
  connectBadgeText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  demoBanner: {
    backgroundColor: '#6C3FC5',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 4,
    alignItems: 'center',
  },
  demoBannerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  qrOptionContainer: {
    marginVertical: 12,
    alignItems: 'center',
    width: '100%',
  },
  qrScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A4A6D',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    shadowColor: '#0A4A6D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  qrScanBtnIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  qrScanBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  scannerSafe: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  scannerTargetFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#0A4A6D',
    borderRadius: 20,
    backgroundColor: 'transparent',
    marginBottom: 20,
    borderStyle: 'dashed',
  },
  scannerTip: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 24,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: 40,
  },
  closeScannerBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  closeScannerBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
