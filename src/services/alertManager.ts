// src/services/alertManager.ts
class AlertManager {
  triggerSOSAlert(memberName: string, latitude: number, longitude: number): void {
    console.log(`SOS triggered from ${memberName}`);
  }
}

export const alertManager = new AlertManager();
