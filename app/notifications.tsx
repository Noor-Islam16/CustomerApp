// app/notifications.tsx
import { Text } from "@/context/FontContext";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Platform,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import Colors from "../constants/colors";

// ─── API Base URL ─────────────────────────────────────────────────────────────
// export const BASE_URL = "https://customer-7bcb.onrender.com";
export const BASE_URL = "https://customer-xnab.onrender.com";
// export const BASE_URL = "http://10.64.32.75:5000";

// ─── Notification Types ───────────────────────────────────────────────────────
export interface ApiNotification {
  _id: string;
  user: string;
  type: "approval_status" | "order_status" | "manual_broadcast" | "system";
  title: string;
  body: string;
  isRead: boolean;
  data?: any;
  createdAt: string;
  updatedAt: string;
}

// ─── Direct API Functions ─────────────────────────────────────────────────────
const getAuthToken = async (): Promise<string | null> => {
  return AsyncStorage.getItem("auth_token");
};

const notificationsApiFetch = async (
  path: string,
  options: RequestInit = {},
) => {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, { ...options, headers });
  const data = await res.json();

  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
};

const fetchNotificationsFromAPI = async () =>
  notificationsApiFetch("/api/notifications?limit=50");

const markNotificationRead = async (id: string) =>
  notificationsApiFetch(`/api/notifications/${id}/read`, { method: "PATCH" });

const markAllNotificationsRead = async () =>
  notificationsApiFetch("/api/notifications/mark-all-read", {
    method: "PATCH",
  });

const deleteNotification = async (id: string) =>
  notificationsApiFetch(`/api/notifications/${id}`, { method: "DELETE" });

const clearAllNotifications = async () =>
  notificationsApiFetch("/api/notifications/clear-all", { method: "DELETE" });

// ─── Icon & Color Config per Type ─────────────────────────────────────────────
const NOTIF_CONFIG: Record<
  string,
  {
    icon: string;
    color: string;
    bg: string;
    gradientStart: string;
    gradientEnd: string;
  }
> = {
  approval_status: {
    icon: "shield",
    color: Colors.primary,
    bg: Colors.primaryLight,
    gradientStart: Colors.primary,
    gradientEnd: Colors.primaryDark,
  },
  order_status: {
    icon: "truck",
    color: "#00A884",
    bg: "#E8F5E9",
    gradientStart: "#00A884",
    gradientEnd: "#4ADE80",
  },
  manual_broadcast: {
    icon: "bell",
    color: "#8B5CF6",
    bg: "#F5F3FF",
    gradientStart: "#8B5CF6",
    gradientEnd: "#A78BFA",
  },
  system: {
    icon: "info",
    color: Colors.textMuted,
    bg: Colors.surfaceAlt,
    gradientStart: Colors.textMuted,
    gradientEnd: Colors.textSecondary,
  },
};

// ─── Filter Tabs ──────────────────────────────────────────────────────────────
type FilterTab =
  | "all"
  | "approval_status"
  | "order_status"
  | "manual_broadcast";
const FILTER_TABS: { key: FilterTab; label: string; icon: string }[] = [
  { key: "all", label: "All", icon: "inbox" },
  { key: "approval_status", label: "Approval", icon: "shield" },
  { key: "order_status", label: "Orders", icon: "package" },
  { key: "manual_broadcast", label: "Alerts", icon: "bell" },
];

const filterNotifications = (notifs: ApiNotification[], tab: FilterTab) => {
  if (tab === "all") return notifs;
  return notifs.filter((n) => n.type === tab);
};

// ─── Time Formatter ───────────────────────────────────────────────────────────
const formatTime = (dateStr: string): { time: string; date: string } => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const diffMins = Math.floor(diff / 60000);
  const diffHrs = Math.floor(diff / 3600000);
  const diffDays = Math.floor(diff / 86400000);

  if (diffMins < 1) return { time: "Just now", date: "Today" };
  if (diffMins < 60) return { time: `${diffMins}m ago`, date: "Today" };
  if (diffHrs < 24) return { time: `${diffHrs}h ago`, date: "Today" };
  if (diffDays === 1) return { time: "Yesterday", date: "Yesterday" };
  if (diffDays < 7) return { time: `${diffDays}d ago`, date: "Earlier" };
  return {
    time: date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    date: "Earlier",
  };
};

// ─── Icon Size Constant (consistent across card) ──────────────────────────────
const ICON_SIZE = wp("11%");
const ICON_RADIUS = ICON_SIZE / 2;
// Unread dot: fixed size relative to icon
const DOT_SIZE = wp("3%");

// ─── Animated Notification Card ───────────────────────────────────────────────
const NotifCard = ({
  item,
  onPress,
  onDelete,
}: {
  item: ApiNotification;
  onPress: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  const cfg = NOTIF_CONFIG[item.type] || NOTIF_CONFIG.system;
  const scale = useRef(new Animated.Value(1)).current;
  const { time } = formatTime(item.createdAt);

  const handlePressIn = () =>
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 40,
      bounciness: 2,
    }).start();

  const handlePressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[styles.notifCard, !item.isRead && styles.notifCardUnread]}
        activeOpacity={1}
        onPress={() => onPress(item._id)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {/* Unread left accent bar */}
        {!item.isRead && (
          <LinearGradient
            colors={[cfg.gradientStart, cfg.gradientEnd]}
            style={styles.unreadBar}
          />
        )}

        <View style={styles.cardInner}>
          {/* Icon column */}
          <View style={styles.iconCol}>
            <LinearGradient
              colors={[cfg.gradientStart, cfg.gradientEnd]}
              style={styles.iconGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Feather name={cfg.icon as any} size={wp("4.8%")} color="#fff" />
            </LinearGradient>
            {!item.isRead && (
              <View
                style={[styles.unreadDot, { backgroundColor: cfg.color }]}
              />
            )}
          </View>

          {/* Text content */}
          <View style={styles.notifContent}>
            <View style={styles.notifTopRow}>
              <Text
                style={[
                  styles.notifTitle,
                  !item.isRead && styles.notifTitleUnread,
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <View style={styles.topRightGroup}>
                <Text style={styles.notifTime}>{time}</Text>
                {/* Delete button - now in the first row with time */}
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => onDelete(item._id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather
                    name="x"
                    size={wp("3.5%")}
                    color={Colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.notifBody} numberOfLines={2}>
              {item.body}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionLabel = ({ label, count }: { label: string; count: number }) => (
  <View style={styles.sectionLabel}>
    <Text style={styles.sectionLabelText}>{label}</Text>
    <View style={styles.sectionCountPill}>
      <Text style={styles.sectionCountText}>{count}</Text>
    </View>
  </View>
);

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyState = () => (
  <View style={styles.emptyWrap}>
    <LinearGradient
      colors={[Colors.primaryLight, "#E0E7FF"]}
      style={styles.emptyIconCircle}
    >
      <Feather name="bell-off" size={wp("10%")} color={Colors.primary} />
    </LinearGradient>
    <Text style={styles.emptyTitle}>All caught up!</Text>
    <Text style={styles.emptySub}>No new notifications right now.</Text>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
const NotificationScreen = () => {
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchNotificationsFromAPI();
      if (res.success && res.data) {
        setNotifications(res.data.notifications || []);
      } else {
        setNotifications([]);
      }
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications]),
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const filtered = filterNotifications(notifications, activeTab);

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
    );
    try {
      await markNotificationRead(id);
    } catch {}
  };

  const handleDelete = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n._id !== id));
    try {
      await deleteNotification(id);
    } catch {}
  };

  const handleClearAll = () => {
    Alert.alert("Clear All", "Remove all notifications?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          setNotifications([]);
          try {
            await clearAllNotifications();
          } catch {}
        },
      },
    ]);
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await markAllNotificationsRead();
    } catch {}
  };

  // Group by date bucket
  const dateOrder = ["Today", "Yesterday", "Earlier"];
  const listData: (
    | { type: "header"; label: string; count: number }
    | { type: "item"; item: ApiNotification }
  )[] = [];

  dateOrder.forEach((label) => {
    const group = filtered.filter(
      (n) => formatTime(n.createdAt).date === label,
    );
    if (group.length > 0) {
      listData.push({ type: "header", label, count: group.length });
      group.forEach((item) => listData.push({ type: "item", item }));
    }
  });

  if (loading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={Colors.gradientStart}
        />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Colors.gradientStart}
      />

      {/* ── Header ── */}
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerDecorCircle} />
        <View style={styles.headerDecorCircle2} />

        {/* Top row: back + title + clear */}
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.iconButton}
            activeOpacity={0.8}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={wp("5%")} color={Colors.white} />
          </TouchableOpacity>

          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>

          {notifications.length > 0 && (
            <TouchableOpacity
              style={styles.iconButton}
              activeOpacity={0.8}
              onPress={handleClearAll}
            >
              <Feather
                name="trash-2"
                size={wp("4.5%")}
                color="rgba(255,255,255,0.85)"
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Subtitle + mark all read */}
        <View style={styles.headerMeta}>
          <Text style={styles.headerSubtitle}>
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          </Text>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllBtn}
              activeOpacity={0.8}
              onPress={handleMarkAllRead}
            >
              <Feather
                name="check-circle"
                size={wp("3.5%")}
                color="rgba(255,255,255,0.9)"
              />
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter tabs */}
        <View style={styles.filterTabsRow}>
          {FILTER_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const tabCount = filterNotifications(notifications, tab.key).filter(
              (n) => !n.isRead,
            ).length;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                activeOpacity={0.8}
                onPress={() => setActiveTab(tab.key)}
              >
                <Feather
                  name={tab.icon as any}
                  size={wp("3.2%")}
                  color={isActive ? Colors.primary : "rgba(255,255,255,0.75)"}
                />
                <Text
                  style={[
                    styles.filterTabText,
                    isActive && styles.filterTabTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
                {tabCount > 0 && (
                  <View
                    style={[styles.tabBadge, isActive && styles.tabBadgeActive]}
                  >
                    <Text
                      style={[
                        styles.tabBadgeText,
                        isActive && styles.tabBadgeTextActive,
                      ]}
                    >
                      {tabCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>

      {/* ── List ── */}
      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) =>
            item.type === "header" ? `h-${item.label}` : item.item._id
          }
          renderItem={({ item }) => {
            if (item.type === "header")
              return <SectionLabel label={item.label} count={item.count} />;
            return (
              <NotifCard
                item={item.item}
                onPress={handleMarkRead}
                onDelete={handleDelete}
              />
            );
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: hp("2%"),
    color: Colors.textSecondary,
    fontSize: wp("3.5%"),
    // FIX: Custom font alignment on Android
    includeFontPadding: false,
    textAlignVertical: "center",
    lineHeight: wp("5%"),
  },

  // ── Header ──
  header: {
    paddingTop: Platform.OS === "ios" ? hp("6%") : hp("6%"),
    paddingBottom: hp("1.5%"),
    paddingHorizontal: wp("5%"),
    borderBottomLeftRadius: wp("6%"),
    borderBottomRightRadius: wp("6%"),
    overflow: "hidden",
    zIndex: 10,
  },
  headerDecorCircle: {
    position: "absolute",
    width: wp("40%"),
    height: wp("40%"),
    borderRadius: wp("20%"),
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -wp("10%"),
    right: -wp("8%"),
  },
  headerDecorCircle2: {
    position: "absolute",
    width: wp("25%"),
    height: wp("25%"),
    borderRadius: wp("12.5%"),
    backgroundColor: "rgba(255,255,255,0.04)",
    bottom: wp("2%"),
    left: -wp("5%"),
  },

  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: hp("1.2%"),
    gap: wp("2%"),
  },
  // FIX: Unified icon button size (was two separate styles before)
  iconButton: {
    width: wp("9.5%"),
    height: wp("9.5%"),
    borderRadius: wp("4.75%"),
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerTitleBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2%"),
  },
  headerTitle: {
    fontSize: wp("5.5%"),
    marginTop: hp("0.5%"),
    fontWeight: "700",
    color: Colors.white,
    letterSpacing: -0.3,
    // FIX: Custom font vertical alignment
    includeFontPadding: false,
    textAlignVertical: "center",
    lineHeight: wp("7%"),
  },
  headerBadge: {
    // marginBottom: hp("0.3%"),
    backgroundColor: Colors.error,
    minWidth: wp("5.5%"),
    height: wp("5.5%"),
    borderRadius: wp("2.75%"),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp("1%"),
  },
  headerBadgeText: {
    marginTop: hp("0.1%"),
    fontSize: wp("2.8%"),
    color: Colors.white,
    fontWeight: "800",
    // FIX: Custom font vertical alignment
    includeFontPadding: false,
    textAlignVertical: "center",
    lineHeight: wp("3.5%"),
  },

  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: hp("1.5%"),
    paddingLeft: wp("0.5%"),
  },
  headerSubtitle: {
    fontSize: wp("3.2%"),
    color: "rgba(255,255,255,0.75)",
    fontWeight: "500",
    // FIX: Custom font vertical alignment
    includeFontPadding: false,
    textAlignVertical: "center",
    lineHeight: wp("4.5%"),
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("1.5%"),
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: wp("3%"),
    paddingVertical: hp("0.6%"),
    borderRadius: wp("3%"),
  },
  markAllText: {
    fontSize: wp("3%"),
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
    // FIX: Custom font vertical alignment
    marginTop: hp("0.25%"),
    includeFontPadding: false,
    textAlignVertical: "center",
    lineHeight: wp("4%"),
  },

  // ── Filter Tabs ──
  filterTabsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: wp("3%"),
    padding: wp("1%"),
    gap: wp("1%"),
  },
  filterTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp("1%"),
    paddingVertical: hp("0.9%"),
    paddingHorizontal: wp("0.5%"),
    borderRadius: wp("2.5%"),
    // FIX: prevent tab text wrapping on small screens
    overflow: "hidden",
  },
  filterTabActive: {
    backgroundColor: Colors.white,
  },
  filterTabText: {
    marginTop: hp("0.2%"),
    fontSize: wp("2.8%"),
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600",
    flexShrink: 1,
    // FIX: Custom font vertical alignment
    includeFontPadding: false,
    textAlignVertical: "center",
    lineHeight: wp("3.8%"),
  },
  filterTabTextActive: {
    marginTop: hp("0.2%"),
    color: Colors.primary,
    fontWeight: "700",
  },
  tabBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: wp("16%"),
    minWidth: wp("4%"),
    paddingHorizontal: wp("1.2%"),
    paddingVertical: hp("0.25%"),
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginBottom: hp("0.1%"),
  },
  tabBadgeActive: {
    backgroundColor: Colors.error,
  },
  tabBadgeText: {
    fontSize: wp("2.2%"),
    color: "rgba(255,255,255,0.9)",
    fontWeight: "700",
    marginTop: hp("0.1%"),
    // FIX: Custom font vertical alignment
    includeFontPadding: false,
    textAlignVertical: "center",
    lineHeight: wp("3%"),
  },
  tabBadgeTextActive: {
    color: Colors.white,
  },

  // ── List ──
  listContent: {
    paddingTop: hp("1.5%"),
    paddingBottom: hp("12%"),
    paddingHorizontal: wp("4%"),
  },

  // ── Section Label ──
  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2%"),
    // FIX: removed conflicting paddingTop + paddingVertical — use single padding
    paddingTop: hp("2%"),
    paddingBottom: hp("0.8%"),
    paddingHorizontal: wp("1%"),
  },
  sectionLabelText: {
    fontSize: wp("3%"),
    fontWeight: "800",
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    // FIX: Custom font vertical alignment
    includeFontPadding: false,
    textAlignVertical: "center",
    lineHeight: wp("4%"),
  },
  sectionCountPill: {
    backgroundColor: Colors.border,
    paddingHorizontal: wp("2%"),
    paddingVertical: hp("0.2%"),
    borderRadius: wp("2%"),
    alignItems: "center",
    justifyContent: "center",
  },
  sectionCountText: {
    fontSize: wp("2.8%"),
    fontWeight: "700",
    color: Colors.textMuted,
    // FIX: Custom font vertical alignment
    includeFontPadding: false,
    textAlignVertical: "center",
    lineHeight: wp("3.8%"),
  },

  // ── Notification Card ──
  notifCard: {
    backgroundColor: Colors.surface,
    borderRadius: wp("4%"),
    marginBottom: hp("1.2%"),
    overflow: "hidden",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  notifCardUnread: {
    shadowColor: Colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  unreadBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: wp("1%"),
    borderTopLeftRadius: wp("4%"),
    borderBottomLeftRadius: wp("4%"),
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "center", // Changed from 'flex-start' to 'center' for vertical centering
    paddingVertical: hp("1.8%"),
    paddingLeft: wp("4.5%"),
    paddingRight: wp("4%"), // Reduced right padding since delete button is inline now
  },
  iconCol: {
    position: "relative",
    marginRight: wp("3%"),
    flexShrink: 0,
    // Remove marginTop since we're centering with alignItems: 'center'
  },
  iconGradient: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_RADIUS,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDot: {
    position: "absolute",
    bottom: 0,
    right: -wp("0.5%"),
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  notifContent: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center", // Center content vertically
  },
  notifTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center", // Changed to center for alignment
    marginBottom: hp("0.5%"),
    gap: wp("2%"),
  },
  topRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2%"),
    flexShrink: 0,
  },
  notifTitle: {
    fontSize: wp("3.6%"),
    fontWeight: "700",
    color: Colors.textSecondary,
    flex: 1,
    includeFontPadding: false,
    textAlignVertical: "center",
    lineHeight: wp("5%"),
  },
  notifTitleUnread: {
    color: Colors.textPrimary,
    fontWeight: "800",
  },
  notifTime: {
    fontSize: wp("2.6%"),
    color: Colors.textMuted,
    fontWeight: "500",
    flexShrink: 0,
    includeFontPadding: false,
    textAlignVertical: "center",
    lineHeight: wp("3.8%"),
  },
  notifBody: {
    fontSize: wp("3.1%"),
    color: Colors.textSecondary,
    lineHeight: wp("4.6%"),
    fontWeight: "400",
    includeFontPadding: false,
  },

  // Delete button - now inline with the first row
  deleteBtn: {
    width: wp("6%"),
    height: wp("6%"),
    borderRadius: wp("3%"),
    marginBottom: hp("0.25%"),
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  // ── Empty State ──
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp("12%"),
  },
  emptyIconCircle: {
    width: wp("26%"),
    height: wp("26%"),
    borderRadius: wp("13%"),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: hp("3%"),
  },
  emptyTitle: {
    fontSize: wp("5%"),
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: hp("1%"),
    letterSpacing: -0.3,
    // FIX: Custom font vertical alignment
    includeFontPadding: false,
    textAlignVertical: "center",
    lineHeight: wp("7%"),
  },
  emptySub: {
    fontSize: wp("3.5%"),
    color: Colors.textMuted,
    textAlign: "center",
    // FIX: lineHeight as wp for consistency with custom font
    lineHeight: wp("5.2%"),
    includeFontPadding: false,
  },
});

export default NotificationScreen;
