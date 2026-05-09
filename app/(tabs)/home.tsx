// screens/HomeScreen.tsx
import { Text } from "@/context/FontContext";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { CATEGORIES, Product } from "../../constants/products";
import { useCart } from "../../context/CartContext";
import { apiGetMe } from "../services/api";
import { ApiProduct, fetchAllProducts } from "../services/productApi";

const TAB_BAR_HEIGHT = 60;

// ─── Helper: Convert API product to app Product format (SIMPLIFIED) ──────────
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

const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { cartTotal, cartItemCount } = useCart();

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [userData, setUserData] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const minOrderThreshold = 500;
  const remaining = minOrderThreshold - cartTotal;
  const showMinOrderWarning = cartTotal > 0 && cartTotal < minOrderThreshold;
  const systemNavHeight = insets.bottom;
  const tabBarTotalHeight = TAB_BAR_HEIGHT + systemNavHeight;

  // ── Fetch All Data ─────────────────────────────────────────────────────────
  const fetchAllData = useCallback(async () => {
    try {
      setError(null);
      setIsLoadingUser(true);
      try {
        const userResponse = await apiGetMe();
        if (userResponse.success) setUserData(userResponse.user);
      } catch (userError) {
        console.error("❌ Failed to load user:", userError);
      } finally {
        setIsLoadingUser(false);
      }

      setIsLoadingProducts(true);
      try {
        const apiProducts = await fetchAllProducts();
        const mappedProducts = apiProducts.map(mapApiProductToAppProduct);
        setAllProducts(mappedProducts);
      } catch (productError) {
        console.error("❌ Failed to load products:", productError);
        setError("Failed to load products. Pull to retry.");
      } finally {
        setIsLoadingProducts(false);
      }
    } catch (err) {
      console.error("❌ Error fetching data:", err);
      setError("Something went wrong. Pull to retry.");
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ── Filter products ────────────────────────────────────────────────────────
  useEffect(() => {
    if (allProducts.length === 0) return;
    let filtered: Product[];
    if (isSearching && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = allProducts.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.brand.toLowerCase().includes(query) ||
          product.category.toLowerCase().includes(query) ||
          (product.description || "").toLowerCase().includes(query),
      );
    } else if (selectedCategory === "all") {
      filtered = allProducts;
    } else {
      filtered = allProducts.filter(
        (product) =>
          product.category.toLowerCase() === selectedCategory.toLowerCase(),
      );
    }
    setFilteredProducts(filtered);
  }, [selectedCategory, searchQuery, isSearching, allProducts]);

  // ── Product sections ───────────────────────────────────────────────────────
  const featuredProducts = allProducts
    .filter((p) => p.isFeatured && p.inStock)
    .slice(0, 6);
  const bestSellerProducts = allProducts
    .filter((p) => p.tags.includes("Best Seller") && p.inStock)
    .slice(0, 6);
  const newArrivalProducts = allProducts
    .filter((p) => p.tags.includes("New Arrival") && p.inStock)
    .slice(0, 6);
  const allProductsForHorizontal = allProducts
    .filter((p) => p.inStock)
    .slice(0, 6);

  // ── Handlers ───────────────────────────────────────────────────────────────
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
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  }, [fetchAllData]);

  // ── User display ───────────────────────────────────────────────────────────
  const getUserDisplayName = () => {
    if (isLoadingUser) return "Loading...";
    if (userData?.profile?.contactName) return userData.profile.contactName;
    if (userData?.phone) return `+91 ${userData.phone}`;
    return "Guest User";
  };
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };
  const getUserAvatar = () => {
    if (userData?.profile?.contactName) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.profile.contactName)}&background=6C63FF&color=fff&size=150`;
    }
    return "https://ui-avatars.com/api/?name=User&background=6C63FF&color=fff&size=150";
  };

  const cartBarHeight = cartItemCount > 0 ? hp("9%") : 0;
  const warningBarHeight = showMinOrderWarning ? hp("6%") : 0;
  const scrollBottomPad =
    tabBarTotalHeight + cartBarHeight + warningBarHeight + hp("2%");

  // ── Loading State ──────────────────────────────────────────────────────────
  if (isLoadingProducts && allProducts.length === 0) {
    return (
      <View style={[styles.root, styles.centerContent]}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>
          Loading electronics accessories...
        </Text>
      </View>
    );
  }

  // ── Error State ────────────────────────────────────────────────────────────
  if (error && allProducts.length === 0) {
    return (
      <View style={[styles.root, styles.centerContent]}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />
        <MaterialCommunityIcons
          name="cloud-off-outline"
          size={wp("20%")}
          color={Colors.textMuted}
        />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchAllData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
        {/* ── Header ── */}
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
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.userSection}
              activeOpacity={0.8}
              onPress={() => router.push("/(tabs)/account")}
            >
              <Image source={{ uri: getUserAvatar() }} style={styles.avatar} />
              <View style={styles.userInfo}>
                <Text style={styles.greeting}>{getGreeting()} 👋</Text>
                <Text style={styles.userName} numberOfLines={1}>
                  {getUserDisplayName()}
                </Text>
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

          <View style={styles.searchContainer}>
            <Feather name="search" size={wp("4.5%")} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search cables, chargers, cases..."
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

        {/* ── Page Body ── */}
        <View style={styles.pageBody}>
          {/* Categories */}
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

          {/* Featured */}
          {featuredProducts.length > 0 &&
            !isSearching &&
            selectedCategory === "all" && (
              <View style={styles.section}>
                <View style={styles.productHeader}>
                  <Text style={styles.sectionTitle}>Featured Products</Text>
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
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalProductScroll}
                >
                  {featuredProducts.map((product) => (
                    <View key={product.id} style={styles.horizontalProductCard}>
                      <ProductCard product={product} hideTags={true} />
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

          {/* Best Sellers */}
          {bestSellerProducts.length > 0 &&
            !isSearching &&
            selectedCategory === "all" && (
              <View style={styles.section}>
                <View style={styles.productHeader}>
                  <Text style={styles.sectionTitle}>Best Sellers</Text>
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

          {/* New Arrivals */}
          {newArrivalProducts.length > 0 &&
            !isSearching &&
            selectedCategory === "all" && (
              <View style={styles.section}>
                <View style={styles.productHeader}>
                  <View style={styles.titleWithIcon}>
                    <MaterialCommunityIcons
                      name="new-box"
                      size={wp("5%")}
                      color="#00A884"
                    />
                    <Text style={styles.sectionTitle}>New Arrivals</Text>
                  </View>
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
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalProductScroll}
                >
                  {newArrivalProducts.map((product) => (
                    <View key={product.id} style={styles.horizontalProductCard}>
                      <ProductCard product={product} hideTags={true} />
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

          {/* All Products */}
          {!isSearching &&
            selectedCategory === "all" &&
            allProductsForHorizontal.length > 0 && (
              <View style={styles.section}>
                <View style={styles.productHeader}>
                  <Text style={styles.sectionTitle}>All Products</Text>
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

          {/* Category/Search Results Grid */}
          {(isSearching || selectedCategory !== "all") && (
            <View style={styles.section}>
              <View style={styles.productHeader}>
                <Text style={styles.sectionTitle}>
                  {isSearching && searchQuery
                    ? `Results for "${searchQuery}" (${filteredProducts.length})`
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
                    name="devices"
                    size={wp("15%")}
                    color={Colors.textMuted}
                  />
                  <Text style={styles.emptyTitle}>No accessories found</Text>
                  <Text style={styles.emptyText}>
                    Try different keywords or browse other categories
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Min Order Warning */}
      {showMinOrderWarning && (
        <View
          style={[
            styles.warningBar,
            { bottom: tabBarTotalHeight + (cartItemCount > 0 ? hp("9%") : 0) },
          ]}
        >
          <Feather name="alert-circle" size={wp("4%")} color="#E65100" />
          <Text style={styles.warningText}>
            Add ₹{remaining} more for minimum order of ₹{minOrderThreshold}
          </Text>
        </View>
      )}

      {/* Cart Bar */}
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: wp("10%"),
  },
  scrollContent: {},
  headerGradient: {
    paddingHorizontal: wp("5%"),
    paddingBottom: hp("3%"),
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
    flex: 1,
  },
  userInfo: { flex: 1 },
  avatar: {
    width: wp("11%"),
    height: wp("11%"),
    borderRadius: wp("5.5%"),
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.8)",
  },
  greeting: { fontSize: wp("3%"), color: "rgba(255,255,255,0.88)" },
  userName: { fontSize: wp("4.2%"), fontWeight: "700", color: Colors.white },
  headerActions: { flexDirection: "row", alignItems: "center", gap: wp("3%") },
  iconButton: { position: "relative", padding: wp("1.5%") },
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
  badgeText: { fontSize: wp("2.2%"), fontWeight: "800", color: Colors.white },
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
  pageBody: { backgroundColor: Colors.background, paddingTop: hp("2%") },
  section: { paddingHorizontal: wp("4%"), marginBottom: hp("2.5%") },
  sectionTitle: {
    fontSize: wp("4.3%"),
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  titleWithIcon: { flexDirection: "row", alignItems: "center", gap: wp("2%") },
  categoryScrollContent: { gap: wp("3%"), paddingRight: wp("4%") },
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
  categoryEmoji: { fontSize: wp("6.5%") },
  categoryLabel: {
    fontSize: wp("2.8%"),
    fontWeight: "500",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  categoryLabelActive: { color: Colors.primary, fontWeight: "700" },
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
  viewAllBtn: { flexDirection: "row", alignItems: "center", gap: wp("0.5%") },
  viewAllText: {
    fontSize: wp("3.2%"),
    fontWeight: "600",
    color: Colors.primary,
  },
  horizontalProductScroll: { gap: wp("3%"), paddingRight: wp("4%") },
  horizontalProductCard: { width: wp("40%") },
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
  retryText: { fontSize: wp("3.5%"), fontWeight: "700", color: Colors.white },
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
  cartLeft: { flexDirection: "row", alignItems: "center", gap: wp("3%") },
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
  cartLabel: { fontSize: wp("2.8%"), color: Colors.textSecondary },
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
