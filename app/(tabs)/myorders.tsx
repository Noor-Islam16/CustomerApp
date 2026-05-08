// app/myorders.tsx
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
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
import { apiCancelOrder, apiGetMyOrders, Order } from "../services/api";

const { width: SW } = Dimensions.get("window");

// ─── Order Status Config ──────────────────────────────────────────────────────
const ORDER_STATUS_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    bg: string;
    icon: string;
    step: number;
  }
> = {
  pending: {
    label: "Pending",
    color: "#FF9800",
    bg: "#FFF8E1",
    icon: "clock",
    step: 1,
  },
  confirmed: {
    label: "Confirmed",
    color: "#2196F3",
    bg: "#E3F7FD",
    icon: "check-circle",
    step: 2,
  },
  processing: {
    label: "Processing",
    color: "#8B5CF6",
    bg: "#F5F3FF",
    icon: "package",
    step: 3,
  },
  out_for_delivery: {
    label: "Out for Delivery",
    color: "#00A884",
    bg: "#E8F5E9",
    icon: "truck",
    step: 4,
  },
  delivered: {
    label: "Delivered",
    color: "#4CAF50",
    bg: "#E8F5E9",
    icon: "check-circle",
    step: 5,
  },
  cancelled: {
    label: "Cancelled",
    color: "#E53935",
    bg: "#FEE8EE",
    icon: "x-circle",
    step: 0,
  },
};

// ─── Tabs ────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "all", label: "All Orders", icon: "list" },
  { id: "active", label: "Active", icon: "package" },
  { id: "completed", label: "Completed", icon: "check-circle" },
  { id: "cancelled", label: "Cancelled", icon: "x-circle" },
];

// ─── Helper: Get product image ───────────────────────────────────────────────
const getProductImage = (item: any) => {
  // Check for images array first (new format)
  if (item.images && item.images.length > 0) {
    const primary = item.images.find((img: any) => img.isPrimary);
    return primary?.url || item.images[0].url;
  }
  // Fallback to imageUrl (old format)
  if (item.imageUrl) return item.imageUrl;
  return "https://via.placeholder.com/60";
};

// ─── Helper: Get item subtitle info ──────────────────────────────────────────
const getItemSubtitle = (item: any): string => {
  const parts: string[] = [];
  if (item.brand) parts.push(item.brand);
  if (item.type) parts.push(item.type);
  if (item.color) parts.push(item.color);
  if (item.warranty && item.warranty !== "No Warranty")
    parts.push(item.warranty);
  return parts.join(" · ") || "";
};

// ─── Order Status Tracker Component ──────────────────────────────────────────
const OrderStatusTracker = ({ status }: { status: string }) => {
  const statusConfig = ORDER_STATUS_CONFIG[status];
  const steps = [
    "pending",
    "confirmed",
    "processing",
    "out_for_delivery",
    "delivered",
  ];
  const currentStep = statusConfig?.step || 0;

  if (status === "cancelled") {
    return (
      <View style={styles.cancelledTracker}>
        <Feather name="x-circle" size={wp("5%")} color="#E53935" />
        <Text style={styles.cancelledText}>Order Cancelled</Text>
      </View>
    );
  }

  return (
    <View style={styles.trackerContainer}>
      {steps.map((step, index) => {
        const stepCfg = ORDER_STATUS_CONFIG[step];
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep - 1;

        return (
          <View key={step} style={styles.trackerStep}>
            <View style={styles.trackerIconWrapper}>
              <View
                style={[
                  styles.trackerIcon,
                  isCompleted && styles.trackerIconCompleted,
                  isCurrent && styles.trackerIconCurrent,
                ]}
              >
                {isCompleted ? (
                  <Feather name="check" size={wp("3.5%")} color="#fff" />
                ) : (
                  <Feather
                    name={(stepCfg?.icon as any) || "circle"}
                    size={wp("3.5%")}
                    color={isCurrent ? "#fff" : Colors.textMuted}
                  />
                )}
              </View>
              {index < steps.length - 1 && (
                <View
                  style={[
                    styles.trackerLine,
                    isCompleted && styles.trackerLineCompleted,
                  ]}
                />
              )}
            </View>
            <Text
              style={[
                styles.trackerLabel,
                (isCompleted || isCurrent) && styles.trackerLabelActive,
              ]}
              numberOfLines={1}
            >
              {stepCfg?.label || step}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

// ─── Order Card Component ────────────────────────────────────────────────────
const OrderCard = ({
  order,
  onPress,
  onCancel,
}: {
  order: Order;
  onPress: () => void;
  onCancel: () => void;
}) => {
  const statusCfg =
    ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.pending;
  const total = order.totalAmount;

  return (
    <TouchableOpacity
      style={styles.orderCard}
      activeOpacity={0.95}
      onPress={onPress}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.orderIcon}>
            <Feather
              name="shopping-bag"
              size={wp("4.5%")}
              color={Colors.primary}
            />
          </View>
          <View>
            <Text style={styles.orderNumber}>{order.orderNumber}</Text>
            <Text style={styles.orderDate}>
              {new Date(order.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
          <Feather
            name={statusCfg.icon as any}
            size={wp("3%")}
            color={statusCfg.color}
          />
          <Text style={[styles.statusText, { color: statusCfg.color }]}>
            {statusCfg.label}
          </Text>
        </View>
      </View>

      {/* Items Preview */}
      <View style={styles.itemsPreview}>
        {order.items.slice(0, 2).map((item, index) => (
          <View key={index} style={styles.previewItem}>
            <Image
              source={{
                uri: getProductImage(item),
              }}
              style={styles.previewImage}
            />
            <Text style={styles.previewQuantity}>x{item.quantity}</Text>
          </View>
        ))}
        {order.items.length > 2 && (
          <View style={styles.moreItems}>
            <Text style={styles.moreItemsText}>+{order.items.length - 2}</Text>
          </View>
        )}
      </View>

      {/* Summary */}
      <View style={styles.itemsSummary}>
        <Text style={styles.itemsSummaryText}>
          {order.items.length} {order.items.length === 1 ? "item" : "items"} •
          Total: ₹{total}
        </Text>
      </View>

      {/* Tracker */}
      <OrderStatusTracker status={order.status} />

      {/* Footer */}
      <View style={styles.cardFooter}>
        {order.status === "delivered" ? (
          <TouchableOpacity style={styles.footerBtn}>
            <Feather
              name="rotate-cw"
              size={wp("3.5%")}
              color={Colors.primary}
            />
            <Text style={styles.footerBtnText}>Reorder</Text>
          </TouchableOpacity>
        ) : order.status === "cancelled" ? (
          <TouchableOpacity style={styles.footerBtn}>
            <Feather
              name="rotate-cw"
              size={wp("3.5%")}
              color={Colors.primary}
            />
            <Text style={styles.footerBtnText}>Buy Again</Text>
          </TouchableOpacity>
        ) : (
          <>
            {order.status === "pending" && (
              <TouchableOpacity
                style={[styles.footerBtn, styles.cancelBtn]}
                onPress={onCancel}
              >
                <Feather name="x" size={wp("3.5%")} color="#E53935" />
                <Text style={[styles.footerBtnText, { color: "#E53935" }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
        <TouchableOpacity style={styles.trackBtn}>
          <Text style={styles.trackBtnText}>
            {order.status === "delivered" ? "View Details" : "Track Order"}
          </Text>
          <Feather
            name="chevron-right"
            size={wp("3.5%")}
            color={Colors.primary}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// ─── Order Details Modal ─────────────────────────────────────────────────────
const OrderDetailsModal = ({
  visible,
  order,
  onClose,
}: {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
}) => {
  if (!order) return null;

  const statusCfg =
    ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.pending;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Feather name="x" size={wp("5%")} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Order Details</Text>
            <View style={{ width: wp("8%") }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalBody}>
              {/* Order Status Header */}
              <View style={styles.modalSection}>
                <View style={styles.orderStatusHeader}>
                  <Text style={styles.orderNumberLarge}>
                    {order.orderNumber}
                  </Text>
                  <View
                    style={[
                      styles.statusBadgeLarge,
                      { backgroundColor: statusCfg.bg },
                    ]}
                  >
                    <Feather
                      name={statusCfg.icon as any}
                      size={wp("3.5%")}
                      color={statusCfg.color}
                    />
                    <Text
                      style={[
                        styles.statusTextLarge,
                        { color: statusCfg.color },
                      ]}
                    >
                      {statusCfg.label}
                    </Text>
                  </View>
                </View>
                <Text style={styles.orderDateLarge}>
                  Placed on{" "}
                  {new Date(order.createdAt).toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </Text>
              </View>

              {/* Status Tracker */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Order Status</Text>
                <OrderStatusTracker status={order.status} />
              </View>

              {/* Delivery Address */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Delivery Address</Text>
                <View style={styles.addressCard}>
                  <Text style={styles.addressName}>
                    {order.deliveryAddress.contactName}
                  </Text>
                  <Text style={styles.addressText}>
                    {order.deliveryAddress.addressLine1}
                  </Text>
                  {order.deliveryAddress.addressLine2 ? (
                    <Text style={styles.addressText}>
                      {order.deliveryAddress.addressLine2}
                    </Text>
                  ) : null}
                  <Text style={styles.addressText}>
                    {order.deliveryAddress.city}, {order.deliveryAddress.state}{" "}
                    - {order.deliveryAddress.pincode}
                  </Text>
                  <Text style={styles.addressPhone}>
                    📞 {order.deliveryAddress.phone}
                  </Text>
                </View>
              </View>

              {/* Order Items */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>
                  Items ({order.items.length})
                </Text>
                {order.items.map((item, index) => (
                  <View key={index} style={styles.orderItem}>
                    <Image
                      source={{
                        uri: getProductImage(item),
                      }}
                      style={styles.orderItemImage}
                    />
                    <View style={styles.orderItemDetails}>
                      <Text style={styles.orderItemName}>{item.name}</Text>
                      {/* Updated: Show electronics-specific details */}
                      <Text style={styles.orderItemManufacturer}>
                        {getItemSubtitle(item)}
                      </Text>
                      {item.dimensions && (
                        <Text style={styles.orderItemSpec}>
                          📐 {item.dimensions}
                        </Text>
                      )}
                      {item.weight && (
                        <Text style={styles.orderItemSpec}>
                          ⚖️ {item.weight}
                        </Text>
                      )}
                      <Text style={styles.orderItemPrice}>
                        ₹{item.sellingPrice} × {item.quantity} = ₹
                        {item.lineTotal}
                      </Text>
                      {/* Show original price if discounted */}
                      {item.originalPrice &&
                        item.originalPrice > item.sellingPrice && (
                          <Text style={styles.orderItemOriginalPrice}>
                            MRP: ₹{item.originalPrice}
                          </Text>
                        )}
                    </View>
                  </View>
                ))}
              </View>

              {/* Payment Summary */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Payment Summary</Text>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Subtotal</Text>
                  <Text style={styles.paymentValue}>₹{order.subtotal}</Text>
                </View>
                {order.couponDiscount > 0 && (
                  <View style={styles.paymentRow}>
                    <Text style={[styles.paymentLabel, { color: "#4CAF50" }]}>
                      Discount
                    </Text>
                    <Text style={[styles.paymentValue, { color: "#4CAF50" }]}>
                      -₹{order.couponDiscount}
                    </Text>
                  </View>
                )}
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Delivery</Text>
                  <Text style={styles.paymentValue}>
                    {order.deliveryCharge === 0
                      ? "FREE"
                      : `₹${order.deliveryCharge}`}
                  </Text>
                </View>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Platform Fee</Text>
                  <Text style={styles.paymentValue}>₹{order.platformFee}</Text>
                </View>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>GST</Text>
                  <Text style={styles.paymentValue}>₹{order.gst}</Text>
                </View>
                {order.deliveryTip > 0 && (
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Tip</Text>
                    <Text style={styles.paymentValue}>
                      ₹{order.deliveryTip}
                    </Text>
                  </View>
                )}
                <View style={[styles.paymentRow, styles.paymentTotal]}>
                  <Text style={styles.paymentTotalLabel}>Total Paid</Text>
                  <Text style={styles.paymentTotalValue}>
                    ₹{order.totalAmount}
                  </Text>
                </View>
                <View style={styles.paymentMethod}>
                  <Feather
                    name="credit-card"
                    size={wp("3.5%")}
                    color={Colors.textMuted}
                  />
                  <Text style={styles.paymentMethodText}>
                    Paid via {order.paymentMethod?.toUpperCase() || "UPI"}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Empty State ─────────────────────────────────────────────────────────────
const EmptyState = ({ activeTab }: { activeTab: string }) => {
  const getEmptyMessage = () => {
    switch (activeTab) {
      case "active":
        return {
          title: "No Active Orders",
          subtitle: "You don't have any active orders",
          icon: "package",
        };
      case "completed":
        return {
          title: "No Completed Orders",
          subtitle: "Your completed orders will appear here",
          icon: "check-circle",
        };
      case "cancelled":
        return {
          title: "No Cancelled Orders",
          subtitle: "You don't have any cancelled orders",
          icon: "x-circle",
        };
      default:
        return {
          title: "No Orders Yet",
          subtitle: "Start shopping for electronics accessories",
          icon: "shopping-bag",
        };
    }
  };
  const message = getEmptyMessage();

  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconCircle}>
        <Feather
          name={message.icon as any}
          size={wp("12%")}
          color={Colors.primary}
        />
      </View>
      <Text style={styles.emptyTitle}>{message.title}</Text>
      <Text style={styles.emptySub}>{message.subtitle}</Text>
      <TouchableOpacity
        style={styles.emptyBtn}
        onPress={() => router.push("/")}
        activeOpacity={0.8}
      >
        <Feather name="shopping-cart" size={wp("4%")} color={Colors.white} />
        <Text style={styles.emptyBtnText}>Start Shopping</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
const MyOrdersScreen = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await apiGetMyOrders({ limit: 50 });
      if (response.success) {
        setOrders(response.data.orders);
        console.log(`📦 Loaded ${response.data.orders.length} orders`);
      }
    } catch (error: any) {
      console.error("Failed to fetch orders:", error);
      Alert.alert("Error", error.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleCancelOrder = (orderId: string) => {
    Alert.alert("Cancel Order", "Are you sure you want to cancel this order?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            await apiCancelOrder(orderId, "Cancelled by customer");
            Alert.alert("Success", "Order cancelled successfully");
            fetchOrders();
          } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to cancel order");
          }
        },
      },
    ]);
  };

  const filteredOrders = orders.filter((order) => {
    if (activeTab === "all") return true;
    if (activeTab === "active")
      return !["delivered", "cancelled"].includes(order.status);
    if (activeTab === "completed") return order.status === "delivered";
    if (activeTab === "cancelled") return order.status === "cancelled";
    return true;
  });

  const stats = {
    total: orders.length,
    active: orders.filter((o) => !["delivered", "cancelled"].includes(o.status))
      .length,
    completed: orders.filter((o) => o.status === "delivered").length,
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }, [fetchOrders]);

  if (loading) {
    return (
      <View
        style={[
          styles.root,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#00A884" />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ marginTop: hp("2%"), color: Colors.textSecondary }}>
          Loading orders...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#00A884" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.8}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={wp("5.5%")} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Orders</Text>
          <View style={{ width: wp("10%") }} />
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: "#FF9800" }]}>
              {stats.active}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: "#fff" }]}>
              {stats.completed}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
            >
              <Feather
                name={tab.icon as any}
                size={wp("3.5%")}
                color={activeTab === tab.id ? Colors.primary : Colors.textMuted}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.id && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
              {activeTab === tab.id && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      {filteredOrders.length === 0 ? (
        <EmptyState activeTab={activeTab} />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() => {
                setSelectedOrder(item);
                setShowOrderModal(true);
              }}
              onCancel={() => handleCancelOrder(item._id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
        />
      )}

      <OrderDetailsModal
        visible={showOrderModal}
        order={selectedOrder}
        onClose={() => setShowOrderModal(false)}
      />
    </View>
  );
};

// ─── Styles (keep existing styles, add new ones below) ────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    paddingTop: Platform.OS === "ios" ? hp("6%") : hp("6%"),
    paddingBottom: hp("2%"),
    paddingHorizontal: wp("5%"),
    backgroundColor: "#00A884",
    borderBottomLeftRadius: wp("6%"),
    borderBottomRightRadius: wp("6%"),
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: hp("1.5%"),
  },
  backBtn: {
    width: wp("10%"),
    height: wp("10%"),
    borderRadius: wp("5%"),
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: wp("5%"), fontWeight: "800", color: "#fff" },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: wp("4%"),
    paddingVertical: hp("1.5%"),
    paddingHorizontal: wp("3%"),
    marginTop: hp("1%"),
  },
  statCard: { flex: 1, alignItems: "center" },
  statNumber: { fontSize: wp("4.5%"), fontWeight: "800", color: "#fff" },
  statLabel: {
    fontSize: wp("2.8%"),
    color: "rgba(255,255,255,0.8)",
    marginTop: hp("0.3%"),
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginVertical: hp("0.5%"),
  },

  // Tabs
  tabsContainer: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabsScroll: { paddingHorizontal: wp("4%") },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("1.5%"),
    paddingVertical: hp("1.5%"),
    paddingHorizontal: wp("4%"),
    position: "relative",
  },
  tabActive: { backgroundColor: Colors.primaryLight },
  tabText: { fontSize: wp("3.2%"), fontWeight: "600", color: Colors.textMuted },
  tabTextActive: { color: Colors.primary },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: wp("2%"),
    right: wp("2%"),
    height: 2,
    backgroundColor: Colors.primary,
    borderRadius: 1,
  },

  // List
  listContent: {
    paddingTop: hp("1.5%"),
    paddingHorizontal: wp("4%"),
    paddingBottom: hp("13%"),
  },

  // Order Card
  orderCard: {
    backgroundColor: Colors.surface,
    borderRadius: wp("4%"),
    marginBottom: hp("1.5%"),
    padding: wp("4%"),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: hp("1.5%"),
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: wp("3%") },
  orderIcon: {
    width: wp("10%"),
    height: wp("10%"),
    borderRadius: wp("3%"),
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  orderNumber: {
    fontSize: wp("3.8%"),
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  orderDate: {
    fontSize: wp("2.8%"),
    color: Colors.textMuted,
    marginTop: hp("0.2%"),
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("1%"),
    paddingHorizontal: wp("2.5%"),
    paddingVertical: hp("0.4%"),
    borderRadius: wp("3%"),
  },
  statusText: { fontSize: wp("2.8%"), fontWeight: "700" },
  itemsPreview: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: hp("1%"),
  },
  previewItem: { position: "relative", marginRight: wp("2%") },
  previewImage: {
    width: wp("12%"),
    height: wp("12%"),
    borderRadius: wp("2%"),
    backgroundColor: Colors.surfaceAlt,
  },
  previewQuantity: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: Colors.primary,
    color: "#fff",
    fontSize: wp("2.2%"),
    fontWeight: "700",
    paddingHorizontal: wp("1.2%"),
    paddingVertical: hp("0.2%"),
    borderRadius: wp("2%"),
    overflow: "hidden",
  },
  moreItems: {
    width: wp("12%"),
    height: wp("12%"),
    borderRadius: wp("2%"),
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  moreItemsText: {
    fontSize: wp("3%"),
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  itemsSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: hp("1.5%"),
  },
  itemsSummaryText: { fontSize: wp("3.2%"), color: Colors.textSecondary },

  // Tracker
  trackerContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: hp("1.5%"),
    paddingHorizontal: wp("2%"),
  },
  trackerStep: { flex: 1, alignItems: "center" },
  trackerIconWrapper: {
    alignItems: "center",
    position: "relative",
    width: "100%",
  },
  trackerIcon: {
    width: wp("7%"),
    height: wp("7%"),
    borderRadius: wp("3.5%"),
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  trackerIconCompleted: { backgroundColor: "#4CAF50", borderColor: "#4CAF50" },
  trackerIconCurrent: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  trackerLine: {
    position: "absolute",
    top: wp("3.5%"),
    left: "50%",
    width: "100%",
    height: 2,
    backgroundColor: Colors.border,
    zIndex: 1,
  },
  trackerLineCompleted: { backgroundColor: "#4CAF50" },
  trackerLabel: {
    fontSize: wp("2%"),
    color: Colors.textMuted,
    marginTop: hp("0.5%"),
    textAlign: "center",
  },
  trackerLabelActive: { color: Colors.textPrimary, fontWeight: "600" },
  cancelledTracker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp("2%"),
    paddingVertical: hp("1%"),
    marginBottom: hp("1%"),
    backgroundColor: "#FEE8EE",
    borderRadius: wp("2%"),
  },
  cancelledText: { fontSize: wp("3.5%"), fontWeight: "600", color: "#E53935" },

  // Card Footer
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: hp("1.5%"),
  },
  footerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("1%"),
    paddingHorizontal: wp("3%"),
    paddingVertical: hp("0.6%"),
  },
  footerBtnText: {
    fontSize: wp("3%"),
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  cancelBtn: { marginLeft: wp("2%") },
  trackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("1%"),
    marginLeft: "auto",
  },
  trackBtnText: {
    fontSize: wp("3%"),
    color: Colors.primary,
    fontWeight: "600",
  },

  // Empty State
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp("12%"),
  },
  emptyIconCircle: {
    width: wp("25%"),
    height: wp("25%"),
    borderRadius: wp("12.5%"),
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: hp("2.5%"),
  },
  emptyTitle: {
    fontSize: wp("5%"),
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: hp("1%"),
  },
  emptySub: {
    fontSize: wp("3.5%"),
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: hp("3%"),
    marginBottom: hp("3%"),
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2%"),
    backgroundColor: Colors.primary,
    paddingHorizontal: wp("6%"),
    paddingVertical: hp("1.5%"),
    borderRadius: wp("5%"),
  },
  emptyBtnText: { fontSize: wp("3.8%"), color: "#fff", fontWeight: "700" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: wp("6%"),
    borderTopRightRadius: wp("6%"),
    maxHeight: hp("90%"),
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: wp("5%"),
    paddingVertical: hp("2%"),
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeBtn: {
    width: wp("8%"),
    height: wp("8%"),
    borderRadius: wp("4%"),
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: wp("4.5%"),
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  modalBody: { padding: wp("5%") },
  modalSection: { marginBottom: hp("2.5%") },
  modalSectionTitle: {
    fontSize: wp("4%"),
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: hp("1.5%"),
  },
  orderStatusHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: hp("0.5%"),
  },
  orderNumberLarge: {
    fontSize: wp("4.5%"),
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  statusBadgeLarge: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("1.5%"),
    paddingHorizontal: wp("3%"),
    paddingVertical: hp("0.6%"),
    borderRadius: wp("4%"),
  },
  statusTextLarge: { fontSize: wp("3.2%"), fontWeight: "700" },
  orderDateLarge: { fontSize: wp("3.2%"), color: Colors.textMuted },
  addressCard: {
    backgroundColor: Colors.surfaceAlt,
    padding: wp("4%"),
    borderRadius: wp("4%"),
  },
  addressName: {
    fontSize: wp("3.8%"),
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: hp("0.5%"),
  },
  addressText: {
    fontSize: wp("3.2%"),
    color: Colors.textSecondary,
    lineHeight: hp("2.5%"),
  },
  addressPhone: {
    fontSize: wp("3.2%"),
    color: Colors.primary,
    fontWeight: "600",
    marginTop: hp("0.5%"),
  },
  orderItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: hp("1%"),
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  orderItemImage: {
    width: wp("15%"),
    height: wp("15%"),
    marginRight: wp("3%"),
    borderRadius: wp("2%"),
    backgroundColor: Colors.surfaceAlt,
  },
  orderItemDetails: { flex: 1 },
  orderItemName: {
    fontSize: wp("3.5%"),
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  orderItemManufacturer: {
    fontSize: wp("2.8%"),
    color: Colors.textMuted,
    marginBottom: 2,
  },
  // New: Item specifications
  orderItemSpec: {
    fontSize: wp("2.5%"),
    color: Colors.textSecondary,
    marginBottom: 1,
  },
  orderItemPrice: {
    fontSize: wp("3.2%"),
    color: Colors.primary,
    fontWeight: "600",
  },
  // New: Original price
  orderItemOriginalPrice: {
    fontSize: wp("2.5%"),
    color: Colors.textMuted,
    textDecorationLine: "line-through",
    marginTop: 1,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: hp("1%"),
  },
  paymentLabel: { fontSize: wp("3.2%"), color: Colors.textSecondary },
  paymentValue: {
    fontSize: wp("3.2%"),
    color: Colors.textPrimary,
    fontWeight: "500",
  },
  paymentTotal: {
    marginTop: hp("1%"),
    paddingTop: hp("1%"),
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  paymentTotalLabel: {
    fontSize: wp("3.8%"),
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  paymentTotalValue: {
    fontSize: wp("4.5%"),
    fontWeight: "800",
    color: Colors.primary,
  },
  paymentMethod: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: hp("1%"),
    gap: wp("2%"),
  },
  paymentMethodText: { fontSize: wp("3%"), color: Colors.textMuted },
});

export default MyOrdersScreen;
