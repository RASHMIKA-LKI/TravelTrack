// src/hooks/useAlerts.ts
import { useTrackingStore } from '../store/useTrackingStore';

/**
 * Use this hook in any screen to read and manage alerts.
 *
 * Usage example:
 *   const { alerts, unreadCount, sosActive, markAlertsRead } = useAlerts();
 */
export function useAlerts() {
  const alerts = useTrackingStore((state) => state.alerts);
  const markAlertsRead = useTrackingStore((state) => state.markAlertsRead);
  const sosActive = useTrackingStore((state) => state.sosActive);
  const sosTriggeredBy = useTrackingStore((state) => state.sosTriggeredBy);

  const unreadCount = alerts.filter((a) => !a.read).length;

  return {
    alerts,          // Full list of all alerts (newest first)
    unreadCount,     // Number badge — how many are unread
    sosActive,       // true when someone has triggered SOS
    sosTriggeredBy,  // Name of the person who triggered SOS
    markAlertsRead,  // Call this when the user opens the alerts screen
  };
}
