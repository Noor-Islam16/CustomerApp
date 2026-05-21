// tabs/_layout.tsx
import { useApproval } from "@/context/ApprovalContext";
import { Text, useFont } from "@/context/FontContext";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useFocusEffect } from "expo-router";
import React, { useCallback, useRef } from "react";
import { Animated, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const COLORS = {
  accent: "#00A884", // brand green
  accentLight: "#E6F7F4", // soft tint for pill background
  accentDark: "#007A61", // darker shade for label
  inactive: "#B0B8C1", // muted grey
  surface: "#FFFFFF",
  border: "rgba(0,0,0,0.06)",
  shadow: "rgba(0,0,0,0.10)",
};

const TAB_BAR_HEIGHT = 64;
const PILL_HEIGHT = 44;

// ─── Tab Config ───────────────────────────────────────────────────────────────
const tabConfig = [
  {
    name: "home",
    label: "Home",
    iconActive: "home" as const,
    iconInactive: "home-outline" as const,
  },
  {
    name: "myorders",
    label: "My Orders",
    iconActive: "bag" as const,
    iconInactive: "bag-outline" as const,
  },
  {
    name: "account",
    label: "Account",
    iconActive: "person" as const,
    iconInactive: "person-outline" as const,
  },
];

// ─── ApprovalCheckOnTabFocus ──────────────────────────────────────────────────
function ApprovalCheckOnTabFocus() {
  const { checkApprovalStatus } = useApproval();
  useFocusEffect(
    useCallback(() => {
      checkApprovalStatus();
    }, [checkApprovalStatus]),
  );
  return null;
}

// ─── Animated Tab Item ────────────────────────────────────────────────────────
function TabItem({
  tab,
  isFocused,
  options,
  onPress,
  onLongPress,
  routeKey,
}: {
  tab: (typeof tabConfig)[0];
  isFocused: boolean;
  options: any;
  onPress: () => void;
  onLongPress: () => void;
  routeKey: string;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pillOpacity = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const pillScale = useRef(new Animated.Value(isFocused ? 1 : 0.7)).current;

  // Animate pill in/out when focus changes
  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(pillOpacity, {
        toValue: isFocused ? 1 : 0,
        useNativeDriver: true,
        speed: 20,
        bounciness: 4,
      }),
      Animated.spring(pillScale, {
        toValue: isFocused ? 1 : 0.7,
        useNativeDriver: true,
        speed: 20,
        bounciness: 4,
      }),
    ]).start();
  }, [isFocused]);

  const handlePress = () => {
    // Bounce press animation
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.88,
        useNativeDriver: true,
        speed: 40,
        bounciness: 0,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 30,
        bounciness: 8,
      }),
    ]).start();
    onPress();
  };

  const iconColor = isFocused ? COLORS.accent : COLORS.inactive;
  const labelColor = isFocused ? COLORS.accentDark : COLORS.inactive;
  const iconName = isFocused ? tab.iconActive : tab.iconInactive;

  return (
    <TouchableOpacity
      key={routeKey}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel}
      testID={options.tabBarTestID}
      onPress={handlePress}
      onLongPress={onLongPress}
      activeOpacity={1}
      style={styles.tabItem}
    >
      <Animated.View
        style={[styles.tabContent, { transform: [{ scale: scaleAnim }] }]}
      >
        {/* Active pill background */}
        <Animated.View
          style={[
            styles.activePill,
            {
              opacity: pillOpacity,
              transform: [{ scale: pillScale }],
            },
          ]}
        />

        {/* Icon */}
        <View style={styles.iconWrapper}>
          <Ionicons name={iconName} size={22} color={iconColor} />
        </View>

        {/* Label */}
        <Text
          style={[
            styles.tabLabel,
            {
              color: labelColor,
              fontWeight: isFocused ? "700" : "500",
            },
          ]}
        >
          {tab.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Custom Tab Bar ────────────────────────────────────────────────────────────
const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { fontsLoaded } = useFont();

  if (!fontsLoaded) return null;

  const bottomInset = insets.bottom;
  const totalHeight = TAB_BAR_HEIGHT + bottomInset;

  return (
    <View style={[styles.outerWrapper, { height: totalHeight }]}>
      {/* Hairline separator */}
      <View style={styles.separator} />

      {/* Tab bar surface */}
      <View style={[styles.tabBar, { height: TAB_BAR_HEIGHT }]}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const tab = tabConfig.find((t) => t.name === route.name);
          if (!tab) return null;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: "tabLongPress", target: route.key });
          };

          return (
            <TabItem
              key={route.key}
              routeKey={route.key}
              tab={tab}
              isFocused={isFocused}
              options={options}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </View>

      {/* System nav bar padding */}
      {bottomInset > 0 && (
        <View
          style={{ height: bottomInset, backgroundColor: COLORS.surface }}
        />
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  outerWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    // Shadow (iOS)
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    // Elevation (Android)
    elevation: 16,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
  },
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    backgroundColor: COLORS.surface,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: TAB_BAR_HEIGHT,
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
    width: 80,
    height: PILL_HEIGHT,
    position: "relative",
  },
  activePill: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.accentLight,
    borderRadius: PILL_HEIGHT / 2,
  },
  iconWrapper: {
    marginBottom: 2,
    // Nudge icon up slightly within pill
    marginTop: 4,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.2,
    marginBottom: 4,
    // Prevent text from wrapping on "My Orders"
    numberOfLines: 1,
  } as any,
});

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function TabsLayout() {
  return (
    <>
      <ApprovalCheckOnTabFocus />
      <Tabs
        tabBar={(props: any) => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen
          name="home"
          options={{ tabBarAccessibilityLabel: "Home Tab" }}
        />
        <Tabs.Screen
          name="myorders"
          options={{ tabBarAccessibilityLabel: "My Orders Tab" }}
        />
        <Tabs.Screen
          name="account"
          options={{ tabBarAccessibilityLabel: "Account Tab" }}
        />
      </Tabs>
    </>
  );
}
