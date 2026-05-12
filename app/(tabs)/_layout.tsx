// tabs/_layout.tsx
import { useApproval } from "@/context/ApprovalContext";
import { Text, useFont } from "@/context/FontContext";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useFocusEffect } from "expo-router";
import React, { useCallback } from "react";
import { TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Tab configuration
const tabConfig = [
  {
    name: "home",
    label: "Home",
    iconActive: "home",
    iconInactive: "home-outline",
  },
  {
    name: "myorders",
    label: "My Orders",
    iconActive: "bag",
    iconInactive: "bag-outline",
  },
  {
    name: "account",
    label: "Account",
    iconActive: "person",
    iconInactive: "person-outline",
  },
];

/**
 * Invisible component — renders nothing.
 * Fires checkApprovalStatus whenever the tab navigator gains focus
 * (tab switch, app foreground, back navigation into tabs).
 * Identical pattern to how HomeScreen refreshes notification badge on focus.
 */
function ApprovalCheckOnTabFocus() {
  const { checkApprovalStatus } = useApproval();

  useFocusEffect(
    useCallback(() => {
      checkApprovalStatus();
    }, [checkApprovalStatus]),
  );

  return null;
}

const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { fontsLoaded } = useFont();

  const systemNavHeight = insets.bottom;
  const tabBarHeight = 60;
  const totalHeight = tabBarHeight + systemNavHeight;

  if (!fontsLoaded) return null;

  return (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: totalHeight,
        backgroundColor: "#FFFFFF",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          height: tabBarHeight,
          paddingHorizontal: 8,
          paddingTop: 8,
          paddingBottom: 8,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0.5,
          borderTopColor: "#000000",
        }}
      >
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

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

          const tab = tabConfig.find((t) => t.name === route.name);
          if (!tab) return null;

          const iconColor = isFocused ? "#00A884" : "#999999";
          const textColor = isFocused ? "#00A884" : "#999999";
          const iconName = isFocused ? tab.iconActive : tab.iconInactive;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 4,
              }}
              activeOpacity={0.7}
            >
              <View style={{ alignItems: "center", justifyContent: "center" }}>
                <View
                  style={{
                    width: 48,
                    height: 32,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 2,
                  }}
                >
                  <Ionicons
                    name={iconName as any}
                    size={24}
                    color={iconColor}
                  />
                </View>

                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: isFocused ? "600" : "500",
                    color: textColor,
                    textAlign: "center",
                  }}
                >
                  {tab.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {systemNavHeight > 0 && (
        <View style={{ height: systemNavHeight, backgroundColor: "#FFFFFF" }} />
      )}
    </View>
  );
};

export default function TabsLayout() {
  return (
    <>
      {/* Fires checkApprovalStatus on every tab focus / tab switch */}
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
