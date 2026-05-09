// app/notifications.tsx
import { Text } from "@/components/CustomText";
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

// ─── API Base URL (same as your api.ts) ──────────────────────────────────────
export const BASE_URL = "https://customer-7bcb.onrender.com";
// export const BASE_URL = "http://10.64.32.75:5000";

// ─── Notification Types ──────────────────────────────────────────────────────
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

// ─── Direct API Functions (bypassing apiFetch for debugging) ──────────────────
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
  console.log(`📡 [Notifications] ${options.method || "GET"} ${url}`);
  console.log(`🔑 Token present: ${!!token}`);

  const res = await fetch(url, { ...options, headers });
  const data = await res.json();

  console.log(`📬 [Notifications] Status: ${res.status}`);
  console.log(
    `📬 [Notifications] Response:`,
    JSON.stringify(data).substring(0, 300),
  );

  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
};

const fetchNotificationsFromAPI = async () => {
  const data = await notificationsApiFetch("/api/notifications?limit=50");
  return data;
};

const markNotificationRead = async (id: string) => {
  return notificationsApiFetch(`/api/notifications/${id}/read`, {
    method: "PATCH",
  });
};

const markAllNotificationsRead = async () => {
  return notificationsApiFetch("/api/notifications/mark-all-read", {
    method: "PATCH",
  });
};

const deleteNotification = async (id: string) => {
  return notificationsApiFetch(`/api/notifications/${id}`, {
    method: "DELETE",
  });
};

const clearAllNotifications = async () => {
  return notificationsApiFetch("/api/notifications/clear-all", {
    method: "DELETE",
  });
};

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

// ─── Time formatter ─────────────────────────────────────────────────────────
const formatTime = (dateStr: string): { time: string; date: string } => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const diffMins = Math.floor(diff / 60000);
  const diffHrs = Math.floor(diff / 3600000);
  const diffDays = Math.floor(diff / 86400000);

  if (diffMins < 1) return { time: "Just now", date: "Today" };
  if (diffMins < 60) return { time: `${diffMins} min ago`, date: "Today" };
  if (diffHrs < 24)
    return {
      time: `${diffHrs} hr${diffHrs > 1 ? "s" : ""} ago`,
      date: "Today",
    };
  if (diffDays === 1) return { time: "Yesterday", date: "Yesterday" };
  if (diffDays < 7) return { time: `${diffDays} days ago`, date: "Earlier" };
  return {
    time: date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    date: "Earlier",
  };
};

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
        {!item.isRead && (
          <LinearGradient
            colors={[cfg.gradientStart, cfg.gradientEnd]}
            style={styles.unreadBar}
          />
        )}
        <View style={styles.cardInner}>
          <View style={styles.iconCol}>
            <LinearGradient
              colors={[cfg.gradientStart, cfg.gradientEnd]}
              style={styles.iconGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Feather name={cfg.icon as any} size={wp("5%")} color="#fff" />
            </LinearGradient>
            {!item.isRead && (
              <View
                style={[styles.unreadDot, { backgroundColor: cfg.color }]}
              />
            )}
          </View>
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
              <Text style={styles.notifTime}>{time}</Text>
            </View>
            <Text style={styles.notifBody} numberOfLines={2}>
              {item.body}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => onDelete(item._id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="x" size={wp("3.5%")} color={Colors.textMuted} />
        </TouchableOpacity>
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
      console.log("📡 Fetching notifications...");

      const res = await fetchNotificationsFromAPI();
      console.log("📬 Full response:", JSON.stringify(res, null, 2));

      if (res.success && res.data) {
        const notifs = res.data.notifications || [];
        console.log(`✅ Loaded ${notifs.length} notifications`);
        if (notifs.length > 0) {
          console.log(
            "📋 First notification:",
            JSON.stringify(notifs[0], null, 2),
          );
        }
        setNotifications(notifs);
      } else {
        console.warn("⚠️ Unexpected response format:", res);
        setNotifications([]);
      }
    } catch (error: any) {
      console.error(
        "❌ Failed to fetch notifications:",
        error?.message || error,
      );
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

  // Group by date
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
      group.forEach((item) => {
        listData.push({ type: "item", item });
      });
    }
  });

  if (loading) {
    return (
      <View
        style={[
          styles.root,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor={Colors.gradientStart}
        />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ marginTop: hp("2%"), color: Colors.textSecondary }}>
          Loading notifications...
        </Text>
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

        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.8}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={wp("5.5%")} color={Colors.white} />
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
              style={styles.clearAllBtn}
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
                  size={wp("3.5%")}
                  color={isActive ? Colors.primary : "rgba(255,255,255,0.7)"}
                />
                <Text
                  style={[
                    styles.filterTabText,
                    isActive && styles.filterTabTextActive,
                  ]}
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
          keyExtractor={(item, index) =>
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
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: Platform.OS === "ios" ? hp("6%") : hp("5.5%"),
    paddingBottom: hp("1.5%"),
    paddingHorizontal: wp("5%"),
    borderBottomLeftRadius: wp("7%"),
    borderBottomRightRadius: wp("7%"),
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
    marginBottom: hp("1%"),
  },
  backBtn: {
    width: wp("10%"),
    height: wp("10%"),
    borderRadius: wp("5%"),
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: wp("3%"),
  },
  headerTitleBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2.5%"),
  },
  headerTitle: {
    fontSize: wp("6%"),
    fontWeight: "800",
    color: Colors.white,
    letterSpacing: -0.5,
  },
  headerBadge: {
    backgroundColor: Colors.error,
    width: wp("6%"),
    height: wp("6%"),
    borderRadius: wp("3%"),
    alignItems: "center",
    justifyContent: "center",
  },
  headerBadgeText: {
    fontSize: wp("2.8%"),
    color: Colors.white,
    fontWeight: "800",
  },
  clearAllBtn: {
    width: wp("10%"),
    height: wp("10%"),
    borderRadius: wp("5%"),
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: hp("1.8%"),
    paddingLeft: wp("1%"),
  },
  headerSubtitle: {
    fontSize: wp("3.3%"),
    color: "rgba(255,255,255,0.75)",
    fontWeight: "500",
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("1.5%"),
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: wp("3%"),
    paddingVertical: hp("0.5%"),
    borderRadius: wp("3%"),
  },
  markAllText: {
    fontSize: wp("3%"),
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
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
    gap: wp("1.5%"),
    paddingVertical: hp("0.9%"),
    borderRadius: wp("2.5%"),
  },
  filterTabActive: { backgroundColor: Colors.white },
  filterTabText: {
    fontSize: wp("3%"),
    color: "rgba(255,255,255,0.75)",
    fontWeight: "600",
  },
  filterTabTextActive: { color: Colors.primary, fontWeight: "800" },
  tabBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: wp("2%"),
    paddingHorizontal: wp("1.5%"),
    paddingVertical: hp("0.1%"),
  },
  tabBadgeActive: { backgroundColor: Colors.error },
  tabBadgeText: {
    fontSize: wp("2.4%"),
    color: "rgba(255,255,255,0.9)",
    fontWeight: "700",
  },
  tabBadgeTextActive: { color: Colors.white },
  listContent: {
    paddingTop: hp("2%"),
    paddingBottom: hp("12%"),
    paddingHorizontal: wp("4%"),
  },
  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2%"),
    paddingVertical: hp("1.2%"),
    paddingTop: hp("2%"),
    paddingHorizontal: wp("1%"),
  },
  sectionLabelText: {
    fontSize: wp("3.5%"),
    fontWeight: "800",
    color: Colors.textSecondary,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  sectionCountPill: {
    backgroundColor: Colors.border,
    paddingHorizontal: wp("2%"),
    paddingVertical: hp("0.2%"),
    borderRadius: wp("2%"),
  },
  sectionCountText: {
    fontSize: wp("2.8%"),
    fontWeight: "700",
    color: Colors.textMuted,
  },
  notifCard: {
    backgroundColor: Colors.surface,
    borderRadius: wp("4.5%"),
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
    borderTopLeftRadius: wp("4.5%"),
    borderBottomLeftRadius: wp("4.5%"),
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: hp("1.8%"),
    paddingLeft: wp("4.5%"),
    paddingRight: wp("10%"),
  },
  iconCol: {
    position: "relative",
    marginRight: wp("3.5%"),
    marginTop: hp("0.2%"),
  },
  iconGradient: {
    width: wp("12%"),
    height: wp("12%"),
    borderRadius: wp("6%"),
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDot: {
    position: "absolute",
    bottom: -hp("0.3%"),
    right: -wp("0.5%"),
    width: wp("3.2%"),
    height: wp("3.2%"),
    borderRadius: wp("1.6%"),
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  notifContent: { flex: 1 },
  notifTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: hp("0.5%"),
    gap: wp("2%"),
  },
  notifTitle: {
    fontSize: wp("3.7%"),
    fontWeight: "700",
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: wp("5%"),
  },
  notifTitleUnread: { color: Colors.textPrimary, fontWeight: "800" },
  notifTime: {
    fontSize: wp("2.6%"),
    color: Colors.textMuted,
    fontWeight: "500",
    flexShrink: 0,
    marginTop: hp("0.2%"),
  },
  notifBody: {
    fontSize: wp("3.2%"),
    color: Colors.textSecondary,
    lineHeight: hp("2.4%"),
    fontWeight: "400",
    marginBottom: hp("1%"),
  },
  deleteBtn: {
    position: "absolute",
    top: wp("3.5%"),
    right: wp("3.5%"),
    width: wp("7%"),
    height: wp("7%"),
    borderRadius: wp("3.5%"),
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp("12%"),
    marginTop: -hp("5%"),
  },
  emptyIconCircle: {
    width: wp("28%"),
    height: wp("28%"),
    borderRadius: wp("14%"),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: hp("3%"),
  },
  emptyTitle: {
    fontSize: wp("5.5%"),
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: hp("1%"),
    letterSpacing: -0.3,
  },
  emptySub: {
    fontSize: wp("3.5%"),
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: hp("2.8%"),
  },
});

export default NotificationScreen;
