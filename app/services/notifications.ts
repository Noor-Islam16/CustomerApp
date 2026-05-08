import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { BASE_URL, getToken } from "./api";

const EXPO_PUSH_TOKEN_KEY = "@expo_push_token";
const EXPO_PROJECT_ID = Constants.expoConfig?.extra?.eas?.projectId;

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Register for Push Notifications ─────────────────────────────────────────
export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  try {
    if (!Device.isDevice) {
      console.log("📱 Must use physical device for push notifications");
      return null;
    }

    // Check permissions
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("❌ Push notification permission denied");
      return null;
    }

    // Get Expo push token -> Production
    const token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: EXPO_PROJECT_ID, // Get from app.json or Expo dashboard
      })
    ).data;
    //For development
    // const token = (await Notifications.getExpoPushTokenAsync()).data;

    console.log("✅ Push token:", token);

    // Save token locally
    await AsyncStorage.setItem(EXPO_PUSH_TOKEN_KEY, token);

    // Send token to backend
    await sendPushTokenToBackend(token);

    // Android specific channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Orders",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#00A884",
        sound: "default",
      });
    }

    return token;
  } catch (error) {
    console.error("❌ Error registering push notifications:", error);
    return null;
  }
}

// ─── Send token to backend ───────────────────────────────────────────────────
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
        device: Device.deviceName || "Unknown",
      }),
    });

    const data = await response.json();
    console.log("📤 Push token registered:", data.success ? "Yes" : "No");
  } catch (error) {
    console.error("❌ Failed to send push token:", error);
  }
}

// ─── Get stored push token ───────────────────────────────────────────────────
export async function getStoredPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(EXPO_PUSH_TOKEN_KEY);
}

// ─── Add notification response handler ───────────────────────────────────────
// In the addNotificationResponseReceivedListener callback
export function addNotificationResponseReceivedListener(
  navigationHandler: (screen: string) => void,
): Notifications.EventSubscription {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data;
      console.log("🔔 Notification tapped:", data);

      // Handle approval status notifications
      if (data?.type === "approval_status") {
        if (data.status === "approved") {
          navigationHandler("/(tabs)/home");
        } else {
          navigationHandler("/(tabs)/account");
        }
        return;
      }

      // Handle other notification types
      if (data?.screen) {
        navigationHandler(data.screen);
      }

      // Handle order status updates
      if (data?.type === "order_status_update" && data?.orderId) {
        navigationHandler(`/(tabs)/myorders?orderId=${data.orderId}`);
      }
    },
  );

  return subscription;
}

// ─── Set badge count ─────────────────────────────────────────────────────────
export async function setBadgeCount(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error("Failed to set badge count:", error);
  }
}

// ─── Clear badge ─────────────────────────────────────────────────────────────
export async function clearBadge(): Promise<void> {
  await setBadgeCount(0);
}
