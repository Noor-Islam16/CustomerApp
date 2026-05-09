// app/checkout.tsx
import { Text } from "@/context/FontContext";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "../constants/colors";
import { useCart } from "../context/CartContext";
import { apiGetMe, apiPlaceOrder, Order } from "./services/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CartOrderData {
  items: any[];
  subtotal: number;
  couponCode?: string;
  couponDiscount: number;
  deliveryCharge: number;
  platformFee: number;
  gst: number;
  deliveryTip: number;
  totalAmount: number;
  appliedCoupon: string | null;
}

interface UserProfile {
  contactName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstNumber?: string;
}

// ─── Helper: Get price from product (handles both API and legacy formats) ─────
const getProductPrice = (product: any): number => {
  if (product.sellingPrice !== undefined && product.sellingPrice !== null) {
    return product.sellingPrice;
  }
  return product.price || product.originalPrice || 0;
};

const getItemTotal = (item: any): number => {
  const price = getProductPrice(item.product);
  return price * item.quantity;
};

// ─── Component ────────────────────────────────────────────────────────────────

const CheckoutScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { cart, clearCart } = useCart();

  // ── State ──
  const [orderData, setOrderData] = useState<CartOrderData | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userPhone, setUserPhone] = useState<string>("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [approvalStatus, setApprovalStatus] = useState<string>("pending");

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  const slideAnim = useRef(new Animated.Value(300)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Parse cart data from params ──
  useEffect(() => {
    if (params.orderData) {
      try {
        const parsed = JSON.parse(params.orderData as string);

        if (parsed.items) {
          parsed.items = parsed.items.map((item: any) => ({
            ...item,
            product: {
              ...item.product,
              sellingPrice: getProductPrice(item.product),
            },
          }));
        }

        setOrderData(parsed);

        console.log(
          "📋 Checkout items:",
          parsed.items.map((i: any) => ({
            name: i.product.name,
            sellingPrice: i.product.sellingPrice,
            quantity: i.quantity,
            total: getItemTotal(i),
          })),
        );
      } catch {
        Alert.alert("Error", "Failed to load order details.");
        router.back();
      }
    }
  }, [params.orderData]);

  // ── Fetch user profile for delivery address ──
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiGetMe();
        setUserProfile(res.user.profile);
        setUserPhone(res.user.phone);
        setApprovalStatus(res.user.approvalStatus || "pending");
      } catch {
        setUserProfile(null);
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, []);

  // ── Modal animation ──
  useEffect(() => {
    if (showPaymentModal) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();

      setCountdown(10);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            timerRef.current = null;
            handleConfirmPayment();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      slideAnim.setValue(300);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [showPaymentModal]);

  // ─── Place order with backend ─────────────────────────────────────────────

  const handleConfirmPayment = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setShowPaymentModal(false);

    if (!orderData || !userProfile) return;

    if (
      !userProfile.contactName ||
      !userProfile.addressLine1 ||
      !userProfile.city ||
      !userProfile.state ||
      !userProfile.pincode
    ) {
      Alert.alert(
        "Incomplete Address",
        "Please complete your delivery address in your profile before placing an order.",
        [{ text: "Go to Profile", onPress: () => router.push("/(tabs)/home") }],
      );
      return;
    }

    setIsPlacingOrder(true);

    try {
      const itemsPayload = orderData.items.map((item: any) => ({
        productId: item.product._id || item.product.id,
        quantity: item.quantity,
      }));

      const payload = {
        items: itemsPayload,
        deliveryAddress: {
          contactName: userProfile.contactName,
          addressLine1: userProfile.addressLine1,
          addressLine2: userProfile.addressLine2,
          city: userProfile.city,
          state: userProfile.state,
          pincode: userProfile.pincode,
          phone: userPhone,
        },
        couponCode: orderData.appliedCoupon || undefined,
        couponDiscount: orderData.couponDiscount,
        deliveryCharge: orderData.deliveryCharge,
        platformFee: orderData.platformFee,
        gst: orderData.gst,
        deliveryTip: orderData.deliveryTip,
        paymentMethod: "upi" as const,
        transactionId: `TXN-${Date.now()}`,
      };

      const result = await apiPlaceOrder(payload);

      clearCart();
      setPlacedOrder(result.data);

      Alert.alert(
        "Order Placed! 🎉",
        `Your order ${result.data.orderNumber} has been placed successfully.`,
        [
          {
            text: "View Order",
            onPress: () =>
              router.replace({
                pathname: "/(tabs)/home",
                params: { orderId: result.data._id },
              }),
          },
          {
            text: "Continue Shopping",
            onPress: () => router.replace("/(tabs)/home"),
          },
        ],
      );
    } catch (err: any) {
      Alert.alert(
        "Order Failed",
        err?.message || "Something went wrong. Please try again.",
        [{ text: "OK" }],
      );
    } finally {
      setIsPlacingOrder(false);
    }
  }, [orderData, userProfile, userPhone, clearCart]);

  const handlePlaceOrder = () => {
    if (!userProfile?.contactName) {
      Alert.alert(
        "Complete Profile",
        "Please complete your profile with delivery address before placing an order.",
        [
          { text: "Go to Profile", onPress: () => router.push("/(tabs)/home") },
          { text: "Cancel", style: "cancel" },
        ],
      );
      return;
    }

    // ✅ Check approval status before allowing payment
    if (approvalStatus === "pending" || approvalStatus === "manual") {
      setShowApprovalModal(true);
      return;
    }

    if (approvalStatus === "rejected") {
      Alert.alert(
        "Account Not Approved",
        "Your account has been rejected. Please contact support for more information.",
        [{ text: "Go to Home", onPress: () => router.push("/(tabs)/home") }],
      );
      return;
    }

    setShowPaymentModal(true);
  };

  const handleCloseModal = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setShowPaymentModal(false);
  };

  // ─── Loading / Empty states ───────────────────────────────────────────────

  if (!orderData || loadingProfile) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={Colors.gradientStart}
        />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading checkout...</Text>
      </View>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const hasAddress =
    userProfile?.contactName && userProfile?.addressLine1 && userProfile?.city;

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Colors.gradientStart}
      />

      {/* Header */}
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.header,
          {
            paddingTop:
              insets.top || (Platform.OS === "ios" ? hp("6%") : hp("4%")),
          },
        ]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={wp("5.5%")}
              color={Colors.white}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: wp("10%") }} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: hp("14%") }}
      >
        {/* ── Delivery Address ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <View style={styles.addressCard}>
            <View style={styles.addressHeader}>
              <MaterialCommunityIcons
                name="home"
                size={wp("5%")}
                color={Colors.primary}
              />
              <Text style={styles.addressType}>Home</Text>
            </View>

            {hasAddress ? (
              <>
                <Text style={styles.addressName}>
                  {userProfile?.contactName}
                </Text>
                <Text style={styles.addressText}>
                  {userProfile?.addressLine1}
                  {userProfile?.addressLine2
                    ? `,\n${userProfile.addressLine2}`
                    : ""}
                  {`\n${userProfile?.city}, ${userProfile?.state} - ${userProfile?.pincode}`}
                </Text>
                {userPhone ? (
                  <Text style={styles.addressPhone}>📞 {userPhone}</Text>
                ) : null}
              </>
            ) : (
              <View style={styles.missingAddressBox}>
                <Feather
                  name="alert-circle"
                  size={wp("4%")}
                  color={Colors.error}
                />
                <Text style={styles.missingAddressText}>
                  Delivery address is incomplete. Please update your profile.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.changeAddressBtn}
              onPress={() => router.push("/(tabs)/home")}
            >
              <Text style={styles.changeAddressText}>
                {hasAddress ? "Change" : "Add"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Order Summary ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryCard}>
            {orderData.items.map((item: any, index: number) => (
              <View key={index} style={styles.summaryItem}>
                <View style={styles.summaryItemLeft}>
                  <Text style={styles.summaryItemName} numberOfLines={1}>
                    {item.product.name}
                  </Text>
                  <Text style={styles.summaryItemQty}>×{item.quantity}</Text>
                </View>
                <Text style={styles.summaryItemPrice}>
                  ₹{getItemTotal(item)}
                </Text>
              </View>
            ))}

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>
                ₹{orderData.subtotal || 0}
              </Text>
            </View>

            {orderData.couponDiscount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: Colors.success }]}>
                  Coupon ({orderData.appliedCoupon})
                </Text>
                <Text style={[styles.summaryValue, { color: Colors.success }]}>
                  -₹{orderData.couponDiscount}
                </Text>
              </View>
            )}

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery</Text>
              <Text style={styles.summaryValue}>
                {orderData.deliveryCharge === 0
                  ? "FREE"
                  : `₹${orderData.deliveryCharge}`}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Platform Fee</Text>
              <Text style={styles.summaryValue}>₹{orderData.platformFee}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>GST (5%)</Text>
              <Text style={styles.summaryValue}>₹{orderData.gst}</Text>
            </View>

            {orderData.deliveryTip > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery Tip</Text>
                <Text style={styles.summaryValue}>
                  ₹{orderData.deliveryTip}
                </Text>
              </View>
            )}

            <View style={[styles.divider, { marginTop: hp("1.5%") }]} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>
                ₹{orderData.totalAmount || 0}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Payment Method ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.paymentCard}>
            <View style={styles.paymentOption}>
              <MaterialCommunityIcons
                name="qrcode-scan"
                size={wp("6%")}
                color={Colors.primary}
              />
              <Text style={styles.paymentOptionText}>UPI / QR Code</Text>
              <Feather
                name="check-circle"
                size={wp("5%")}
                color={Colors.primary}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── Bottom Bar ── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom }]}>
        <LinearGradient
          colors={["rgba(255,255,255,0.95)", Colors.white]}
          style={styles.bottomBarGradient}
        >
          <View style={styles.bottomBarLeft}>
            <Text style={styles.bottomBarLabel}>Total Amount</Text>
            <Text style={styles.bottomBarAmount}>
              ₹{orderData.totalAmount || 0}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.placeOrderBtn, isPlacingOrder && { opacity: 0.7 }]}
            onPress={handlePlaceOrder}
            activeOpacity={0.9}
            disabled={isPlacingOrder}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.placeOrderGradient}
            >
              {isPlacingOrder ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.placeOrderText}>Place Order</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* ── Approval Pending Modal ── */}
      <Modal
        visible={showApprovalModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowApprovalModal(false)}
      >
        <View style={styles.approvalModalOverlay}>
          <View style={styles.approvalModalContent}>
            {/* Icon */}
            <View style={styles.approvalIconCircle}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={wp("12%")}
                color="#D97706"
              />
            </View>

            {/* Title */}
            <Text style={styles.approvalModalTitle}>
              Account Under Review ⏳
            </Text>

            {/* Message */}
            <Text style={styles.approvalModalMessage}>
              {approvalStatus === "manual"
                ? "Your profile is under manual review by our admin team. You'll be able to place orders once your account is approved."
                : "Your account is currently pending approval. Our admin team will review your profile within 24 hours. We'll notify you once approved."}
            </Text>

            {/* Additional Info */}
            <View style={styles.approvalInfoCard}>
              <Feather name="info" size={wp("4%")} color="#D97706" />
              <Text style={styles.approvalInfoText}>
                {userProfile?.gstNumber
                  ? "GST verification in progress. This usually takes a few hours."
                  : "No GST provided. Admin will manually review your profile."}
              </Text>
            </View>

            {/* Go to Home Button */}
            <TouchableOpacity
              style={styles.approvalGoHomeBtn}
              onPress={() => {
                setShowApprovalModal(false);
                router.push("/(tabs)/home");
              }}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.approvalGoHomeGradient}
              >
                <Feather name="home" size={wp("4.5%")} color={Colors.white} />
                <Text style={styles.approvalGoHomeText}>Go to Home</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Close Button */}
            <TouchableOpacity
              style={styles.approvalCloseBtn}
              onPress={() => setShowApprovalModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.approvalCloseText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Payment QR Modal ── */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContent,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Scan & Pay</Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Feather name="x" size={wp("5%")} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Scan the QR code with any UPI app
            </Text>

            <View style={styles.qrContainer}>
              <View style={styles.qrCode}>
                <MaterialCommunityIcons
                  name="qrcode"
                  size={wp("30%")}
                  color={Colors.primary}
                />
                <Text style={styles.qrAmount}>
                  ₹{orderData.totalAmount || 0}
                </Text>
              </View>
            </View>

            <View style={styles.countdownContainer}>
              <Text style={styles.countdownText}>
                Auto-confirming in {countdown}s
              </Text>
              <View style={styles.countdownBar}>
                <View
                  style={[
                    styles.countdownProgress,
                    { width: `${(countdown / 10) * 100}%` },
                  ]}
                />
              </View>
            </View>

            <Text style={styles.payWithText}>Pay with any UPI app</Text>

            <View style={styles.upiAppsContainer}>
              {[
                "https://upload.wikimedia.org/wikipedia/commons/9/9d/Phonepe-blue.svg",
                "https://upload.wikimedia.org/wikipedia/commons/2/24/Paytm_Logo_%28standalone%29.svg",
                "https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg",
              ].map((uri) => (
                <Image key={uri} source={{ uri }} style={styles.upiIcon} />
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.confirmPaymentBtn,
                isPlacingOrder && { opacity: 0.7 },
              ]}
              onPress={handleConfirmPayment}
              disabled={isPlacingOrder}
            >
              {isPlacingOrder ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.confirmPaymentText}>I've Paid</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    gap: hp("2%"),
  },
  loadingText: { fontSize: wp("3.8%"), color: Colors.textSecondary },
  header: { paddingBottom: hp("2%"), paddingHorizontal: wp("5%") },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: wp("10%"),
    height: wp("10%"),
    borderRadius: wp("5%"),
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: wp("4.5%"), fontWeight: "700", color: Colors.white },
  content: { flex: 1, paddingHorizontal: wp("4%"), paddingTop: hp("2%") },
  section: { marginBottom: hp("2%") },
  sectionTitle: {
    fontSize: wp("4%"),
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: hp("1.5%"),
  },
  addressCard: {
    backgroundColor: Colors.white,
    borderRadius: wp("3%"),
    padding: wp("4%"),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    position: "relative",
  },
  addressHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2%"),
    marginBottom: hp("1%"),
  },
  addressType: {
    fontSize: wp("3.5%"),
    fontWeight: "600",
    color: Colors.primary,
  },
  addressName: {
    fontSize: wp("3.8%"),
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: hp("0.5%"),
  },
  addressText: {
    fontSize: wp("3.3%"),
    color: Colors.textSecondary,
    lineHeight: wp("5%"),
    marginBottom: hp("1%"),
  },
  addressPhone: { fontSize: wp("3.3%"), color: Colors.textSecondary },
  missingAddressBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: wp("2%"),
    backgroundColor: "#FFF0F0",
    padding: wp("3%"),
    borderRadius: wp("2%"),
    borderWidth: 1,
    borderColor: Colors.error + "40",
    marginBottom: hp("1%"),
  },
  missingAddressText: { flex: 1, fontSize: wp("3.2%"), color: Colors.error },
  changeAddressBtn: {
    position: "absolute",
    top: wp("4%"),
    right: wp("4%"),
    paddingHorizontal: wp("3%"),
    paddingVertical: hp("0.5%"),
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: wp("2%"),
  },
  changeAddressText: {
    fontSize: wp("3%"),
    fontWeight: "600",
    color: Colors.primary,
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: wp("3%"),
    padding: wp("4%"),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: hp("0.8%"),
  },
  summaryItemLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2%"),
  },
  summaryItemName: { flex: 1, fontSize: wp("3.3%"), color: Colors.textPrimary },
  summaryItemQty: { fontSize: wp("3%"), color: Colors.textMuted },
  summaryItemPrice: {
    fontSize: wp("3.3%"),
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: hp("1%"),
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: hp("0.6%"),
  },
  summaryLabel: { fontSize: wp("3.3%"), color: Colors.textSecondary },
  summaryValue: {
    fontSize: wp("3.3%"),
    fontWeight: "500",
    color: Colors.textPrimary,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: wp("4%"),
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  totalValue: {
    fontSize: wp("4.5%"),
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  paymentCard: {
    backgroundColor: Colors.white,
    borderRadius: wp("3%"),
    padding: wp("4%"),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  paymentOption: { flexDirection: "row", alignItems: "center", gap: wp("3%") },
  paymentOptionText: {
    flex: 1,
    fontSize: wp("3.5%"),
    fontWeight: "500",
    color: Colors.textPrimary,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  bottomBarGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: wp("6%"),
    paddingTop: hp("1.5%"),
  },
  bottomBarLeft: { flex: 1 },
  bottomBarLabel: { fontSize: wp("3%"), color: Colors.textMuted },
  bottomBarAmount: {
    fontSize: wp("5%"),
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  placeOrderBtn: { borderRadius: wp("3%"), overflow: "hidden" },
  placeOrderGradient: {
    paddingHorizontal: wp("6%"),
    paddingVertical: hp("1.5%"),
    minWidth: wp("35%"),
    alignItems: "center",
    justifyContent: "center",
    minHeight: hp("5.5%"),
  },
  placeOrderText: {
    fontSize: wp("4%"),
    fontWeight: "700",
    color: Colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: wp("6%"),
    borderTopRightRadius: wp("6%"),
    padding: wp("5%"),
    paddingBottom: Platform.OS === "ios" ? hp("4%") : hp("3%"),
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: hp("1%"),
  },
  modalTitle: {
    fontSize: wp("5%"),
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: wp("3.5%"),
    color: Colors.textSecondary,
    marginBottom: hp("2.5%"),
  },
  qrContainer: { alignItems: "center", marginBottom: hp("2%") },
  qrCode: {
    width: wp("60%"),
    aspectRatio: 1,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: wp("4%"),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: "dashed",
  },
  qrAmount: {
    fontSize: wp("5%"),
    fontWeight: "800",
    color: Colors.primary,
    marginTop: hp("1%"),
  },
  countdownContainer: { marginBottom: hp("2%") },
  countdownText: {
    fontSize: wp("3.3%"),
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: hp("1%"),
  },
  countdownBar: {
    height: hp("0.6%"),
    backgroundColor: Colors.border,
    borderRadius: hp("0.3%"),
    overflow: "hidden",
  },
  countdownProgress: { height: "100%", backgroundColor: Colors.primary },
  payWithText: {
    fontSize: wp("3.5%"),
    fontWeight: "600",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: hp("1.5%"),
  },
  upiAppsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp("8%"),
    marginBottom: hp("3%"),
  },
  upiIcon: { width: wp("12%"), height: wp("12%"), resizeMode: "contain" },
  confirmPaymentBtn: {
    backgroundColor: Colors.primary,
    borderRadius: wp("3%"),
    paddingVertical: hp("1.6%"),
    alignItems: "center",
    minHeight: hp("5.5%"),
    justifyContent: "center",
  },
  confirmPaymentText: {
    fontSize: wp("4%"),
    fontWeight: "700",
    color: Colors.white,
  },

  // ── Approval Modal Styles ──────────────────────────────────────────────────
  approvalModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: wp("8%"),
  },
  approvalModalContent: {
    backgroundColor: Colors.white,
    borderRadius: wp("6%"),
    padding: wp("6%"),
    alignItems: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  approvalIconCircle: {
    width: wp("22%"),
    height: wp("22%"),
    borderRadius: wp("11%"),
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: hp("2.5%"),
    borderWidth: 3,
    borderColor: "#FCD34D",
  },
  approvalModalTitle: {
    fontSize: wp("5%"),
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: hp("1.5%"),
  },
  approvalModalMessage: {
    fontSize: wp("3.5%"),
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: wp("5.5%"),
    marginBottom: hp("2%"),
  },
  approvalInfoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF3C7",
    borderRadius: wp("3%"),
    padding: wp("3.5%"),
    gap: wp("2.5%"),
    marginBottom: hp("2.5%"),
    borderWidth: 1,
    borderColor: "#FCD34D",
    width: "100%",
  },
  approvalInfoText: {
    flex: 1,
    fontSize: wp("3.2%"),
    color: "#92400E",
    lineHeight: wp("4.8%"),
    fontWeight: "500",
  },
  approvalGoHomeBtn: {
    width: "100%",
    borderRadius: wp("3.5%"),
    overflow: "hidden",
    marginBottom: hp("1.2%"),
  },
  approvalGoHomeGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp("2.5%"),
    paddingVertical: hp("1.8%"),
  },
  approvalGoHomeText: {
    fontSize: wp("4%"),
    fontWeight: "700",
    color: Colors.white,
  },
  approvalCloseBtn: {
    paddingVertical: hp("1.2%"),
    paddingHorizontal: wp("6%"),
  },
  approvalCloseText: {
    fontSize: wp("3.5%"),
    color: Colors.textMuted,
    fontWeight: "600",
  },
});

export default CheckoutScreen;
