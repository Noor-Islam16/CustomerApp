import ApprovalModal from "@/components/ApprovalModal";
import { ApprovalProvider, useApproval } from "@/context/ApprovalContext";
import { CartProvider } from "@/context/CartContext";
import { FontProvider } from "@/context/FontContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import messaging from "@react-native-firebase/messaging";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { SplashScreen, Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import "react-native-reanimated";
import {
  addNotificationResponseReceivedListener,
  checkInitialFCMNotification,
  registerForPushNotificationsAsync,
  setupForegroundMessageHandler,
} from "./services/notifications";

export const unstable_settings = {
  anchor: "(tabs)",
};

// ── Must be outside component tree ──────────────────────────────────────────
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log("📬 FCM background message:", remoteMessage.data);
});

SplashScreen.preventAutoHideAsync();

function ApprovalModalWrapper() {
  const { showApprovalModal, setShowApprovalModal } = useApproval();

  return (
    <ApprovalModal
      visible={showApprovalModal}
      onClose={() => setShowApprovalModal(false)}
    />
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const foregroundUnsub = useRef<(() => void) | null>(null);
  const backgroundSub = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    setTimeout(() => {
      SplashScreen.hideAsync();
    }, 500);
  }, []);

  useEffect(() => {
    // Register device and save FCM token to backend
    registerForPushNotificationsAsync();

    // Foreground: app is open, message arrives
    foregroundUnsub.current = setupForegroundMessageHandler((message) => {
      console.log(
        "📬 FCM foreground message:",
        message.notification?.title,
        message.data,
      );
      // FCM won't auto-display when app is open
      // Add notifee here if you want foreground banners
    });

    // Background: app was in background, user tapped notification
    backgroundSub.current = addNotificationResponseReceivedListener(
      (screen) => {
        console.log("🧭 Navigating to:", screen);
        router.push(screen as any);
      },
    );

    // Quit state: app was fully closed, user tapped notification
    checkInitialFCMNotification((screen) => {
      router.push(screen as any);
    });

    return () => {
      foregroundUnsub.current?.();
      backgroundSub.current?.remove();
    };
  }, []);

  return (
    <FontProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <ApprovalProvider>
          <CartProvider>
            <Stack>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen
                name="auth/login"
                options={{ headerShown: false }}
              />
              <Stack.Screen name="signup" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="products" options={{ headerShown: false }} />
              <Stack.Screen
                name="product/[id]"
                options={{ headerShown: false }}
              />
              <Stack.Screen name="cart" options={{ headerShown: false }} />
              <Stack.Screen name="checkout" options={{ headerShown: false }} />
              <Stack.Screen
                name="notifications"
                options={{ headerShown: false }}
              />
              <Stack.Screen name="privacy" options={{ headerShown: false }} />
              <Stack.Screen
                name="editprofile"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="bestsellers"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="limitedstocks"
                options={{ headerShown: false }}
              />
            </Stack>
            <ApprovalModalWrapper />
          </CartProvider>
        </ApprovalProvider>
      </ThemeProvider>
      <StatusBar style="dark" />
    </FontProvider>
  );
}
