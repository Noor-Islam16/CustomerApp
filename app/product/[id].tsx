import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Platform,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ProductCard from "../../components/ProductCard";
import Colors from "../../constants/colors";
import {
  Product,
  getProductById,
  getProductsByCategory,
} from "../../constants/products";
import { useCart } from "../../context/CartContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const ProductDetailsScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addToCart, removeFromCart, updateQuantity, getCartQuantity } =
    useCart();
  const insets = useSafeAreaInsets();

  // ── State ──
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<"details" | "specifications">(
    "details",
  );

  // ── Refs ──
  const scrollY = useRef(new Animated.Value(0)).current;
  const imageScrollRef = useRef<ScrollView>(null);

  // ── Load Product ──
  useEffect(() => {
    if (id) {
      const foundProduct = getProductById(id);
      if (foundProduct) {
        setProduct(foundProduct);
        const categoryProducts = getProductsByCategory(foundProduct.category)
          .filter((p) => p.id !== id)
          .slice(0, 6);
        setSimilarProducts(categoryProducts);
      }
      setLoading(false);
    }
  }, [id]);

  // ── Sync local quantity with cart whenever cart changes ──
  const currentCartQuantity = product ? getCartQuantity(product.id) : 0;
  const isInCart = currentCartQuantity > 0;

  useEffect(() => {
    if (isInCart) {
      // Keep local quantity in sync with what's actually in the cart
      setQuantity(currentCartQuantity);
    }
  }, [currentCartQuantity, isInCart]);

  // ── Handlers ──
  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product, quantity);
    Alert.alert("Added to Cart", `${product.name} added to your cart!`);
  };

  const handleGoToCart = () => {
    router.push("/cart");
  };

  const handleBuyNow = () => {
    if (!product) return;
    if (!isInCart) addToCart(product, quantity);
    router.push("/cart");
  };

  const handleRemoveFromCart = () => {
    if (!product) return;
    Alert.alert("Remove from Cart", `Remove ${product.name} from your cart?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          removeFromCart(product.id);
          setQuantity(1); // reset local quantity
        },
      },
    ]);
  };

  /**
   * Quantity change handler.
   * - If item is already in cart  → directly update cart quantity (live sync).
   * - If item is NOT in cart yet  → just update local state so the user can
   *   pick how many they want before pressing "Add to Cart".
   */
  const handleQuantityChange = (change: number) => {
    if (!product) return;

    if (isInCart) {
      const next = Math.max(
        1,
        Math.min(product.stock, currentCartQuantity + change),
      );
      updateQuantity(product.id, next);
      // local quantity stays in sync via the useEffect above
    } else {
      setQuantity((prev) =>
        Math.max(1, Math.min(product.stock, prev + change)),
      );
    }
  };

  // ── Header Animation ──
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const headerTitleOpacity = scrollY.interpolate({
    inputRange: [100, 200],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  if (loading || !product) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const isOutOfStock = !product.inStock;
  const discount = product.discount || 0;
  const hasDiscount = discount > 0;

  // Which quantity value to display in the selector
  const displayQuantity = isInCart ? currentCartQuantity : quantity;

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* ── Animated Header ── */}
      <Animated.View
        style={[
          styles.animatedHeader,
          {
            opacity: headerOpacity,
            paddingTop: Platform.OS === "ios" ? hp("6%") : hp("6%"),
          },
        ]}
      >
        <LinearGradient
          colors={[Colors.white, Colors.white]}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
            >
              <Ionicons
                name="arrow-back"
                size={wp("5.5%")}
                color={Colors.textPrimary}
              />
            </TouchableOpacity>
            <Animated.Text
              style={[styles.animatedTitle, { opacity: headerTitleOpacity }]}
              numberOfLines={1}
            >
              {product.name}
            </Animated.Text>
            <TouchableOpacity
              style={styles.headerIcon}
              onPress={() => router.push("/cart")}
            >
              <Feather
                name="shopping-cart"
                size={wp("5%")}
                color={Colors.textPrimary}
              />
              {currentCartQuantity > 0 && (
                <View style={styles.headerCartBadge}>
                  <Text style={styles.headerCartBadgeText}>
                    {currentCartQuantity}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* ── Back Button Overlay ── */}
      <TouchableOpacity
        style={[
          styles.floatingBackBtn,
          { top: Platform.OS === "ios" ? hp("6%") : hp("6%") },
        ]}
        onPress={() => router.back()}
      >
        <Ionicons
          name="arrow-back"
          size={wp("5.5%")}
          color={Colors.textPrimary}
        />
      </TouchableOpacity>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: Platform.OS === "ios" ? hp("6%") : hp("6%"),
          paddingBottom: hp("15%"),
        }}
      >
        {/* Image Carousel */}
        <View style={styles.imageCarousel}>
          <ScrollView
            ref={imageScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(
                e.nativeEvent.contentOffset.x / SCREEN_WIDTH,
              );
              setCurrentImageIndex(index);
            }}
          >
            {product.images.map((image, index) => (
              <Image
                key={index}
                source={{ uri: image }}
                style={styles.productImage}
                resizeMode="cover"
              />
            ))}
          </ScrollView>

          <View style={styles.imageIndicators}>
            {product.images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  currentImageIndex === index && styles.indicatorActive,
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.infoContainer}>
          {product.brand && <Text style={styles.brand}>{product.brand}</Text>}
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.unit}>{product.weight || product.unit}</Text>

          <View style={styles.ratingRow}>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingValue}>{product.rating}</Text>
              <Feather name="star" size={wp("3%")} color="#fff" />
            </View>
            <Text style={styles.ratingCount}>
              {product.reviewCount?.toLocaleString("en-IN")} ratings
            </Text>
            {product.fastMoving && (
              <View style={styles.fastMovingBadge}>
                <MaterialCommunityIcons
                  name="fire"
                  size={wp("3.5%")}
                  color="#FF6B00"
                />
                <Text style={styles.fastMovingText}>Fast Moving</Text>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.priceSection}>
            <View>
              <View style={styles.priceMain}>
                <Text style={styles.currency}>₹</Text>
                <Text style={styles.price}>{product.price}</Text>
                {hasDiscount && (
                  <View style={styles.discountBadgeInline}>
                    <Text style={styles.discountTextInline}>
                      {discount}% OFF
                    </Text>
                  </View>
                )}
              </View>
              {hasDiscount && product.originalPrice && (
                <Text style={styles.originalPrice}>
                  MRP: ₹{product.originalPrice}
                </Text>
              )}
            </View>
            <View style={styles.stockInfo}>
              <View
                style={[
                  styles.stockDot,
                  {
                    backgroundColor: isOutOfStock
                      ? Colors.error
                      : Colors.success,
                  },
                ]}
              />
              <Text
                style={[
                  styles.stockText,
                  { color: isOutOfStock ? Colors.error : Colors.success },
                ]}
              >
                {isOutOfStock
                  ? "Out of Stock"
                  : `In Stock (${product.stock} available)`}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {!isOutOfStock && (
            <View style={styles.quantitySection}>
              <Text style={styles.quantityLabel}>Quantity</Text>
              <View style={styles.quantitySelector}>
                <TouchableOpacity
                  style={[
                    styles.qtyBtn,
                    displayQuantity <= 1 && styles.qtyBtnDisabled,
                  ]}
                  onPress={() => handleQuantityChange(-1)}
                  disabled={displayQuantity <= 1}
                >
                  <Feather
                    name="minus"
                    size={wp("4.5%")}
                    color={Colors.primary}
                  />
                </TouchableOpacity>
                <Text style={styles.quantityValue}>{displayQuantity}</Text>
                <TouchableOpacity
                  style={[
                    styles.qtyBtn,
                    displayQuantity >= product.stock && styles.qtyBtnDisabled,
                  ]}
                  onPress={() => handleQuantityChange(1)}
                  disabled={displayQuantity >= product.stock}
                >
                  <Feather
                    name="plus"
                    size={wp("4.5%")}
                    color={Colors.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "details" && styles.tabActive]}
              onPress={() => setActiveTab("details")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "details" && styles.tabTextActive,
                ]}
              >
                Details
              </Text>
              {activeTab === "details" && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "specifications" && styles.tabActive,
              ]}
              onPress={() => setActiveTab("specifications")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "specifications" && styles.tabTextActive,
                ]}
              >
                Specifications
              </Text>
              {activeTab === "specifications" && (
                <View style={styles.tabIndicator} />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.tabContent}>
            {activeTab === "details" ? (
              <Text style={styles.description}>{product.description}</Text>
            ) : (
              <View style={styles.specsContainer}>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Brand</Text>
                  <Text style={styles.specValue}>{product.brand || "N/A"}</Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Category</Text>
                  <Text style={styles.specValue}>{product.category}</Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Sub Category</Text>
                  <Text style={styles.specValue}>
                    {product.subCategory || "N/A"}
                  </Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Unit</Text>
                  <Text style={styles.specValue}>{product.unit}</Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Weight</Text>
                  <Text style={styles.specValue}>
                    {product.weight || "N/A"}
                  </Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Min Order Qty</Text>
                  <Text style={styles.specValue}>
                    {product.minOrderQty || 1}
                  </Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Tags</Text>
                  <View style={styles.specTags}>
                    {product.tags.map((tag, index) => (
                      <View key={index} style={styles.specTag}>
                        <Text style={styles.specTagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          {similarProducts.length > 0 && (
            <View style={styles.similarSection}>
              <View style={styles.similarHeader}>
                <Text style={styles.similarTitle}>Similar Products</Text>
                <TouchableOpacity onPress={() => router.push("/products")}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.similarScroll}
              >
                {similarProducts.map((item) => (
                  <View key={item.id} style={styles.similarCard}>
                    <ProductCard product={item} />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {/* Bottom Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom }]}>
        <LinearGradient
          colors={["rgba(255,255,255,0.95)", Colors.white]}
          style={styles.bottomBarGradient}
        >
          {isOutOfStock ? (
            <View style={styles.outOfStockBtn}>
              <Text style={styles.outOfStockBtnText}>Out of Stock</Text>
            </View>
          ) : (
            <>
              {isInCart ? (
                /* ── Go to Cart + Delete + Buy Now row ── */
                <View style={styles.goToCartRow}>
                  {/* Delete / remove button */}
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={handleRemoveFromCart}
                    activeOpacity={0.8}
                  >
                    <Feather
                      name="trash-2"
                      size={wp("5%")}
                      color={Colors.error}
                    />
                  </TouchableOpacity>

                  {/* Go to Cart */}
                  <TouchableOpacity
                    style={styles.goToCartBtn}
                    onPress={handleGoToCart}
                    activeOpacity={0.9}
                  >
                    <Feather
                      name="shopping-cart"
                      size={wp("5%")}
                      color={Colors.white}
                    />
                    <Text style={styles.goToCartText}>Go to Cart</Text>
                    <View style={styles.cartBadgeGoToCart}>
                      <Text style={styles.cartBadgeTextGoToCart}>
                        {currentCartQuantity}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Buy Now */}
                  <TouchableOpacity
                    style={styles.buyNowBtn}
                    onPress={handleBuyNow}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={[Colors.primary, Colors.primaryDark]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.buyNowGradient}
                    >
                      <MaterialCommunityIcons
                        name="lightning-bolt"
                        size={wp("5%")}
                        color="#FFD700"
                      />
                      <Text style={styles.buyNowText}>Buy Now</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
                /* ── Add to Cart + Buy Now row ── */
                <>
                  <TouchableOpacity
                    style={styles.addToCartBtn}
                    onPress={handleAddToCart}
                    activeOpacity={0.9}
                  >
                    <Feather
                      name="shopping-cart"
                      size={wp("5%")}
                      color={Colors.primary}
                    />
                    <Text style={styles.addToCartText}>Add to Cart</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.buyNowBtn}
                    onPress={handleBuyNow}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={[Colors.primary, Colors.primaryDark]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.buyNowGradient}
                    >
                      <MaterialCommunityIcons
                        name="lightning-bolt"
                        size={wp("5%")}
                        color="#FFD700"
                      />
                      <Text style={styles.buyNowText}>Buy Now</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </LinearGradient>
      </View>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
  },

  // ── Header ──
  animatedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: Colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerGradient: {
    paddingBottom: hp("1.5%"),
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: wp("4%"),
  },
  backBtn: {
    width: wp("10%"),
    height: wp("10%"),
    borderRadius: wp("5%"),
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  animatedTitle: {
    flex: 1,
    fontSize: wp("4%"),
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
    marginHorizontal: wp("2%"),
  },
  headerIcon: {
    width: wp("10%"),
    height: wp("10%"),
    borderRadius: wp("5%"),
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  floatingBackBtn: {
    position: "absolute",
    left: wp("4%"),
    zIndex: 20,
    width: wp("10%"),
    height: wp("10%"),
    borderRadius: wp("5%"),
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },

  // ── Image Carousel ──
  imageCarousel: {
    position: "relative",
  },
  productImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: Colors.surfaceAlt,
  },
  imageIndicators: {
    position: "absolute",
    bottom: wp("4%"),
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: wp("2%"),
  },
  indicator: {
    width: wp("2%"),
    height: wp("2%"),
    borderRadius: wp("1%"),
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  indicatorActive: {
    backgroundColor: Colors.primary,
    width: wp("6%"),
  },

  // ── Product Info ──
  infoContainer: {
    paddingHorizontal: wp("4%"),
    paddingTop: hp("2%"),
  },
  brand: {
    fontSize: wp("3.2%"),
    fontWeight: "600",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: hp("0.5%"),
  },
  name: {
    fontSize: wp("5.5%"),
    fontWeight: "800",
    color: Colors.textPrimary,
    lineHeight: wp("7%"),
    marginBottom: hp("0.5%"),
  },
  unit: {
    fontSize: wp("3.5%"),
    color: Colors.textSecondary,
    marginBottom: hp("1.2%"),
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2%"),
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("0.8%"),
    backgroundColor: "#2E7D32",
    paddingHorizontal: wp("2.5%"),
    paddingVertical: hp("0.4%"),
    borderRadius: wp("1.5%"),
  },
  ratingValue: {
    fontSize: wp("3.5%"),
    fontWeight: "700",
    color: Colors.white,
  },
  ratingCount: {
    fontSize: wp("3.2%"),
    color: Colors.textMuted,
  },
  fastMovingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("1%"),
    backgroundColor: "#FFF3E0",
    paddingHorizontal: wp("2.5%"),
    paddingVertical: hp("0.4%"),
    borderRadius: wp("3%"),
    marginLeft: "auto",
  },
  fastMovingText: {
    fontSize: wp("2.8%"),
    fontWeight: "600",
    color: "#E65100",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: hp("2%"),
  },

  headerCartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: Colors.primary,
    minWidth: wp("4.5%"),
    height: wp("4.5%"),
    borderRadius: wp("2.25%"),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.white,
  },
  headerCartBadgeText: {
    fontSize: wp("2.2%"),
    fontWeight: "800",
    color: Colors.white,
  },

  // ── Price Section ──
  priceSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2%"),
  },
  currency: {
    fontSize: wp("4%"),
    fontWeight: "700",
    color: Colors.textPrimary,
    marginTop: hp("0.8%"),
  },
  price: {
    fontSize: wp("7%"),
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  discountBadgeInline: {
    backgroundColor: "#14803C",
    paddingHorizontal: wp("2.5%"),
    paddingVertical: hp("0.3%"),
    borderRadius: wp("1.5%"),
  },
  discountTextInline: {
    fontSize: wp("3%"),
    fontWeight: "800",
    color: Colors.white,
  },
  originalPrice: {
    fontSize: wp("3.2%"),
    color: Colors.textMuted,
    textDecorationLine: "line-through",
    marginTop: hp("0.3%"),
  },
  stockInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("1.5%"),
  },
  stockDot: {
    width: wp("2%"),
    height: wp("2%"),
    borderRadius: wp("1%"),
  },
  stockText: {
    fontSize: wp("3.2%"),
    fontWeight: "600",
  },

  // ── Quantity Selector ──
  quantitySection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: hp("2%"),
  },
  quantityLabel: {
    fontSize: wp("3.8%"),
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  quantitySelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("4%"),
    backgroundColor: Colors.surfaceAlt,
    borderRadius: wp("3%"),
    paddingHorizontal: wp("3%"),
    paddingVertical: hp("0.8%"),
  },
  qtyBtn: {
    width: wp("8%"),
    height: wp("8%"),
    borderRadius: wp("4%"),
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  qtyBtnDisabled: {
    opacity: 0.5,
  },
  quantityValue: {
    fontSize: wp("4%"),
    fontWeight: "700",
    color: Colors.textPrimary,
    minWidth: wp("6%"),
    textAlign: "center",
  },

  // ── Tabs ──
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: hp("1.5%"),
    position: "relative",
  },
  tabActive: {},
  tabText: {
    fontSize: wp("3.8%"),
    fontWeight: "500",
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: "700",
  },
  tabIndicator: {
    position: "absolute",
    bottom: -1,
    width: wp("10%"),
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 1.5,
  },
  tabContent: {
    paddingVertical: hp("2%"),
  },
  description: {
    fontSize: wp("3.5%"),
    color: Colors.textSecondary,
    lineHeight: wp("5.5%"),
  },

  // ── Specifications ──
  specsContainer: {
    gap: hp("1.5%"),
  },
  specRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  specLabel: {
    width: wp("30%"),
    fontSize: wp("3.5%"),
    fontWeight: "500",
    color: Colors.textMuted,
  },
  specValue: {
    flex: 1,
    fontSize: wp("3.5%"),
    color: Colors.textPrimary,
  },
  specTags: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: wp("1.5%"),
  },
  specTag: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: wp("2.5%"),
    paddingVertical: hp("0.4%"),
    borderRadius: wp("3%"),
  },
  specTagText: {
    fontSize: wp("2.8%"),
    color: Colors.primary,
    fontWeight: "600",
  },

  // ── Similar Products ──
  similarSection: {
    marginTop: hp("1%"),
  },
  similarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: hp("1.5%"),
  },
  similarTitle: {
    fontSize: wp("4.2%"),
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  viewAllText: {
    fontSize: wp("3.5%"),
    fontWeight: "600",
    color: Colors.primary,
  },
  similarScroll: {
    gap: wp("3%"),
    paddingRight: wp("4%"),
  },
  similarCard: {
    width: wp("42%"),
  },

  // ── Bottom Bar ──
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
    gap: wp("3%"),
    paddingHorizontal: wp("4%"),
    paddingTop: hp("1.5%"),
  },
  addToCartBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp("2%"),
    backgroundColor: Colors.primaryLight,
    borderRadius: wp("3%"),
    paddingVertical: hp("1.6%"),
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  addToCartText: {
    fontSize: wp("3.8%"),
    fontWeight: "700",
    color: Colors.primary,
  },
  goToCartRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2.5%"),
  },
  deleteBtn: {
    width: wp("11%"),
    height: wp("11%"),
    borderRadius: wp("3%"),
    backgroundColor: "#FFF0F0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFCDD2",
  },
  goToCartBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp("2%"),
    backgroundColor: Colors.primary,
    borderRadius: wp("3%"),
    paddingVertical: hp("1.6%"),
    position: "relative",
  },
  goToCartText: {
    fontSize: wp("3.8%"),
    fontWeight: "700",
    color: Colors.white,
  },
  cartBadgeGoToCart: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: Colors.white,
    minWidth: wp("5%"),
    height: wp("5%"),
    borderRadius: wp("2.5%"),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp("1%"),
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  cartBadgeTextGoToCart: {
    fontSize: wp("2.5%"),
    fontWeight: "800",
    color: Colors.primary,
  },
  buyNowBtn: {
    flex: 1,
    borderRadius: wp("3%"),
    overflow: "hidden",
  },
  buyNowGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp("2%"),
    paddingVertical: hp("1.6%"),
  },
  buyNowText: {
    fontSize: wp("3.8%"),
    fontWeight: "800",
    color: Colors.white,
  },
  outOfStockBtn: {
    flex: 1,
    backgroundColor: Colors.border,
    borderRadius: wp("3%"),
    paddingVertical: hp("1.6%"),
    alignItems: "center",
  },
  outOfStockBtnText: {
    fontSize: wp("3.8%"),
    fontWeight: "700",
    color: Colors.textMuted,
  },
});

export default ProductDetailsScreen;
