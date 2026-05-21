import AsyncStorage from "@react-native-async-storage/async-storage";
import messaging from "@react-native-firebase/messaging";
import * as Device from "expo-device";
import { Alert, PermissionsAndroid, Platform } from "react-native";
import { BASE_URL, getToken } from "./api";

const FCM_TOKEN_KEY = "@fcm_token";

export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  try {
    if (!Device.isDevice) {
      Alert.alert("Error", "Must use physical device for push notifications");
      return null;
    }

    if (Platform.OS === "android" && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: "Notification Permission",
          message:
            "Thump needs to send you notifications for order updates, offers, and important alerts.",
          buttonPositive: "Allow",
          buttonNegative: "Deny",
        },
      );

      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log("❌ Android notification permission denied");
        return null;
      }
    }

    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log("❌ Push notification permission denied");
      return null;
    }

    // Get FCM token
    const fcmToken = await messaging().getToken();
    console.log("✅ FCM Token:", fcmToken);

    if (fcmToken) {
      await AsyncStorage.setItem(FCM_TOKEN_KEY, fcmToken);
      await sendFCMTokenToBackend(fcmToken);
    }

    // Token refresh listener
    messaging().onTokenRefresh(async (newToken) => {
      console.log("🔄 FCM Token refreshed:", newToken);
      await AsyncStorage.setItem(FCM_TOKEN_KEY, newToken);
      await sendFCMTokenToBackend(newToken);
    });

    return fcmToken;
  } catch (error) {
    console.error("❌ Error registering push notifications:", error);
    return null;
  }
}

async function sendFCMTokenToBackend(token: string): Promise<void> {
  try {
    const authToken = await getToken();
    if (!authToken) {
      console.log("⚠️ Not authenticated, skipping FCM token registration");
      return;
    }

    const response = await fetch(`${BASE_URL}/auth/fcm-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        fcmToken: token,
        platform: Platform.OS,
        device: Device.deviceName || "Unknown",
      }),
    });

    const data = await response.json();

    if (data.success) {
      console.log("📤 FCM token registered:", data.tokenCount, "devices");
    } else {
      console.error("❌ Failed to register FCM token:", data.message);
    }
  } catch (error) {
    console.error("❌ Failed to send FCM token:", error);
  }
}

export async function removeFCMTokenFromBackend(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(FCM_TOKEN_KEY);
    const authToken = await getToken();

    if (!token || !authToken) return;

    const response = await fetch(`${BASE_URL}/auth/fcm-token`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        fcmToken: token,
      }),
    });

    const data = await response.json();

    if (data.success) {
      console.log("🗑️ FCM token removed from backend");
      await AsyncStorage.removeItem(FCM_TOKEN_KEY);
    }
  } catch (error) {
    console.error("❌ Failed to remove FCM token:", error);
  }
}

export async function getRegisteredDevices(): Promise<any[]> {
  try {
    const authToken = await getToken();
    if (!authToken) return [];

    const response = await fetch(`${BASE_URL}/auth/fcm-tokens`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const data = await response.json();

    if (data.success) {
      return data.fcmTokens || [];
    }
    return [];
  } catch (error) {
    console.error("❌ Failed to get FCM tokens:", error);
    return [];
  }
}

export function setupForegroundHandler() {
  return messaging().onMessage(async (remoteMessage) => {
    console.log("📬 Foreground message:", JSON.stringify(remoteMessage));
  });
}

export function setupBackgroundHandler() {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log("📬 Background message:", JSON.stringify(remoteMessage));
  });
}

export function addNotificationResponseReceivedListener(
  navigationHandler: (screen: string) => void,
): () => void {
  // ✅ Only handles background → foreground taps
  // Cold start (killed → tapped) is handled in index.tsx
  const unsubscribe = messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log("🔔 Notification opened:", JSON.stringify(remoteMessage));
    handleNavigation(remoteMessage.data, navigationHandler);
  });

  return unsubscribe;
}

function handleNavigation(
  data: Record<string, string> | undefined,
  navigationHandler: (screen: string) => void,
) {
  // If no data at all, navigate to notifications
  if (!data) {
    console.log("📭 No data in notification, navigating to notifications");
    navigationHandler("notifications");
    return;
  }

  console.log("🔍 Processing notification data:", JSON.stringify(data));

  // Handle approval status
  if (data.type === "approval_status") {
    const screen =
      data.status === "approved" ? "/(tabs)/home" : "/(tabs)/account";
    console.log("✅ Approval status navigation to:", screen);
    navigationHandler(screen);
    return;
  }

  // Handle order status updates
  if (data.type === "order_status_update" && data.orderId) {
    console.log(
      "📦 Order status update, navigating to myorders with orderId:",
      data.orderId,
    );
    navigationHandler("/(tabs)/myorders");
    return;
  }

  // Handle direct screen navigation
  if (data.screen) {
    console.log("🎯 Direct screen navigation to:", data.screen);
    navigationHandler(data.screen);
    return;
  }

  // Default fallback - navigate to notifications
  console.log("📍 No specific navigation match, defaulting to notifications");
  navigationHandler("notifications");
}
