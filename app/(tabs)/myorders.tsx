// app/myorders.tsx

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
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
import { PRODUCTS, Product } from "../../constants/products";

const { width: SW } = Dimensions.get("window");

// ─── Order Status Config ──────────────────────────────────────────────────────
const ORDER_STATUS = {
  pending: {
    label: "Pending",
    color: Colors.warning,
    bg: "#FFF8E1",
    icon: "clock",
    step: 1,
  },
  confirmed: {
    label: "Confirmed",
    color: Colors.info,
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
  shipped: {
    label: "Shipped",
    color: Colors.accent,
    bg: Colors.primaryLight,
    icon: "truck",
    step: 4,
  },
  delivered: {
    label: "Delivered",
    color: Colors.success,
    bg: Colors.accentLight,
    icon: "check-circle",
    step: 5,
  },
  cancelled: {
    label: "Cancelled",
    color: Colors.error,
    bg: "#FEE8EE",
    icon: "x-circle",
    step: 0,
  },
};

type OrderStatus = keyof typeof ORDER_STATUS;

// ─── Order Types ──────────────────────────────────────────────────────────────
interface OrderItem {
  productId: string;
  quantity: number;
}

interface Order {
  id: string;
  orderNumber: string;
  orderDate: string;
  deliveryDate: string;
  status: OrderStatus;
  items: OrderItem[];
  paymentMethod: string;
  deliveryAddress: {
    name: string;
    address: string;
    city: string;
    pincode: string;
    phone: string;
  };
  trackingNumber?: string;
  prescriptionRequired?: boolean;
}

// ─── Helper: resolve product ──────────────────────────────────────────────────
const getProduct = (id: string): Product | undefined =>
  PRODUCTS.find((p) => p.id === id);

const orderTotal = (items: OrderItem[]): number =>
  items.reduce((sum, it) => {
    const p = getProduct(it.productId);
    return sum + (p ? p.price * it.quantity : 0);
  }, 0);

// ─── Mock Orders (items reference PRODUCTS ids) ───────────────────────────────
const MOCK_ORDERS: Order[] = [
  {
    id: "1",
    orderNumber: "NIL12345678",
    orderDate: "2024-01-15",
    deliveryDate: "2024-01-18",
    status: "delivered",
    items: [
      { productId: "1", quantity: 2 }, // Premium Basmati Rice
      { productId: "10", quantity: 1 }, // Tata Tea Gold
    ],
    paymentMethod: "Cash on Delivery",
    deliveryAddress: {
      name: "Rahul Sharma",
      address: "123, Nilkanth Society, Near City Hospital",
      city: "Mumbai, Maharashtra",
      pincode: "400069",
      phone: "+91 98765 43210",
    },
    trackingNumber: "TRK987654321",
  },
  {
    id: "2",
    orderNumber: "NIL87654321",
    orderDate: "2024-01-20",
    deliveryDate: "2024-01-23",
    status: "shipped",
    items: [
      { productId: "13", quantity: 1 }, // Surf Excel Matic
      { productId: "14", quantity: 2 }, // Lizol Floor Cleaner
    ],
    paymentMethod: "UPI",
    deliveryAddress: {
      name: "Rahul Sharma",
      address: "123, Nilkanth Society, Near City Hospital",
      city: "Mumbai, Maharashtra",
      pincode: "400069",
      phone: "+91 98765 43210",
    },
    trackingNumber: "TRK123456789",
  },
  {
    id: "3",
    orderNumber: "NIL11223344",
    orderDate: "2024-01-22",
    deliveryDate: "2024-01-25",
    status: "processing",
    items: [
      { productId: "16", quantity: 1 }, // Dove Shampoo
      { productId: "18", quantity: 2 }, // Colgate Toothpaste
    ],
    paymentMethod: "Credit Card",
    deliveryAddress: {
      name: "Rahul Sharma",
      address: "123, Nilkanth Society, Near City Hospital",
      city: "Mumbai, Maharashtra",
      pincode: "400069",
      phone: "+91 98765 43210",
    },
  },
  {
    id: "4",
    orderNumber: "NIL99887766",
    orderDate: "2024-01-10",
    deliveryDate: "2024-01-13",
    status: "cancelled",
    items: [
      { productId: "7", quantity: 3 }, // Cadbury Dairy Milk
    ],
    paymentMethod: "Cash on Delivery",
    deliveryAddress: {
      name: "Rahul Sharma",
      address: "123, Nilkanth Society, Near City Hospital",
      city: "Mumbai, Maharashtra",
      pincode: "400069",
      phone: "+91 98765 43210",
    },
  },
  {
    id: "5",
    orderNumber: "NIL55667788",
    orderDate: "2024-01-25",
    deliveryDate: "2024-01-28",
    status: "pending",
    items: [
      { productId: "20", quantity: 1 }, // Imported Dark Chocolate
      { productId: "19", quantity: 1 }, // Nivea Body Lotion
    ],
    paymentMethod: "Net Banking",
    deliveryAddress: {
      name: "Rahul Sharma",
      address: "123, Nilkanth Society, Near City Hospital",
      city: "Mumbai, Maharashtra",
      pincode: "400069",
      phone: "+91 98765 43210",
    },
  },
];

// ─── Tab Filter Options ──────────────────────────────────────────────────────
const TABS = [
  { id: "all", label: "All Orders", icon: "list" },
  { id: "active", label: "Active", icon: "package" },
  { id: "completed", label: "Completed", icon: "check-circle" },
  { id: "cancelled", label: "Cancelled", icon: "x-circle" },
];

// ─── Order Status Tracker ────────────────────────────────────────────────────
const OrderStatusTracker = ({ status }: { status: OrderStatus }) => {
  const statusConfig = ORDER_STATUS[status];
  const steps = ["pending", "confirmed", "processing", "shipped", "delivered"];
  const currentStep = statusConfig.step;

  if (status === "cancelled") {
    return (
      <View style={styles.cancelledTracker}>
        <Feather name="x-circle" size={wp("5%")} color={Colors.error} />
        <Text style={styles.cancelledText}>Order Cancelled</Text>
      </View>
    );
  }

  return (
    <View style={styles.trackerContainer}>
      {steps.map((step, index) => {
        const stepStatus = ORDER_STATUS[step as OrderStatus];
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
                  <Feather
                    name="check"
                    size={wp("3.5%")}
                    color={Colors.white}
                  />
                ) : (
                  <Feather
                    name={stepStatus.icon as any}
                    size={wp("3.5%")}
                    color={isCurrent ? Colors.white : Colors.textMuted}
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
            >
              {stepStatus.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

// ─── Order Card ──────────────────────────────────────────────────────────────
const OrderCard = ({
  order,
  onPress,
}: {
  order: Order;
  onPress: () => void;
}) => {
  const status = ORDER_STATUS[order.status];
  const total = orderTotal(order.items);
  const resolvedItems = order.items.map((it) => ({
    ...it,
    product: getProduct(it.productId),
  }));

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
              Ordered on{" "}
              {new Date(order.orderDate).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Feather
            name={status.icon as any}
            size={wp("3%")}
            color={status.color}
          />
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
      </View>

      {/* Items Preview */}
      <View style={styles.itemsPreview}>
        {resolvedItems.slice(0, 2).map(({ productId, quantity, product }) =>
          product ? (
            <View key={productId} style={styles.previewItem}>
              <Image
                source={{ uri: product.images[0] }}
                style={styles.previewImage}
              />
              <Text style={styles.previewQuantity}>x{quantity}</Text>
            </View>
          ) : null,
        )}
        {order.items.length > 2 && (
          <View style={styles.moreItems}>
            <Text style={styles.moreItemsText}>+{order.items.length - 2}</Text>
          </View>
        )}
      </View>

      {/* Summary row */}
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
          <>
            <TouchableOpacity style={styles.footerBtn}>
              <Feather
                name="rotate-cw"
                size={wp("3.5%")}
                color={Colors.primary}
              />
              <Text style={styles.footerBtnText}>Reorder</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerBtn}>
              <Feather name="star" size={wp("3.5%")} color={Colors.warning} />
              <Text style={styles.footerBtnText}>Rate</Text>
            </TouchableOpacity>
          </>
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
            <TouchableOpacity style={styles.footerBtn}>
              <Feather
                name="help-circle"
                size={wp("3.5%")}
                color={Colors.textSecondary}
              />
              <Text style={styles.footerBtnText}>Need Help?</Text>
            </TouchableOpacity>
            {order.status === "pending" && (
              <TouchableOpacity style={[styles.footerBtn, styles.cancelBtn]}>
                <Feather name="x" size={wp("3.5%")} color={Colors.error} />
                <Text style={[styles.footerBtnText, { color: Colors.error }]}>
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

  const status = ORDER_STATUS[order.status];
  const total = orderTotal(order.items);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Modal Header */}
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
                      { backgroundColor: status.bg },
                    ]}
                  >
                    <Feather
                      name={status.icon as any}
                      size={wp("3.5%")}
                      color={status.color}
                    />
                    <Text
                      style={[styles.statusTextLarge, { color: status.color }]}
                    >
                      {status.label}
                    </Text>
                  </View>
                </View>
                <Text style={styles.orderDateLarge}>
                  Placed on{" "}
                  {new Date(order.orderDate).toLocaleDateString("en-IN", {
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
                {order.status === "shipped" && order.trackingNumber && (
                  <View style={styles.trackingInfo}>
                    <Feather name="truck" size={wp("4%")} color={Colors.info} />
                    <Text style={styles.trackingNumber}>
                      Tracking: {order.trackingNumber}
                    </Text>
                  </View>
                )}
              </View>

              {/* Delivery Address */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Delivery Address</Text>
                <View style={styles.addressCard}>
                  <Text style={styles.addressName}>
                    {order.deliveryAddress.name}
                  </Text>
                  <Text style={styles.addressText}>
                    {order.deliveryAddress.address}
                  </Text>
                  <Text style={styles.addressText}>
                    {order.deliveryAddress.city}
                  </Text>
                  <Text style={styles.addressText}>
                    {order.deliveryAddress.pincode}
                  </Text>
                  <Text style={styles.addressPhone}>
                    {order.deliveryAddress.phone}
                  </Text>
                </View>
              </View>

              {/* Order Items */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>
                  Items ({order.items.length})
                </Text>
                {order.items.map(({ productId, quantity }) => {
                  const product = getProduct(productId);
                  if (!product) return null;
                  return (
                    <View key={productId} style={styles.orderItem}>
                      <Image
                        source={{ uri: product.images[0] }}
                        style={styles.orderItemImage}
                      />
                      <View style={styles.orderItemDetails}>
                        <Text style={styles.orderItemName}>{product.name}</Text>
                        <Text style={styles.orderItemManufacturer}>
                          {product.brand ?? ""}
                        </Text>
                        <Text style={styles.orderItemPrice}>
                          ₹{product.price} × {quantity} = ₹
                          {product.price * quantity}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Payment Summary */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Payment Summary</Text>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Item Total</Text>
                  <Text style={styles.paymentValue}>₹{total}</Text>
                </View>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Delivery Fee</Text>
                  <Text
                    style={[
                      styles.paymentValue,
                      { color: Colors.success, fontWeight: "700" },
                    ]}
                  >
                    FREE
                  </Text>
                </View>
                <View style={[styles.paymentRow, styles.paymentTotal]}>
                  <Text style={styles.paymentTotalLabel}>Total Paid</Text>
                  <Text style={styles.paymentTotalValue}>₹{total}</Text>
                </View>
                <View style={styles.paymentMethod}>
                  <Feather
                    name="credit-card"
                    size={wp("3.5%")}
                    color={Colors.textMuted}
                  />
                  <Text style={styles.paymentMethodText}>
                    Paid via {order.paymentMethod}
                  </Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.downloadInvoiceBtn}>
                  <Feather
                    name="download"
                    size={wp("4%")}
                    color={Colors.textSecondary}
                  />
                  <Text style={styles.downloadInvoiceText}>
                    Download Invoice
                  </Text>
                </TouchableOpacity>

                {order.status === "delivered" ? (
                  <TouchableOpacity style={styles.reorderBtn}>
                    <Feather
                      name="rotate-cw"
                      size={wp("4%")}
                      color={Colors.white}
                    />
                    <Text style={styles.reorderBtnText}>Reorder All Items</Text>
                  </TouchableOpacity>
                ) : (
                  order.status !== "cancelled" && (
                    <TouchableOpacity style={styles.contactSupportBtn}>
                      <Feather
                        name="message-circle"
                        size={wp("4%")}
                        color={Colors.primary}
                      />
                      <Text style={styles.contactSupportText}>
                        Contact Support
                      </Text>
                    </TouchableOpacity>
                  )
                )}
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
          subtitle: "You don't have any active orders at the moment",
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
          subtitle: "Start shopping to place your first order",
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
        onPress={() => router.push("/" as any)}
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
  const [orders] = useState<Order[]>(MOCK_ORDERS);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.accent} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.8}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={wp("5.5%")} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Orders</Text>
          <TouchableOpacity style={styles.headerIcon}>
            <Feather name="search" size={wp("5%")} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: Colors.warning }]}>
              {stats.active}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: Colors.accentLight }]}>
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
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() => {
                setSelectedOrder(item);
                setShowOrderModal(true);
              }}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    paddingTop: Platform.OS === "ios" ? hp("6%") : hp("6%"),
    paddingBottom: hp("2%"),
    paddingHorizontal: wp("5%"),
    backgroundColor: Colors.accent,
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
  headerTitle: {
    fontSize: wp("5%"),
    fontWeight: "800",
    color: Colors.white,
  },
  headerIcon: {
    width: wp("10%"),
    height: wp("10%"),
    borderRadius: wp("5%"),
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: wp("4%"),
    paddingVertical: hp("1.5%"),
    paddingHorizontal: wp("3%"),
    marginTop: hp("1%"),
  },
  statCard: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: wp("4.5%"),
    fontWeight: "800",
    color: Colors.white,
  },
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
  tabsScroll: {
    paddingHorizontal: wp("4%"),
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("1.5%"),
    paddingVertical: hp("1.5%"),
    paddingHorizontal: wp("4%"),
    position: "relative",
  },
  tabActive: {
    backgroundColor: Colors.primaryLight,
  },
  tabText: {
    fontSize: wp("3.2%"),
    fontWeight: "600",
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.primary,
  },
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
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: hp("1.5%"),
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("3%"),
  },
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
  statusText: {
    fontSize: wp("2.8%"),
    fontWeight: "700",
  },
  itemsPreview: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: hp("1%"),
  },
  previewItem: {
    position: "relative",
    marginRight: wp("2%"),
  },
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
    color: Colors.white,
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
  itemsSummaryText: {
    fontSize: wp("3.2%"),
    color: Colors.textSecondary,
  },

  // Tracker
  trackerContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: hp("1.5%"),
    paddingHorizontal: wp("2%"),
  },
  trackerStep: {
    flex: 1,
    alignItems: "center",
  },
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
  trackerIconCompleted: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
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
  trackerLineCompleted: {
    backgroundColor: Colors.success,
  },
  trackerLabel: {
    fontSize: wp("2.2%"),
    color: Colors.textMuted,
    marginTop: hp("0.5%"),
    textAlign: "center",
  },
  trackerLabelActive: {
    color: Colors.textPrimary,
    fontWeight: "600",
  },
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
  cancelledText: {
    fontSize: wp("3.5%"),
    fontWeight: "600",
    color: Colors.error,
  },

  // Card Footer
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
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
  cancelBtn: {
    marginLeft: wp("2%"),
  },
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
  emptyBtnText: {
    fontSize: wp("3.8%"),
    color: Colors.white,
    fontWeight: "700",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.white,
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
  modalBody: {
    padding: wp("5%"),
  },
  modalSection: {
    marginBottom: hp("2.5%"),
  },
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
  statusTextLarge: {
    fontSize: wp("3.2%"),
    fontWeight: "700",
  },
  orderDateLarge: {
    fontSize: wp("3.2%"),
    color: Colors.textMuted,
  },
  trackingInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.info + "18",
    padding: wp("3%"),
    borderRadius: wp("3%"),
    marginTop: hp("1.5%"),
    gap: wp("2%"),
  },
  trackingNumber: {
    fontSize: wp("3.2%"),
    color: Colors.info,
    fontWeight: "600",
  },
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
    borderBottomColor: Colors.divider,
  },
  orderItemImage: {
    width: wp("15%"),
    height: wp("15%"),
    marginRight: wp("3%"),
    borderRadius: wp("2%"),
  },
  orderItemDetails: {
    flex: 1,
  },
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
  orderItemPrice: {
    fontSize: wp("3.2%"),
    color: Colors.primary,
    fontWeight: "600",
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: hp("1%"),
  },
  paymentLabel: {
    fontSize: wp("3.2%"),
    color: Colors.textSecondary,
  },
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
  paymentMethodText: {
    fontSize: wp("3%"),
    color: Colors.textMuted,
  },
  modalActions: {
    gap: hp("1.5%"),
    marginTop: hp("1%"),
  },
  downloadInvoiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp("2%"),
    backgroundColor: Colors.surfaceAlt,
    paddingVertical: hp("1.5%"),
    borderRadius: wp("4%"),
  },
  downloadInvoiceText: {
    fontSize: wp("3.5%"),
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  reorderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp("2%"),
    backgroundColor: Colors.primary,
    paddingVertical: hp("1.5%"),
    borderRadius: wp("4%"),
  },
  reorderBtnText: {
    fontSize: wp("3.8%"),
    fontWeight: "700",
    color: Colors.white,
  },
  contactSupportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp("2%"),
    backgroundColor: Colors.primaryLight,
    paddingVertical: hp("1.5%"),
    borderRadius: wp("4%"),
  },
  contactSupportText: {
    fontSize: wp("3.5%"),
    fontWeight: "600",
    color: Colors.primary,
  },
});

export default MyOrdersScreen;
