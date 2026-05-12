// components/ProductCard.tsx
import { Text } from "@/context/FontContext";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef } from "react";
import {
  Alert,
  Animated,
  Image,
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

interface ProductCardProps {
  product: Product;
  onWishlist?: (product: Product) => void;
  isWishlisted?: boolean;
  hideTags?: boolean;
  layout?: "grid" | "list";
}

// Updated TAG_CONFIG for electronics accessories
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
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const { addToCart, updateQuantity, getCartQuantity } = useCart();

  const quantity = getCartQuantity(product.id);
  const isOutOfStock = !product.inStock;

  // Calculate discount dynamically from API data
  const hasDiscount =
    product.originalPrice > 0 && product.sellingPrice < product.originalPrice;
  const discountPercentage = hasDiscount
    ? Math.round(
        ((product.originalPrice - product.sellingPrice) /
          product.originalPrice) *
          100,
      )
    : 0;

  const primaryTag = product.tags?.[0];
  const tagConfig = primaryTag ? TAG_CONFIG[primaryTag] : null;

  // Get primary image from images array (supports multiple images)
  const primaryImage =
    product.images?.find((img) => img.isPrimary)?.url ||
    product.images?.[0]?.url;
  const totalImages = product.images?.length || 0;

  const handlePressIn = () =>
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();

  const handlePressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();

  const handleAdd = () => {
    // ✅ Check max order quantity
    if (product.maxOrderQuantity && quantity >= product.maxOrderQuantity) {
      Alert.alert(
        "Maximum Limit Reached",
        `You can order a maximum of ${product.maxOrderQuantity} units of this product.`,
        [{ text: "OK" }],
      );
      return;
    }

    // ✅ Check stock
    if (product.stockQuantity && quantity >= product.stockQuantity) {
      Alert.alert(
        "Stock Limit Reached",
        `Only ${product.stockQuantity} units available in stock.`,
        [{ text: "OK" }],
      );
      return;
    }

    addToCart(product, 1);
  };

  const handleRemove = () => {
    if (quantity > 0) {
      // ✅ Check min order quantity before removing
      if (product.minOrderQuantity && quantity <= product.minOrderQuantity) {
        Alert.alert(
          "Minimum Order Required",
          `Minimum order quantity for this product is ${product.minOrderQuantity} unit${product.minOrderQuantity > 1 ? "s" : ""}.`,
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
    }
  };

  const handlePress = () => {
    if (!isOutOfStock) {
      router.push(`/product/${product.id}`);
    }
  };

  const isList = layout === "list";

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        isList && styles.cardWrapperList,
        { transform: [{ scale }] },
      ]}
    >
      <TouchableWithoutFeedback
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isOutOfStock}
      >
        <View
          style={[
            styles.card,
            isList && styles.cardList,
            isOutOfStock && styles.cardDimmed,
          ]}
        >
          {/* ── Image Section ── */}
          <View
            style={[styles.imageContainer, isList && styles.imageContainerList]}
          >
            {primaryImage ? (
              <Image
                source={{ uri: primaryImage }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]}>
                <MaterialIcons
                  name="devices"
                  size={wp("12%")}
                  color={Colors.border}
                />
              </View>
            )}

            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.7)", "rgba(0,0,0,0.85)"]}
              style={styles.imageOverlay}
            />

            {/* Discount Badge - calculated from API prices */}
            {hasDiscount && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>
                  {discountPercentage}% OFF
                </Text>
              </View>
            )}

            {/* Fast Moving Badge */}
            {product.isFastMoving && (
              <View style={styles.fastMovingBadge}>
                <Feather name="zap" size={wp("2.8%")} color="#fff" />
                <Text style={styles.fastMovingText}>Fast</Text>
              </View>
            )}

            {/* Tag Badge */}
            {!hideTags && tagConfig && !product.isFastMoving && (
              <View
                style={[styles.imageTag, { backgroundColor: tagConfig.bg }]}
              >
                {tagConfig.icon && (
                  <Feather
                    name={tagConfig.icon as any}
                    size={wp("2.5%")}
                    color={tagConfig.dot}
                  />
                )}
                <Text style={[styles.imageTagText, { color: tagConfig.text }]}>
                  {primaryTag}
                </Text>
              </View>
            )}

            {/* Image Count Badge */}
            {totalImages > 1 && (
              <View style={styles.imageCountBadge}>
                <Text style={styles.imageCountText}>{totalImages} pics</Text>
              </View>
            )}

            {/* Low Stock Warning */}
            {!isOutOfStock &&
              product.stockQuantity <= 10 &&
              product.stockQuantity > 0 && (
                <View style={styles.stockPill}>
                  <Text style={styles.stockPillText}>
                    Only {product.stockQuantity} left
                  </Text>
                </View>
              )}

            {/* Out of Stock Overlay */}
            {isOutOfStock && (
              <View style={styles.oosOverlay}>
                <MaterialIcons name="block" size={wp("8%")} color="#fff" />
                <Text style={styles.oosText}>Out of Stock</Text>
              </View>
            )}

            {/* Wishlist Button */}
            {onWishlist && (
              <TouchableOpacity
                style={styles.wishBtn}
                onPress={() => onWishlist(product)}
                activeOpacity={0.75}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather
                  name="heart"
                  size={isList ? wp("4%") : wp("3.8%")}
                  color={isWishlisted ? "#EF5350" : "#fff"}
                  style={styles.wishIconShadow}
                />
              </TouchableOpacity>
            )}

            {/* Product Info Overlay on Image */}
            <View
              style={[
                styles.imageTextOverlay,
                isList && styles.imageTextOverlayList,
              ]}
            >
              {product.brand ? (
                <Text
                  style={[styles.imageBrand, isList && styles.imageBrandList]}
                  numberOfLines={1}
                >
                  {product.brand}
                </Text>
              ) : null}
              <Text
                style={[styles.imageName, isList && styles.imageNameList]}
                numberOfLines={2}
              >
                {product.name}
              </Text>
              <View style={styles.imageMetaRow}>
                {product.type && (
                  <Text style={styles.imageTypeText} numberOfLines={1}>
                    {product.type}
                  </Text>
                )}
                {product.dimensions && (
                  <Text style={styles.imageTypeText} numberOfLines={1}>
                    {product.dimensions}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* ── Content Section ── */}
          <View style={[styles.content, isList && styles.contentList]}>
            {/* Specifications Preview */}
            {product.specifications &&
              Object.keys(product.specifications).length > 0 && (
                <View style={styles.specRow}>
                  {Object.entries(product.specifications)
                    .slice(0, 2)
                    .map(([key, val]) => (
                      <Text key={key} style={styles.specText} numberOfLines={1}>
                        {val}
                      </Text>
                    ))}
                </View>
              )}

            {/* Color & Material */}
            {(product.color || product.material) && (
              <View style={styles.attributeRow}>
                {product.color && (
                  <View style={styles.attributeChip}>
                    <View
                      style={[
                        styles.colorDot,
                        {
                          backgroundColor:
                            product.color.toLowerCase() === "black"
                              ? "#000"
                              : product.color.toLowerCase() === "white"
                                ? "#fff"
                                : product.color.toLowerCase() === "silver"
                                  ? "#C0C0C0"
                                  : product.color.toLowerCase() === "gold"
                                    ? "#FFD700"
                                    : product.color.toLowerCase() ===
                                        "rose gold"
                                      ? "#B76E79"
                                      : product.color.toLowerCase() === "blue"
                                        ? "#2196F3"
                                        : product.color.toLowerCase() === "red"
                                          ? "#F44336"
                                          : product.color.toLowerCase() ===
                                              "green"
                                            ? "#4CAF50"
                                            : Colors.primary,
                        },
                      ]}
                    />
                    <Text style={styles.attributeText}>{product.color}</Text>
                  </View>
                )}
                {product.material && (
                  <View style={styles.attributeChip}>
                    <Feather
                      name="shield"
                      size={wp("2.2%")}
                      color={Colors.textMuted}
                    />
                    <Text style={styles.attributeText}>{product.material}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Warranty Badge */}
            {product.warranty && product.warranty !== "No Warranty" && (
              <View style={styles.warrantyBadge}>
                <Feather
                  name="shield"
                  size={wp("2.2%")}
                  color={Colors.primary}
                />
                <Text style={styles.warrantyText}>{product.warranty}</Text>
              </View>
            )}

            <View style={styles.priceRow}>
              <View style={isList && styles.priceInfoList}>
                <View style={styles.priceMain}>
                  <Text
                    style={[
                      styles.priceCurrency,
                      isList && styles.priceCurrencyList,
                    ]}
                  >
                    ₹
                  </Text>
                  <Text
                    style={[styles.priceValue, isList && styles.priceValueList]}
                  >
                    {product.sellingPrice}
                  </Text>
                </View>
                {/* Show original price if there's a discount */}
                {hasDiscount && (
                  <Text
                    style={[
                      styles.originalPrice,
                      isList && styles.originalPriceList,
                    ]}
                  >
                    ₹{product.originalPrice}
                  </Text>
                )}
              </View>

              {/* Cart Actions */}
              {isOutOfStock ? (
                <View
                  style={[styles.disabledBtn, isList && styles.disabledBtnList]}
                >
                  <Text
                    style={[
                      styles.disabledText,
                      isList && styles.disabledTextList,
                    ]}
                  >
                    Out of Stock
                  </Text>
                </View>
              ) : quantity > 0 ? (
                <View style={[styles.qtyCtrl, isList && styles.qtyCtrlList]}>
                  <TouchableOpacity
                    onPress={handleRemove}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name="minus"
                      size={isList ? wp("3.8%") : wp("3.5%")}
                      color={Colors.white}
                    />
                  </TouchableOpacity>
                  <Text
                    style={[styles.qtyValue, isList && styles.qtyValueList]}
                  >
                    {quantity}
                  </Text>
                  <TouchableOpacity
                    onPress={handleAdd}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.7}
                    // ✅ Disable plus button when max is reached
                    disabled={Boolean(
                      (product.maxOrderQuantity &&
                        quantity >= product.maxOrderQuantity) ||
                      (product.stockQuantity &&
                        quantity >= product.stockQuantity),
                    )}
                  >
                    <Feather
                      name="plus"
                      size={isList ? wp("3.8%") : wp("3.5%")}
                      color={
                        (product.maxOrderQuantity &&
                          quantity >= product.maxOrderQuantity) ||
                        (product.stockQuantity &&
                          quantity >= product.stockQuantity)
                          ? Colors.textMuted
                          : Colors.white
                      }
                    />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.addBtn, isList && styles.addBtnList]}
                  onPress={handleAdd}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.addBtnText, isList && styles.addBtnTextList]}
                  >
                    ADD
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Min Order Quantity Info */}
            {!isOutOfStock && product.minOrderQuantity > 1 && (
              <Text style={styles.minOrderText}>
                Min {product.minOrderQuantity} units
              </Text>
            )}
            {/* Max Order Quantity Info */}
            {/* {!isOutOfStock && product.maxOrderQuantity && (
              <Text style={styles.maxOrderText}>
                Max {product.maxOrderQuantity} units
              </Text>
            )} */}

            {/* Compatibility Info (List View) */}
            {isList &&
              product.compatibility &&
              product.compatibility.length > 0 && (
                <View style={styles.compatRow}>
                  <Feather
                    name="smartphone"
                    size={wp("2.5%")}
                    color={Colors.textMuted}
                  />
                  <Text style={styles.compatText} numberOfLines={1}>
                    {product.compatibility.slice(0, 2).join(", ")}
                    {product.compatibility.length > 2
                      ? ` +${product.compatibility.length - 2}`
                      : ""}
                  </Text>
                </View>
              )}

            {/* List View Tag */}
            {isList && !hideTags && tagConfig && (
              <View style={[styles.listTag, { backgroundColor: tagConfig.bg }]}>
                {tagConfig.icon && (
                  <Feather
                    name={tagConfig.icon as any}
                    size={wp("2.5%")}
                    color={tagConfig.dot}
                  />
                )}
                <Text style={[styles.listTagText, { color: tagConfig.text }]}>
                  {primaryTag}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    flex: 1,
    marginHorizontal: wp("1%"),
    marginBottom: hp("1.8%"),
  },
  cardWrapperList: {
    width: "100%",
    marginHorizontal: 0,
    marginBottom: hp("1.5%"),
  },
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: wp("3.5%"),
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardList: {
    flexDirection: "row",
  },
  cardDimmed: {
    opacity: 0.7,
  },

  // ── Image Section ──────────────────────────────────────────────────────
  imageContainer: {
    position: "relative",
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#F5F5F5",
    overflow: "hidden",
  },
  imageContainerList: {
    width: wp("30%"),
    aspectRatio: 1,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surfaceAlt,
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "55%",
  },
  discountBadge: {
    position: "absolute",
    top: wp("2%"),
    left: wp("2%"),
    backgroundColor: "#FF3B30",
    paddingHorizontal: wp("2.5%"),
    paddingVertical: hp("0.4%"),
    borderRadius: wp("1.5%"),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  discountText: {
    fontSize: wp("2.6%"),
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
  },
  fastMovingBadge: {
    position: "absolute",
    top: wp("2%"),
    right: wp("2%"),
    backgroundColor: "#FF6B00",
    flexDirection: "row",
    alignItems: "center",
    gap: wp("1%"),
    paddingHorizontal: wp("2.5%"),
    paddingVertical: hp("0.4%"),
    borderRadius: wp("1.5%"),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  fastMovingText: {
    fontSize: wp("2.3%"),
    fontWeight: "800",
    color: "#fff",
  },
  imageTag: {
    position: "absolute",
    top: wp("2%"),
    right: wp("2%"),
    flexDirection: "row",
    alignItems: "center",
    gap: wp("1%"),
    paddingHorizontal: wp("2.5%"),
    paddingVertical: hp("0.4%"),
    borderRadius: wp("3%"),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  imageTagText: {
    fontSize: wp("2.4%"),
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  imageCountBadge: {
    position: "absolute",
    bottom: wp("2%"),
    right: wp("2%"),
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: wp("2%"),
    paddingVertical: hp("0.2%"),
    borderRadius: wp("1.5%"),
  },
  imageCountText: {
    fontSize: wp("2%"),
    fontWeight: "600",
    color: "#fff",
  },
  stockPill: {
    position: "absolute",
    top: wp("2%"),
    right: wp("2%"),
    backgroundColor: "rgba(255,152,0,0.95)",
    paddingHorizontal: wp("2.5%"),
    paddingVertical: hp("0.3%"),
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  stockPillText: {
    fontSize: wp("2.2%"),
    fontWeight: "700",
    color: "#fff",
  },
  oosOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    gap: hp("1%"),
  },
  oosText: {
    fontSize: wp("3.8%"),
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  wishBtn: {
    position: "absolute",
    top: wp("16%"),
    right: wp("2%"),
    width: wp("8%"),
    height: wp("8%"),
    borderRadius: wp("4%"),
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  wishIconShadow: {
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  imageTextOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: wp("3%"),
    paddingBottom: hp("1%"),
    paddingTop: hp("3%"),
  },
  imageTextOverlayList: {
    paddingHorizontal: wp("2.5%"),
    paddingBottom: hp("0.8%"),
  },
  imageBrand: {
    fontSize: wp("2.6%"),
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: hp("0.2%"),
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  imageBrandList: {
    fontSize: wp("2.4%"),
  },
  imageName: {
    fontSize: wp("3.8%"),
    fontWeight: "700",
    color: "#fff",
    lineHeight: wp("5%"),
    marginBottom: hp("0.3%"),
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  imageNameList: {
    fontSize: wp("3.5%"),
    lineHeight: wp("4.5%"),
  },
  imageMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2%"),
  },
  imageTypeText: {
    fontSize: wp("2.5%"),
    fontWeight: "500",
    color: "rgba(255,255,255,0.8)",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // ── Content Section ────────────────────────────────────────────────────
  content: {
    paddingHorizontal: wp("3%"),
    paddingTop: hp("0.8%"),
    paddingBottom: hp("1.2%"),
    backgroundColor: Colors.surface,
  },
  contentList: {
    flex: 1,
    paddingHorizontal: wp("3%"),
    paddingTop: hp("1.2%"),
    paddingBottom: hp("1.2%"),
    justifyContent: "space-between",
  },

  // Specifications
  specRow: {
    flexDirection: "row",
    gap: wp("1.5%"),
    flexWrap: "wrap",
    marginBottom: hp("0.4%"),
  },
  specText: {
    fontSize: wp("2.3%"),
    color: Colors.textSecondary,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: wp("1.5%"),
    paddingVertical: hp("0.1%"),
    borderRadius: wp("1%"),
    fontWeight: "500",
  },

  // Attributes
  attributeRow: {
    flexDirection: "row",
    gap: wp("1.5%"),
    marginBottom: hp("0.4%"),
  },
  attributeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("0.8%"),
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: wp("1.5%"),
    paddingVertical: hp("0.1%"),
    borderRadius: wp("1%"),
  },
  colorDot: {
    width: wp("2%"),
    height: wp("2%"),
    borderRadius: wp("1%"),
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  attributeText: {
    fontSize: wp("2.3%"),
    color: Colors.textSecondary,
    fontWeight: "500",
  },

  // Warranty
  warrantyBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: wp("0.8%"),
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: wp("1.5%"),
    paddingVertical: hp("0.1%"),
    borderRadius: wp("1%"),
    marginBottom: hp("0.4%"),
  },
  warrantyText: {
    fontSize: wp("2.2%"),
    fontWeight: "600",
    color: Colors.primary,
  },

  // ── Price row ──────────────────────────────────────────────────────────
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceInfoList: {
    flex: 1,
  },
  priceMain: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  priceCurrency: {
    fontSize: wp("2.8%"),
    fontWeight: "700",
    color: Colors.textPrimary,
    marginTop: hp("0.4%"),
  },
  priceCurrencyList: {
    fontSize: wp("3%"),
  },
  priceValue: {
    fontSize: wp("4.5%"),
    fontWeight: "800",
    color: Colors.textPrimary,
    lineHeight: wp("5.5%"),
  },
  priceValueList: {
    fontSize: wp("5%"),
  },
  originalPrice: {
    fontSize: wp("2.6%"),
    color: Colors.textMuted,
    textDecorationLine: "line-through",
    marginTop: -hp("0.2%"),
  },
  originalPriceList: {
    fontSize: wp("2.8%"),
  },

  // ADD Button
  addBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: wp("2%"),
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("0.7%"),
    backgroundColor: Colors.white,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  addBtnList: {
    paddingHorizontal: wp("5%"),
    paddingVertical: hp("0.8%"),
  },
  addBtnText: {
    fontSize: wp("3.2%"),
    fontWeight: "800",
    color: Colors.primary,
    letterSpacing: 0.8,
  },
  addBtnTextList: {
    fontSize: wp("3.5%"),
  },

  // Quantity Control
  qtyCtrl: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: wp("2%"),
    paddingHorizontal: wp("3%"),
    paddingVertical: hp("0.7%"),
    gap: wp("2.5%"),
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  qtyCtrlList: {
    paddingHorizontal: wp("3.5%"),
    paddingVertical: hp("0.8%"),
    gap: wp("3%"),
  },
  qtyValue: {
    fontSize: wp("3.5%"),
    fontWeight: "800",
    color: Colors.white,
    minWidth: wp("3.5%"),
    textAlign: "center",
  },
  qtyValueList: {
    fontSize: wp("3.8%"),
    minWidth: wp("4%"),
  },

  disabledBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: wp("2%"),
    paddingHorizontal: wp("3%"),
    paddingVertical: hp("0.7%"),
    backgroundColor: Colors.surfaceAlt,
  },
  disabledBtnList: {
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("0.8%"),
  },
  disabledText: {
    fontSize: wp("2.6%"),
    fontWeight: "600",
    color: Colors.textMuted,
  },
  disabledTextList: {
    fontSize: wp("2.8%"),
  },

  // Min Order Text
  minOrderText: {
    fontSize: wp("2.4%"),
    color: Colors.textMuted,
    fontWeight: "500",
    marginTop: hp("0.5%"),
  },

  maxOrderText: {
    fontSize: wp("2.4%"),
    color: Colors.warning,
    fontWeight: "500",
    marginTop: hp("0.3%"),
  },

  // Compatibility Row (List View)
  compatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("1%"),
    marginTop: hp("0.5%"),
  },
  compatText: {
    fontSize: wp("2.4%"),
    color: Colors.textSecondary,
    flex: 1,
  },

  // ── List View Tag ──────────────────────────────────────────────────────
  listTag: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: wp("1%"),
    paddingHorizontal: wp("2.5%"),
    paddingVertical: hp("0.4%"),
    borderRadius: wp("3%"),
    marginTop: hp("1%"),
  },
  listTagText: {
    fontSize: wp("2.4%"),
    fontWeight: "700",
  },
});

export default ProductCard;
