// src/services/alertManager.ts
import { Vibration, Alert } from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';
// Note: react-native-sound is used for audio
// import Sound from 'react-native-sound';

class AlertManager {

  /**
   * Triggered when a member goes out of the 50m radius.
   * Medium vibration + warning sound.
   */
  triggerOutOfRangeAlert(memberName: string, distance: number): void {
    console.log(`⚠️ ALERT: ${memberName} is ${distance}m away — OUT OF RANGE!`);

    // Vibration pattern: vibrate, pause, vibrate, pause, vibrate
    if (useSettingsStore.getState().vibrationEnabled) {
      Vibration.vibrate([0, 500, 200, 500, 200, 500]);
    }

    // Show in-app alert
    Alert.alert(
      '⚠️ Member Out of Range',
      `${memberName} is ${Math.round(distance)}m away — outside the safe zone!`,
      [{ text: 'OK' }]
    );

    // TODO: Add sound: this.playSound('alert_warning.mp3')
  }

  /**
   * Triggered when someone hits the SOS button.
   * Emergency siren + full-screen alert.
   */
  triggerSOSAlert(memberName: string, latitude: number, longitude: number): void {
    console.log(`🆘 SOS from ${memberName} at ${latitude}, ${longitude}`);

    // Long repeated vibration
    if (useSettingsStore.getState().vibrationEnabled) {
      Vibration.vibrate([0, 1000, 300, 1000, 300, 1000], true);
    }

    Alert.alert(
      '🆘 SOS ALERT!',
      latitude || longitude
        ? `${memberName} needs help. Their last reported location is available.`
        : `${memberName} needs help. No GPS location was included.`,
      [
        {
          text: 'Acknowledge',
          onPress: () => {
            Vibration.cancel(); // Stop vibrating when acknowledged
          },
        },
      ],
      { cancelable: false } // User MUST press acknowledge
    );

    // TODO: Add siren sound: this.playSound('sos_siren.mp3', { loop: true })
  }

  /**
   * Triggered when a member comes back into range.
   * Short happy vibration.
   */
  triggerReturnAlert(memberName: string): void {
    console.log(`✅ ${memberName} returned to safe zone`);
    if (useSettingsStore.getState().vibrationEnabled) Vibration.vibrate(200);
    // TODO: Add success sound: this.playSound('member_returned.mp3')
  }

  /**
   * Stop all alerts (vibrations and sounds)
   */
  cancelAll(): void {
    Vibration.cancel();
    // TODO: Stop all sounds
  }
}

// Export a single shared instance
export const alertManager = new AlertManager();
