// app/(tabs)/account.tsx
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
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
import { apiGetMe, apiGetMyOrders, clearToken } from "../services/api";

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
  {
    id: "3",
    label: "Privacy Policy",
    icon: "shield",
    color: Colors.textMuted,
    bg: Colors.surfaceAlt,
    route: "/privacy",
  },
];

// ─── Approval Status Config ──────────────────────────────────────────────────
const APPROVAL_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: string; message: string }
> = {
  auto: {
    label: "Auto Approved",
    color: "#059669",
    bg: "#D1FAE5",
    icon: "zap",
    message: "Your GST was verified automatically. Account is fully active.",
  },
  approved: {
    label: "Approved",
    color: "#059669",
    bg: "#D1FAE5",
    icon: "check-circle",
    message: "Your account has been approved by admin.",
  },
  pending: {
    label: "Pending Review",
    color: "#D97706",
    bg: "#FEF3C7",
    icon: "clock",
    message:
      "Your profile is under review. This usually takes within 24 hours.",
  },
  manual: {
    label: "Manual Review",
    color: "#D97706",
    bg: "#FEF3C7",
    icon: "clock",
    message: "No GST provided. Admin will review your profile manually.",
  },
  rejected: {
    label: "Rejected",
    color: "#DC2626",
    bg: "#FEE2E2",
    icon: "x-circle",
    message: "Your account was not approved. Please contact support.",
  },
};

// ─── GST Status Helper ──────────────────────────────────────────────────────
const getGstStatusText = (userData: any): { text: string; color: string } => {
  if (!userData) return { text: "Loading...", color: Colors.textMuted };

  const gstNumber = userData.profile?.gstNumber;
  const approvalStatus = userData.approvalStatus;

  if (gstNumber) {
    if (approvalStatus === "auto")
      return { text: "GST Verified", color: "#059669" };
    if (approvalStatus === "approved")
      return { text: "GST Approved", color: "#059669" };
    if (approvalStatus === "pending" || approvalStatus === "manual")
      return { text: "Verifying", color: "#D97706" };
    if (approvalStatus === "rejected")
      return { text: "Rejected", color: "#DC2626" };
    return { text: "GST Added", color: Colors.primary };
  }

  // No GST number
  if (approvalStatus === "approved" || approvalStatus === "auto")
    return { text: "No GST", color: Colors.textMuted };
  if (approvalStatus === "pending" || approvalStatus === "manual")
    return { text: "Pending", color: "#D97706" };
  if (approvalStatus === "rejected")
    return { text: "Rejected", color: "#DC2626" };
  return { text: "No GST", color: Colors.textMuted };
};

// ─── Skeleton Loader ─────────────────────────────────────────────────────────
const SkeletonLoader = () => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  const SkeletonBlock = ({
    width,
    height,
    style,
  }: {
    width: string | number;
    height: number;
    style?: any;
  }) => (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          backgroundColor: Colors.surfaceAlt,
          borderRadius: 8,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Colors.gradientStart}
      />
      <View style={styles.header}>
        <SkeletonBlock
          width={wp("35%")}
          height={hp("3.5%")}
          style={{ marginBottom: hp("1%") }}
        />
      </View>

      <View style={[styles.scrollContent, { paddingTop: hp("2.5%") }]}>
        {/* Profile Card Skeleton */}
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <SkeletonBlock
              width={wp("18%")}
              height={wp("18%")}
              style={{ borderRadius: wp("9%"), marginRight: wp("4%") }}
            />
            <View style={{ flex: 1 }}>
              <SkeletonBlock
                width={wp("45%")}
                height={hp("2.5%")}
                style={{ marginBottom: hp("1%") }}
              />
              <SkeletonBlock
                width={wp("30%")}
                height={hp("1.8%")}
                style={{ marginBottom: hp("1%") }}
              />
              <SkeletonBlock width={wp("35%")} height={hp("2%")} />
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <SkeletonBlock
                width={wp("10%")}
                height={hp("3%")}
                style={{ marginBottom: hp("0.5%") }}
              />
              <SkeletonBlock width={wp("12%")} height={hp("1.5%")} />
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <SkeletonBlock
                width={wp("15%")}
                height={hp("3%")}
                style={{ marginBottom: hp("0.5%") }}
              />
              <SkeletonBlock width={wp("12%")} height={hp("1.5%")} />
            </View>
          </View>
        </View>

        {/* Approval Card Skeleton */}
        <View
          style={[
            styles.approvalCard,
            { backgroundColor: Colors.surfaceAlt, borderColor: Colors.border },
          ]}
        >
          <View style={styles.approvalHeader}>
            <SkeletonBlock
              width={wp("10%")}
              height={wp("10%")}
              style={{ borderRadius: wp("5%") }}
            />
            <View style={{ flex: 1 }}>
              <SkeletonBlock
                width={wp("40%")}
                height={hp("2%")}
                style={{ marginBottom: hp("0.5%") }}
              />
              <SkeletonBlock width={wp("70%")} height={hp("1.5%")} />
            </View>
          </View>
        </View>

        {/* Menu Skeleton */}
        <View style={styles.menuCard}>
          {[1, 2, 3].map((item) => (
            <View key={item}>
              <View style={styles.menuItem}>
                <SkeletonBlock
                  width={wp("10%")}
                  height={wp("10%")}
                  style={{ borderRadius: wp("3%") }}
                />
                <SkeletonBlock
                  width={wp("35%")}
                  height={hp("2%")}
                  style={{ flex: 1, marginLeft: wp("3.5%") }}
                />
                <SkeletonBlock width={wp("5%")} height={wp("5%")} />
              </View>
              {item < 3 && <View style={styles.menuDivider} />}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

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
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [userName, setUserName] = useState("User");
  const [userPhone, setUserPhone] = useState("");
  const [approvalStatus, setApprovalStatus] = useState<string>("pending");
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [orderCount, setOrderCount] = useState(0);
  const [gstInfo, setGstInfo] = useState({
    text: "Loading...",
    color: Colors.textMuted,
  });

  // ── Fetch user data ──────────────────────────────────────────────────────
  const fetchOrdersCount = async () => {
    try {
      const response = await apiGetMyOrders({ limit: 1 });
      if (response.success && response.data) {
        setOrderCount(
          response.data.pagination?.total || response.data.orders?.length || 0,
        );
      }
    } catch (error) {
      console.error("Failed to fetch orders count:", error);
      setOrderCount(0);
    }
  };

  const loadUserData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiGetMe();
      if (response.success && response.user) {
        const user = response.user;
        setUserData(user);
        setUserName(
          user.profile?.contactName || `User ${user.phone?.slice(-4) || ""}`,
        );
        setUserPhone(user.phone || "");
        setApprovalStatus(user.approvalStatus || "pending");
        setIsProfileComplete(user.isProfileComplete || false);
        setGstInfo(getGstStatusText(user));

        // Fetch orders count
        await fetchOrdersCount();
      }
    } catch (error) {
      console.error("Failed to load user data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // ── Reload when screen comes into focus ──────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [loadUserData]),
  );

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await clearToken();
          router.replace("/auth/login");
        },
      },
    ]);
  };

  const handleNavigation = (route: string) => {
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

  const approvalCfg =
    APPROVAL_CONFIG[approvalStatus] || APPROVAL_CONFIG.pending;

  // ── Skeleton Loading state ────────────────────────────────────────────────
  if (loading) {
    return <SkeletonLoader />;
  }

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
                source={{
                  uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=6C63FF&color=fff&size=150`,
                }}
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
              <Text style={styles.profileName}>{userName}</Text>
              <Text style={styles.profileSub}>
                {userPhone ? `+91 ${userPhone}` : "Jhole Salers App"}
              </Text>
              {/* Profile completion badge */}
              <View
                style={[
                  styles.profileStatusBadge,
                  {
                    backgroundColor: isProfileComplete ? "#D1FAE5" : "#FEF3C7",
                  },
                ]}
              >
                <Feather
                  name={isProfileComplete ? "check-circle" : "alert-circle"}
                  size={wp("3%")}
                  color={isProfileComplete ? "#059669" : "#D97706"}
                />
                <Text
                  style={[
                    styles.profileStatusText,
                    { color: isProfileComplete ? "#059669" : "#D97706" },
                  ]}
                >
                  {isProfileComplete
                    ? "Profile Complete"
                    : "Profile Incomplete"}
                </Text>
              </View>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{orderCount}</Text>
              <Text style={styles.statLabel}>Orders</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statValue,
                  {
                    fontSize: userData?.profile?.gstNumber
                      ? wp("4%")
                      : wp("4.5%"),
                    color: gstInfo.color,
                  },
                ]}
              >
                {gstInfo.text}
              </Text>
              <Text style={styles.statLabel}>GST Status</Text>
            </View>
          </View>
        </View>

        {/* ── Approval Status Card ── */}
        <View
          style={[
            styles.approvalCard,
            {
              backgroundColor: approvalCfg.bg,
              borderColor: approvalCfg.color + "40",
            },
          ]}
        >
          <View style={styles.approvalHeader}>
            <View
              style={[
                styles.approvalIconCircle,
                { backgroundColor: approvalCfg.color },
              ]}
            >
              <Feather
                name={approvalCfg.icon as any}
                size={wp("4.5%")}
                color={Colors.white}
              />
            </View>
            <View style={styles.approvalInfo}>
              <Text
                style={[styles.approvalTitle, { color: approvalCfg.color }]}
              >
                {approvalCfg.label}
              </Text>
              <Text style={styles.approvalMessage}>{approvalCfg.message}</Text>
            </View>
          </View>
          {(approvalStatus === "pending" || approvalStatus === "manual") && (
            <View style={styles.approvalFooter}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={wp("3.5%")}
                color="#D97706"
              />
              <Text style={styles.approvalFooterText}>
                You'll be notified once reviewed
              </Text>
            </View>
          )}
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
  root: { flex: 1, backgroundColor: Colors.background },
  centerContent: { justifyContent: "center", alignItems: "center" },
  loadingText: {
    fontSize: wp("3.5%"),
    color: Colors.textSecondary,
    marginTop: hp("2%"),
  },
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
  scroll: { flex: 1 },
  scrollContent: { paddingTop: hp("2.5%"), paddingHorizontal: wp("5%") },
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: wp("5%"),
    padding: wp("5%"),
    marginBottom: hp("2%"),
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  profileTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: hp("2%"),
  },
  avatarWrap: { position: "relative", marginRight: wp("4%") },
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
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: wp("5%"),
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: hp("0.3%"),
  },
  profileSub: {
    fontSize: wp("3.2%"),
    color: Colors.textMuted,
    marginBottom: hp("0.8%"),
  },
  profileStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: wp("1%"),
    paddingHorizontal: wp("2.5%"),
    paddingVertical: hp("0.3%"),
    borderRadius: wp("3%"),
  },
  profileStatusText: { fontSize: wp("2.8%"), fontWeight: "600" },
  statsRow: {
    flexDirection: "row",
    backgroundColor: Colors.background,
    borderRadius: wp("4%"),
    paddingVertical: hp("1.8%"),
  },
  statItem: { flex: 1, alignItems: "center" },
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
  approvalCard: {
    borderRadius: wp("4%"),
    borderWidth: 1.5,
    padding: wp("4%"),
    marginBottom: hp("2%"),
  },
  approvalHeader: { flexDirection: "row", alignItems: "center", gap: wp("3%") },
  approvalIconCircle: {
    width: wp("10%"),
    height: wp("10%"),
    borderRadius: wp("5%"),
    alignItems: "center",
    justifyContent: "center",
  },
  approvalInfo: { flex: 1 },
  approvalTitle: {
    fontSize: wp("3.8%"),
    fontWeight: "700",
    marginBottom: hp("0.3%"),
  },
  approvalMessage: {
    fontSize: wp("3%"),
    color: Colors.textSecondary,
    lineHeight: wp("4.5%"),
  },
  approvalFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("1.5%"),
    marginTop: hp("1.5%"),
    paddingTop: hp("1.5%"),
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.08)",
  },
  approvalFooterText: {
    fontSize: wp("2.8%"),
    color: "#D97706",
    fontWeight: "500",
  },
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
  logoutText: { fontSize: wp("4%"), fontWeight: "800", color: Colors.error },
  versionText: {
    textAlign: "center",
    fontSize: wp("3%"),
    color: Colors.textMuted,
    fontWeight: "500",
    paddingBottom: hp("5%"),
  },
});

export default ProfileScreen;
