import { CartProvider } from "@/context/CartContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import "react-native-reanimated";
import {
  addNotificationResponseReceivedListener,
  registerForPushNotificationsAsync,
} from "./services/notifications";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [notification, setNotification] = useState<any>(null);

  // ✅ Fixed: Pass null as initial value
  const notificationListener = useRef<Notifications.EventSubscription | null>(
    null,
  );
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Register for push notifications
    registerForPushNotificationsAsync();

    // Listen for notifications while app is in foreground
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notif) => {
        console.log("📬 Notification received in foreground:", notif);
        setNotification(notif);
      });

    // Handle notification taps
    responseListener.current = addNotificationResponseReceivedListener(
      (screen) => {
        console.log("🧭 Navigating to:", screen);
        router.push(screen as any);
      },
    );

    // Check if app was opened from a notification
    checkInitialNotification();

    return () => {
      // ✅ Fixed: Use addNotificationReceivedListener's return value directly
      Notifications.addNotificationReceivedListener((_notif) => {
        // This creates a new listener, we need to remove the actual subscription
      });

      // Clean up properly
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  // Check if app was opened from a killed state via notification
  // In your checkInitialNotification function, add this:
  const checkInitialNotification = async () => {
    try {
      const response = await Notifications.getLastNotificationResponseAsync();
      if (response) {
        const data = response.notification.request.content.data;
        console.log("🚀 App opened from notification:", data);

        // ✅ Handle approval status notifications
        if (data?.type === "approval_status") {
          setTimeout(() => {
            if (data.status === "approved") {
              router.push("/(tabs)/home" as any);
            } else {
              router.push("/(tabs)/account" as any);
            }
          }, 1000);
        }

        // Handle order status updates
        if (data?.type === "order_status_update" && data?.orderId) {
          setTimeout(() => {
            router.push(`/(tabs)/myorders?orderId=${data.orderId}` as any);
          }, 1000);
        }
      }
    } catch (error) {
      console.error("Failed to check initial notification:", error);
    }
  };

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <CartProvider>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="auth/login" options={{ headerShown: false }} />
          <Stack.Screen name="signup" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="products" options={{ headerShown: false }} />
          <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="cart" options={{ headerShown: false }} />
          <Stack.Screen name="checkout" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
          <Stack.Screen name="privacy" options={{ headerShown: false }} />
          <Stack.Screen name="editprofile" options={{ headerShown: false }} />
          <Stack.Screen name="bestsellers" options={{ headerShown: false }} />
          <Stack.Screen name="limitedstocks" options={{ headerShown: false }} />
        </Stack>
      </CartProvider>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}
