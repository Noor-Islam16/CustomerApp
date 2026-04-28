// app/notifications.tsx or screens/NotificationScreen.tsx
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Platform,
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
import Colors from "../constants/colors";

// ─── Notification Types ───────────────────────────────────────────────────────
type NotifType =
  | "order_shipped"
  | "order_delivered"
  | "order_placed"
  | "offer"
  | "reminder"
  | "restock"
  | "system"
  | "review";

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  date: string;
  isRead: boolean;
  meta?: string;
  actionLabel?: string;
}

// ─── Ecommerce Notification Data ─────────────────────────────────────────────
const INITIAL_NOTIFICATIONS: Notification[] = [
  // TODAY
  {
    id: "1",
    type: "order_shipped",
    title: "Your order is on its way!",
    body: "Order #NM20481 has been dispatched. Premium Basmati Rice & 3 more items are headed to you.",
    time: "Just now",
    date: "Today",
    isRead: false,
    meta: "#NM20481",
    actionLabel: "Track Order",
  },
  {
    id: "2",
    type: "offer",
    title: "Flash Sale — 30% OFF ends tonight",
    body: "Surf Excel Matic, Tata Tea Gold & top household items at unbeatable prices. Use code FLASH30.",
    time: "20 min ago",
    date: "Today",
    isRead: false,
    meta: "FLASH30",
    actionLabel: "Shop Now",
  },
  {
    id: "3",
    type: "restock",
    title: "Back in stock — Real Fruit Juice",
    body: "You were waiting for this! Real Mixed Fruit Juice 1ltr is available again. Limited units only.",
    time: "1 hr ago",
    date: "Today",
    isRead: false,
    meta: "Real Fruit Juice",
    actionLabel: "Add to Cart",
  },
  {
    id: "4",
    type: "reminder",
    title: "Items left in your cart",
    body: "Nivea Body Lotion & Colgate Toothpaste are waiting. Complete your order before stock runs out.",
    time: "3 hrs ago",
    date: "Today",
    isRead: true,
    actionLabel: "View Cart",
  },
  // YESTERDAY
  {
    id: "5",
    type: "order_delivered",
    title: "Order delivered successfully!",
    body: "Order #NM20460 — Aashirvaad Atta 5kg & Tata Tea Gold — has been delivered. How was your experience?",
    time: "11:20 AM",
    date: "Yesterday",
    isRead: true,
    meta: "#NM20460",
    actionLabel: "Rate Order",
  },
  {
    id: "6",
    type: "offer",
    title: "Members-only: Extra 10% off",
    body: "As a valued member, get an extra 10% off on orders above ₹499. Valid only for the next 24 hours.",
    time: "09:00 AM",
    date: "Yesterday",
    isRead: true,
    meta: "MEMBER10",
    actionLabel: "Claim Offer",
  },
  {
    id: "7",
    type: "review",
    title: "Share your review for Cadbury Dairy Milk",
    body: "You purchased Cadbury Dairy Milk 52g. Your review helps thousands of shoppers make better choices.",
    time: "08:15 AM",
    date: "Yesterday",
    isRead: true,
    actionLabel: "Write Review",
  },
  // EARLIER
  {
    id: "8",
    type: "order_placed",
    title: "Order confirmed!",
    body: "Your order #NM20460 for ₹850 has been placed. Expected delivery in 2–3 business days.",
    time: "Jun 10",
    date: "Earlier",
    isRead: true,
    meta: "#NM20460",
  },
  {
    id: "9",
    type: "restock",
    title: "Limited Stock Alert — Haldiram's Bhujia",
    body: "Haldiram's Bhujia 200g has only 15 units left. You've bought this before — grab it now!",
    time: "Jun 9",
    date: "Earlier",
    isRead: true,
    actionLabel: "Buy Now",
  },
  {
    id: "10",
    type: "system",
    title: "Address verified successfully",
    body: "Your delivery address in Kolkata has been verified and saved. Future orders will be delivered here.",
    time: "Jun 8",
    date: "Earlier",
    isRead: true,
  },
];

// ─── Icon & Color Config per Type ─────────────────────────────────────────────
const NOTIF_CONFIG: Record<
  NotifType,
  {
    icon: string;
    color: string;
    bg: string;
    gradientStart: string;
    gradientEnd: string;
  }
> = {
  order_shipped: {
    icon: "truck",
    color: Colors.primary,
    bg: Colors.primaryLight,
    gradientStart: Colors.primary,
    gradientEnd: Colors.primaryDark,
  },
  order_delivered: {
    icon: "check-circle",
    color: Colors.success,
    bg: "#ECFDF5",
    gradientStart: Colors.success,
    gradientEnd: "#4ADE80",
  },
  order_placed: {
    icon: "shopping-bag",
    color: "#8B5CF6",
    bg: "#F5F3FF",
    gradientStart: "#8B5CF6",
    gradientEnd: "#A78BFA",
  },
  offer: {
    icon: "tag",
    color: Colors.warning,
    bg: "#FFFBEB",
    gradientStart: Colors.warning,
    gradientEnd: "#FCD34D",
  },
  reminder: {
    icon: "shopping-cart",
    color: Colors.error,
    bg: "#FEF2F2",
    gradientStart: Colors.error,
    gradientEnd: "#F87171",
  },
  restock: {
    icon: "refresh-cw",
    color: Colors.info,
    bg: "#ECFEFF",
    gradientStart: Colors.info,
    gradientEnd: "#22D3EE",
  },
  system: {
    icon: "shield",
    color: Colors.textMuted,
    bg: Colors.surfaceAlt,
    gradientStart: Colors.textMuted,
    gradientEnd: Colors.textSecondary,
  },
  review: {
    icon: "star",
    color: Colors.warning,
    bg: "#FFF7ED",
    gradientStart: Colors.warning,
    gradientEnd: "#FB923C",
  },
};

// ─── Animated Notification Card ───────────────────────────────────────────────
const NotifCard = ({
  item,
  onPress,
  onDelete,
  index,
}: {
  item: Notification;
  onPress: (id: string) => void;
  onDelete: (id: string) => void;
  index: number;
}) => {
  const cfg = NOTIF_CONFIG[item.type];
  const scale = useRef(new Animated.Value(1)).current;

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
        onPress={() => onPress(item.id)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {/* Unread accent bar */}
        {!item.isRead && (
          <LinearGradient
            colors={[cfg.gradientStart, cfg.gradientEnd]}
            style={styles.unreadBar}
          />
        )}

        <View style={styles.cardInner}>
          {/* Icon */}
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

          {/* Content */}
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
              <Text style={styles.notifTime}>{item.time}</Text>
            </View>

            <Text style={styles.notifBody} numberOfLines={2}>
              {item.body}
            </Text>

            {/* Meta chip + Action */}
            {(item.meta || item.actionLabel) && (
              <View style={styles.metaRow}>
                {item.meta && (
                  <View style={[styles.metaChip, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.metaChipText, { color: cfg.color }]}>
                      {item.meta}
                    </Text>
                  </View>
                )}
                {item.actionLabel && (
                  <TouchableOpacity
                    style={styles.actionPill}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.actionPillText, { color: cfg.color }]}>
                      {item.actionLabel}
                    </Text>
                    <Feather
                      name="arrow-right"
                      size={wp("2.8%")}
                      color={cfg.color}
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Delete */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => onDelete(item.id)}
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
    <Text style={styles.emptySub}>
      No new notifications right now.{"\n"}We'll ping you when something
      arrives.
    </Text>
  </View>
);

// ─── Filter Tabs ──────────────────────────────────────────────────────────────
type FilterTab = "all" | "orders" | "offers" | "alerts";
const FILTER_TABS: { key: FilterTab; label: string; icon: string }[] = [
  { key: "all", label: "All", icon: "inbox" },
  { key: "orders", label: "Orders", icon: "package" },
  { key: "offers", label: "Offers", icon: "tag" },
  { key: "alerts", label: "Alerts", icon: "bell" },
];

const filterNotifications = (notifs: Notification[], tab: FilterTab) => {
  if (tab === "all") return notifs;
  if (tab === "orders")
    return notifs.filter((n) =>
      ["order_shipped", "order_delivered", "order_placed"].includes(n.type),
    );
  if (tab === "offers") return notifs.filter((n) => n.type === "offer");
  if (tab === "alerts")
    return notifs.filter((n) =>
      ["reminder", "restock", "review", "system"].includes(n.type),
    );
  return notifs;
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const NotificationScreen = ({ navigation }: { navigation?: any }) => {
  const [notifications, setNotifications] = useState<Notification[]>(
    INITIAL_NOTIFICATIONS,
  );
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const filtered = filterNotifications(notifications, activeTab);

  const handleMarkRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
  };

  const handleDelete = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleClearAll = () => {
    Alert.alert("Clear All", "Remove all notifications?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => setNotifications([]),
      },
    ]);
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  // Group by date
  const dateOrder = ["Today", "Yesterday", "Earlier"];
  const listData: (
    | { type: "header"; label: string; count: number }
    | { type: "item"; item: Notification; index: number }
  )[] = [];
  let globalIdx = 0;
  dateOrder.forEach((label) => {
    const group = filtered.filter((n) => n.date === label);
    if (group.length > 0) {
      listData.push({ type: "header", label, count: group.length });
      group.forEach((item) => {
        listData.push({ type: "item", item, index: globalIdx++ });
      });
    }
  });

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
        {/* Decorative circle */}
        <View style={styles.headerDecorCircle} />
        <View style={styles.headerDecorCircle2} />

        {/* Top Row */}
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

        {/* Mark all + subtitle */}
        <View style={styles.headerMeta}>
          <Text style={styles.headerSubtitle}>
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              : "You're all caught up"}
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

        {/* Filter Tabs */}
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
            item.type === "header" ? `h-${item.label}` : item.item.id
          }
          renderItem={({ item }) => {
            if (item.type === "header") {
              return <SectionLabel label={item.label} count={item.count} />;
            }
            return (
              <NotifCard
                item={item.item}
                onPress={handleMarkRead}
                onDelete={handleDelete}
                index={item.index}
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

  // ── Header ──
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
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
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
    gap: wp("1.5%"),
    paddingVertical: hp("0.9%"),
    borderRadius: wp("2.5%"),
  },
  filterTabActive: {
    backgroundColor: Colors.white,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  filterTabText: {
    fontSize: wp("3%"),
    color: "rgba(255,255,255,0.75)",
    fontWeight: "600",
  },
  filterTabTextActive: {
    color: Colors.primary,
    fontWeight: "800",
  },
  tabBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: wp("2%"),
    paddingHorizontal: wp("1.5%"),
    paddingVertical: hp("0.1%"),
  },
  tabBadgeActive: {
    backgroundColor: Colors.error,
  },
  tabBadgeText: {
    fontSize: wp("2.4%"),
    color: "rgba(255,255,255,0.9)",
    fontWeight: "700",
  },
  tabBadgeTextActive: {
    color: Colors.white,
  },

  // ── List ──
  listContent: {
    paddingTop: hp("2%"),
    paddingBottom: hp("12%"),
    paddingHorizontal: wp("4%"),
  },

  // ── Section Label ──
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

  // ── Notification Card ──
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

  // ── Icon ──
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
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
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

  // ── Content ──
  notifContent: {
    flex: 1,
  },
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
  notifTitleUnread: {
    color: Colors.textPrimary,
    fontWeight: "800",
  },
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

  // Meta row
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2%"),
    flexWrap: "wrap",
  },
  metaChip: {
    paddingHorizontal: wp("2.5%"),
    paddingVertical: hp("0.35%"),
    borderRadius: wp("2%"),
  },
  metaChipText: {
    fontSize: wp("2.8%"),
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("1%"),
    paddingHorizontal: wp("2.5%"),
    paddingVertical: hp("0.35%"),
  },
  actionPillText: {
    fontSize: wp("3%"),
    fontWeight: "700",
  },

  // ── Delete ──
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

  // ── Empty ──
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
