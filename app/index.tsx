// app/index.tsx
import { Text } from "@/context/FontContext";
import messaging from "@react-native-firebase/messaging";
import * as NavigationBar from "expo-navigation-bar";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import Colors from "../constants/colors";
import { apiGetMe, getToken } from "./services/api";

const { height } = Dimensions.get("window");

export default function Index() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  // ✅ Store pending cold-start notification screen
  const pendingNotificationScreen = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === "android") {
        NavigationBar.setBackgroundColorAsync(Colors.gradientStart);
        NavigationBar.setButtonStyleAsync("light");
      }
    }, []),
  );

  useEffect(() => {
    // ✅ Check for cold start notification FIRST before anything else
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log(
            "🚀 Cold start notification detected:",
            JSON.stringify(remoteMessage.data),
          );
          // Store it — we'll navigate after auth check completes
          const data = remoteMessage.data;
          if (!data) {
            pendingNotificationScreen.current = "notifications";
          } else if (data.type === "approval_status") {
            pendingNotificationScreen.current =
              data.status === "approved" ? "/(tabs)/home" : "/(tabs)/account";
          } else if (data.type === "order_status_update") {
            pendingNotificationScreen.current = "/(tabs)/myorders";
          } else if (data.screen) {
            pendingNotificationScreen.current = data.screen as string;
          } else {
            pendingNotificationScreen.current = "notifications";
          }
          console.log(
            "📌 Pending notification screen:",
            pendingNotificationScreen.current,
          );
        }
      });

    // Logo entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulsing dots loop
    const pulseDot = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ).start();

    pulseDot(dot1, 0);
    pulseDot(dot2, 180);
    pulseDot(dot3, 360);

    // Auth check
    const bootstrap = async () => {
      try {
        const token = await getToken();
        if (token) {
          const userData = await apiGetMe();
          if (userData.success && userData.user?.isProfileComplete) {
            // ✅ If notification is pending, go there instead of home
            if (pendingNotificationScreen.current) {
              console.log(
                "🔔 Auth OK + notification pending → navigating to:",
                pendingNotificationScreen.current,
              );
              router.replace(pendingNotificationScreen.current as any);
              pendingNotificationScreen.current = null;
            } else {
              router.replace("/(tabs)/home");
            }
            return;
          }
        }
      } catch {
        // token expired or invalid — fall through to login
      }

      // ✅ Not authenticated — go to login regardless of notification
      // (notification will be re-handled when user logs in next time)
      router.replace("/auth/login");
    };

    bootstrap();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Colors.gradientStart}
      />

      <View style={styles.gradientBg}>
        <View style={styles.gradientOverlay} />
      </View>

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require("../assets/images/logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.tagline} boldVariant="exotc">
          Electronic Accessories In Your Way.
        </Text>

        <View style={styles.dotsRow}>
          {[dot1, dot2, dot3].map((dot, i) => (
            <Animated.View key={i} style={[styles.dot, { opacity: dot }]} />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.gradientStart,
    alignItems: "center",
    justifyContent: "center",
  },
  gradientBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.gradientStart,
  },
  gradientOverlay: {
    flex: 1,
    backgroundColor: Colors.gradientEnd,
    opacity: 0.3,
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 32,
  },
  logoContainer: {
    marginBottom: 12,
  },
  logoImage: {
    width: 280,
    height: 120,
  },
  tagline: {
    fontSize: 20,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 40,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
});
