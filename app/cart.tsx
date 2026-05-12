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
import Colors from "../constants/colors";
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

  const [deliveryTip, setDeliveryTip] = useState(0);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState("");

  const deliveryCharge = cartTotal >= 999 ? 0 : 49;
  const platformFee = 5;
  const gst = Math.round(cartTotal * 0.05);
  const subtotal = cartTotal - couponDiscount;
  const totalAmount =
    subtotal + deliveryCharge + platformFee + gst + deliveryTip;

  const MIN_ORDER_VALUE = 500;
  const isMinOrderMet = cartTotal >= MIN_ORDER_VALUE;

  const TAB_BAR_HEIGHT = 60;
  const systemNavHeight = insets.bottom;
  const tabBarTotalHeight = TAB_BAR_HEIGHT + systemNavHeight;

  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (code === "TECH20" || code === "WELCOME20") {
      if (appliedCoupon === code) {
        setCouponError("Coupon already applied");
        return;
      }
      const discount = Math.round(cartTotal * 0.2);
      setCouponDiscount(discount);
      setAppliedCoupon(code);
      setCouponError("");
      Alert.alert("Coupon Applied", `₹${discount} discount applied!`);
    } else {
      setCouponError("Invalid coupon code");
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponCode("");
    setCouponError("");
  };

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
      deliveryCharge,
      platformFee,
      gst,
      deliveryTip,
      totalAmount,
      appliedCoupon,
    };

    router.push({
      pathname: "/checkout",
      params: { orderData: JSON.stringify(orderData) },
    });
  };

  const tipOptions = [0, 10, 20, 50];

  // Get primary image from product images array
  const getProductImage = (product: any) => {
    if (product.images && product.images.length > 0) {
      const primary = product.images.find((img: any) => img.isPrimary);
      return primary?.url || product.images[0].url;
    }
    if (product.imageUrl) return product.imageUrl;
    return "https://via.placeholder.com/300";
  };

  // Calculate discount
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

  if (!cart || cart.length === 0) {
    return (
      <View style={styles.root}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={Colors.gradientStart}
        />
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
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
            <Text style={styles.headerTitle}>My Cart</Text>
            <View style={{ width: wp("10%") }} />
          </View>
        </LinearGradient>

        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="cart-outline"
            size={wp("25%")}
            color={Colors.textMuted}
          />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyText}>
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
        style={styles.header}
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
          <Text style={styles.headerTitle}>My Cart ({cartItemCount})</Text>
          <TouchableOpacity style={styles.clearBtn} onPress={clearCart}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarTotalHeight + hp("15%") }}
      >
        {/* Minimum Order Warning */}
        {!isMinOrderMet && (
          <View style={styles.minOrderWarning}>
            <Feather name="alert-circle" size={wp("4.5%")} color="#E65100" />
            <Text style={styles.minOrderWarningText}>
              Add ₹{MIN_ORDER_VALUE - cartTotal} more to meet minimum order
              value of ₹{MIN_ORDER_VALUE}
            </Text>
          </View>
        )}

        {/* Cart Items */}
        <View style={styles.cartItemsSection}>
          <Text style={styles.sectionTitle}>Items</Text>
          {cart.map((item) => {
            const product = item.product;
            const discount = getDiscount(product);

            return (
              <View key={product.id} style={styles.cartItem}>
                <Image
                  source={{ uri: getProductImage(product) }}
                  style={styles.itemImage}
                  resizeMode="cover"
                />

                <View style={styles.itemDetails}>
                  {product.brand ? (
                    <Text style={styles.itemBrand}>{product.brand}</Text>
                  ) : null}
                  <Text style={styles.itemName} numberOfLines={2}>
                    {product.name}
                  </Text>

                  {/* Product info chips */}
                  <View style={styles.itemInfoRow}>
                    {product.type && (
                      <View style={styles.infoChip}>
                        <Text style={styles.infoChipText}>{product.type}</Text>
                      </View>
                    )}
                    {product.color && (
                      <View style={styles.infoChip}>
                        <View
                          style={[
                            styles.colorDot,
                            {
                              backgroundColor:
                                product.color.toLowerCase() === "black"
                                  ? "#000"
                                  : product.color.toLowerCase() === "white"
                                    ? "#ddd"
                                    : product.color.toLowerCase() === "silver"
                                      ? "#C0C0C0"
                                      : product.color.toLowerCase() === "gold"
                                        ? "#FFD700"
                                        : Colors.primary,
                            },
                          ]}
                        />
                        <Text style={styles.infoChipText}>{product.color}</Text>
                      </View>
                    )}
                    {product.warranty && product.warranty !== "No Warranty" && (
                      <View style={styles.infoChip}>
                        <Feather
                          name="shield"
                          size={wp("2.5%")}
                          color={Colors.success}
                        />
                        <Text style={styles.infoChipText}>
                          {product.warranty}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.itemPriceRow}>
                    <View>
                      <View style={styles.priceMain}>
                        <Text style={styles.priceCurrency}>₹</Text>
                        <Text style={styles.priceValue}>
                          {product.sellingPrice}
                        </Text>
                      </View>
                      {discount > 0 && (
                        <Text style={styles.originalPrice}>
                          ₹{product.originalPrice}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.itemSubtotal}>
                      ₹{product.sellingPrice * item.quantity}
                    </Text>
                  </View>
                </View>

                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removeFromCart(product.id)}
                  >
                    <Feather
                      name="trash-2"
                      size={wp("4%")}
                      color={Colors.error}
                    />
                  </TouchableOpacity>

                  <View style={styles.qtyCtrl}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() =>
                        updateQuantity(product.id, item.quantity - 1)
                      }
                    >
                      <Feather
                        name="minus"
                        size={wp("3.5%")}
                        color={Colors.primary}
                      />
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() =>
                        updateQuantity(product.id, item.quantity + 1)
                      }
                    >
                      <Feather
                        name="plus"
                        size={wp("3.5%")}
                        color={Colors.primary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Coupon Section */}
        {/* <View style={styles.couponSection}>
          <Text style={styles.sectionTitle}>Apply Coupon</Text>

          {!appliedCoupon ? (
            <>
              <View style={styles.couponInputContainer}>
                <TextInput
                  style={styles.couponInput}
                  placeholder="Enter coupon code"
                  placeholderTextColor={Colors.textMuted}
                  value={couponCode}
                  onChangeText={(text) => {
                    setCouponCode(text.toUpperCase());
                    setCouponError("");
                  }}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={[
                    styles.applyBtn,
                    !couponCode && styles.applyBtnDisabled,
                  ]}
                  onPress={handleApplyCoupon}
                  disabled={!couponCode}
                >
                  <Text style={styles.applyBtnText}>Apply</Text>
                </TouchableOpacity>
              </View>
              {couponError ? (
                <Text style={styles.couponError}>{couponError}</Text>
              ) : null}
              <View style={styles.couponHint}>
                <Feather name="tag" size={wp("3.5%")} color={Colors.success} />
                <Text style={styles.couponHintText}>
                  Use code <Text style={styles.couponCode}>TECH20</Text> for 20%
                  off
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.appliedCouponContainer}>
              <View style={styles.appliedCouponLeft}>
                <Feather
                  name="check-circle"
                  size={wp("4.5%")}
                  color={Colors.success}
                />
                <View>
                  <Text style={styles.appliedCouponCode}>{appliedCoupon}</Text>
                  <Text style={styles.appliedCouponDiscount}>
                    ₹{couponDiscount} discount applied
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleRemoveCoupon}>
                <Feather name="x" size={wp("4.5%")} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}
        </View> */}

        {/* Bill Details */}
        <View style={styles.billSection}>
          <Text style={styles.sectionTitle}>Bill Details</Text>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item Total</Text>
            <Text style={styles.billValue}>₹{cartTotal}</Text>
          </View>

          {couponDiscount > 0 && (
            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: Colors.success }]}>
                Coupon Discount ({appliedCoupon})
              </Text>
              <Text style={[styles.billValue, { color: Colors.success }]}>
                -₹{couponDiscount}
              </Text>
            </View>
          )}

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Delivery Charge</Text>
            {deliveryCharge === 0 ? (
              <Text style={styles.freeDelivery}>FREE</Text>
            ) : (
              <Text style={styles.billValue}>₹{deliveryCharge}</Text>
            )}
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Platform Fee</Text>
            <Text style={styles.billValue}>₹{platformFee}</Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>GST (5%)</Text>
            <Text style={styles.billValue}>₹{gst}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{totalAmount}</Text>
          </View>

          {deliveryCharge > 0 && (
            <View style={styles.freeDeliveryHint}>
              <Feather name="info" size={wp("3.5%")} color={Colors.info} />
              <Text style={styles.freeDeliveryText}>
                Add ₹{999 - cartTotal} more for FREE delivery
              </Text>
            </View>
          )}
        </View>

        {/* Delivery Tip */}
        {/* <View style={styles.tipSection}>
          <Text style={styles.sectionTitle}>Delivery Tip</Text>
          <Text style={styles.tipSubtitle}>Support your delivery partner</Text>

          <View style={styles.tipOptions}>
            {tipOptions.map((tip) => (
              <TouchableOpacity
                key={tip}
                style={[
                  styles.tipChip,
                  deliveryTip === tip && styles.tipChipActive,
                ]}
                onPress={() => setDeliveryTip(tip)}
              >
                <Text
                  style={[
                    styles.tipChipText,
                    deliveryTip === tip && styles.tipChipTextActive,
                  ]}
                >
                  {tip === 0 ? "No Tip" : `₹${tip}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View> */}
      </ScrollView>

      {/* Bottom Checkout Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom }]}>
        <LinearGradient
          colors={["rgba(255,255,255,0.95)", Colors.white]}
          style={styles.bottomBarGradient}
        >
          <View style={styles.bottomBarLeft}>
            <Text style={styles.bottomBarLabel}>Total</Text>
            <Text style={styles.bottomBarAmount}>₹{totalAmount}</Text>
            {!isMinOrderMet && (
              <Text style={styles.minOrderNote}>
                Min. order: ₹{MIN_ORDER_VALUE}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.checkoutBtn,
              !isMinOrderMet && styles.checkoutBtnDisabled,
            ]}
            onPress={handleCheckout}
            activeOpacity={0.9}
            disabled={!isMinOrderMet}
          >
            <LinearGradient
              colors={
                isMinOrderMet
                  ? [Colors.primary, Colors.primaryDark]
                  : [Colors.textMuted, Colors.textMuted]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.checkoutGradient}
            >
              <Text style={styles.checkoutText}>
                {isMinOrderMet
                  ? "Checkout"
                  : `Add ₹${MIN_ORDER_VALUE - cartTotal}`}
              </Text>
              {isMinOrderMet && (
                <Feather
                  name="arrow-right"
                  size={wp("5%")}
                  color={Colors.white}
                />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: Platform.OS === "ios" ? hp("6%") : hp("6%"),
    paddingBottom: hp("2%"),
    paddingHorizontal: wp("5%"),
  },
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
  headerTitle: {
    fontSize: wp("4.5%"),
    fontWeight: "700",
    color: Colors.white,
  },
  clearBtn: {
    paddingHorizontal: wp("2%"),
    paddingVertical: hp("0.5%"),
  },
  clearText: {
    fontSize: wp("3.5%"),
    fontWeight: "600",
    color: Colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: wp("4%"),
    paddingTop: hp("2%"),
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp("10%"),
  },
  emptyTitle: {
    fontSize: wp("5%"),
    fontWeight: "700",
    color: Colors.textPrimary,
    marginTop: hp("2%"),
  },
  emptyText: {
    fontSize: wp("3.5%"),
    color: Colors.textSecondary,
    marginTop: hp("1%"),
    marginBottom: hp("3%"),
  },
  shopNowBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: wp("8%"),
    paddingVertical: hp("1.5%"),
    borderRadius: wp("3%"),
  },
  shopNowText: {
    fontSize: wp("4%"),
    fontWeight: "700",
    color: Colors.white,
  },
  minOrderWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2.5%"),
    backgroundColor: "#FFF3E0",
    padding: wp("3.5%"),
    borderRadius: wp("3%"),
    marginBottom: hp("2%"),
    borderWidth: 1,
    borderColor: "#FFB74D",
  },
  minOrderWarningText: {
    flex: 1,
    fontSize: wp("3.2%"),
    fontWeight: "600",
    color: "#E65100",
  },
  sectionTitle: {
    fontSize: wp("4%"),
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: hp("1.5%"),
  },
  cartItemsSection: {
    marginBottom: hp("2%"),
  },
  cartItem: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderRadius: wp("3%"),
    padding: wp("3%"),
    marginBottom: hp("1.5%"),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  itemImage: {
    width: wp("22%"),
    height: wp("22%"),
    borderRadius: wp("2%"),
    backgroundColor: Colors.surfaceAlt,
  },
  itemDetails: {
    flex: 1,
    marginLeft: wp("3%"),
  },
  itemBrand: {
    fontSize: wp("2.5%"),
    fontWeight: "600",
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  itemName: {
    fontSize: wp("3.5%"),
    fontWeight: "600",
    color: Colors.textPrimary,
    marginVertical: hp("0.3%"),
  },
  itemInfoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: wp("1.5%"),
    marginTop: hp("0.3%"),
    marginBottom: hp("0.5%"),
  },
  infoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("1%"),
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: wp("2%"),
    paddingVertical: hp("0.2%"),
    borderRadius: wp("1.5%"),
  },
  infoChipText: {
    fontSize: wp("2.3%"),
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  colorDot: {
    width: wp("2%"),
    height: wp("2%"),
    borderRadius: wp("1%"),
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  itemPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: hp("0.8%"),
  },
  priceMain: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  priceCurrency: {
    fontSize: wp("2.8%"),
    fontWeight: "700",
    color: Colors.textPrimary,
    marginTop: hp("0.3%"),
  },
  priceValue: {
    fontSize: wp("4%"),
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  originalPrice: {
    fontSize: wp("2.5%"),
    color: Colors.textMuted,
    textDecorationLine: "line-through",
  },
  itemSubtotal: {
    fontSize: wp("3.5%"),
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  itemActions: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginLeft: wp("2%"),
  },
  removeBtn: {
    padding: wp("1%"),
  },
  qtyCtrl: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primaryLight,
    borderRadius: wp("2%"),
    paddingHorizontal: wp("2%"),
    paddingVertical: hp("0.5%"),
    gap: wp("2%"),
  },
  qtyBtn: {
    padding: wp("0.5%"),
  },
  qtyValue: {
    fontSize: wp("3.5%"),
    fontWeight: "700",
    color: Colors.primary,
    minWidth: wp("4%"),
    textAlign: "center",
  },
  couponSection: {
    backgroundColor: Colors.white,
    borderRadius: wp("3%"),
    padding: wp("4%"),
    marginBottom: hp("2%"),
  },
  couponInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2.5%"),
    marginBottom: hp("1%"),
  },
  couponInput: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: wp("2.5%"),
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("1.4%"),
    fontSize: wp("3.5%"),
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    textTransform: "uppercase",
  },
  applyBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: wp("5%"),
    paddingVertical: hp("1.4%"),
    borderRadius: wp("2.5%"),
  },
  applyBtnDisabled: {
    opacity: 0.5,
  },
  applyBtnText: {
    fontSize: wp("3.5%"),
    fontWeight: "700",
    color: Colors.white,
  },
  couponError: {
    fontSize: wp("3%"),
    color: Colors.error,
    marginBottom: hp("1%"),
  },
  couponHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2%"),
    backgroundColor: "#E8F5E9",
    padding: wp("3%"),
    borderRadius: wp("2%"),
  },
  couponHintText: {
    fontSize: wp("3.2%"),
    color: Colors.textSecondary,
  },
  couponCode: {
    fontWeight: "700",
    color: Colors.success,
  },
  appliedCouponContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#E8F5E9",
    padding: wp("3.5%"),
    borderRadius: wp("2.5%"),
    borderWidth: 1,
    borderColor: Colors.success,
  },
  appliedCouponLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("3%"),
  },
  appliedCouponCode: {
    fontSize: wp("3.8%"),
    fontWeight: "700",
    color: Colors.success,
  },
  appliedCouponDiscount: {
    fontSize: wp("3%"),
    color: Colors.textSecondary,
  },
  billSection: {
    backgroundColor: Colors.white,
    borderRadius: wp("3%"),
    padding: wp("4%"),
    marginBottom: hp("2%"),
  },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: hp("1%"),
  },
  billLabel: {
    fontSize: wp("3.5%"),
    color: Colors.textSecondary,
  },
  billValue: {
    fontSize: wp("3.5%"),
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  freeDelivery: {
    fontSize: wp("3.5%"),
    fontWeight: "700",
    color: Colors.success,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: hp("1.5%"),
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
  freeDeliveryHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2%"),
    backgroundColor: "#E3F2FD",
    padding: wp("3%"),
    borderRadius: wp("2%"),
    marginTop: hp("1.5%"),
  },
  freeDeliveryText: {
    flex: 1,
    fontSize: wp("3%"),
    color: Colors.info,
    fontWeight: "500",
  },
  tipSection: {
    backgroundColor: Colors.white,
    borderRadius: wp("3%"),
    padding: wp("4%"),
    marginBottom: hp("2%"),
  },
  tipSubtitle: {
    fontSize: wp("3.2%"),
    color: Colors.textMuted,
    marginBottom: hp("1.5%"),
  },
  tipOptions: {
    flexDirection: "row",
    gap: wp("2.5%"),
  },
  tipChip: {
    flex: 1,
    paddingVertical: hp("1.2%"),
    borderRadius: wp("2.5%"),
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
  },
  tipChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tipChipText: {
    fontSize: wp("3.5%"),
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  tipChipTextActive: {
    color: Colors.white,
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
    paddingHorizontal: wp("4%"),
    paddingTop: hp("1.5%"),
  },
  bottomBarLeft: {
    flex: 1,
  },
  bottomBarLabel: {
    fontSize: wp("3%"),
    color: Colors.textMuted,
  },
  bottomBarAmount: {
    fontSize: wp("5%"),
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  minOrderNote: {
    fontSize: wp("2.5%"),
    color: Colors.error,
    marginTop: hp("0.2%"),
  },
  checkoutBtn: {
    borderRadius: wp("3%"),
    overflow: "hidden",
  },
  checkoutBtnDisabled: {
    opacity: 0.7,
  },
  checkoutGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2%"),
    paddingHorizontal: wp("5%"),
    paddingVertical: hp("1.5%"),
  },
  checkoutText: {
    fontSize: wp("3.5%"),
    fontWeight: "700",
    color: Colors.white,
  },
});

export default CartScreen;
