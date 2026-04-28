// screens/HomeScreen.tsx
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Text } from "expo-dynamic-fonts";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
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
  BANNERS,
  CATEGORIES,
  getProductsByCategory,
  Product,
  PRODUCTS,
  searchProducts,
} from "../../constants/products";
import { useCart } from "../../context/CartContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BANNER_H_PADDING = wp("5%");
const BANNER_WIDTH = SCREEN_WIDTH - BANNER_H_PADDING * 2;
const BANNER_GAP = wp("3%");

const TAB_BAR_HEIGHT = 60;

const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {
    cart,
    cartTotal,
    cartItemCount,
    addToCart,
    updateQuantity,
    getCartQuantity,
  } = useCart();

  // ── State ──
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(
    getProductsByCategory("all"),
  );
  const [refreshing, setRefreshing] = useState(false);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  // ── Refs ──
  const bannerScrollRef = useRef<ScrollView>(null);
  const bannerAutoTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Computed ──
  const minOrderThreshold = 500;
  const remaining = minOrderThreshold - cartTotal;
  const showMinOrderWarning = cartTotal > 0 && cartTotal < minOrderThreshold;

  const systemNavHeight = insets.bottom;
  const tabBarTotalHeight = TAB_BAR_HEIGHT + systemNavHeight;

  // ── Get products by tags ──
  const bestSellerProducts = PRODUCTS.filter(
    (p) => p.tags.includes("Best Seller") && p.inStock,
  ).slice(0, 6);

  const limitedStockProducts = PRODUCTS.filter(
    (p) => p.tags.includes("Limited Stock") && p.inStock,
  ).slice(0, 6);

  const allProductsForHorizontal = PRODUCTS.filter((p) => p.inStock).slice(
    0,
    6,
  );

  // ── Banner auto-scroll ──
  const scrollBannerTo = (index: number) => {
    bannerScrollRef.current?.scrollTo({
      x: index * (BANNER_WIDTH + BANNER_GAP),
      animated: true,
    });
    setCurrentBannerIndex(index);
  };

  const startBannerTimer = () => {
    if (bannerAutoTimer.current) clearInterval(bannerAutoTimer.current);
    bannerAutoTimer.current = setInterval(() => {
      setCurrentBannerIndex((prev) => {
        const next = (prev + 1) % BANNERS.length;
        bannerScrollRef.current?.scrollTo({
          x: next * (BANNER_WIDTH + BANNER_GAP),
          animated: true,
        });
        return next;
      });
    }, 3500);
  };

  useEffect(() => {
    startBannerTimer();
    return () => {
      if (bannerAutoTimer.current) clearInterval(bannerAutoTimer.current);
    };
  }, []);

  // ── Filter products ──
  useEffect(() => {
    if (isSearching && searchQuery) {
      setFilteredProducts(searchProducts(searchQuery));
    } else {
      setFilteredProducts(getProductsByCategory(selectedCategory));
    }
  }, [selectedCategory, searchQuery, isSearching]);

  // ── Handlers ──
  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setIsSearching(false);
    setSearchQuery("");
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setIsSearching(text.length > 0);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setIsSearching(false);
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
  };

  const handleRemoveFromCart = (product: Product) => {
    const currentQty = getCartQuantity(product.id);
    if (currentQty > 0) {
      updateQuantity(product.id, currentQty - 1);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  const cartBarHeight = cartItemCount > 0 ? hp("9%") : 0;
  const warningBarHeight = showMinOrderWarning ? hp("6%") : 0;
  const scrollBottomPad =
    tabBarTotalHeight + cartBarHeight + warningBarHeight + hp("2%");

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: scrollBottomPad },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* ── Header Gradient with rounded bottom corners ── */}
        <LinearGradient
          colors={[
            Colors.gradientStart,
            Colors.gradientEnd,
            Colors.primaryDark,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[
            styles.headerGradient,
            {
              paddingTop:
                insets.top || (Platform.OS === "ios" ? hp("6%") : hp("4%")),
            },
          ]}
        >
          {/* Header top row */}
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.userSection} activeOpacity={0.8}>
              <Image
                source={{ uri: "https://i.pravatar.cc/150?img=32" }}
                style={styles.avatar}
              />
              <View>
                <Text style={styles.greeting}>Good Morning 👋</Text>
                <Text style={styles.userName}>Sonali Ray</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => router.push("/notifications")}
              >
                <Feather name="bell" size={wp("5.5%")} color={Colors.white} />
                <View style={styles.notificationBadge}>
                  <Text style={styles.badgeText}>3</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => router.push("/cart")}
              >
                <Feather
                  name="shopping-cart"
                  size={wp("5.5%")}
                  color={Colors.white}
                />
                {cartItemCount > 0 && (
                  <View style={styles.cartBadge}>
                    <Text style={styles.badgeText}>{cartItemCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Search bar */}
          <View style={styles.searchContainer}>
            <Feather name="search" size={wp("4.5%")} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products, brands & more..."
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={handleClearSearch}>
                <Feather
                  name="x-circle"
                  size={wp("4.5%")}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>

        {/* ────────────────────────────────────────────────
              BANNERS — 50% inside gradient, 50% outside
        ──────────────────────────────────────────────── */}
        <View style={styles.bannerWrapper}>
          <View style={styles.bannerSection}>
            <ScrollView
              ref={bannerScrollRef}
              horizontal
              pagingEnabled={false}
              snapToInterval={BANNER_WIDTH + BANNER_GAP}
              snapToAlignment="start"
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bannerScrollContent}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(
                  e.nativeEvent.contentOffset.x / (BANNER_WIDTH + BANNER_GAP),
                );
                setCurrentBannerIndex(idx);
                startBannerTimer();
              }}
            >
              {BANNERS.map((banner) => (
                <LinearGradient
                  key={banner.id}
                  colors={[
                    banner.backgroundColor,
                    banner.backgroundColor + "DD",
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.bannerCard}
                >
                  <Text
                    style={[styles.bannerIcon, { color: banner.textColor }]}
                  >
                    {banner.icon}
                  </Text>
                  <View style={styles.bannerTextBlock}>
                    <Text
                      style={[styles.bannerTitle, { color: banner.textColor }]}
                      numberOfLines={1}
                    >
                      {banner.title}
                    </Text>
                    <Text
                      style={[
                        styles.bannerSubtitle,
                        { color: banner.textColor },
                      ]}
                      numberOfLines={2}
                    >
                      {banner.subtitle}
                    </Text>
                  </View>
                </LinearGradient>
              ))}
            </ScrollView>

            {/* Dot indicators */}
            <View style={styles.dotsRow}>
              {BANNERS.map((_, i) => (
                <TouchableOpacity key={i} onPress={() => scrollBannerTo(i)}>
                  <View
                    style={[
                      styles.dot,
                      currentBannerIndex === i && styles.dotActive,
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ── Page body ── */}
        <View style={styles.pageBody}>
          {/* ────────────────────────────────────────────────
              CATEGORIES — Swiggy-style icon tiles
          ──────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { marginBottom: hp("1.5%") }]}>
              Shop by Category
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScrollContent}
            >
              {CATEGORIES.map((category) => {
                const isActive = selectedCategory === category.id;
                return (
                  <TouchableOpacity
                    key={category.id}
                    style={styles.categoryTile}
                    onPress={() => handleCategoryPress(category.id)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.categoryIconCircle,
                        {
                          backgroundColor: isActive
                            ? Colors.primary
                            : category.color + "18",
                          borderColor: isActive
                            ? Colors.primary
                            : category.color + "40",
                          borderWidth: isActive ? 2 : 1.5,
                        },
                      ]}
                    >
                      <Text style={styles.categoryEmoji}>{category.icon}</Text>
                    </View>
                    <Text
                      style={[
                        styles.categoryLabel,
                        isActive && styles.categoryLabelActive,
                      ]}
                      numberOfLines={1}
                    >
                      {category.name}
                    </Text>
                    {isActive && <View style={styles.categoryActiveDot} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* ────────────────────────────────────────────────
              BEST SELLER SECTION (Horizontal)
          ──────────────────────────────────────────────── */}
          {bestSellerProducts.length > 0 &&
            !isSearching &&
            selectedCategory === "all" && (
              <View style={styles.section}>
                <View style={styles.productHeader}>
                  <View style={styles.titleWithIcon}>
                    <MaterialCommunityIcons
                      name="trophy"
                      size={wp("5%")}
                      color="#FFB800"
                    />
                    <Text style={styles.sectionTitle}>Best Sellers</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.viewAllBtn}
                    onPress={() => router.push("/bestsellers")}
                  >
                    <Text style={styles.viewAllText}>View All</Text>
                    <Feather
                      name="chevron-right"
                      size={wp("4%")}
                      color={Colors.primary}
                    />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalProductScroll}
                >
                  {bestSellerProducts.map((product) => (
                    <View key={product.id} style={styles.horizontalProductCard}>
                      <ProductCard product={product} hideTags={true} />
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

          {/* ────────────────────────────────────────────────
              LIMITED STOCK SECTION (Horizontal)
          ──────────────────────────────────────────────── */}
          {limitedStockProducts.length > 0 &&
            !isSearching &&
            selectedCategory === "all" && (
              <View style={styles.section}>
                <View style={styles.productHeader}>
                  <View style={styles.titleWithIcon}>
                    <MaterialCommunityIcons
                      name="alert-circle-outline"
                      size={wp("5%")}
                      color="#E65100"
                    />
                    <Text style={styles.sectionTitle}>Limited Stock</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.viewAllBtn}
                    onPress={() => router.push("/limitedstocks")}
                  >
                    <Text style={styles.viewAllText}>View All</Text>
                    <Feather
                      name="chevron-right"
                      size={wp("4%")}
                      color={Colors.primary}
                    />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalProductScroll}
                >
                  {limitedStockProducts.map((product) => (
                    <View key={product.id} style={styles.horizontalProductCard}>
                      <ProductCard product={product} hideTags={true} />
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

          {/* ────────────────────────────────────────────────
              ALL PRODUCTS SECTION (Horizontal)
          ──────────────────────────────────────────────── */}
          {!isSearching && selectedCategory === "all" && (
            <View style={styles.section}>
              <View style={styles.productHeader}>
                <Text style={styles.sectionTitle}>All Products</Text>
                <TouchableOpacity
                  style={styles.viewAllBtn}
                  onPress={() => {
                    router.push("/products");
                  }}
                >
                  <Text style={styles.viewAllText}>View All</Text>
                  <Feather
                    name="chevron-right"
                    size={wp("4%")}
                    color={Colors.primary}
                  />
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalProductScroll}
              >
                {allProductsForHorizontal.map((product) => (
                  <View key={product.id} style={styles.horizontalProductCard}>
                    <ProductCard product={product} hideTags={true} />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* ────────────────────────────────────────────────
              CATEGORY PRODUCTS (Grid)
          ──────────────────────────────────────────────── */}
          {(isSearching || selectedCategory !== "all") && (
            <View style={styles.section}>
              <View style={styles.productHeader}>
                <Text style={styles.sectionTitle}>
                  {isSearching && searchQuery
                    ? `Results (${filteredProducts.length})`
                    : CATEGORIES.find((c) => c.id === selectedCategory)?.name ||
                      "Products"}
                </Text>
                {!isSearching && (
                  <TouchableOpacity
                    style={styles.viewAllBtn}
                    onPress={() => router.push("/products")}
                  >
                    <Text style={styles.viewAllText}>View All</Text>
                    <Feather
                      name="chevron-right"
                      size={wp("4%")}
                      color={Colors.primary}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {filteredProducts.length > 0 ? (
                <FlatList
                  data={filteredProducts}
                  keyExtractor={(item) => item.id}
                  numColumns={2}
                  scrollEnabled={false}
                  columnWrapperStyle={styles.productRow}
                  renderItem={({ item }) => <ProductCard product={item} />}
                />
              ) : (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons
                    name="package-variant"
                    size={wp("15%")}
                    color={Colors.textMuted}
                  />
                  <Text style={styles.emptyTitle}>No products found</Text>
                  <Text style={styles.emptyText}>
                    Try different keywords or browse other categories
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── MIN ORDER WARNING BAR ── */}
      {showMinOrderWarning && (
        <View
          style={[
            styles.warningBar,
            {
              bottom: tabBarTotalHeight + (cartItemCount > 0 ? hp("9%") : 0),
            },
          ]}
        >
          <Feather name="alert-circle" size={wp("4%")} color="#E65100" />
          <Text style={styles.warningText}>
            Add ₹{remaining} more for minimum order of ₹{minOrderThreshold}
          </Text>
        </View>
      )}

      {/* ── CART BOTTOM BAR ── */}
      {cartItemCount > 0 && (
        <View style={[styles.cartBar, { bottom: tabBarTotalHeight }]}>
          <View style={styles.cartBarInner}>
            <View style={styles.cartLeft}>
              <View style={styles.cartIconWrap}>
                <Feather
                  name="shopping-bag"
                  size={wp("5%")}
                  color={Colors.white}
                />
                <View style={styles.cartCountBadge}>
                  <Text style={styles.cartCountText}>{cartItemCount}</Text>
                </View>
              </View>
              <View>
                <Text style={styles.cartLabel}>Total Amount</Text>
                <Text style={styles.cartTotal}>₹{cartTotal}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.viewCartBtn}
              activeOpacity={0.9}
              onPress={() => router.push("/cart")}
            >
              <Text style={styles.viewCartText}>View Cart</Text>
              <Feather
                name="arrow-right"
                size={wp("4.5%")}
                color={Colors.white}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

// ─── Styles remain exactly the same ─────────────────────────────────────────
const styles = StyleSheet.create({
  // ... all existing styles remain unchanged
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {},
  headerGradient: {
    paddingHorizontal: wp("5%"),
    paddingBottom: hp("6%"),
    borderBottomLeftRadius: wp("8%"),
    borderBottomRightRadius: wp("8%"),
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: hp("2%"),
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("3%"),
  },
  avatar: {
    width: wp("11%"),
    height: wp("11%"),
    borderRadius: wp("5.5%"),
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.8)",
  },
  greeting: {
    fontSize: wp("3%"),
    color: "rgba(255,255,255,0.88)",
  },
  userName: {
    fontSize: wp("4.2%"),
    fontWeight: "700",
    color: Colors.white,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("3%"),
  },
  iconButton: {
    position: "relative",
    padding: wp("1.5%"),
  },
  notificationBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: Colors.error,
    width: wp("4%"),
    height: wp("4%"),
    borderRadius: wp("2%"),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  cartBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: Colors.success,
    width: wp("4%"),
    height: wp("4%"),
    borderRadius: wp("2%"),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  badgeText: {
    fontSize: wp("2.2%"),
    fontWeight: "800",
    color: Colors.white,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2.5%"),
    backgroundColor: Colors.white,
    borderRadius: wp("3%"),
    paddingHorizontal: wp("4%"),
    height: hp("5.8%"),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: wp("3.5%"),
    color: Colors.textPrimary,
    height: "100%",
  },
  bannerWrapper: {
    marginTop: -hp("3%"),
  },
  bannerSection: {
    paddingHorizontal: BANNER_H_PADDING,
    marginBottom: hp("1%"),
  },
  bannerScrollContent: {
    gap: BANNER_GAP,
    paddingRight: BANNER_H_PADDING,
  },
  bannerCard: {
    width: BANNER_WIDTH,
    borderRadius: wp("4%"),
    paddingVertical: hp("2.5%"),
    paddingHorizontal: wp("5%"),
    flexDirection: "row",
    alignItems: "center",
    gap: wp("4%"),
    overflow: "hidden",
    // shadowColor: "#000",
    // shadowOffset: { width: 0, height: 4 },
    // shadowOpacity: 0.12,
    // shadowRadius: 10,
    // elevation: 6,
  },
  bannerIcon: {
    fontSize: wp("10%"),
  },
  bannerTextBlock: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: wp("4.2%"),
    fontWeight: "800",
    marginBottom: hp("0.4%"),
  },
  bannerSubtitle: {
    fontSize: wp("3.1%"),
    fontWeight: "500",
    opacity: 0.88,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: wp("1.5%"),
    marginTop: hp("1.2%"),
  },
  dot: {
    width: wp("1.8%"),
    height: wp("1.8%"),
    borderRadius: wp("0.9%"),
    backgroundColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: wp("4.5%"),
    borderRadius: wp("0.9%"),
  },
  pageBody: {
    backgroundColor: Colors.background,
  },
  section: {
    paddingHorizontal: wp("4%"),
    marginBottom: hp("2.5%"),
  },
  sectionTitle: {
    fontSize: wp("4.3%"),
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  titleWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2%"),
  },
  categoryScrollContent: {
    gap: wp("3%"),
    paddingRight: wp("4%"),
  },
  categoryTile: {
    alignItems: "center",
    width: wp("16%"),
    position: "relative",
  },
  categoryIconCircle: {
    width: wp("14%"),
    height: wp("14%"),
    borderRadius: wp("7%"),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: hp("0.6%"),
  },
  categoryEmoji: {
    fontSize: wp("6.5%"),
  },
  categoryLabel: {
    fontSize: wp("2.8%"),
    fontWeight: "500",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  categoryLabelActive: {
    color: Colors.primary,
    fontWeight: "700",
  },
  categoryActiveDot: {
    marginTop: hp("0.3%"),
    width: wp("1.2%"),
    height: wp("1.2%"),
    borderRadius: wp("0.6%"),
    backgroundColor: Colors.primary,
  },
  productHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: hp("1.5%"),
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("0.5%"),
  },
  viewAllText: {
    fontSize: wp("3.2%"),
    fontWeight: "600",
    color: Colors.primary,
  },
  horizontalProductScroll: {
    gap: wp("3%"),
    paddingRight: wp("4%"),
  },
  horizontalProductCard: {
    width: wp("40%"),
  },
  productRow: {
    justifyContent: "space-between",
    marginBottom: hp("0.5%"),
    alignItems: "stretch",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: hp("8%"),
    paddingHorizontal: wp("10%"),
  },
  emptyTitle: {
    fontSize: wp("4.2%"),
    fontWeight: "700",
    color: Colors.textPrimary,
    marginTop: hp("2%"),
    marginBottom: hp("0.8%"),
  },
  emptyText: {
    fontSize: wp("3.3%"),
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: wp("5%"),
  },
  warningBar: {
    position: "absolute",
    left: wp("4%"),
    right: wp("4%"),
    backgroundColor: "#FFF3E0",
    borderRadius: wp("3%"),
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("1.3%"),
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2.5%"),
    borderWidth: 1,
    borderColor: "#FFB74D",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },
  warningText: {
    flex: 1,
    fontSize: wp("3%"),
    fontWeight: "600",
    color: "#E65100",
  },
  cartBar: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("1.2%"),
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 12,
  },
  cartBarInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cartLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("3%"),
  },
  cartIconWrap: {
    position: "relative",
    backgroundColor: Colors.primary,
    width: wp("10%"),
    height: wp("10%"),
    borderRadius: wp("5%"),
    alignItems: "center",
    justifyContent: "center",
  },
  cartCountBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: Colors.error,
    width: wp("4%"),
    height: wp("4%"),
    borderRadius: wp("2%"),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  cartCountText: {
    fontSize: wp("2.2%"),
    fontWeight: "800",
    color: Colors.white,
  },
  cartLabel: {
    fontSize: wp("2.8%"),
    color: Colors.textSecondary,
  },
  cartTotal: {
    fontSize: wp("4.2%"),
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  viewCartBtn: {
    backgroundColor: Colors.primary,
    borderRadius: wp("2.5%"),
    paddingHorizontal: wp("5%"),
    paddingVertical: hp("1.3%"),
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2%"),
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  viewCartText: {
    fontSize: wp("3.6%"),
    fontWeight: "700",
    color: Colors.white,
  },
});

export default HomeScreen;
