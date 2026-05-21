import ApprovalModal from "@/components/ApprovalModal";
import { ApprovalProvider, useApproval } from "@/context/ApprovalContext";
import { CartProvider } from "@/context/CartContext";
import { FontProvider } from "@/context/FontContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
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
  registerForPushNotificationsAsync,
  setupBackgroundHandler,
  setupForegroundHandler,
} from "./services/notifications";

export const unstable_settings = { anchor: "(tabs)" };

SplashScreen.preventAutoHideAsync();

// ✅ MUST be at module level — before any React code runs
setupBackgroundHandler();

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
  const cleanupListener = useRef<(() => void) | null>(null);

  useEffect(() => {
    setTimeout(() => SplashScreen.hideAsync(), 500);
  }, []);

  useEffect(() => {
    // ✅ No delay on notification listener — must register immediately
    registerForPushNotificationsAsync();

    const unsubscribeForeground = setupForegroundHandler();

    cleanupListener.current = addNotificationResponseReceivedListener(
      (screen) => {
        console.log("🧭 Navigating to:", screen);
        router.push(screen as any);
      },
    );

    return () => {
      unsubscribeForeground();
      if (cleanupListener.current) {
        cleanupListener.current();
      }
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
