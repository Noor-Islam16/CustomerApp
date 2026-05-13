// app/product/[id].tsx
import { Text } from "@/context/FontContext";
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
import { Product } from "../../constants/products";
import { useCart } from "../../context/CartContext";
import { ApiProduct, fetchProducts } from "../services/productApi";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
// const BASE_URL = "https://customer-7bcb.onrender.com";
export const BASE_URL = "http://10.64.32.75:5000";

// Map API product to app Product format
const mapApiProductToAppProduct = (apiProduct: ApiProduct): Product => {
  return {
    id: apiProduct._id,
    name: apiProduct.name,
    brand: apiProduct.brand || "",
    category: apiProduct.category,
    subCategory: apiProduct.subCategory || "",
    type: apiProduct.type || "",
    compatibility: apiProduct.compatibility || [],
    sellingPrice: apiProduct.sellingPrice,
    originalPrice: apiProduct.originalPrice || apiProduct.sellingPrice * 1.2,
    color: apiProduct.color || "",
    material: apiProduct.material || "",
    dimensions: apiProduct.dimensions || "",
    weight: apiProduct.weight || "",
    warranty: apiProduct.warranty || "No Warranty",
    stockQuantity: apiProduct.stockQuantity,
    minOrderQuantity: apiProduct.minOrderQuantity,
    description: apiProduct.description || "",
    images: apiProduct.images || [],
    specifications: apiProduct.specifications || {},
    tags: apiProduct.tags || [],
    inStock: apiProduct.stockQuantity > 0,
    isFastMoving: apiProduct.isFastMoving || false,
    isFeatured: apiProduct.isFeatured || false,
  };
};

const ProductDetailsScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addToCart, removeFromCart, updateQuantity, getCartQuantity } =
    useCart();
  const insets = useSafeAreaInsets();

  // ── State ──
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<"details" | "specifications">(
    "details",
  );
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  // ── Refs ──
  const scrollY = useRef(new Animated.Value(0)).current;
  const imageScrollRef = useRef<ScrollView>(null);

  // ── Fetch Product from API ──
  useEffect(() => {
    const fetchProductDetails = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        console.log("📡 Fetching electronics product:", id);

        const response = await fetch(`${BASE_URL}/api/products/${id}`);
        const data = await response.json();

        if (!data.success || !data.data) {
          throw new Error(data.message || "Product not found");
        }

        const apiProduct = data.data;
        const mappedProduct = mapApiProductToAppProduct(apiProduct);
        setProduct(mappedProduct);
        console.log("✅ Product loaded:", mappedProduct.name);

        // Fetch similar products from same category
        try {
          const similarData = await fetchProducts({
            category: apiProduct.category,
            limit: 6,
          });

          const filtered = similarData
            .filter((p) => p._id !== id)
            .map(mapApiProductToAppProduct)
            .slice(0, 6);

          setSimilarProducts(filtered);
        } catch (similarError) {
          console.error("Failed to fetch similar products:", similarError);
        }
      } catch (err: any) {
        console.error("❌ Error fetching product:", err);
        setError(err.message || "Failed to load product");
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [id]);

  // ── Sync local quantity with cart ──
  const currentCartQuantity = product ? getCartQuantity(product.id) : 0;
  const isInCart = currentCartQuantity > 0;

  useEffect(() => {
    if (isInCart) {
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
          setQuantity(1);
        },
      },
    ]);
  };

  const handleQuantityChange = (change: number) => {
    if (!product) return;

    if (isInCart) {
      const next = Math.max(
        1,
        Math.min(product.stockQuantity, currentCartQuantity + change),
      );
      updateQuantity(product.id, next);
    } else {
      setQuantity((prev) =>
        Math.max(1, Math.min(product.stockQuantity, prev + change)),
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

  // ── Loading State ──
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading product...</Text>
      </View>
    );
  }

  // ── Error State ──
  if (error || !product) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />
        <MaterialCommunityIcons
          name="devices"
          size={wp("20%")}
          color={Colors.textMuted}
        />
        <Text style={styles.errorText}>{error || "Product not found"}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOutOfStock = !product.inStock;
  const hasDiscount =
    product.originalPrice > 0 && product.sellingPrice < product.originalPrice;
  const discountPercentage = hasDiscount
    ? Math.round(
        ((product.originalPrice - product.sellingPrice) /
          product.originalPrice) *
          100,
      )
    : 0;

  const displayQuantity = isInCart ? currentCartQuantity : quantity;

  // Create image array from product images
  const productImages =
    product.images && product.images.length > 0
      ? product.images.map((img) => img.url)
      : ["https://via.placeholder.com/300"];

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
            {productImages.map((image, index) => (
              <View key={index} style={styles.imageContainer}>
                {imageErrors.has(index) ? (
                  <View style={styles.imagePlaceholder}>
                    <MaterialCommunityIcons
                      name="devices"
                      size={wp("20%")}
                      color={Colors.border}
                    />
                  </View>
                ) : (
                  <Image
                    source={{ uri: image }}
                    style={styles.productImage}
                    resizeMode="cover"
                    onError={() =>
                      setImageErrors((prev) => new Set(prev).add(index))
                    }
                  />
                )}
              </View>
            ))}
          </ScrollView>

          {/* Image indicators */}
          {productImages.length > 1 && (
            <View style={styles.imageIndicators}>
              {productImages.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    currentImageIndex === index && styles.indicatorActive,
                  ]}
                />
              ))}
            </View>
          )}

          {/* Image count badge */}
          {productImages.length > 1 && (
            <View style={styles.imageCountBadge}>
              <Text style={styles.imageCountText}>
                {currentImageIndex + 1}/{productImages.length}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.infoContainer}>
          {/* Brand & Category */}
          <View style={styles.metaRow}>
            {product.brand ? (
              <Text style={styles.brand}>{product.brand}</Text>
            ) : null}
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {product.subCategory || product.category}
              </Text>
            </View>
          </View>

          {/* Product Name */}
          <Text style={styles.name}>{product.name}</Text>

          {/* Type & Compatibility */}
          <View style={styles.quickInfoRow}>
            {product.type && (
              <View style={styles.quickInfoChip}>
                <Feather name="tag" size={wp("3%")} color={Colors.primary} />
                <Text style={styles.quickInfoText}>{product.type}</Text>
              </View>
            )}
            {product.compatibility && product.compatibility.length > 0 && (
              <View style={styles.quickInfoChip}>
                <Feather
                  name="smartphone"
                  size={wp("3%")}
                  color={Colors.primary}
                />
                <Text style={styles.quickInfoText}>
                  {product.compatibility.slice(0, 2).join(", ")}
                  {product.compatibility.length > 2
                    ? ` +${product.compatibility.length - 2}`
                    : ""}
                </Text>
              </View>
            )}
            {product.warranty && product.warranty !== "No Warranty" && (
              <View style={styles.quickInfoChip}>
                <Feather name="shield" size={wp("3%")} color={Colors.success} />
                <Text style={styles.quickInfoText}>{product.warranty}</Text>
              </View>
            )}
          </View>

          {/* Fast Moving & Featured Badges */}
          <View style={styles.badgesRow}>
            {product.isFastMoving && (
              <View style={styles.fastMovingBadge}>
                <MaterialCommunityIcons
                  name="fire"
                  size={wp("3.5%")}
                  color="#FF6B00"
                />
                <Text style={styles.fastMovingText}>Fast Moving</Text>
              </View>
            )}
            {product.isFeatured && (
              <View style={styles.featuredBadge}>
                <Feather name="star" size={wp("3.2%")} color="#F9A825" />
                <Text style={styles.featuredText}>Featured</Text>
              </View>
            )}
          </View>

          {/* Color & Material */}
          {(product.color ||
            product.material ||
            product.dimensions ||
            product.weight) && (
            <View style={styles.attributesRow}>
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
                              ? "#ddd"
                              : product.color.toLowerCase() === "silver"
                                ? "#C0C0C0"
                                : product.color.toLowerCase() === "gold"
                                  ? "#FFD700"
                                  : product.color.toLowerCase() === "rose gold"
                                    ? "#B76E79"
                                    : product.color.toLowerCase() === "blue"
                                      ? "#2196F3"
                                      : product.color.toLowerCase() === "red"
                                        ? "#F44336"
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
                    size={wp("2.8%")}
                    color={Colors.textMuted}
                  />
                  <Text style={styles.attributeText}>{product.material}</Text>
                </View>
              )}
              {product.dimensions && (
                <View style={styles.attributeChip}>
                  <Feather
                    name="maximize"
                    size={wp("2.8%")}
                    color={Colors.textMuted}
                  />
                  <Text style={styles.attributeText}>{product.dimensions}</Text>
                </View>
              )}
              {product.weight && (
                <View style={styles.attributeChip}>
                  <Feather
                    name="package"
                    size={wp("2.8%")}
                    color={Colors.textMuted}
                  />
                  <Text style={styles.attributeText}>{product.weight}</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.divider} />

          {/* Price Section */}
          <View style={styles.priceSection}>
            <View>
              <View style={styles.priceMain}>
                <Text style={styles.currency}>₹</Text>
                <Text style={styles.price}>{product.sellingPrice}</Text>
                {hasDiscount && (
                  <View style={styles.discountBadgeInline}>
                    <Text style={styles.discountTextInline}>
                      {discountPercentage}% OFF
                    </Text>
                  </View>
                )}
              </View>
              {hasDiscount && (
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
                  : `In Stock (${product.stockQuantity} available)`}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Quantity Selector */}
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
                    displayQuantity >= product.stockQuantity &&
                      styles.qtyBtnDisabled,
                  ]}
                  onPress={() => handleQuantityChange(1)}
                  disabled={displayQuantity >= product.stockQuantity}
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

          {/* Tabs */}
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

          {/* Tab Content */}
          <View style={styles.tabContent}>
            {activeTab === "details" ? (
              <View>
                <Text style={styles.description}>
                  {product.description || "No description available."}
                </Text>

                {/* Tags */}
                {product.tags.length > 0 && (
                  <View style={styles.tagsSection}>
                    <Text style={styles.tagsTitle}>Product Tags</Text>
                    <View style={styles.tagsContainer}>
                      {product.tags.map((tag, index) => (
                        <View key={index} style={styles.tagChip}>
                          <Text style={styles.tagChipText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.specsContainer}>
                {/* Technical Specifications */}
                {product.specifications &&
                  Object.keys(product.specifications).length > 0 && (
                    <>
                      <Text style={styles.specSectionTitle}>
                        Technical Specifications
                      </Text>
                      {Object.entries(product.specifications).map(
                        ([key, value]) => (
                          <View key={key} style={styles.specRow}>
                            <Text style={styles.specLabel}>{key}</Text>
                            <Text style={styles.specValue}>{value}</Text>
                          </View>
                        ),
                      )}
                      <View style={styles.specDivider} />
                    </>
                  )}

                {/* General Info */}
                <Text style={styles.specSectionTitle}>Product Information</Text>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Brand</Text>
                  <Text style={styles.specValue}>{product.brand || "N/A"}</Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Category</Text>
                  <Text style={styles.specValue}>{product.category}</Text>
                </View>
                {product.subCategory && (
                  <View style={styles.specRow}>
                    <Text style={styles.specLabel}>Sub Category</Text>
                    <Text style={styles.specValue}>{product.subCategory}</Text>
                  </View>
                )}
                {product.type && (
                  <View style={styles.specRow}>
                    <Text style={styles.specLabel}>Type</Text>
                    <Text style={styles.specValue}>{product.type}</Text>
                  </View>
                )}
                {product.color && (
                  <View style={styles.specRow}>
                    <Text style={styles.specLabel}>Color</Text>
                    <Text style={styles.specValue}>{product.color}</Text>
                  </View>
                )}
                {product.material && (
                  <View style={styles.specRow}>
                    <Text style={styles.specLabel}>Material</Text>
                    <Text style={styles.specValue}>{product.material}</Text>
                  </View>
                )}
                {product.dimensions && (
                  <View style={styles.specRow}>
                    <Text style={styles.specLabel}>Dimensions</Text>
                    <Text style={styles.specValue}>{product.dimensions}</Text>
                  </View>
                )}
                {product.weight && (
                  <View style={styles.specRow}>
                    <Text style={styles.specLabel}>Weight</Text>
                    <Text style={styles.specValue}>{product.weight}</Text>
                  </View>
                )}
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Warranty</Text>
                  <Text style={styles.specValue}>
                    {product.warranty || "No Warranty"}
                  </Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Min Order Qty</Text>
                  <Text style={styles.specValue}>
                    {product.minOrderQuantity}
                  </Text>
                </View>

                {/* Compatibility */}
                {product.compatibility && product.compatibility.length > 0 && (
                  <>
                    <View style={styles.specDivider} />
                    <Text style={styles.specSectionTitle}>Compatibility</Text>
                    <View style={styles.compatContainer}>
                      {product.compatibility.map((comp, index) => (
                        <View key={index} style={styles.compatChip}>
                          <Feather
                            name="smartphone"
                            size={wp("3%")}
                            color={Colors.primary}
                          />
                          <Text style={styles.compatChipText}>{comp}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </View>
            )}
          </View>

          <View style={styles.divider} />

          {/* Similar Products */}
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
                <View style={styles.goToCartRow}>
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
    paddingHorizontal: wp("10%"),
  },
  loadingText: {
    fontSize: wp("3.5%"),
    color: Colors.textSecondary,
    marginTop: hp("2%"),
  },
  errorText: {
    fontSize: wp("4%"),
    color: Colors.textPrimary,
    marginTop: hp("2%"),
    textAlign: "center",
  },
  retryButton: {
    marginTop: hp("3%"),
    backgroundColor: Colors.primary,
    paddingHorizontal: wp("8%"),
    paddingVertical: hp("1.5%"),
    borderRadius: wp("3%"),
  },
  retryButtonText: {
    fontSize: wp("3.5%"),
    fontWeight: "700",
    color: Colors.white,
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
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: Colors.surfaceAlt,
  },
  productImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: Colors.surfaceAlt,
  },
  imagePlaceholder: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    alignItems: "center",
    justifyContent: "center",
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
  imageCountBadge: {
    position: "absolute",
    top: wp("3%"),
    right: wp("4%"),
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: wp("3%"),
    paddingVertical: hp("0.4%"),
    borderRadius: wp("3%"),
  },
  imageCountText: {
    fontSize: wp("3%"),
    fontWeight: "600",
    color: Colors.white,
  },

  // ── Product Info ──
  infoContainer: {
    paddingHorizontal: wp("4%"),
    paddingTop: hp("2%"),
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2%"),
    marginBottom: hp("0.8%"),
  },
  brand: {
    fontSize: wp("3.2%"),
    fontWeight: "600",
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  categoryBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: wp("2.5%"),
    paddingVertical: hp("0.3%"),
    borderRadius: wp("2%"),
  },
  categoryText: {
    fontSize: wp("2.8%"),
    fontWeight: "600",
    color: Colors.primary,
  },
  name: {
    fontSize: wp("5.5%"),
    fontWeight: "800",
    color: Colors.textPrimary,
    lineHeight: wp("7%"),
    marginBottom: hp("1%"),
  },
  quickInfoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: wp("2%"),
    marginBottom: hp("1%"),
  },
  quickInfoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("1%"),
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: wp("2.5%"),
    paddingVertical: hp("0.4%"),
    borderRadius: wp("3%"),
  },
  quickInfoText: {
    fontSize: wp("3%"),
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  badgesRow: {
    flexDirection: "row",
    gap: wp("2%"),
    marginBottom: hp("1%"),
  },
  fastMovingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("1%"),
    backgroundColor: "#FFF3E0",
    paddingHorizontal: wp("2.5%"),
    paddingVertical: hp("0.4%"),
    borderRadius: wp("3%"),
  },
  fastMovingText: {
    fontSize: wp("2.8%"),
    fontWeight: "600",
    color: "#E65100",
  },
  featuredBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("1%"),
    backgroundColor: "#FFF8E1",
    paddingHorizontal: wp("2.5%"),
    paddingVertical: hp("0.4%"),
    borderRadius: wp("3%"),
  },
  featuredText: {
    fontSize: wp("2.8%"),
    fontWeight: "600",
    color: "#F57F17",
  },
  attributesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: wp("2%"),
    marginBottom: hp("1%"),
  },
  attributeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("1%"),
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: wp("2.5%"),
    paddingVertical: hp("0.4%"),
    borderRadius: wp("3%"),
  },
  colorDot: {
    width: wp("3%"),
    height: wp("3%"),
    borderRadius: wp("1.5%"),
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  attributeText: {
    fontSize: wp("2.8%"),
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: hp("2%"),
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
    backgroundColor: "#FF3B30",
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

  // ── Quantity ──
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
    marginBottom: hp("2%"),
  },

  // ── Tags ──
  tagsSection: {
    marginTop: hp("1%"),
  },
  tagsTitle: {
    fontSize: wp("3.5%"),
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: hp("1%"),
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: wp("2%"),
  },
  tagChip: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: wp("2.5%"),
    paddingVertical: hp("0.4%"),
    borderRadius: wp("3%"),
  },
  tagChipText: {
    fontSize: wp("2.8%"),
    color: Colors.primary,
    fontWeight: "600",
  },

  // ── Specifications ──
  specsContainer: {
    gap: hp("0.5%"),
  },
  specSectionTitle: {
    fontSize: wp("3.8%"),
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: hp("1%"),
    marginTop: hp("0.5%"),
  },
  specRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: hp("0.8%"),
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  specLabel: {
    width: wp("32%"),
    fontSize: wp("3.3%"),
    fontWeight: "500",
    color: Colors.textMuted,
  },
  specValue: {
    flex: 1,
    fontSize: wp("3.3%"),
    color: Colors.textPrimary,
    fontWeight: "500",
  },
  specDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: hp("1%"),
  },
  compatContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: wp("2%"),
    marginTop: hp("0.5%"),
  },
  compatChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("1%"),
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: wp("2.5%"),
    paddingVertical: hp("0.5%"),
    borderRadius: wp("3%"),
    borderWidth: 1,
    borderColor: Colors.accentLight,
  },
  compatChipText: {
    fontSize: wp("3%"),
    color: Colors.primary,
    fontWeight: "500",
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
