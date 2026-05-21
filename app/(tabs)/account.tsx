// app/(tabs)/account.tsx
import { Text } from "@/context/FontContext";
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
    subtitle: "Update your personal information",
    icon: "user",
    color: Colors.primary,
    bg: Colors.primaryLight,
    route: "/editprofile",
  },
  {
    id: "2",
    label: "My Orders",
    subtitle: "Track and view your orders",
    icon: "shopping-bag",
    color: Colors.success,
    bg: "#ECFDF5",
    route: "/myorders",
  },
  {
    id: "3",
    label: "Privacy Policy",
    subtitle: "Read our privacy policy",
    icon: "shield",
    color: "#6366F1",
    bg: "#EEF2FF",
    route: "/privacy",
  },
];

// ─── Approval Status Config ──────────────────────────────────────────────────
const APPROVAL_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: string; message: string }
> = {
  auto: {
    label: "Account Approved",
    color: "#059669",
    bg: "#D1FAE5",
    icon: "check-circle",
    message: "Your GST was verified automatically. Account is fully active.",
  },
  approved: {
    label: "Account Approved",
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
      return { text: "Verified", color: "#059669" };
    if (approvalStatus === "approved")
      return { text: "Approved", color: "#059669" };
    if (approvalStatus === "pending" || approvalStatus === "manual")
      return { text: "Verifying", color: "#D97706" };
    if (approvalStatus === "rejected")
      return { text: "Rejected", color: "#DC2626" };
    return { text: "Added", color: Colors.primary };
  }

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

  const Skel = ({ width, height, radius = 8, style }: any) => (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: Colors.surfaceAlt,
          borderRadius: radius,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Colors.gradientStart}
      />
      <View style={styles.header}>
        <Skel
          width={wp("35%")}
          height={hp("3.2%")}
          style={{ marginBottom: 8 }}
        />
        <Skel width={wp("55%")} height={hp("1.8%")} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card Skeleton */}
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <Skel
              width={56}
              height={56}
              radius={28}
              style={{ marginRight: wp("4%") }}
            />
            <View style={{ flex: 1, gap: 8 }}>
              <Skel width={wp("42%")} height={hp("2.2%")} />
              <Skel width={wp("28%")} height={hp("1.6%")} />
              <Skel width={wp("30%")} height={hp("2%")} radius={20} />
            </View>
          </View>

          {/* Stats Row Skeleton - matches exact layout of real stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Skel width={40} height={40} radius={12} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skel width={wp("10%")} height={hp("2.5%")} />
                <Skel width={wp("18%")} height={hp("1.5%")} />
                <Skel width={wp("22%")} height={hp("1.3%")} />
              </View>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Skel width={40} height={40} radius={12} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skel width={wp("16%")} height={hp("2.5%")} />
                <Skel width={wp("18%")} height={hp("1.5%")} />
                <Skel width={wp("22%")} height={hp("1.3%")} />
              </View>
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
            <Skel width={44} height={44} radius={22} />
            <View style={{ flex: 1, gap: 8 }}>
              <Skel width={wp("38%")} height={hp("2%")} />
              <Skel width={wp("65%")} height={hp("1.5%")} />
            </View>
          </View>
        </View>

        {/* Menu Skeleton */}
        <View style={styles.menuCard}>
          {[1, 2, 3].map((item, i) => (
            <View key={item}>
              <View style={styles.menuItem}>
                <Skel width={44} height={44} radius={12} />
                <View style={{ flex: 1, gap: 7 }}>
                  <Skel width={wp("32%")} height={hp("1.9%")} />
                  <Skel width={wp("48%")} height={hp("1.5%")} />
                </View>
                <Skel width={20} height={20} radius={4} />
              </View>
              {i < 2 && <View style={styles.menuDivider} />}
            </View>
          ))}
        </View>
      </ScrollView>
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
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: item.bg }]}>
        <Feather name={item.icon as any} size={20} color={item.color} />
      </View>
      <View style={styles.menuTextWrap}>
        <Text style={styles.menuLabel}>{item.label}</Text>
        <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
    {!isLast && <View style={styles.menuDivider} />}
  </>
);

// ─── Stat Cell Component ──────────────────────────────────────────────────────
// Fixed-height value box ensures both cells are always the same height
// regardless of whether the value is a short number ("0") or a word ("Verifying")
const StatCell = ({
  iconName,
  iconColor,
  iconBg,
  value,
  valueColor,
  label,
  caption,
  onPress,
}: {
  iconName: string;
  iconColor: string;
  iconBg: string;
  value: string | number;
  valueColor?: string;
  label: string;
  caption: string;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={styles.statCell}
    activeOpacity={0.7}
    onPress={onPress}
  >
    {/* Colored icon background — same as original statIconWrap / statIconWrapGST */}
    <View style={[styles.statIconWrap, { backgroundColor: iconBg }]}>
      <Feather name={iconName as any} size={wp(5.5)} color={iconColor} />
    </View>

    <View style={styles.statTextWrap}>
      {/* Fixed-height box: the KEY fix — both cells share this same 26dp height
          so the row never shifts regardless of value content length */}
      <View style={styles.statValueBox}>
        <Text
          style={[styles.statValue, valueColor ? { color: valueColor } : {}]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {String(value)}
        </Text>
      </View>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.statCaption} numberOfLines={1}>
        {caption}
      </Text>
    </View>
  </TouchableOpacity>
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
    text: "No GST",
    color: Colors.textMuted,
  });

  const fetchOrdersCount = async () => {
    try {
      const response = await apiGetMyOrders({ limit: 1 });
      if (response.success && response.data) {
        setOrderCount(
          response.data.pagination?.total || response.data.orders?.length || 0,
        );
      }
    } catch {
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
    } catch {
      Alert.alert("Error", "Screen not found.");
    }
  };

  const approvalCfg =
    APPROVAL_CONFIG[approvalStatus] || APPROVAL_CONFIG.pending;
  const isApproved = approvalStatus === "approved" || approvalStatus === "auto";

  if (loading) return <SkeletonLoader />;

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Colors.gradientStart}
      />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <Text style={styles.headerSubtitle}>
          Manage your account and preferences
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Card ── */}
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatarWrap}>
              <Image
                source={{
                  uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=6C63FF&color=fff&size=150`,
                }}
                style={styles.avatar}
              />
              {isProfileComplete && (
                <View style={styles.avatarCheckBadge}>
                  <Feather name="check" size={10} color={Colors.white} />
                </View>
              )}
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.profileName} numberOfLines={1}>
                {userName}
              </Text>
              <Text style={styles.profileSub} numberOfLines={1}>
                {userPhone ? `+91 ${userPhone}` : "Thump Beyond Limits"}
              </Text>
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
                  size={11}
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

          {/* ── Stats Row ── */}
          <View style={styles.statsRow}>
            <StatCell
              iconName="shopping-bag"
              iconColor={Colors.success}
              iconBg="#ECFDF5"
              value={orderCount}
              label="Total Orders"
              caption="View your orders"
              onPress={() => handleNavigation("/myorders")}
            />
            <View style={styles.statDivider} />
            <StatCell
              iconName="file-text"
              iconColor="#6366F1"
              iconBg="#E0E3FF"
              value={gstInfo.text}
              valueColor={gstInfo.color}
              label="GST Status"
              caption={
                userData?.profile?.gstNumber ? "Registered" : "Not Registered"
              }
              onPress={() => handleNavigation("/editprofile")}
            />
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
                size={18}
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
            {isApproved && (
              <Image
                source={require("../../assets/images/fireworks.png")}
                style={styles.fireworkImage}
                resizeMode="contain"
              />
            )}
          </View>
          {(approvalStatus === "pending" || approvalStatus === "manual") && (
            <View style={styles.approvalFooter}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={14}
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
          activeOpacity={0.8}
          onPress={handleLogout}
        >
          <MaterialCommunityIcons
            name="logout"
            size={20}
            color={Colors.error}
          />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Thump Beyond Limits v1.0.0</Text>

        {/* Safe area bottom padding */}
        <View style={{ height: hp("12%") }} />
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  // ── Header ──
  header: {
    paddingTop: Platform.OS === "ios" ? hp("6%") : hp("5%"),
    paddingBottom: hp("2.5%"),
    paddingHorizontal: wp("5.5%"),
    backgroundColor: Colors.gradientStart,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.white,
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.white + "BB",
    fontWeight: "400",
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: wp("4%"),
  },

  // ── Profile Card ──
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  profileTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarWrap: { position: "relative", marginRight: 14 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2.5,
    borderColor: Colors.primaryLight,
  },
  avatarCheckBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.white,
  },
  profileInfo: { flex: 1, gap: 4 },
  profileName: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  profileSub: {
    fontSize: 12.5,
    color: Colors.textMuted,
    fontWeight: "500",
  },
  profileStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  profileStatusText: {
    fontSize: 11.5,
    fontWeight: "700",
    includeFontPadding: false,
    marginTop: 1.5,
  },

  // ── Stats Row ──
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.025)",
    borderRadius: 14,
    paddingVertical: hp(1.8),
    paddingHorizontal: wp(3),
    minHeight: 82,
  },
  statCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: wp(3),
  },
  // Restored: matches original statIconWrap / statIconWrapGST (same size, just iconBg passed as prop)
  statIconWrap: {
    width: wp(11),
    height: wp(11),
    borderRadius: wp(3),
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statTextWrap: {
    flex: 1,
    gap: 2,
  },
  // THE FIX: fixed height so "0" and "Verifying" both occupy the same space
  statValueBox: {
    height: 26,
    justifyContent: "center",
  },
  statValue: {
    fontSize: wp(5),
    fontWeight: "700",
    color: Colors.primary,
    includeFontPadding: false,
    lineHeight: wp(6),
  },
  statLabel: {
    fontSize: wp(3),
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  statCaption: {
    fontSize: wp(2.6),
    color: Colors.textMuted,
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: wp(3),
    marginVertical: hp(0.5),
  },

  // ── Approval Card ──
  approvalCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 14,
    overflow: "hidden",
  },
  approvalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  approvalIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  approvalInfo: { flex: 1 },
  approvalTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 3,
  },
  approvalMessage: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  fireworkImage: {
    width: 40,
    height: 40,
    flexShrink: 0,
    tintColor: Colors.primary,
  },
  approvalFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.07)",
  },
  approvalFooterText: {
    fontSize: 11.5,
    color: "#D97706",
    fontWeight: "500",
  },

  // ── Menu Card ──
  menuCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    marginBottom: 14,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  menuIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  menuTextWrap: { flex: 1 },
  menuLabel: {
    fontSize: 14.5,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: "400",
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 56, // aligns with text, not icon
  },

  // ── Logout ──
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    paddingVertical: 15,
    borderWidth: 1.5,
    borderColor: "#FECACA",
    marginBottom: 16,
  },
  logoutText: {
    top: hp("0.2%"),
    fontSize: 15,
    fontWeight: "700",
    color: Colors.error,
    includeFontPadding: false,
  },
  versionText: {
    paddingBottom: 16,
    textAlign: "center",
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: "500",
  },
});

export default ProfileScreen;
