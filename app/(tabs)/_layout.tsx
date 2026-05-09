// tabs/_layout.tsx
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { Tabs } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
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

// Custom Tab Bar Component with Safe Area Handling
const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  const insets = useSafeAreaInsets();

  // Get font loaded state - you can pass this as a prop
  const [fontsLoaded] = useFonts({
    Exotc350BdBTBold: require("@/assets/fonts/exotic.ttf"),
  });

  // Calculate dynamic bottom padding based on system navigation bar
  const systemNavHeight = insets.bottom;
  const tabBarHeight = 60;
  const totalHeight = tabBarHeight + systemNavHeight;

  if (!fontsLoaded) {
    return null; // Or a loading placeholder
  }

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
      {/* Tab Bar Content Container */}
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
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
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
              <View
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* Icon Container */}
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

                {/* Label with custom font */}
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: "Exotc350BdBTBold", // ✅ Added custom font
                    fontWeight: isFocused ? "600" : "400",
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

      {/* System Navigation Bar Spacer */}
      {systemNavHeight > 0 && (
        <View
          style={{
            height: systemNavHeight,
            backgroundColor: "#FFFFFF",
          }}
        />
      )}
    </View>
  );
};

// Main Tab Layout
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props: any) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarAccessibilityLabel: "Home Tab",
        }}
      />
      <Tabs.Screen
        name="myorders"
        options={{
          tabBarAccessibilityLabel: "My Orders Tab",
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          tabBarAccessibilityLabel: "Account Tab",
        }}
      />
    </Tabs>
  );
}
