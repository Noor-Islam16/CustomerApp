// components/ProductCard.tsx
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  Text,
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

const TAG_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  "Limited Stock": { bg: "#FFF3E0", text: "#C75B00", dot: "#FFA000" },
  "Fast Moving": { bg: "#E8F5E9", text: "#2E7D32", dot: "#43A047" },
  "Best Seller": { bg: "#FFF0F0", text: "#C62828", dot: "#EF5350" },
  Premium: { bg: "#FFF8E1", text: "#E65100", dot: "#FFA000" },
  Organic: { bg: "#E8F5E9", text: "#2E7D32", dot: "#66BB6A" },
  Imported: { bg: "#E3F2FD", text: "#1565C0", dot: "#42A5F5" },
  "New Arrival": { bg: "#E8EAF6", text: "#283593", dot: "#5C6BC0" },
  "Special Offer": { bg: "#FCE4EC", text: "#AD1457", dot: "#EC407A" },
  Trending: { bg: "#E0F7FA", text: "#006064", dot: "#00ACC1" },
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
  const discount = product.discount || 0;
  const hasDiscount = discount > 0;
  const primaryTag = product.tags?.[0];
  const tagConfig = primaryTag ? TAG_CONFIG[primaryTag] : null;

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
    addToCart(product, 1);
  };

  const handleRemove = () => {
    if (quantity > 0) {
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
            <Image
              source={{ uri: product.images[0] }}
              style={styles.image}
              resizeMode="cover"
            />

            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.7)", "rgba(0,0,0,0.85)"]}
              style={styles.imageOverlay}
            />

            {hasDiscount && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{discount}% OFF</Text>
              </View>
            )}

            {!hideTags && tagConfig && (
              <View
                style={[styles.imageTag, { backgroundColor: tagConfig.bg }]}
              >
                <View
                  style={[styles.tagDot, { backgroundColor: tagConfig.dot }]}
                />
                <Text style={[styles.imageTagText, { color: tagConfig.text }]}>
                  {primaryTag}
                </Text>
              </View>
            )}

            {!isOutOfStock && product.stock <= 10 && product.stock > 0 && (
              <View style={styles.stockPill}>
                <Text style={styles.stockPillText}>
                  Only {product.stock} left
                </Text>
              </View>
            )}

            {isOutOfStock && (
              <View style={styles.oosOverlay}>
                <Text style={styles.oosText}>Out of Stock</Text>
              </View>
            )}

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

            <View
              style={[
                styles.imageTextOverlay,
                isList && styles.imageTextOverlayList,
              ]}
            >
              {product.brand && (
                <Text
                  style={[styles.imageBrand, isList && styles.imageBrandList]}
                  numberOfLines={1}
                >
                  {product.brand}
                </Text>
              )}
              <Text
                style={[styles.imageName, isList && styles.imageNameList]}
                numberOfLines={2}
              >
                {product.name}
              </Text>
              <Text
                style={[styles.imageUnit, isList && styles.imageUnitList]}
                numberOfLines={1}
              >
                {product.weight || product.unit}
              </Text>
            </View>
          </View>

          {/* ── Content Section ── */}
          <View style={[styles.content, isList && styles.contentList]}>
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
                    {product.price}
                  </Text>
                </View>
                {hasDiscount && product.originalPrice && (
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
                  >
                    <Feather
                      name="plus"
                      size={isList ? wp("3.8%") : wp("3.5%")}
                      color={Colors.white}
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

            {product.rating ? (
              <View style={styles.ratingRow}>
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingVal}>{product.rating}</Text>
                  <Feather name="star" size={wp("2.5%")} color="#fff" />
                </View>
                <Text style={styles.reviewCount}>
                  {product.reviewCount?.toLocaleString("en-IN")} ratings
                </Text>
              </View>
            ) : null}

            {isList && !hideTags && tagConfig && (
              <View style={[styles.listTag, { backgroundColor: tagConfig.bg }]}>
                <View
                  style={[styles.tagDot, { backgroundColor: tagConfig.dot }]}
                />
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
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
  },
  discountBadge: {
    position: "absolute",
    top: wp("2%"),
    left: wp("2%"),
    backgroundColor: "#14803C",
    paddingHorizontal: wp("2.5%"),
    paddingVertical: hp("0.4%"),
    borderRadius: wp("1.5%"),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  discountText: {
    fontSize: wp("2.6%"),
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
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
  tagDot: {
    width: wp("1.5%"),
    height: wp("1.5%"),
    borderRadius: wp("0.75%"),
  },
  imageTagText: {
    fontSize: wp("2.4%"),
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  stockPill: {
    position: "absolute",
    top: wp("2%"),
    right: wp("2%"),
    backgroundColor: "rgba(255,243,224,0.95)",
    borderWidth: 1,
    borderColor: "rgba(255,160,0,0.5)",
    paddingHorizontal: wp("2.5%"),
    paddingVertical: hp("0.3%"),
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  stockPillText: {
    fontSize: wp("2.2%"),
    fontWeight: "700",
    color: "#C75B00",
  },
  oosOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  oosText: {
    fontSize: wp("3.8%"),
    fontWeight: "800",
    color: "#fff",
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("0.8%"),
    borderRadius: wp("2%"),
    overflow: "hidden",
    letterSpacing: 0.5,
  },
  wishBtn: {
    position: "absolute",
    top: wp("2%"),
    right: wp("2%"),
    width: wp("8%"),
    height: wp("8%"),
    borderRadius: wp("4%"),
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(4px)",
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
    paddingTop: hp("2%"),
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
  imageUnit: {
    fontSize: wp("2.8%"),
    fontWeight: "500",
    color: "rgba(255,255,255,0.85)",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  imageUnitList: {
    fontSize: wp("2.5%"),
  },

  // ── Content Section ────────────────────────────────────────────────────
  content: {
    paddingHorizontal: wp("3%"),
    paddingTop: hp("1%"),
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

  // ── Rating ─────────────────────────────────────────────────────────────
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("1.5%"),
    marginTop: hp("0.8%"),
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("0.6%"),
    backgroundColor: "#2E7D32",
    paddingHorizontal: wp("1.8%"),
    paddingVertical: hp("0.2%"),
    borderRadius: wp("1%"),
  },
  ratingVal: {
    fontSize: wp("2.6%"),
    fontWeight: "700",
    color: "#fff",
  },
  reviewCount: {
    fontSize: wp("2.4%"),
    color: Colors.textMuted,
    fontWeight: "500",
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
