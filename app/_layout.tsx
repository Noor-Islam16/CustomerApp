import { CartProvider } from "@/context/CartContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { SplashScreen, Stack, useRouter } from "expo-router";
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

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  // ALL HOOKS must be declared before any conditional returns
  const [fontsLoaded] = useFonts({
    Exotc350BdBTBold: require("@/assets/fonts/exotic.ttf"),
  });

  const [notification, setNotification] = useState<any>(null);

  const notificationListener = useRef<Notifications.EventSubscription | null>(
    null,
  );
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  // Hide splash screen once fonts are loaded
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Notification effects
  useEffect(() => {
    registerForPushNotificationsAsync();

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notif) => {
        console.log("📬 Notification received in foreground:", notif);
        setNotification(notif);
      });

    responseListener.current = addNotificationResponseReceivedListener(
      (screen) => {
        console.log("🧭 Navigating to:", screen);
        router.push(screen as any);
      },
    );

    checkInitialNotification();

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  const checkInitialNotification = async () => {
    try {
      const response = await Notifications.getLastNotificationResponseAsync();
      if (response) {
        const data = response.notification.request.content.data;
        console.log("🚀 App opened from notification:", data);

        if (data?.type === "approval_status") {
          setTimeout(() => {
            if (data.status === "approved") {
              router.push("/(tabs)/home" as any);
            } else {
              router.push("/(tabs)/account" as any);
            }
          }, 1000);
        }

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

  // NOW it's safe to conditionally return after all hooks
  if (!fontsLoaded) {
    return null;
  }

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
