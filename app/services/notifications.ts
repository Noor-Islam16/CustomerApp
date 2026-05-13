import AsyncStorage from "@react-native-async-storage/async-storage";
import messaging, {
  FirebaseMessagingTypes,
} from "@react-native-firebase/messaging";
import { Platform } from "react-native";
import { BASE_URL, getToken } from "./api";

const FCM_TOKEN_KEY = "@fcm_push_token";

// ─── Register for Push Notifications ─────────────────────────────────────────
export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  try {
    // Request permission (iOS)
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log("❌ FCM permission denied");
      return null;
    }

    // Get FCM token
    const token = await messaging().getToken();
    console.log("✅ FCM Token:", token);

    await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
    await sendPushTokenToBackend(token);

    // Android notification channel
    if (Platform.OS === "android") {
      const { default: notifee } = await import("@notifee/react-native").catch(
        () => ({ default: null }),
      );
      // If you're not using notifee, skip — FCM handles channels on Android 8+
      // via the manifest or firebase config
    }

    // Listen for token refresh
    messaging().onTokenRefresh(async (newToken) => {
      console.log("🔄 FCM token refreshed:", newToken);
      await AsyncStorage.setItem(FCM_TOKEN_KEY, newToken);
      await sendPushTokenToBackend(newToken);
    });

    return token;
  } catch (error) {
    console.error("❌ Error registering FCM:", error);
    return null;
  }
}

// ─── Send token to backend ────────────────────────────────────────────────────
export async function sendPushTokenToBackend(token: string): Promise<void> {
  try {
    const authToken = await getToken();
    if (!authToken) {
      console.log("⚠️ Not authenticated, skipping push token registration");
      return;
    }

    const response = await fetch(`${BASE_URL}/auth/push-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        pushToken: token,
        platform: Platform.OS,
        tokenType: "fcm",
      }),
    });

    const data = await response.json();
    console.log("📤 FCM token registered:", data.success ? "Yes" : "No");
  } catch (error) {
    console.error("❌ Failed to send FCM token:", error);
  }
}

// ─── Navigation handler (shared) ─────────────────────────────────────────────
function handleNavigation(
  data: Record<string, any> | undefined,
  navigationHandler: (screen: string) => void,
) {
  if (!data) return;

  if (data.type === "approval_status") {
    navigationHandler(
      data.status === "approved" ? "/(tabs)/home" : "/(tabs)/account",
    );
    return;
  }
  if (data.type === "order_status_update" && data.orderId) {
    navigationHandler(`/(tabs)/myorders?orderId=${data.orderId}`);
    return;
  }
  if (data.screen) {
    navigationHandler(data.screen);
  }
}

// ─── Foreground message listener ─────────────────────────────────────────────
// Call this once in your layout to handle messages while app is open
export function setupForegroundMessageHandler(
  onMessage?: (message: FirebaseMessagingTypes.RemoteMessage) => void,
): () => void {
  const unsubscribe = messaging().onMessage(async (remoteMessage) => {
    console.log("📬 FCM foreground message:", remoteMessage.data);
    onMessage?.(remoteMessage);
    // FCM doesn't auto-display when app is open — show a local notification
    // or update your in-app notification state here
  });
  return unsubscribe;
}

// ─── Add notification response handler (background tap) ──────────────────────
export function addNotificationResponseReceivedListener(
  navigationHandler: (screen: string) => void,
): { remove: () => void } {
  // App in background → user taps notification
  const unsubscribeBackground = messaging().onNotificationOpenedApp(
    (remoteMessage) => {
      console.log("🔔 FCM tapped (background):", remoteMessage.data);
      handleNavigation(remoteMessage.data, navigationHandler);
    },
  );

  return {
    remove: () => {
      unsubscribeBackground();
    },
  };
}

// ─── Check if app was opened from a notification (quit state) ─────────────────
export async function checkInitialFCMNotification(
  navigationHandler: (screen: string) => void,
): Promise<void> {
  const remoteMessage = await messaging().getInitialNotification();
  if (remoteMessage) {
    console.log("🚀 App opened from quit state via FCM:", remoteMessage.data);
    setTimeout(() => {
      handleNavigation(remoteMessage.data, navigationHandler);
    }, 1000);
  }
}

// ─── Get stored FCM token ─────────────────────────────────────────────────────
export async function getStoredPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(FCM_TOKEN_KEY);
}

// ─── Badge helpers (no-ops without expo-notifications — handle via notifee if needed) ──
export async function setBadgeCount(count: number): Promise<void> {
  console.log("Badge count:", count, "— install notifee for badge support");
}

export async function clearBadge(): Promise<void> {
  await setBadgeCount(0);
}
