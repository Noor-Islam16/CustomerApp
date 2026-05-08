// app/(tabs)/account.tsx or screens/ProfileScreen.tsx
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import Colors from "../../constants/colors";
import { clearToken } from "../services/api"; // ✅ Import clearToken

// ─── Menu Items ───────────────────────────────────────────────────────────────
const MENU_ITEMS = [
  {
    id: "1",
    label: "Edit Profile",
    icon: "edit-3",
    color: Colors.primary,
    bg: Colors.primaryLight,
    route: "/editprofile",
  },
  {
    id: "2",
    label: "My Orders",
    icon: "shopping-bag",
    color: Colors.success,
    bg: "#ECFDF5",
    route: "/myorders",
  },
  //   {
  //     id: "3",
  //     label: "My Prescriptions",
  //     icon: "file-text",
  //     color: "#8B5CF6",
  //     bg: "#F5F3FF",
  //     route: "/prescriptions",
  //   },
  //   {
  //     id: "4",
  //     label: "Saved Addresses",
  //     icon: "map-pin",
  //     color: Colors.error,
  //     bg: "#FEF2F2",
  //     route: "/addresses",
  //   },
  //   {
  //     id: "3",
  //     label: "FAQ",
  //     icon: "help-circle",
  //     color: Colors.info,
  //     bg: "#ECFEFF",
  //     route: "/faq",
  //   },
  {
    id: "3",
    label: "Privacy Policy",
    icon: "shield",
    color: Colors.textMuted,
    bg: Colors.surfaceAlt,
    route: "/privacy",
  },
];

// ─── Stats data ───────────────────────────────────────────────────────────────
const STATS = [
  { id: "1", label: "Orders", value: "24" },
  { id: "2", label: "Saved", value: "8" },
];

// ─── MenuItem Component ───────────────────────────────────────────────────────
const MenuItem = ({
  item,
  onPress,
  isLast,
}: {
  item: (typeof MENU_ITEMS)[0];
  onPress: () => void;
  isLast: boolean;
}) => (
  <>
    <TouchableOpacity
      style={styles.menuItem}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: item.bg }]}>
        <Feather name={item.icon as any} size={wp("5%")} color={item.color} />
      </View>
      <Text style={styles.menuLabel}>{item.label}</Text>
      <Feather
        name="chevron-right"
        size={wp("4.5%")}
        color={Colors.textMuted}
      />
    </TouchableOpacity>
    {!isLast && <View style={styles.menuDivider} />}
  </>
);

// ─── Main ProfileScreen ───────────────────────────────────────────────────────
const ProfileScreen = () => {
  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          // ✅ Clear token BEFORE redirecting
          await clearToken();
          // ✅ Use replace so user can't swipe back to protected screens
          router.replace("/auth/login");
        },
      },
    ]);
  };

  const handleNavigation = (route: string) => {
    console.log("Navigating to:", route);
    try {
      router.push(route as any);
    } catch (error) {
      console.error("Navigation error:", error);
      Alert.alert(
        "Error",
        "Screen not found. Please check if the route exists.",
      );
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Colors.gradientStart}
      />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Card ── */}
        <View style={styles.profileCard}>
          {/* Avatar + info */}
          <View style={styles.profileTop}>
            <View style={styles.avatarWrap}>
              <Image
                source={{ uri: "https://i.pravatar.cc/150?img=12" }}
                style={styles.avatar}
              />
              <TouchableOpacity
                style={styles.avatarEditBtn}
                activeOpacity={0.85}
                onPress={() => handleNavigation("/editprofile")}
              >
                <Feather name="camera" size={wp("3.5%")} color={Colors.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>Sonali Ray</Text>
              <Text style={styles.profileSub}>Jhole Salers App</Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            {STATS.map((stat, index) => (
              <React.Fragment key={stat.id}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
                {index < STATS.length - 1 && (
                  <View style={styles.statDivider} />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* ── Menu Card ── */}
        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, index) => (
            <MenuItem
              key={item.id}
              item={item}
              isLast={index === MENU_ITEMS.length - 1}
              onPress={() => handleNavigation(item.route)}
            />
          ))}
        </View>

        {/* ── Logout Button ── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          activeOpacity={0.85}
          onPress={handleLogout}
        >
          <Feather name="log-out" size={wp("4.5%")} color={Colors.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* ── App version ── */}
        <Text style={styles.versionText}>JholeSaler App v1.0.0</Text>

        <View style={{ height: hp("10%") }} />
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ── Header ──
  header: {
    paddingTop: Platform.OS === "ios" ? hp("6%") : hp("6%"),
    paddingBottom: hp("2%"),
    paddingHorizontal: wp("5%"),
    backgroundColor: Colors.gradientStart,
    borderBottomLeftRadius: wp("8%"),
    borderBottomRightRadius: wp("8%"),
    zIndex: 10,
  },
  headerTitle: {
    fontSize: wp("5.5%"),
    fontWeight: "800",
    color: Colors.white,
    letterSpacing: -0.3,
  },

  // ── Scroll ──
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: hp("2.5%"),
    paddingHorizontal: wp("5%"),
  },

  // ── Profile Card ──
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: wp("5%"),
    padding: wp("5%"),
    marginBottom: hp("2.5%"),
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  profileTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: hp("2.5%"),
  },
  avatarWrap: {
    position: "relative",
    marginRight: wp("4%"),
  },
  avatar: {
    width: wp("18%"),
    height: wp("18%"),
    borderRadius: wp("9%"),
    borderWidth: 3,
    borderColor: Colors.primaryLight,
  },
  avatarEditBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: wp("7%"),
    height: wp("7%"),
    borderRadius: wp("3.5%"),
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: wp("5%"),
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: hp("0.4%"),
  },
  profileSub: {
    fontSize: wp("3.2%"),
    color: Colors.textMuted,
    marginBottom: hp("1%"),
  },

  // ── Stats ──
  statsRow: {
    flexDirection: "row",
    backgroundColor: Colors.background,
    borderRadius: wp("4%"),
    paddingVertical: hp("1.8%"),
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: wp("5.5%"),
    fontWeight: "800",
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: wp("3%"),
    color: Colors.textSecondary,
    fontWeight: "600",
    marginTop: hp("0.3%"),
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: hp("0.5%"),
  },

  // ── Menu Card ──
  menuCard: {
    backgroundColor: Colors.surface,
    borderRadius: wp("5%"),
    paddingHorizontal: wp("4%"),
    marginBottom: hp("2.5%"),
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: hp("1.8%"),
    gap: wp("3.5%"),
  },
  menuIconWrap: {
    width: wp("10%"),
    height: wp("10%"),
    borderRadius: wp("3%"),
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    flex: 1,
    fontSize: wp("4%"),
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: wp("13.5%"),
  },

  // ── Logout ──
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp("2.5%"),
    backgroundColor: "#FEF2F2",
    borderRadius: wp("4%"),
    paddingVertical: hp("1.8%"),
    borderWidth: 1.5,
    borderColor: "#FECACA",
    marginBottom: hp("2%"),
  },
  logoutText: {
    fontSize: wp("4%"),
    fontWeight: "800",
    color: Colors.error,
  },

  // ── Version ──
  versionText: {
    textAlign: "center",
    fontSize: wp("3%"),
    color: Colors.textMuted,
    fontWeight: "500",
    paddingBottom: hp("5%"),
  },
});

export default ProfileScreen;
