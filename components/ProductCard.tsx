// components/ProductCard.tsx
import { Text } from "@/context/FontContext";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
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
import Colors from "../constants/colors";
import { Product } from "../constants/products";
import { useCart } from "../context/CartContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Grid card width: 2 columns, 4% side padding each side, 2% gap between cards
// = (screenWidth - 8% - 4%) / 2  — the 4% accounts for margin(1%) on each card side × 2
const GRID_CARD_WIDTH = (SCREEN_WIDTH - wp("8%") - wp("2%")) / 2;

// Horizontal scroll card width: ~45% of screen feels natural, not too wide, not cramped
const HORIZONTAL_CARD_WIDTH = SCREEN_WIDTH * 0.4;

// Image card height — square-ish feel like Blinkit/Zepto
const IMAGE_HEIGHT = wp("48%");

interface ProductCardProps {
  product: Product;
  onWishlist?: (product: Product) => void;
  isWishlisted?: boolean;
  hideTags?: boolean;
  layout?: "grid" | "list";
  /** Pass true when used inside a horizontal ScrollView (HomeScreen sections).
   *  The card sizes itself — no wrapper width needed on the parent. */
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

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onWishlist,
  isWishlisted = false,
  hideTags = false,
  layout = "grid",
  horizontal = false,
}) => {
  // Card width drives the carousel image width and the overall card width
  const cardWidth = horizontal ? HORIZONTAL_CARD_WIDTH : GRID_CARD_WIDTH;
  const scale = useRef(new Animated.Value(1)).current;
  const { addToCart, updateQuantity, getCartQuantity } = useCart();

  const quantity = getCartQuantity(product.id);
  const isOutOfStock = !product.inStock;
  const limitsEnabled = product.enforceOrderLimits !== false;

  // ── Image normalisation ───────────────────────────────────────
  // Supports both string[] and {url, isPrimary}[] from API
  const rawImages: any[] = product.images || [];
  const allUrls: string[] = rawImages
    .map((img) => (typeof img === "string" ? img : img?.url || ""))
    .filter(Boolean);

  // Sort: isPrimary first
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

  const handleImageScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const pageW = e.nativeEvent.layoutMeasurement.width;
    if (pageW > 0) {
      const idx = Math.round(e.nativeEvent.contentOffset.x / pageW);
      if (idx !== activeIdx) setActiveIdx(idx);
    }
  };

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
  const isAtMax = limitsEnabled
    ? (product.maxOrderQuantity !== undefined &&
        quantity >= product.maxOrderQuantity) ||
      (product.stockQuantity !== undefined && quantity >= product.stockQuantity)
    : product.stockQuantity !== undefined && quantity >= product.stockQuantity;

  const isLowStock =
    !isOutOfStock && product.stockQuantity <= 10 && product.stockQuantity > 0;

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

  // ── Cart handlers ─────────────────────────────────────────────
  const handleAdd = () => {
    // Only enforce max limits if the product has enforceOrderLimits enabled
    if (limitsEnabled) {
      if (product.maxOrderQuantity && quantity >= product.maxOrderQuantity) {
        Alert.alert(
          "Maximum Limit Reached",
          `You can order a maximum of ${product.maxOrderQuantity} units.`,
          [{ text: "OK" }],
        );
        return;
      }
    }

    // Always check stock availability
    if (product.stockQuantity && quantity >= product.stockQuantity) {
      Alert.alert(
        "Stock Limit Reached",
        `Only ${product.stockQuantity} units available.`,
        [{ text: "OK" }],
      );
      return;
    }

    // Determine add quantity
    const addQty =
      quantity === 0 && limitsEnabled && product.minOrderQuantity
        ? product.minOrderQuantity
        : 1;
    addToCart(product, addQty);
  };

  const handleRemove = () => {
    if (quantity > 0) {
      // Only check minimum order quantity when limits are enabled
      if (
        limitsEnabled &&
        product.minOrderQuantity &&
        quantity <= product.minOrderQuantity
      ) {
        Alert.alert(
          "Minimum Order Required",
          `Minimum order quantity is ${product.minOrderQuantity} unit${product.minOrderQuantity > 1 ? "s" : ""}.`,
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
      // If limits disabled or quantity is above minimum, just decrease
      updateQuantity(product.id, quantity - 1);
    }
  };

  // ════════════════════════════════════════════════════════════════
  // LIST LAYOUT — kept intact from original
  // ════════════════════════════════════════════════════════════════
  if (layout === "list") {
    const primaryUrl = sortedUrls[0];
    return (
      <Animated.View style={[s.listCard, { transform: [{ scale }] }]}>
        <TouchableWithoutFeedback
          onPress={() => !isOutOfStock && router.push(`/product/${product.id}`)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isOutOfStock}
        >
          <View style={[s.listInner, isOutOfStock && s.dimmed]}>
            {/* Image */}
            <View style={s.listImageWrap}>
              {primaryUrl ? (
                <Image
                  source={{ uri: primaryUrl }}
                  style={s.listImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[s.listImage, s.imgPlaceholder]}>
                  <MaterialIcons
                    name="devices"
                    size={wp("10%")}
                    color={Colors.border}
                  />
                </View>
              )}
              {isLowStock && (
                <View style={s.lowStockBadge}>
                  <Text style={s.lowStockText}>
                    Only {product.stockQuantity} left
                  </Text>
                </View>
              )}
              {isOutOfStock && (
                <View style={s.oosOverlay}>
                  <MaterialIcons name="block" size={wp("7%")} color="#fff" />
                  <Text style={s.oosOverlayText}>Out of Stock</Text>
                </View>
              )}
              {onWishlist && (
                <TouchableOpacity
                  style={s.listWishBtn}
                  onPress={() => onWishlist(product)}
                  activeOpacity={0.75}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <View style={s.heartBg}>
                    <Feather
                      name="heart"
                      size={hp(2.2)}
                      color="#EE2525"
                      style={{ opacity: isWishlisted ? 1 : 0.4 }}
                    />
                  </View>
                </TouchableOpacity>
              )}
            </View>
            {/* Content */}
            <View style={s.listContent}>
              {product.brand ? (
                <Text style={s.listBrand} numberOfLines={1}>
                  {product.brand}
                </Text>
              ) : null}
              <Text style={s.listName} numberOfLines={2}>
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
              {product.warranty && product.warranty !== "No Warranty" && (
                <View style={s.warrantyBadge}>
                  <Feather
                    name="shield"
                    size={wp("2.2%")}
                    color={Colors.primary}
                  />
                  <Text style={s.warrantyText}>{product.warranty}</Text>
                </View>
              )}
              <View style={s.listPriceRow}>
                <View style={s.priceGroup}>
                  <Text style={s.listPrice}>₹{product.sellingPrice}</Text>
                  {hasDiscount && (
                    <Text style={s.listOriginal}>₹{product.originalPrice}</Text>
                  )}
                </View>
                {isOutOfStock ? (
                  <View style={s.disabledBtn}>
                    <Text style={s.disabledText}>Out of Stock</Text>
                  </View>
                ) : quantity > 0 ? (
                  <View style={s.qtyRowList}>
                    <TouchableOpacity
                      onPress={handleRemove}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Feather name="minus" size={wp("3.8%")} color="#fff" />
                    </TouchableOpacity>
                    <Text style={s.qtyVal}>{quantity}</Text>
                    <TouchableOpacity
                      onPress={handleAdd}
                      activeOpacity={0.7}
                      disabled={isAtMax}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Feather
                        name="plus"
                        size={wp("3.8%")}
                        color={isAtMax ? "rgba(255,255,255,0.35)" : "#fff"}
                      />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={s.listAddBtn}
                    onPress={handleAdd}
                    activeOpacity={0.8}
                  >
                    <Feather
                      name="shopping-cart"
                      size={wp("4%")}
                      color={Colors.primary}
                    />
                    <Text style={s.listAddBtnText}>
                      {limitsEnabled &&
                      product.minOrderQuantity &&
                      product.minOrderQuantity > 1
                        ? `ADD ${product.minOrderQuantity}`
                        : "ADD TO CART"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
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
          </View>
        </TouchableWithoutFeedback>
      </Animated.View>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // GRID LAYOUT
  // ════════════════════════════════════════════════════════════════
  return (
    <Animated.View
      style={[s.gridCard, horizontal && { width: cardWidth }]}
      onTouchStart={handlePressIn}
      onTouchEnd={handlePressOut}
      onTouchCancel={handlePressOut}
    >
      <View style={[s.gridInner, isOutOfStock && s.dimmed]}>
        {/* ── IMAGE CARD ── */}
        <View style={s.imageCard}>
          {hasImages ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              bounces={false}
              scrollEventThrottle={16}
              onScroll={handleImageScroll}
              nestedScrollEnabled
              style={{ width: cardWidth, height: IMAGE_HEIGHT }}
              contentContainerStyle={{ flexGrow: 0 }}
            >
              {sortedUrls.map((url, i) => (
                <Image
                  key={i}
                  source={{ uri: url }}
                  style={[s.carouselImage, { width: cardWidth }]}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          ) : (
            <View style={s.imgPlaceholder}>
              <MaterialIcons name="devices" size={wp("14%")} color="#888" />
            </View>
          )}

          {/* Fast Moving badge */}
          {product.isFastMoving && (
            <View style={[s.fastBadge, hasDiscount && { top: hp("4.5%") }]}>
              <Feather name="zap" size={wp("2.4%")} color="#fff" />
              <Text style={s.fastText}>Fast</Text>
            </View>
          )}

          {/* Low stock */}
          {isLowStock && (
            <View
              style={[
                s.lowStockBadge,
                {
                  top:
                    wp("2%") +
                    (hasDiscount ? hp("3.8%") : 0) +
                    (product.isFastMoving ? hp("3.4%") : 0),
                },
              ]}
            >
              <Text style={s.lowStockText}>
                Only {product.stockQuantity} left
              </Text>
            </View>
          )}

          {/* Carousel dots */}
          {hasMultipleImages && (
            <View style={s.dotsRow} pointerEvents="none">
              {sortedUrls.map((_, i) => (
                <View key={i} style={[s.dot, i === activeIdx && s.dotActive]} />
              ))}
            </View>
          )}

          {/* ADD / Stepper */}
          <View style={s.addArea}>
            {isOutOfStock ? null : quantity === 0 ? (
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
                    color={isAtMax ? "rgba(255,255,255,0.3)" : Colors.primary}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* OOS overlay */}
          {isOutOfStock && (
            <View style={s.oosOverlay}>
              <MaterialIcons name="block" size={wp("7%")} color="#fff" />
              <Text style={s.oosOverlayText}>Out of Stock</Text>
            </View>
          )}

          {/* Wishlist */}
          {onWishlist && (
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

        {/* ── CONTENT BELOW ── */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => !isOutOfStock && router.push(`/product/${product.id}`)}
          disabled={isOutOfStock}
        >
          <View style={s.info}>
            <View style={s.priceRow}>
              <Text style={s.sellingPrice}>₹{product.sellingPrice}</Text>
              {hasDiscount && (
                <Text style={s.strikePrice}>₹{product.originalPrice}</Text>
              )}
            </View>
            {hasDiscount && (
              <Text style={s.discLabel}>{discountPct}% OFF on MRP</Text>
            )}
            {product.brand ? (
              <Text style={s.brandText} numberOfLines={1}>
                {product.brand}
              </Text>
            ) : null}
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
            {product.warranty && product.warranty !== "No Warranty" && (
              <View style={s.warrantyBadge}>
                <Feather
                  name="shield"
                  size={wp("2.2%")}
                  color={Colors.primary}
                />
                <Text style={s.warrantyText}>{product.warranty}</Text>
              </View>
            )}
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
    </Animated.View>
  );
};

export default ProductCard;

// ─── STYLES ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  dimmed: { opacity: 0.6 },

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
  oosOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.48)",
    alignItems: "center",
    justifyContent: "center",
    gap: hp("0.8%"),
    zIndex: 6,
  },
  oosOverlayText: { fontSize: wp("3.2%"), color: "#fff", fontWeight: "600" },
  discBadge: {
    position: "absolute",
    top: wp("2%"),
    left: wp("2%"),
    backgroundColor: "#FF4444",
    borderRadius: wp("1.5%"),
    paddingHorizontal: wp("2%"),
    paddingVertical: hp("0.25%"),
    zIndex: 4,
  },
  discBadgeText: {
    fontSize: wp("2.4%"),
    fontWeight: "700",
    color: "#fff",
    top: hp("0.1%"),
  },
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
  lowStockBadge: {
    position: "absolute",
    left: wp("2%"),
    backgroundColor: "rgba(255,152,0,0.92)",
    borderRadius: wp("1.5%"),
    paddingHorizontal: wp("2%"),
    paddingVertical: hp("0.2%"),
    zIndex: 4,
  },
  lowStockText: { fontSize: wp("2.2%"), color: "#fff", fontWeight: "600" },
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
  priceGroup: { flexDirection: "row", alignItems: "baseline", gap: wp("1.5%") },

  // ═══════════════════════════════════════════════════════════════
  // GRID CARD
  // ═══════════════════════════════════════════════════════════════
  gridCard: {
    flex: 1,
  },
  gridInner: {
    flex: 1,
    flexDirection: "column",
  },

  // Image card (the dark/surface rounded box)
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
  carouselImage: {
    height: IMAGE_HEIGHT,
    backgroundColor: Colors.surface,
  },

  // Stock dot (top-right square box with dot inside)
  stockDotBox: {
    position: "absolute",
    top: wp("2.5%"),
    right: wp("2.5%"),
    width: wp("7%"),
    height: wp("7%"),
    borderRadius: wp("1.8%"),
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.1)",
    zIndex: 5,
  },
  stockDot: {
    width: wp("2.8%"),
    height: wp("2.8%"),
    borderRadius: wp("1.4%"),
  },

  // Carousel dots (bottom-left)
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

  // ADD button (bottom-right)
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

  // Stepper (inline −  N  +)
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

  wishBtn: {
    position: "absolute",
    top: wp("2.5%"),
    right: wp("11%"),
    zIndex: 5,
  },

  // Content area below image card
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
  discLabel: {
    fontSize: wp("3.2%"),
    fontWeight: "700",
    color: Colors.primary,
  },
  productName: {
    fontSize: wp("3.2%"),
    fontWeight: "600",
    color: Colors.textPrimary,
    lineHeight: wp("4.6%"),
  },
  brandText: {
    fontSize: wp("3%"),
    color: Colors.textMuted,
    fontWeight: "500",
  },
  deliveryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("1%"),
    marginTop: hp("0.2%"),
  },
  deliveryText: {
    fontSize: wp("2.8%"),
    color: Colors.textMuted,
  },

  // ═══════════════════════════════════════════════════════════════
  // LIST CARD
  // ═══════════════════════════════════════════════════════════════
  listCard: {
    width: "100%",
    marginBottom: hp("1.5%"),
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  listInner: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: wp("3.5%"),
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.08)",
  },
  listImageWrap: {
    position: "relative",
    width: wp("30%"),
    aspectRatio: 1,
    backgroundColor: Colors.surfaceAlt,
    overflow: "hidden",
  },
  listImage: { width: "100%", height: "100%" },
  listWishBtn: {
    position: "absolute",
    top: wp("2%"),
    right: wp("2%"),
    zIndex: 10,
  },
  listContent: {
    flex: 1,
    paddingHorizontal: wp("3%"),
    paddingVertical: hp("1.2%"),
    gap: hp("0.4%"),
    justifyContent: "space-between",
  },
  listBrand: {
    fontSize: wp("2.4%"),
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "700",
  },
  listName: {
    fontSize: wp("3.5%"),
    color: Colors.textPrimary,
    lineHeight: wp("4.8%"),
    fontWeight: "600",
  },
  listPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: wp("1%"),
  },
  listPrice: {
    fontSize: wp("4.5%"),
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  listOriginal: {
    fontSize: wp("2.8%"),
    color: Colors.textMuted,
    textDecorationLine: "line-through",
  },
  listAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp("1.5%"),
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: wp("2%"),
    paddingHorizontal: wp("3.5%"),
    paddingVertical: hp("0.8%"),
    backgroundColor: Colors.white,
  },
  listAddBtnText: {
    fontSize: wp("3%"),
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  qtyRowList: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.primary,
    borderRadius: wp("2.5%"),
    paddingVertical: hp("0.85%"),
    paddingHorizontal: wp("3%"),
    minWidth: wp("22%"),
  },
  qtyVal: {
    fontSize: wp("4%"),
    color: "#fff",
    fontWeight: "700",
    minWidth: wp("5%"),
    textAlign: "center",
  },
  disabledBtn: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: wp("2.5%"),
    paddingVertical: hp("0.95%"),
    paddingHorizontal: wp("3%"),
    alignItems: "center",
    backgroundColor: "#FAFAFA",
  },
  disabledText: { fontSize: wp("2.9%"), color: "#AAAAAA" },
});
