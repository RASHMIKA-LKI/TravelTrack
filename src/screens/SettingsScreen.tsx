// src/screens/SettingsScreen.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Switch,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from "react-native";
import { colors } from "../theme/colors";
import { useSettingsStore } from "../store/useSettingsStore";
import { useAuthStore } from "../store/useAuthStore";

export function SettingsScreen({ navigation }: any) {
  const settings = useSettingsStore();
  const { logout } = useAuthStore();

  // Local/Store fallbacks in case Member 5's store hasn't been loaded on current branch
  const soundEnabled = settings?.soundEnabled ?? true;
  const vibrationEnabled = settings?.vibrationEnabled ?? true;
  const gpsIntervalMs = settings?.gpsIntervalMs ?? 3000;
  const defaultRadiusMeters = settings?.defaultRadiusMeters ?? 50;

  const toggleSound = settings?.toggleSound ?? (() => {});
  const toggleVibration = settings?.toggleVibration ?? (() => {});
  const setGpsInterval = settings?.setGpsInterval ?? (() => {});
  const setDefaultRadius = settings?.setDefaultRadius ?? (() => {});

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Alert Notifications</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Sound Alerts</Text>
                <Text style={styles.settingDesc}>
                  Play warning siren and safety return sounds
                </Text>
              </View>
              <Switch
                value={soundEnabled}
                onValueChange={toggleSound}
                trackColor={{ false: "#D0D0D0", true: colors.primaryLight }}
                thumbColor={soundEnabled ? colors.primary : "#F4F3F4"}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Vibration Alerts</Text>
                <Text style={styles.settingDesc}>
                  Vibrate device on boundary warning triggers
                </Text>
              </View>
              <Switch
                value={vibrationEnabled}
                onValueChange={toggleVibration}
                trackColor={{ false: "#D0D0D0", true: colors.primaryLight }}
                thumbColor={vibrationEnabled ? colors.primary : "#F4F3F4"}
              />
            </View>
          </View>

          <Text style={styles.sectionTitle}>GPS Configuration</Text>
          <View style={styles.card}>
            <Text style={styles.settingLabel}>Location Sync Frequency</Text>
            <Text style={styles.settingDesc}>
              Frequency at which device GPS uploads coordinates
            </Text>

            <View style={styles.btnRow}>
              {[2000, 3000, 5000, 10000].map((interval) => {
                const active = gpsIntervalMs === interval;
                return (
                  <TouchableOpacity
                    key={interval}
                    style={[
                      styles.optionBtn,
                      active ? styles.optionBtnActive : null,
                    ]}
                    onPress={() => setGpsInterval(interval)}
                  >
                    <Text
                      style={[
                        styles.optionBtnText,
                        active ? styles.optionBtnTextActive : null,
                      ]}
                    >
                      {interval / 1000}s
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <Text style={styles.sectionTitle}>Geofence Configuration</Text>
          <View style={styles.card}>
            <Text style={styles.settingLabel}>Default Safe Radius</Text>
            <Text style={styles.settingDesc}>
              Initial safe boundary radius applied when hosting trips
            </Text>

            <View style={styles.btnRow}>
              {[25, 50, 75, 100].map((r) => {
                const active = defaultRadiusMeters === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.optionBtn,
                      active ? styles.optionBtnActive : null,
                    ]}
                    onPress={() => setDefaultRadius(r)}
                  >
                    <Text
                      style={[
                        styles.optionBtnText,
                        active ? styles.optionBtnTextActive : null,
                      ]}
                    >
                      {r}m
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity
            style={styles.logoutCard}
            onPress={logout}
            activeOpacity={0.8}
          >
            <Text style={styles.logoutText}>Log Out Account</Text>
            <Text style={styles.logoutIcon}>🚪</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              TravelTrack — Version 1.0.0 (Beta)
            </Text>
            <Text style={styles.footerText}>
              Keep your friends close, keep them safe.
            </Text>
          </View>
        </ScrollView>
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
  backText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  scroll: {
    flex: 1,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "#F9F9F9",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  settingDesc: {
    fontSize: 12,
    color: "#666666",
    marginTop: 3,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "#EAEAEA",
    marginVertical: 16,
  },
  btnRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  optionBtn: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  optionBtnActive: {
    borderColor: colors.primary,
    backgroundColor: "#E8F5F2",
  },
  optionBtnText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#666666",
  },
  optionBtnTextActive: {
    color: colors.primary,
  },
  logoutCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FFCDD2",
    marginTop: 8,
    marginBottom: 20,
  },
  logoutText: {
    color: "#C62828",
    fontSize: 16,
    fontWeight: "bold",
  },
  logoutIcon: {
    fontSize: 18,
  },
  footer: {
    alignItems: "center",
    marginVertical: 24,
    gap: 4,
  },
  footerText: {
    color: "#BBBBBB",
    fontSize: 11,
    fontWeight: "600",
  },
});
