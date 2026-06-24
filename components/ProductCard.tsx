// components/ProductCard.tsx
import { Text } from "@/context/FontContext";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { getToken } from "../app/services/api";
import Colors from "../constants/colors";
import { Product } from "../constants/products";
import { useCart } from "../context/CartContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const GRID_CARD_WIDTH = (SCREEN_WIDTH - wp("8%") - wp("2%")) / 2;
const HORIZONTAL_CARD_WIDTH = SCREEN_WIDTH * 0.4;
const IMAGE_HEIGHT = wp("48%");

// const BASE_URL = "https://customer-u8ip.onrender.com";
export const BASE_URL = "http://10.28.69.75:5000";


interface ProductCardProps {
  product: Product;
  onWishlist?: (product: Product) => void;
  isWishlisted?: boolean;
  hideTags?: boolean;
  layout?: "grid";
  horizontal?: boolean;
}

const TAG_CONFIG: Record<
  string,
  { bg: string; text: string; dot: string; icon?: string }
> = {
  "New Arrival": {
    bg: "#E8F5E9",
    text: "#2E7D32",
    dot: "#43A047",
    icon: "zap",
  },
  "Best Seller": {
    bg: "#FFF0F0",
    text: "#C62828",
    dot: "#EF5350",
    icon: "award",
  },
  "Fast Charging": {
    bg: "#FFF3E0",
    text: "#C75B00",
    dot: "#FFA000",
    icon: "zap",
  },
  Wireless: { bg: "#E8EAF6", text: "#283593", dot: "#5C6BC0", icon: "wifi" },
  Gaming: { bg: "#E0F7FA", text: "#006064", dot: "#00ACC1", icon: "cpu" },
  Premium: { bg: "#FFF8E1", text: "#E65100", dot: "#FFA000", icon: "star" },
  "Budget Friendly": {
    bg: "#E8F5E9",
    text: "#2E7D32",
    dot: "#66BB6A",
    icon: "dollar-sign",
  },
  Waterproof: {
    bg: "#E3F2FD",
    text: "#1565C0",
    dot: "#42A5F5",
    icon: "shield",
  },
  MagSafe: { bg: "#FCE4EC", text: "#AD1457", dot: "#EC407A", icon: "disc" },
  "Limited Edition": {
    bg: "#FFF0F0",
    text: "#C62828",
    dot: "#EF5350",
    icon: "award",
  },
  "Eco-Friendly": {
    bg: "#E8F5E9",
    text: "#2E7D32",
    dot: "#66BB6A",
    icon: "leaf",
  },
  "Travel Ready": {
    bg: "#E3F2FD",
    text: "#1565C0",
    dot: "#42A5F5",
    icon: "briefcase",
  },
  "Limited Stock": {
    bg: "#FFF3E0",
    text: "#C75B00",
    dot: "#FFA000",
    icon: "alert-circle",
  },
  "Fast Moving": {
    bg: "#E8F5E9",
    text: "#2E7D32",
    dot: "#43A047",
    icon: "trending-up",
  },
  Trending: {
    bg: "#E0F7FA",
    text: "#006064",
    dot: "#00ACC1",
    icon: "trending-up",
  },
  "Special Offer": {
    bg: "#FCE4EC",
    text: "#AD1457",
    dot: "#EC407A",
    icon: "percent",
  },
};

// ── Blinkit-style Low Stock Battery Component ─────────────────────────────
const LowStockBattery: React.FC<{ qty: number }> = ({ qty }) => {
  const fillColor = qty <= 3 ? "#EF4444" : qty <= 7 ? "#F97316" : "#EAB308";
  const fillPct = Math.max(10, Math.min(70, qty * 7));

  return (
    <View style={s.batteryRow}>
      <View style={[s.batteryBody, { borderColor: fillColor }]}>
        <View
          style={[
            s.batteryFill,
            { width: `${fillPct}%` as any, backgroundColor: fillColor },
          ]}
        />
      </View>
      <View style={[s.batteryNub, { backgroundColor: fillColor }]} />
      <Text style={[s.batteryLabel, { color: fillColor }]}>
        Only {qty} left
      </Text>
    </View>
  );
};

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onWishlist,
  isWishlisted = false,
  hideTags = false,
  horizontal = false,
}) => {
  const cardWidth = horizontal ? HORIZONTAL_CARD_WIDTH : GRID_CARD_WIDTH;
  const scale = useRef(new Animated.Value(1)).current;
  const { addToCart, updateQuantity, getCartQuantity } = useCart();

  const quantity = getCartQuantity(product.id);
  const isOutOfStock = !product.inStock;
  const limitsEnabled = product.enforceOrderLimits !== false;

  // ── Notify Me states ─────────────────────────────────────────
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);

  useEffect(() => {
    checkSubscriptionStatus();
  }, [product.id]);

  const checkSubscriptionStatus = async () => {
    try {
      const token = await getToken();
      if (!token) {
        setIsSubscribed(false);
        return;
      }

      if (!isOutOfStock) {
        setIsSubscribed(false);
        return;
      }

      const response = await fetch(
        `${BASE_URL}/api/stocks/notify-status/${product.id}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = await response.json();
      if (data.success) {
        setIsSubscribed(data.data.isSubscribed);
      }
    } catch (error) {
      console.error("Failed to check subscription:", error);
      setIsSubscribed(false);
    }
  };

  const handleNotifyMe = async () => {
    setNotifyLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert("Login Required", "Please login to set notifications.");
        setShowNotifyModal(false);
        return;
      }

      const response = await fetch(`${BASE_URL}/api/stocks/notify-me`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId: product.id }),
      });
      const data = await response.json();

      if (data.success) {
        setIsSubscribed(true);
        if (!data.data?.reactivated) {
          Alert.alert(
            "✅ Notification Set",
            "We'll notify you when this product is back in stock!",
          );
        }
      } else {
        Alert.alert("Error", data.message || "Failed to set notification");
      }
    } catch (error) {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setNotifyLoading(false);
      setShowNotifyModal(false);
    }
  };

  const handleUnsubscribe = async () => {
    setNotifyLoading(true);
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(
        `${BASE_URL}/api/stocks/notify-me/${product.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = await response.json();

      if (data.success) {
        setIsSubscribed(false);
        Alert.alert("✅ Removed", "Notification alert removed.");
      }
    } catch (error) {
      console.error("Failed to unsubscribe:", error);
    } finally {
      setNotifyLoading(false);
    }
  };

  // ── Image normalisation ───────────────────────────────────────
  const rawImages: any[] = product.images || [];
  const allUrls: string[] = rawImages
    .map((img) => (typeof img === "string" ? img : img?.url || ""))
    .filter(Boolean);

  const primaryIdx = rawImages.findIndex((img) => img?.isPrimary);
  const sortedUrls: string[] = (() => {
    if (primaryIdx > 0) {
      const copy = [...allUrls];
      const [first] = copy.splice(primaryIdx, 1);
      copy.unshift(first);
      return copy;
    }
    return allUrls;
  })();

  const hasImages = sortedUrls.length > 0;
  const hasMultipleImages = sortedUrls.length > 1;

  // ── Carousel state ────────────────────────────────────────────
  const [activeIdx, setActiveIdx] = useState(0);
  // Actual rendered width of the image container — avoids fixed-pixel overflow
  const [imageContainerWidth, setImageContainerWidth] = useState(cardWidth);

  const handleImageScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const pageW = e.nativeEvent.layoutMeasurement.width;
    if (pageW > 0) {
      const idx = Math.round(e.nativeEvent.contentOffset.x / pageW);
      if (idx !== activeIdx) setActiveIdx(idx);
    }
  };

  // ── Tap vs. Swipe detection via PanResponder ──────────────────
  // We track touch start position; if the finger barely moved → it's a tap → navigate.
  // If it moved horizontally more than a threshold → it's a swipe → let ScrollView handle it.
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const TAP_THRESHOLD = 6; // pixels — movement below this = tap

  const imagePanResponder = useRef(
    PanResponder.create({
      // Let this responder try to claim the gesture
      onStartShouldSetPanResponder: () => true,
      // But yield to ScrollView when horizontal movement is detected
      onMoveShouldSetPanResponder: (_, gs) => {
        // If the horizontal movement is clearly a scroll, don't interfere
        return false;
      },
      onPanResponderGrant: (e) => {
        touchStartX.current = e.nativeEvent.pageX;
        touchStartY.current = e.nativeEvent.pageY;
      },
      onPanResponderRelease: (e) => {
        const dx = Math.abs(e.nativeEvent.pageX - touchStartX.current);
        const dy = Math.abs(e.nativeEvent.pageY - touchStartY.current);
        // Only navigate if it was a clean tap (minimal movement)
        if (dx < TAP_THRESHOLD && dy < TAP_THRESHOLD) {
          router.push(`/product/${product.id}`);
        }
      },
    }),
  ).current;

  // ── Discount ──────────────────────────────────────────────────
  const hasDiscount =
    product.originalPrice > 0 && product.sellingPrice < product.originalPrice;
  const discountPct = hasDiscount
    ? Math.round(
        ((product.originalPrice - product.sellingPrice) /
          product.originalPrice) *
          100,
      )
    : 0;

  // ── Tag ──────────────────────────────────────────────────────
  const primaryTag = product.tags?.[0];
  const tagConfig = primaryTag ? TAG_CONFIG[primaryTag] : null;

  // ── Stock guards ──────────────────────────────────────────────
  const hasStockCap =
    product.stockQuantity !== undefined && product.stockQuantity > 0;
  const hasMaxCap =
    product.maxOrderQuantity !== undefined && product.maxOrderQuantity > 0;

  const isAtMax = (() => {
    const hitMax = hasMaxCap && quantity >= product.maxOrderQuantity!;
    const hitStock = hasStockCap && quantity >= product.stockQuantity!;
    if (limitsEnabled) {
      return hitMax || hitStock;
    }
    return hitStock;
  })();

  const isLowStock =
    !isOutOfStock &&
    hasStockCap &&
    product.stockQuantity! <= 10 &&
    product.stockQuantity! > 0;

  // ── Animations ───────────────────────────────────────────────
  const handlePressIn = () =>
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 3,
    }).start();
  const handlePressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 5,
    }).start();

  // ── Navigate to detail ────────────────────────────────────────
  const navigateToDetail = () => {
    router.push(`/product/${product.id}`);
  };

  // ── Cart handlers ─────────────────────────────────────────────
  const handleAdd = () => {
    if (limitsEnabled && hasMaxCap) {
      if (quantity >= product.maxOrderQuantity!) {
        Alert.alert(
          "Maximum Limit Reached",
          `You can order a maximum of ${product.maxOrderQuantity} units.`,
          [{ text: "OK" }],
        );
        return;
      }
    }
    if (hasStockCap && quantity >= product.stockQuantity!) {
      Alert.alert(
        "Stock Limit Reached",
        `Only ${product.stockQuantity} units available.`,
        [{ text: "OK" }],
      );
      return;
    }
    const addQty =
      quantity === 0 && limitsEnabled && product.minOrderQuantity
        ? product.minOrderQuantity
        : 1;
    addToCart(product, addQty);
  };

  const handleRemove = () => {
    if (quantity <= 0) return;
    const hasMinCap =
      product.minOrderQuantity !== undefined && product.minOrderQuantity > 1;
    if (limitsEnabled && hasMinCap && quantity <= product.minOrderQuantity!) {
      Alert.alert(
        "Minimum Order Required",
        `Minimum order quantity is ${product.minOrderQuantity} unit${product.minOrderQuantity! > 1 ? "s" : ""}.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove Anyway",
            style: "destructive",
            onPress: () => updateQuantity(product.id, quantity - 1),
          },
        ],
      );
      return;
    }
    updateQuantity(product.id, quantity - 1);
  };

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════
  return (
    <>
      <Animated.View
        style={[
          s.gridCard,
          horizontal && { width: cardWidth },
          { transform: [{ scale }] },
        ]}
        onTouchStart={handlePressIn}
        onTouchEnd={handlePressOut}
        onTouchCancel={handlePressOut}
      >
        <View style={s.gridInner}>

          {/* ── IMAGE CARD ── */}
          <View style={s.imageCard}>

            {hasImages ? (
              /**
               * PanResponder wrapper:
               * - Uses "100%" width so it always matches imageCard's actual
               *   rendered width — avoids overflow from fixed pixel cardWidth.
               * - onStartShouldSetPanResponder captures touch start coords.
               * - onMoveShouldSetPanResponder returns false so ScrollView
               *   keeps the scroll responder when the user swipes.
               * - onPanResponderRelease: tiny dx/dy = tap → navigate.
               */
              <View
                style={s.carouselWrapper}
                onLayout={(e) => setImageContainerWidth(e.nativeEvent.layout.width)}
                {...imagePanResponder.panHandlers}
              >
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  bounces={false}
                  scrollEventThrottle={16}
                  onScroll={handleImageScroll}
                  nestedScrollEnabled
                  style={s.carouselScroll}
                  contentContainerStyle={{ flexGrow: 0 }}
                >
                  {sortedUrls.map((url, i) => (
                    <Image
                      key={i}
                      source={{ uri: url }}
                      style={[s.carouselImage, { width: imageContainerWidth }]}
                      resizeMode="contain"
                    />
                  ))}
                </ScrollView>
              </View>
            ) : (
              <TouchableOpacity
                style={s.imgPlaceholder}
                activeOpacity={0.85}
                onPress={navigateToDetail}
              >
                <MaterialIcons name="devices" size={wp("14%")} color="#888" />
              </TouchableOpacity>
            )}

            {/* ── Discount badge — top left ── */}
            {hasDiscount && !isOutOfStock && (
              <View style={s.discBadge} pointerEvents="none">
                <Text style={s.discBadgeText}>{discountPct}% OFF</Text>
              </View>
            )}

            {/* ── Fast Moving badge ── */}
            {product.isFastMoving && !isOutOfStock && (
              <View
                style={[s.fastBadge, hasDiscount && { top: hp("5%") }]}
                pointerEvents="none"
              >
                <Feather name="zap" size={wp("2.4%")} color="#fff" />
                <Text style={s.fastText}>Fast</Text>
              </View>
            )}

            {/* ── Carousel dots ── */}
            {hasMultipleImages && !isOutOfStock && (
              <View style={s.dotsRow} pointerEvents="none">
                {sortedUrls.map((_, i) => (
                  <View
                    key={i}
                    style={[s.dot, i === activeIdx && s.dotActive]}
                  />
                ))}
              </View>
            )}

            {/* ── ADD / Stepper — only when in stock ── */}
            {!isOutOfStock && (
              <View style={s.addArea}>
                {quantity === 0 ? (
                  <TouchableOpacity
                    style={s.addBtn}
                    onPress={handleAdd}
                    activeOpacity={0.82}
                  >
                    <Text style={s.addBtnText}>ADD</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={s.stepper}>
                    <TouchableOpacity
                      style={s.stepBtn}
                      onPress={handleRemove}
                      activeOpacity={0.7}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Feather
                        name="minus"
                        size={wp("3.5%")}
                        color={Colors.primary}
                      />
                    </TouchableOpacity>
                    <Text style={s.stepQty}>{quantity}</Text>
                    <TouchableOpacity
                      style={[s.stepBtn, isAtMax && s.stepBtnDisabled]}
                      onPress={handleAdd}
                      activeOpacity={0.7}
                      disabled={isAtMax}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Feather
                        name="plus"
                        size={wp("3.5%")}
                        color={
                          isAtMax ? "rgba(255,255,255,0.3)" : Colors.primary
                        }
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* ── Wishlist — only when in stock ── */}
            {onWishlist && !isOutOfStock && (
              <TouchableOpacity
                style={s.wishBtn}
                onPress={() => onWishlist(product)}
                activeOpacity={0.75}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <View style={s.heartBg}>
                  <Feather
                    name="heart"
                    size={hp(1.9)}
                    color="#EE2525"
                    style={{ opacity: isWishlisted ? 1 : 0.4 }}
                  />
                </View>
              </TouchableOpacity>
            )}
          </View>
          {/* END imageCard */}

          {/* ── CONTENT BELOW IMAGE ── */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={navigateToDetail}
          >
            <View style={s.info}>
              {/* Price row */}
              <View style={s.priceRow}>
                <Text style={s.sellingPrice}>₹{product.sellingPrice}</Text>
                {hasDiscount && (
                  <Text style={s.strikePrice}>₹{product.originalPrice}</Text>
                )}
              </View>

              {/* Brand + Low Stock battery on the same line */}
              <View style={s.brandStockRow}>
                {product.brand ? (
                  <Text style={s.brandText} numberOfLines={1}>
                    {product.brand}
                  </Text>
                ) : (
                  <View />
                )}
                {isLowStock && <LowStockBattery qty={product.stockQuantity} />}
              </View>

              <Text style={s.productName} numberOfLines={2}>
                {product.name}
              </Text>

              {product.rating !== undefined && (
                <View style={s.ratingRow}>
                  <Feather name="star" size={wp("3%")} color="#FFC107" />
                  <Text style={s.ratingVal}>{product.rating.toFixed(1)}</Text>
                  {product.reviewCount !== undefined && (
                    <Text style={s.ratingCount}>({product.reviewCount})</Text>
                  )}
                </View>
              )}

              {/* {product.warranty && product.warranty !== "No Warranty" && (
                <View style={s.warrantyBadge}>
                  <Feather
                    name="shield"
                    size={wp("2.2%")}
                    color={Colors.primary}
                  />
                  <Text style={s.warrantyText}>{product.warranty}</Text>
                </View>
              )} */}

              {!hideTags && tagConfig && (
                <View style={[s.tagPill, { backgroundColor: tagConfig.bg }]}>
                  {tagConfig.icon && (
                    <Feather
                      name={tagConfig.icon as any}
                      size={wp("2.5%")}
                      color={tagConfig.dot}
                    />
                  )}
                  <Text style={[s.tagText, { color: tagConfig.text }]}>
                    {primaryTag}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
        {/* END gridInner */}

        {/* ══════════════════════════════════════════════════════════
            OUT OF STOCK OVERLAY
        ══════════════════════════════════════════════════════════ */}
        {isOutOfStock && (
          <View style={s.oosOverlay} pointerEvents="box-none">
            {/* Frosted top half — covers only the image area */}
            <View style={[s.oosImageFrost, { height: IMAGE_HEIGHT }]}>
              {/* "OUT OF STOCK" banner */}
              <View style={s.oosBanner}>
                <MaterialIcons name="block" size={wp("4%")} color="#fff" />
                <Text style={s.oosBannerText}>OUT OF STOCK</Text>
              </View>

              {/* Notify Me button */}
              <TouchableOpacity
                style={[s.notifyBtn, isSubscribed && s.notifyBtnSubscribed]}
                onPress={() => setShowNotifyModal(true)}
                activeOpacity={0.85}
              >
                <Feather
                  name="bell"
                  size={wp("3.5%")}
                  color={isSubscribed ? Colors.primary : "#fff"}
                />
                <Text
                  style={[
                    s.notifyBtnText,
                    isSubscribed && s.notifyBtnTextSubscribed,
                  ]}
                >
                  {isSubscribed ? "✓ Notified" : "Notify Me"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Dim the info section below the image */}
            <View style={s.oosInfoDim} pointerEvents="none" />
          </View>
        )}
      </Animated.View>

      {/* ════════════════════════════════════════════════════════════
          NOTIFY ME MODAL
      ════════════════════════════════════════════════════════════ */}
      <Modal
        visible={showNotifyModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowNotifyModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowNotifyModal(false)}>
          <View style={s.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={s.modalContent}>
                <View style={s.modalIconCircle}>
                  <Feather name="bell" size={wp("7%")} color={Colors.primary} />
                </View>

                <Text style={s.modalTitle}>
                  {isSubscribed ? "Already Set!" : "Get Notified"}
                </Text>

                <Text style={s.modalMessage}>
                  {isSubscribed
                    ? `You'll be alerted as soon as "${product.name}" is back in stock.`
                    : `"${product.name}" is currently unavailable. Want us to notify you the moment it's back?`}
                </Text>

                <View style={s.modalProductPill}>
                  <Text style={s.modalProductPillText} numberOfLines={1}>
                    {product.name}
                  </Text>
                </View>

                <View style={s.modalActions}>
                  {isSubscribed ? (
                    <>
                      <TouchableOpacity
                        style={s.modalSecondaryBtn}
                        onPress={handleUnsubscribe}
                        disabled={notifyLoading}
                        activeOpacity={0.75}
                      >
                        <Feather
                          name="bell-off"
                          size={wp("3.5%")}
                          color="#EF4444"
                        />
                        <Text style={s.modalSecondaryBtnText}>
                          {notifyLoading ? "Removing..." : "Remove Alert"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.modalPrimaryBtn}
                        onPress={() => setShowNotifyModal(false)}
                        activeOpacity={0.8}
                      >
                        <Text style={s.modalPrimaryBtnText}>Done</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={s.modalSecondaryBtn}
                        onPress={() => setShowNotifyModal(false)}
                        activeOpacity={0.75}
                      >
                        <Text style={s.modalSecondaryBtnText}>Maybe Later</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.modalPrimaryBtn}
                        onPress={handleNotifyMe}
                        disabled={notifyLoading}
                        activeOpacity={0.8}
                      >
                        <Feather name="bell" size={wp("3.5%")} color="#fff" />
                        <Text style={s.modalPrimaryBtnText}>
                          {notifyLoading ? "Setting..." : "Notify Me"}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

export default ProductCard;

// ─── STYLES ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // ── Shared ────────────────────────────────────────────────────
  imgPlaceholder: {
    width: "100%",
    height: IMAGE_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
  },
  heartBg: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 5,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: wp("1%") },
  ratingVal: {
    fontSize: wp("3%"),
    color: Colors.textPrimary,
    lineHeight: wp("4.5%"),
  },
  ratingCount: {
    fontSize: wp("2.6%"),
    color: Colors.textMuted,
    lineHeight: wp("4.5%"),
  },
  warrantyBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: wp("1%"),
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: wp("1.8%"),
    paddingVertical: hp("0.15%"),
    borderRadius: wp("1%"),
  },
  warrantyText: { fontSize: wp("2.2%"), color: Colors.primary },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: wp("1%"),
    paddingHorizontal: wp("2%"),
    paddingVertical: hp("0.3%"),
    borderRadius: wp("3%"),
  },
  tagText: { fontSize: wp("2.4%"), fontWeight: "600" },

  // ═══════════════════════════════════════════════════════════════
  // GRID CARD
  // ═══════════════════════════════════════════════════════════════
  gridCard: { flex: 1 },
  gridInner: { flex: 1, flexDirection: "column" },

  // Image card
  imageCard: {
    width: "100%",
    height: IMAGE_HEIGHT,
    backgroundColor: Colors.surface,
    borderRadius: wp("3.5%"),
    overflow: "hidden",
    position: "relative",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },

  // Fills the imageCard exactly — no fixed pixel width that could overflow
  carouselWrapper: {
    width: "100%",
    height: IMAGE_HEIGHT,
  },
  carouselScroll: {
    width: "100%",
    height: IMAGE_HEIGHT,
  },
  carouselImage: {
    height: IMAGE_HEIGHT,
    backgroundColor: Colors.surface,
  },

  // ── Discount badge ──────────────────────────────────────────────
  discBadge: {
    position: "absolute",
    top: wp("2%"),
    left: wp("2%"),
    backgroundColor: "#FF4444",
    borderRadius: wp("1.5%"),
    paddingHorizontal: wp("2.2%"),
    paddingVertical: hp("0.22%"),
    zIndex: 4,
    elevation: 2,
  },
  discBadgeText: {
    top: hp("0.1%"),
    fontSize: wp("2.5%"),
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
  },

  // ── Fast badge ─────────────────────────────────────────────────
  fastBadge: {
    position: "absolute",
    top: wp("2%"),
    left: wp("2%"),
    flexDirection: "row",
    alignItems: "center",
    gap: wp("0.8%"),
    backgroundColor: "#FF6B00",
    borderRadius: wp("1.5%"),
    paddingHorizontal: wp("2%"),
    paddingVertical: hp("0.25%"),
    zIndex: 4,
  },
  fastText: { fontSize: wp("2.3%"), color: "#fff", fontWeight: "700" },

  // ── Carousel dots ──────────────────────────────────────────────
  dotsRow: {
    position: "absolute",
    bottom: wp("2.5%"),
    left: wp("2.5%"),
    flexDirection: "row",
    alignItems: "center",
    gap: wp("1%"),
    zIndex: 5,
  },
  dot: {
    width: wp("1.8%"),
    height: wp("1.8%"),
    borderRadius: wp("1%"),
    backgroundColor: "rgba(255,255,255,0.38)",
  },
  dotActive: {
    backgroundColor: "#fff",
    width: wp("4%"),
  },

  // ── ADD button ─────────────────────────────────────────────────
  addArea: {
    position: "absolute",
    bottom: wp("2%"),
    right: wp("2%"),
    zIndex: 5,
  },
  addBtn: {
    backgroundColor: Colors.surface,
    borderWidth: 1.8,
    borderColor: Colors.primary,
    borderRadius: wp("2%"),
    paddingHorizontal: wp("3.6%"),
    paddingVertical: hp("0.25%"),
    alignItems: "center",
    justifyContent: "center",
    minWidth: wp("16%"),
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  addBtnText: {
    fontSize: wp("3.5%"),
    fontWeight: "700",
    top: hp("0.2%"),
    color: Colors.primary,
    letterSpacing: 1,
  },

  // ── Stepper ────────────────────────────────────────────────────
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1.8,
    borderColor: Colors.primary,
    borderRadius: wp("2%"),
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  stepBtn: {
    paddingHorizontal: wp("2.5%"),
    paddingVertical: hp("0.75%"),
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnDisabled: { opacity: 0.3 },
  stepQty: {
    top: hp("0.2%"),
    minWidth: wp("4%"),
    textAlign: "center",
    fontSize: wp("3.5%"),
    fontWeight: "800",
    color: Colors.primary,
    paddingHorizontal: wp("1%"),
  },

  // ── Wishlist ───────────────────────────────────────────────────
  wishBtn: {
    position: "absolute",
    top: wp("2.5%"),
    right: wp("2.5%"),
    zIndex: 5,
  },

  // ═══════════════════════════════════════════════════════════════
  // OUT OF STOCK OVERLAY
  // ═══════════════════════════════════════════════════════════════
  oosOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    borderRadius: wp("3.5%"),
    overflow: "hidden",
  },
  oosImageFrost: {
    width: "100%",
    backgroundColor: "rgba(15, 15, 15, 0.72)",
    alignItems: "center",
    justifyContent: "center",
    gap: hp("1.4%"),
    borderTopLeftRadius: wp("3.5%"),
    borderTopRightRadius: wp("3.5%"),
  },
  oosBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("1.5%"),
    backgroundColor: "rgba(239, 68, 68, 0.92)",
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("0.7%"),
    borderRadius: wp("5%"),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  oosBannerText: {
    top: hp("0.1%"),
    fontSize: wp("3%"),
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 1.2,
  },
  notifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("1.5%"),
    backgroundColor: Colors.primary,
    paddingHorizontal: wp("4.5%"),
    paddingVertical: hp("0.9%"),
    borderRadius: wp("2.5%"),
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    minWidth: wp("28%"),
    justifyContent: "center",
  },
  notifyBtnSubscribed: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  notifyBtnText: {
    top: hp("0.1%"),
    fontSize: wp("3%"),
    fontWeight: "700",
    color: "#fff",
  },
  notifyBtnTextSubscribed: {
    color: Colors.primary,
  },
  oosInfoDim: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.55)",
  },

  // ── Content below image ────────────────────────────────────────
  info: {
    paddingTop: hp("0.9%"),
    paddingHorizontal: wp("1.5%"),
    gap: hp("0.32%"),
    marginBottom: hp("1.5%"),
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: wp("2%"),
  },
  sellingPrice: {
    fontSize: wp("4.8%"),
    fontWeight: "800",
    color: Colors.textPrimary,
    includeFontPadding: false,
  },
  strikePrice: {
    fontSize: wp("3.2%"),
    color: Colors.textMuted,
    textDecorationLine: "line-through",
    fontWeight: "500",
  },
  brandStockRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: hp("2.4%"),
  },
  brandText: {
    fontSize: wp("3%"),
    color: Colors.textMuted,
    fontWeight: "500",
    flexShrink: 1,
    marginRight: wp("1%"),
  },

  // ── Blinkit-style battery indicator ───────────────────────────
  batteryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("1%"),
    flexShrink: 0,
  },
  batteryBody: {
    width: wp("5.5%"),
    height: hp("1.35%"),
    borderRadius: wp("0.6%"),
    borderWidth: 1.5,
    overflow: "hidden",
    justifyContent: "center",
    paddingHorizontal: wp("0.4%"),
    paddingVertical: hp("0.12%"),
  },
  batteryFill: {
    height: "100%",
    borderRadius: wp("0.3%"),
  },
  batteryNub: {
    width: wp("1%"),
    height: hp("0.75%"),
    borderRadius: wp("0.3%"),
    marginLeft: -wp("0.6%"),
  },
  batteryLabel: {
    top: hp("0.1%"),
    fontSize: wp("2.4%"),
    fontWeight: "700",
  },
  productName: {
    fontSize: wp("3.2%"),
    fontWeight: "600",
    color: Colors.textPrimary,
    lineHeight: wp("4.6%"),
  },

  // ═══════════════════════════════════════════════════════════════
  // NOTIFY ME MODAL
  // ═══════════════════════════════════════════════════════════════
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: wp("6%"),
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: wp("5%"),
    paddingVertical: hp("3%"),
    paddingHorizontal: wp("6%"),
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
  },
  modalIconCircle: {
    width: wp("16%"),
    height: wp("16%"),
    borderRadius: wp("8%"),
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: hp("1.5%"),
  },
  modalTitle: {
    fontSize: wp("5%"),
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: hp("0.8%"),
  },
  modalMessage: {
    fontSize: wp("3.2%"),
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: wp("5%"),
  },
  modalProductPill: {
    marginTop: hp("1.5%"),
    backgroundColor: Colors.surfaceAlt,
    borderRadius: wp("2%"),
    paddingHorizontal: wp("3%"),
    paddingVertical: hp("0.6%"),
    maxWidth: "90%",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalProductPillText: {
    fontSize: wp("2.8%"),
    fontWeight: "600",
    color: Colors.textMuted,
  },
  modalActions: {
    flexDirection: "row",
    gap: wp("3%"),
    marginTop: hp("2.5%"),
    width: "100%",
  },
  modalSecondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp("1.5%"),
    paddingVertical: hp("1.3%"),
    borderRadius: wp("3%"),
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalSecondaryBtnText: {
    fontSize: wp("3.2%"),
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  modalPrimaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp("1.5%"),
    paddingVertical: hp("1.3%"),
    borderRadius: wp("3%"),
    backgroundColor: Colors.primary,
  },
  modalPrimaryBtnText: {
    top: hp("0.1%"),
    fontSize: wp("3.2%"),
    fontWeight: "700",
    color: "#fff",
  },
});