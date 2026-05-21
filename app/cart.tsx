import Colors from "@/constants/colors";
import { Text } from "@/context/FontContext";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCart } from "../context/CartContext";

const CartScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {
    cart,
    cartTotal,
    cartItemCount,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);

  const DELIVERY_CHARGE = 0; // FREE
  const totalAmount = cartTotal - couponDiscount + DELIVERY_CHARGE;
  const MIN_ORDER_VALUE = 500;
  const isMinOrderMet = cartTotal >= MIN_ORDER_VALUE;

  const handleCheckout = () => {
    if (cartTotal < MIN_ORDER_VALUE) {
      Alert.alert(
        "Minimum Order Required",
        `Your cart total is ₹${cartTotal}. Please add items worth ₹${MIN_ORDER_VALUE - cartTotal} more to place the order.`,
        [
          {
            text: "Continue Shopping",
            onPress: () => router.push("/products"),
          },
          { text: "OK", style: "cancel" },
        ],
      );
      return;
    }
    const orderData = {
      items: cart,
      subtotal: cartTotal,
      couponDiscount,
      totalAmount,
      appliedCoupon,
    };
    router.push({
      pathname: "/checkout",
      params: { orderData: JSON.stringify(orderData) },
    });
  };

  const getProductImage = (product: any) => {
    if (product.images && product.images.length > 0) {
      const primary = product.images.find((img: any) => img.isPrimary);
      return primary?.url || product.images[0].url;
    }
    if (product.imageUrl) return product.imageUrl;
    return "https://via.placeholder.com/300";
  };

  const getDiscount = (product: any) => {
    if (
      product.originalPrice > 0 &&
      product.sellingPrice < product.originalPrice
    ) {
      return Math.round(
        ((product.originalPrice - product.sellingPrice) /
          product.originalPrice) *
          100,
      );
    }
    return 0;
  };

  const isLimitsEnabled = (product: any) =>
    product.enforceOrderLimits !== false;

  const getMinOrderQty = (product: any) => {
    // Only enforce min order quantity if limits are enabled
    if (!isLimitsEnabled(product)) return 1;
    return product.minOrderQuantity || 1;
  };

  const getMaxOrderQty = (product: any) => {
    // Only enforce max order quantity if limits are enabled
    if (!isLimitsEnabled(product)) return product.stockQuantity || 999;
    return product.maxOrderQuantity || product.stockQuantity || 999;
  };

  const handleIncreaseQuantity = (product: any, currentQty: number) => {
    const maxQty = Math.min(
      getMaxOrderQty(product),
      product.stockQuantity || 999,
    );
    if (currentQty >= maxQty) {
      Alert.alert(
        "Maximum Limit Reached",
        `You can order a maximum of ${maxQty} units of this item.`,
        [{ text: "OK" }],
      );
      return;
    }
    updateQuantity(product.id, currentQty + 1);
  };

  const handleDecreaseQuantity = (product: any, currentQty: number) => {
    const minQty = getMinOrderQty(product);
    const limitsEnabled = isLimitsEnabled(product);

    // Only check minimum order quantity when limits are enabled
    if (limitsEnabled && currentQty <= minQty) {
      Alert.alert(
        "Minimum Order Required",
        `Minimum order quantity is ${minQty} unit${minQty > 1 ? "s" : ""}.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove Anyway",
            style: "destructive",
            onPress: () => removeFromCart(product.id),
          },
        ],
      );
      return;
    }

    // If limits disabled or quantity is above minimum, just decrease
    // If quantity becomes 0, remove from cart
    if (currentQty <= 1) {
      Alert.alert("Remove Item", "Remove this item from cart?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeFromCart(product.id),
        },
      ]);
      return;
    }

    updateQuantity(product.id, currentQty - 1);
  };

  // ─── Empty State ───────────────────────────────────────────────
  if (!cart || cart.length === 0) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#008080" />

        {/* ── Header ── */}
        <LinearGradient
          colors={[
            Colors.gradientStart,
            Colors.gradientEnd,
            Colors.primaryDark,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.header]}
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

            {/* Title and Subtitle grouped together */}
            <View style={styles.headerTextGroup}>
              <Text style={styles.headerTitle}>
                My Cart ({cartItemCount || 0})
              </Text>
              <Text style={styles.headerSubtitle}>
                Review your items and proceed
              </Text>
            </View>

            <TouchableOpacity style={styles.clearBtn} onPress={clearCart}>
              <Feather
                name="trash-2"
                size={wp("4.5%")}
                color="rgba(255,255,255,0.85)"
              />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="cart-outline"
            size={wp("25%")}
            color="#BDBDBD"
          />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>
            Add electronics accessories to get started
          </Text>
          <TouchableOpacity
            style={styles.shopNowBtn}
            onPress={() => router.push("/")}
          >
            <Text style={styles.shopNowText}>Shop Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Main Cart ─────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* ── Header ── */}
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd, Colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[
          styles.header,
          {
            paddingTop:
              Platform.OS === "ios" ? insets.top + hp("1%") : hp("5%"),
          },
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={wp("5.5%")} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              My Cart ({cartItemCount || 0})
            </Text>
            <Text style={styles.headerSubtitle}>
              Review your items and proceed
            </Text>
          </View>

          <TouchableOpacity style={styles.clearBtn} onPress={clearCart}>
            <Text style={styles.clearText}>Clear Cart</Text>
            <Feather name="trash-2" size={wp("3.8%")} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── Scrollable Content ── */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: hp("12%"),
          paddingTop: hp("2%"),
        }}
      >
        {/* Section Label */}
        <Text style={styles.sectionLabel}>Items</Text>

        {/* ── Cart Items ── */}
        {cart.map((item) => {
          const product = item.product;
          const discount = getDiscount(product);
          const limitsEnabled = isLimitsEnabled(product);
          const minQty = getMinOrderQty(product);
          const maxQty = Math.min(
            getMaxOrderQty(product),
            product.stockQuantity || 999,
          );
          const canDecrease = limitsEnabled
            ? item.quantity > minQty
            : item.quantity > 1;
          const canIncrease = item.quantity < maxQty;

          return (
            <View key={product.id} style={styles.cartCard}>
              {/* Product Image */}
              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: getProductImage(product) }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
              </View>

              {/* Product Info */}
              <View style={styles.productInfo}>
                {/* Row 1: Brand + Delete icon */}
                <View style={styles.brandRow}>
                  <Text style={styles.brandText}>
                    {product.brand?.toUpperCase() || ""}
                  </Text>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => removeFromCart(product.id)}
                  >
                    <Feather name="trash-2" size={wp("4%")} color="#E53935" />
                  </TouchableOpacity>
                </View>

                {/* Row 2: Product Name */}
                <Text style={styles.productName} numberOfLines={2}>
                  {product.name}
                </Text>

                {/* Row 3: Selling Price (large, left) */}
                <Text style={styles.sellingPrice}>₹{product.sellingPrice}</Text>

                {/* Show limits info only when limits are enabled */}
                {limitsEnabled &&
                  (minQty > 1 ||
                    getMaxOrderQty(product) <
                      (product.stockQuantity || 999)) && (
                    <View style={styles.limitsInfo}>
                      {minQty > 1 && (
                        <Text style={styles.limitsInfoText}>
                          Min: {minQty} unit{minQty > 1 ? "s" : ""}
                        </Text>
                      )}
                      {getMaxOrderQty(product) <
                        (product.stockQuantity || 999) && (
                        <Text
                          style={[
                            styles.limitsInfoText,
                            minQty > 1 && { marginLeft: wp("2%") },
                          ]}
                        >
                          Max: {getMaxOrderQty(product)} unit
                          {getMaxOrderQty(product) > 1 ? "s" : ""}
                        </Text>
                      )}
                    </View>
                  )}

                {/* Row 4: Strikethrough price (left) | Multiplied total + Qty pill (right) */}
                <View style={styles.bottomRow}>
                  {/* Left: original strikethrough price */}
                  {discount > 0 ? (
                    <Text style={styles.originalPrice}>
                      ₹{product.originalPrice}
                    </Text>
                  ) : (
                    <View />
                  )}

                  {/* Right: multiplied price + qty pill */}
                  <View style={styles.totalQtyGroup}>
                    <Text style={styles.subtotalText}>
                      ₹
                      {(product.sellingPrice * item.quantity).toLocaleString(
                        "en-IN",
                      )}
                    </Text>
                    <View style={styles.qtyPill}>
                      <TouchableOpacity
                        style={styles.qtyTouchable}
                        onPress={() =>
                          handleDecreaseQuantity(product, item.quantity)
                        }
                        disabled={!canDecrease && limitsEnabled}
                      >
                        <Feather
                          name="minus"
                          size={wp("3%")}
                          color={canDecrease ? Colors.primary : "#BDBDBD"}
                        />
                      </TouchableOpacity>
                      <Text style={styles.qtyNumber}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.qtyTouchable}
                        onPress={() =>
                          handleIncreaseQuantity(product, item.quantity)
                        }
                        disabled={!canIncrease}
                      >
                        <Feather
                          name="plus"
                          size={wp("3%")}
                          color={canIncrease ? Colors.primary : "#BDBDBD"}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          );
        })}

        {/* ── Bill Details ── */}
        <View style={styles.billCard}>
          <Text style={styles.billTitle}>Bill Details</Text>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item Total</Text>
            <Text style={styles.billValue}>
              ₹{cartTotal.toLocaleString("en-IN")}
            </Text>
          </View>

          {appliedCoupon && (
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Coupon ({appliedCoupon})</Text>
              <Text style={styles.billDiscount}>-₹{couponDiscount}</Text>
            </View>
          )}

          <View style={styles.billDivider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>
              ₹{totalAmount.toLocaleString("en-IN")}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Bottom Checkout Bar ── */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, hp("1.5%")) },
        ]}
      >
        <View style={styles.bottomBarInner}>
          {/* Left: Total */}
          <View>
            <Text style={styles.bottomTotalLabel}>Total</Text>
            <Text style={styles.bottomTotalAmount}>
              ₹{totalAmount.toLocaleString("en-IN")}
            </Text>
          </View>

          {/* Right: Checkout Button */}
          <TouchableOpacity
            onPress={handleCheckout}
            activeOpacity={0.88}
            disabled={!isMinOrderMet}
            style={styles.checkoutBtnWrapper}
          >
            <LinearGradient
              colors={
                isMinOrderMet
                  ? [Colors.primary, Colors.primaryDark]
                  : ["#BDBDBD", "#9E9E9E"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.checkoutGradient}
            >
              <Text style={styles.checkoutLabel}>
                {isMinOrderMet
                  ? "Checkout"
                  : `Add ₹${MIN_ORDER_VALUE - cartTotal}`}
              </Text>
              {isMinOrderMet && (
                <Feather
                  name="arrow-right"
                  size={wp("4.5%")}
                  color="#fff"
                  style={{ marginLeft: wp("1.5%") }}
                />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F4F6F5",
  },

  // ── Header ──
  header: {
    paddingTop: Platform.OS === "ios" ? hp("6%") : hp("6%"),
    paddingHorizontal: wp("5%"),
    paddingBottom: hp("2.8%"),
    borderBottomLeftRadius: wp("7%"),
    borderBottomRightRadius: wp("7%"),
    // Subtle shadow to lift header
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTextGroup: {
    flex: 1,
    marginLeft: wp("3.5%"),
  },
  backBtn: {
    width: wp("9.5%"),
    height: wp("9.5%"),
    borderRadius: wp("5%"),
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    marginLeft: wp("3.5%"),
  },
  headerTitle: {
    marginTop: hp("0.2%"),
    fontSize: wp("4.5%"),
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: wp("3.5%"),
    color: "rgba(255,255,255,0.78)",
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("1.5%"),
  },
  clearText: {
    top: hp("0.2%"),
    fontSize: wp("3.3%"),
    fontWeight: "600",
    color: "#fff",
  },

  // ── Scroll ──
  scrollView: {
    flex: 1,
    paddingHorizontal: wp("4%"),
  },
  sectionLabel: {
    fontSize: wp("4.2%"),
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: hp("1.5%"),
  },

  // ── Cart Card ──
  cartCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: wp("3.5%"),
    padding: wp("3.5%"),
    marginBottom: hp("1.5%"),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  imageWrapper: {
    borderRadius: wp("2.5%"),
    overflow: "hidden",
    backgroundColor: "#F0F0F0",
    alignSelf: "flex-start",
  },
  productImage: {
    width: wp("24%"),
    height: wp("24%"),
  },
  productInfo: {
    flex: 1,
    marginLeft: wp("3.5%"),
  },
  brandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: hp("0.4%"),
  },
  brandText: {
    fontSize: wp("2.8%"),
    fontWeight: "800",
    color: Colors.primary,
    letterSpacing: 0.8,
  },
  deleteBtn: {
    padding: wp("1.5%"),
    backgroundColor: "#FFEBEE",
    borderRadius: wp("2%"),
  },
  productName: {
    fontSize: wp("3.6%"),
    fontWeight: "700",
    color: "#1A1A1A",
    lineHeight: wp("5%"),
    marginBottom: hp("0.4%"),
  },
  sellingPrice: {
    fontSize: wp("4.2%"),
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: hp("0.4%"),
  },
  originalPrice: {
    fontSize: wp("3%"),
    color: "#AAAAAA",
    textDecorationLine: "line-through",
  },
  limitsInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: hp("0.3%"),
    marginBottom: hp("0.2%"),
  },
  limitsInfoText: {
    fontSize: wp("2.4%"),
    color: Colors.textMuted,
    fontWeight: "500",
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: wp("1.8%"),
    paddingVertical: hp("0.2%"),
    borderRadius: wp("1%"),
  },
  // Row 4: strikethrough left, subtotal+qty right
  bottomRow: {
    bottom: hp("1%"),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalQtyGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2.5%"),
  },
  subtotalText: {
    fontSize: wp("3.8%"),
    fontWeight: "700",
    color: "#1A1A1A",
  },
  qtyPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5F1",
    borderRadius: wp("2%"),
    borderWidth: 1,
    borderColor: "#C8E6DF",
    paddingHorizontal: wp("1%"),
    paddingVertical: hp("0.4%"),
  },
  qtyTouchable: {
    padding: wp("1.5%"),
  },
  qtyNumber: {
    top: hp("0.2%"),
    fontSize: wp("3.6%"),
    fontWeight: "700",
    color: Colors.primary,
    minWidth: wp("5%"),
    textAlign: "center",
  },

  // ── Bill Card ──
  billCard: {
    backgroundColor: "#fff",
    borderRadius: wp("3.5%"),
    padding: wp("4.5%"),
    marginTop: hp("0.5%"),
    marginBottom: hp("4%"),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  billTitle: {
    fontSize: wp("4.2%"),
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: hp("1.5%"),
  },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: hp("0.75%"),
  },
  billLabel: {
    fontSize: wp("3.4%"),
    color: "#666",
    fontWeight: "400",
  },
  billValue: {
    fontSize: wp("3.4%"),
    fontWeight: "600",
    color: "#1A1A1A",
  },
  billDiscount: {
    fontSize: wp("3.4%"),
    fontWeight: "700",
    color: Colors.primary,
  },
  billFree: {
    fontSize: wp("3.4%"),
    fontWeight: "700",
    color: Colors.primary,
  },
  billDivider: {
    height: 1,
    backgroundColor: "#EFEFEF",
    marginVertical: hp("1.2%"),
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: wp("4%"),
    fontWeight: "700",
    color: "#1A1A1A",
  },
  totalValue: {
    fontSize: wp("4.2%"),
    fontWeight: "800",
    color: Colors.primary,
  },

  // ── Bottom Bar ──
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#EFEFEF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 10,
  },
  bottomBarInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: wp("5%"),
    paddingTop: hp("1.5%"),
    paddingBottom: hp("1%"),
  },
  bottomTotalLabel: {
    fontSize: wp("3.2%"),
    color: "#888",
    fontWeight: "400",
  },
  bottomTotalAmount: {
    fontSize: wp("5%"),
    fontWeight: "800",
    color: "#1A1A1A",
    marginTop: hp("0.2%"),
  },
  checkoutBtnWrapper: {
    borderRadius: wp("2.5%"),
    overflow: "hidden",
  },
  checkoutGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp("7%"),
    paddingVertical: hp("1.8%"),
  },
  checkoutLabel: {
    top: hp("0.2%"),
    fontSize: wp("4%"),
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },

  // ── Empty State ──
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp("10%"),
  },
  emptyTitle: {
    fontSize: wp("5%"),
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: hp("2.5%"),
  },
  emptySubtitle: {
    fontSize: wp("3.5%"),
    color: "#888",
    marginTop: hp("1%"),
    marginBottom: hp("3%"),
    textAlign: "center",
  },
  shopNowBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: wp("9%"),
    paddingVertical: hp("1.6%"),
    borderRadius: wp("3%"),
  },
  shopNowText: {
    fontSize: wp("4%"),
    fontWeight: "700",
    color: "#fff",
  },
});

export default CartScreen;
