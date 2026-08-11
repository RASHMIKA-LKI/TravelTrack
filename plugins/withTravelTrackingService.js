const fs = require('fs');
const path = require('path');
const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
  withMainApplication,
} = require('@expo/config-plugins');

const SERVICE = `package com.traveltrack

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class TravelTrackingService : Service() {
  companion object { const val CHANNEL_ID = "traveltrack_active_tracking"; const val NOTIFICATION_ID = 4102 }
  override fun onCreate() {
    super.onCreate()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      getSystemService(NotificationManager::class.java).createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "Active group tracking", NotificationManager.IMPORTANCE_LOW).apply {
          description = "Shown while TravelTrack shares location with an offline group"
        }
      )
    }
  }
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val openApp = packageManager.getLaunchIntentForPackage(packageName) ?: Intent(this, MainActivity::class.java)
    val pendingIntent = PendingIntent.getActivity(this, 0, openApp, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle("TravelTrack group tracking active")
      .setContentText("Location sharing continues while the screen is locked")
      .setContentIntent(pendingIntent).setOngoing(true).setOnlyAlertOnce(true)
      .setCategory(NotificationCompat.CATEGORY_SERVICE).build()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
    } else startForeground(NOTIFICATION_ID, notification)
    return START_STICKY
  }
  override fun onDestroy() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) stopForeground(STOP_FOREGROUND_REMOVE)
    else @Suppress("DEPRECATION") stopForeground(true)
    super.onDestroy()
  }
  override fun onBind(intent: Intent?): IBinder? = null
}
`;

const MODULE = `package com.traveltrack

import android.content.Intent
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class TravelTrackingModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName(): String = "TravelTracking"
  @ReactMethod fun start(promise: Promise) {
    try { ContextCompat.startForegroundService(context, Intent(context, TravelTrackingService::class.java)); promise.resolve(true) }
    catch (error: Exception) { promise.reject("FOREGROUND_TRACKING_START_FAILED", error) }
  }
  @ReactMethod fun stop(promise: Promise) {
    try { context.stopService(Intent(context, TravelTrackingService::class.java)); promise.resolve(true) }
    catch (error: Exception) { promise.reject("FOREGROUND_TRACKING_STOP_FAILED", error) }
  }
}
`;

const PACKAGE = `package com.traveltrack

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class TravelTrackingPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> = listOf(TravelTrackingModule(reactContext))
  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
`;

function withTrackingManifest(config) {
  return withAndroidManifest(config, (mod) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    application.service = application.service || [];
    if (!application.service.some((service) => service.$?.['android:name'] === '.TravelTrackingService')) {
      application.service.push({
        $: {
          'android:name': '.TravelTrackingService',
          'android:exported': 'false',
          'android:foregroundServiceType': 'location',
        },
      });
    }
    return mod;
  });
}

function withTrackingPackageRegistration(config) {
  return withMainApplication(config, (mod) => {
    if (!mod.modResults.contents.includes('add(TravelTrackingPackage())')) {
      mod.modResults.contents = mod.modResults.contents.replace(
        '// add(MyReactNativePackage())',
        '// add(MyReactNativePackage())\n              add(TravelTrackingPackage())'
      );
    }
    return mod;
  });
}

function withTrackingSources(config) {
  return withDangerousMod(config, ['android', async (mod) => {
    const sourceDir = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/java/com/traveltrack');
    await fs.promises.mkdir(sourceDir, { recursive: true });
    await Promise.all([
      fs.promises.writeFile(path.join(sourceDir, 'TravelTrackingService.kt'), SERVICE),
      fs.promises.writeFile(path.join(sourceDir, 'TravelTrackingModule.kt'), MODULE),
      fs.promises.writeFile(path.join(sourceDir, 'TravelTrackingPackage.kt'), PACKAGE),
    ]);
    return mod;
  }]);
}

module.exports = function withTravelTrackingService(config) {
  config = withTrackingManifest(config);
  config = withTrackingPackageRegistration(config);
  return withTrackingSources(config);
};
