// screens/HomeScreen.tsx
import { Text } from "@/context/FontContext";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  BackHandler,
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
import { apiGetMe, apiGetNotifications } from "../services/api";
import { ApiProduct, fetchAllProducts } from "../services/productApi";

const TAB_BAR_HEIGHT = 60;

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
    enforceOrderLimits: apiProduct.enforceOrderLimits !== false,
    color: apiProduct.color || "",
    material: apiProduct.material || "",
    dimensions: apiProduct.dimensions || "",
    weight: apiProduct.weight || "",
    warranty: apiProduct.warranty || "No Warranty",
    stockQuantity: apiProduct.stockQuantity,
    minOrderQuantity: apiProduct.minOrderQuantity,
    maxOrderQuantity: apiProduct.maxOrderQuantity,
    description: apiProduct.description || "",
    images: apiProduct.images || [],
    specifications: apiProduct.specifications || {},
    tags: apiProduct.tags || [],
    inStock: apiProduct.stockQuantity > 0,
    isFastMoving: apiProduct.isFastMoving || false,
    isFeatured: apiProduct.isFeatured || false,
  };
};

const goToProducts = (filter?: {
  category?: string;
  tag?: string;
  section?: string;
}) => {
  const params: Record<string, string> = {};
  if (filter?.category) params.category = filter.category;
  if (filter?.tag) params.tag = filter.tag;
  if (filter?.section) params.section = filter.section;
  router.push({ pathname: "/products", params });
};

const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { cartTotal, cartItemCount } = useCart();

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const [showNewProductsBanner, setShowNewProductsBanner] = useState(false);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const minOrderThreshold = 500;
  const remaining = minOrderThreshold - cartTotal;
  const showMinOrderWarning = cartTotal > 0 && cartTotal < minOrderThreshold;
  const systemNavHeight = insets.bottom;
  const tabBarTotalHeight = TAB_BAR_HEIGHT + systemNavHeight;

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => { BackHandler.exitApp(); return true; };
      const backHandler = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => backHandler.remove();
    }, []),
  );

  const fetchUnreadNotificationCount = useCallback(async () => {
    try {
      const res = await apiGetNotifications({ limit: 1 });
      if (res.success && res.data) setUnreadNotificationCount(res.data.unreadCount || 0);
    } catch (error) {
      console.error("Failed to fetch notification count:", error);
    }
  }, []);

  const checkForNewProducts = useCallback(async () => {
    if (isPolling) return;
    try {
      setIsPolling(true);
      const apiProducts = await fetchAllProducts();
      const hasNewProducts = apiProducts.length !== allProducts.length;
      const hasChanges = apiProducts.some((newProduct) => {
        const existingProduct = allProducts.find((p) => p.id === newProduct._id);
        return (!existingProduct || existingProduct.stockQuantity !== newProduct.stockQuantity || existingProduct.sellingPrice !== newProduct.sellingPrice);
      });
      if (hasNewProducts || hasChanges) {
        const mappedProducts = apiProducts.map(mapApiProductToAppProduct);
        setAllProducts(mappedProducts);
        if (allProducts.length > 0) {
          setShowNewProductsBanner(true);
          if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
          bannerTimeoutRef.current = setTimeout(() => setShowNewProductsBanner(false), 5000);
        }
      }
    } catch (error) {
      console.error("Polling error:", error);
    } finally {
      setIsPolling(false);
    }
  }, [allProducts, isPolling]);

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
        setAllProducts(apiProducts.map(mapApiProductToAppProduct));
      } catch (productError) {
        console.error("❌ Failed to load products:", productError);
        setError("Failed to load products. Pull to retry.");
      } finally {
        setIsLoadingProducts(false);
      }
      await fetchUnreadNotificationCount();
    } catch (err) {
      console.error("❌ Error fetching data:", err);
      setError("Something went wrong. Pull to retry.");
    }
  }, [fetchUnreadNotificationCount]);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  useFocusEffect(useCallback(() => { fetchUnreadNotificationCount(); }, [fetchUnreadNotificationCount]));

  useFocusEffect(
    useCallback(() => {
      const refreshUserData = async () => {
        try {
          const userResponse = await apiGetMe();
          if (userResponse.success) setUserData(userResponse.user);
        } catch (error) { console.error("Failed to refresh user data:", error); }
      };
      const refreshProducts = async () => {
        try {
          const apiProducts = await fetchAllProducts();
          setAllProducts(apiProducts.map(mapApiProductToAppProduct));
        } catch (error) { console.error("Failed to refresh products:", error); }
      };
      if (!isLoadingProducts && allProducts.length > 0) { refreshUserData(); refreshProducts(); }
      fetchUnreadNotificationCount();
    }, [isLoadingProducts, allProducts.length, fetchUnreadNotificationCount]),
  );

  useEffect(() => {
    const interval = setInterval(fetchUnreadNotificationCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadNotificationCount]);

  useEffect(() => {
    if (!isLoadingProducts) {
      pollingIntervalRef.current = setInterval(checkForNewProducts, 30000);
    }
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
    };
  }, [isLoadingProducts, checkForNewProducts]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active" && !isLoadingProducts) {
        checkForNewProducts();
        fetchUnreadNotificationCount();
      }
    });
    return () => subscription.remove();
  }, [isLoadingProducts, checkForNewProducts, fetchUnreadNotificationCount]);

  // ── Filtered products — computed synchronously with useMemo so it's always
  // in sync with selectedCategory/searchQuery (no stale-render flicker) ──────
  const filteredProducts = useMemo<Product[]>(() => {
    if (allProducts.length === 0) return [];
    if (isSearching && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      return allProducts.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.brand.toLowerCase().includes(query) ||
          product.category.toLowerCase().includes(query) ||
          (product.description || "").toLowerCase().includes(query),
      );
    }
    if (selectedCategory === "all") return allProducts;
    return allProducts.filter(
      (product) => product.category.toLowerCase() === selectedCategory.toLowerCase(),
    );
  }, [selectedCategory, searchQuery, isSearching, allProducts]);

  // ── Product sections — 2 from each, de-duplicated across sections ─────────
  const inStockProducts = allProducts.filter((p) => p.inStock);

  const featuredProducts = inStockProducts
    .filter((p) => p.isFeatured)
    .slice(0, 2);
  const featuredIds = new Set(featuredProducts.map((p) => p.id));

  const bestSellerProducts = inStockProducts
    .filter((p) => p.tags.includes("Best Seller") && !featuredIds.has(p.id))
    .slice(0, 2);
  const bestSellerIds = new Set(bestSellerProducts.map((p) => p.id));

  const newArrivalProducts = inStockProducts
    .filter(
      (p) =>
        p.tags.includes("New Arrival") &&
        !featuredIds.has(p.id) &&
        !bestSellerIds.has(p.id),
    )
    .slice(0, 2);
  const newArrivalIds = new Set(newArrivalProducts.map((p) => p.id));

  // Per-category sections — 2 products from EACH category, de-duplicated
  // against anything already shown in Featured / Best Sellers / New Arrivals
  // (and against earlier category sections too)
  const shownIds = new Set([...featuredIds, ...bestSellerIds, ...newArrivalIds]);
  const categorySections = CATEGORIES.filter((c) => c.id !== "all")
    .map((category) => {
      const products = inStockProducts
        .filter(
          (p) =>
            p.category.toLowerCase() === category.id.toLowerCase() &&
            !shownIds.has(p.id),
        )
        .slice(0, 2);
      products.forEach((p) => shownIds.add(p.id));
      return { category, products };
    })
    .filter((section) => section.products.length > 0);
  // ─────────────────────────────────────────────────────────────────────────

  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setIsSearching(false);
    setSearchQuery("");
  };
  const handleSearch = (text: string) => { setSearchQuery(text); setIsSearching(text.length > 0); };
  const handleClearSearch = () => { setSearchQuery(""); setIsSearching(false); };
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAllData();
    setShowNewProductsBanner(false);
    setRefreshing(false);
  }, [fetchAllData]);

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
  const scrollBottomPad = tabBarTotalHeight + cartBarHeight + warningBarHeight + hp("2%");

  const renderProductGrid = (
    products: Product[],
    title: string,
    viewAllFilter?: { category?: string; tag?: string; section?: string },
  ) => {
    if (products.length === 0) return null;
    return (
      <View style={styles.section}>
        <View style={styles.productHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <TouchableOpacity style={styles.viewAllBtn} onPress={() => goToProducts(viewAllFilter)}>
            <Text style={styles.viewAllText}>View All</Text>
            <Feather name="chevron-right" size={wp("4%")} style={{ marginBottom: wp("0.5%") }} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.gridRow}>
          {products.map((product) => (
            <View key={product.id} style={styles.gridCardWrapper}>
              <ProductCard product={product} />
            </View>
          ))}
        </View>
      </View>
    );
  };

  if (isLoadingProducts && allProducts.length === 0) {
    return (
      <View style={[styles.root, styles.centerContent]}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading electronics accessories...</Text>
      </View>
    );
  }

  if (error && allProducts.length === 0) {
    return (
      <View style={[styles.root, styles.centerContent]}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <MaterialCommunityIcons name="cloud-off-outline" size={wp("20%")} color={Colors.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchAllData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPad }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* ── Header ── */}
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientEnd, Colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top || (Platform.OS === "ios" ? hp("6%") : hp("6%")) }]}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.userSection} activeOpacity={0.8} onPress={() => router.push("/(tabs)/account")}>
              <Image source={{ uri: getUserAvatar() }} style={styles.avatar} />
              <View style={styles.userInfo}>
                <Text style={styles.greeting} numberOfLines={1}>{getGreeting()} 👋</Text>
                <Text style={styles.userName} numberOfLines={1}>{getUserDisplayName()}</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.iconButton} onPress={() => router.push("/notifications")}>
                <Feather name="bell" size={wp("5.5%")} color={Colors.white} />
                {unreadNotificationCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.badgeText}>{unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={() => router.push("/cart")}>
                <Feather name="shopping-cart" size={wp("5.5%")} color={Colors.white} />
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
                <Feather name="x-circle" size={wp("4.5%")} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>

        {/* New Products Banner */}
        {showNewProductsBanner && (
          <View style={styles.newProductsBanner}>
            <MaterialCommunityIcons name="package-variant-plus" size={wp("4.5%")} color={Colors.white} />
            <Text style={styles.newProductsBannerText}>New products added! Pull down to refresh</Text>
            <TouchableOpacity onPress={() => setShowNewProductsBanner(false)}>
              <Feather name="x" size={wp("4%")} color={Colors.white} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Page Body ── */}
        <View style={styles.pageBody}>
          {/* Categories */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { marginBottom: hp("1.5%") }]} boldVariant="exotc">
              Shop by Category
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScrollContent}>
              {CATEGORIES.map((category) => {
                const isActive = selectedCategory === category.id;
                return (
                  <TouchableOpacity key={category.id} style={styles.categoryTile} onPress={() => handleCategoryPress(category.id)} activeOpacity={0.8}>
                    <View
                      style={[
                        styles.categoryIconCircle,
                        {
                          backgroundColor: isActive ? Colors.primary : category.color + "18",
                          borderColor: isActive ? Colors.primary : category.color + "40",
                          borderWidth: isActive ? 2 : 1.5,
                        },
                      ]}
                    >
                      <Text style={styles.categoryEmoji}>{category.icon}</Text>
                    </View>
                    <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>{category.name}</Text>
                    {isActive && <View style={styles.categoryActiveDot} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* ── Search / Category filter ── */}
          {isSearching || selectedCategory !== "all" ? (
            <View style={styles.section}>
              <View style={styles.productHeader}>
                <Text style={styles.sectionTitle}>
                  {isSearching && searchQuery
                    ? `Results for "${searchQuery}" (${filteredProducts.length})`
                    : CATEGORIES.find((c) => c.id === selectedCategory)?.name || "Products"}
                </Text>
                {!isSearching && (
                  <TouchableOpacity
                    style={styles.viewAllBtn}
                    onPress={() => goToProducts(selectedCategory !== "all" ? { category: selectedCategory } : undefined)}
                  >
                    <Text style={styles.viewAllText}>View All</Text>
                    <Feather name="chevron-right" size={wp("4%")} color={Colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
              {filteredProducts.length > 0 ? (
                <View style={styles.gridRow}>
                  {filteredProducts.slice(0, 2).map((item) => (
                    <View key={item.id} style={styles.gridCardWrapper}>
                      <ProductCard product={item} />
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="devices" size={wp("15%")} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>No accessories found</Text>
                  <Text style={styles.emptyText}>Try different keywords or browse other categories</Text>
                </View>
              )}
            </View>
          ) : (
            <>
              {/* Featured Products — 2 unique items */}
              {renderProductGrid(featuredProducts, "Featured Products", { section: "featured" })}

              {/* Best Sellers — 2 unique items (not in Featured) */}
              {renderProductGrid(bestSellerProducts, "Best Sellers", { tag: "Best Seller" })}

              {/* New Arrivals — 2 unique items (not in Featured or Best Sellers) */}
              {newArrivalProducts.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.productHeader}>
                    <View style={styles.titleWithIcon}>
                      <MaterialCommunityIcons name="new-box" size={wp("5%")} color="#00A884" />
                      <Text style={styles.sectionTitle}>New Arrivals</Text>
                    </View>
                    <TouchableOpacity style={styles.viewAllBtn} onPress={() => goToProducts({ tag: "New Arrival" })}>
                      <Text style={styles.viewAllText}>View All</Text>
                      <Feather name="chevron-right" size={wp("4%")} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.gridRow}>
                    {newArrivalProducts.map((product) => (
                      <View key={product.id} style={styles.gridCardWrapper}>
                        <ProductCard product={product} />
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* One section per category — 2 unique items each */}
              {categorySections.map(({ category, products }) =>
                renderProductGrid(products, category.name, { category: category.id }),
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Min Order Warning */}
      {showMinOrderWarning && (
        <View style={[styles.warningBar, { bottom: tabBarTotalHeight + (cartItemCount > 0 ? hp("9%") : 0) }]}>
          <Feather name="alert-circle" size={wp("4%")} color="#E65100" />
          <Text style={styles.warningText}>Add ₹{remaining} more for minimum order of ₹{minOrderThreshold}</Text>
        </View>
      )}

      {/* Cart Bar */}
      {cartItemCount > 0 && (
        <View style={[styles.cartBar, { bottom: tabBarTotalHeight }]}>
          <View style={styles.cartBarInner}>
            <View style={styles.cartLeft}>
              <View style={styles.cartIconWrap}>
                <Feather name="shopping-bag" size={wp("5%")} color={Colors.white} />
                <View style={styles.cartCountBadge}>
                  <Text style={styles.cartCountText}>{cartItemCount}</Text>
                </View>
              </View>
              <View>
                <Text style={styles.cartLabel}>Total Amount</Text>
                <Text style={styles.cartTotal}>₹{cartTotal}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.viewCartBtn} activeOpacity={0.9} onPress={() => router.push("/cart")}>
              <View style={styles.viewCartBtnContent}>
                <Text style={styles.viewCartText}>View Cart</Text>
                <Feather name="arrow-right" size={wp("4.5%")} color={Colors.white} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  centerContent: { justifyContent: "center", alignItems: "center", paddingHorizontal: wp("10%") },
  scrollContent: {},
  headerGradient: { paddingHorizontal: wp("5%"), paddingBottom: hp("3%"), borderBottomLeftRadius: wp("8%"), borderBottomRightRadius: wp("8%") },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: hp("2%") },
  userSection: { flexDirection: "row", alignItems: "center", gap: wp("3%"), flex: 1 },
  userInfo: { flex: 1, justifyContent: "center" },
  avatar: { width: wp("12%"), height: wp("12%"), borderRadius: wp("6%"), borderWidth: 2, borderColor: "rgba(255,255,255,0.9)", backgroundColor: Colors.primary },
  greeting: { fontSize: wp("3.8%"), color: "rgba(255,255,255,0.9)", fontWeight: "600", lineHeight: wp("5%"), includeFontPadding: false, textAlignVertical: "center" },
  userName: { fontSize: wp("4.2%"), fontWeight: "700", color: Colors.white, lineHeight: wp("5.2%"), includeFontPadding: false, textAlignVertical: "center" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: wp("3%") },
  iconButton: { position: "relative", padding: wp("1.5%") },
  notificationBadge: { position: "absolute", top: 0, right: 0, backgroundColor: Colors.error, minWidth: wp("4.5%"), height: wp("4.5%"), borderRadius: wp("2.25%"), alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: Colors.white, paddingHorizontal: 2 },
  cartBadge: { position: "absolute", top: 0, right: 0, backgroundColor: Colors.success, width: wp("4%"), height: wp("4%"), borderRadius: wp("2%"), alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: Colors.white },
  badgeText: { fontSize: wp("2.2%"), fontWeight: "800", color: Colors.white, lineHeight: wp("3.5%"), includeFontPadding: false, textAlignVertical: "center" },
  searchContainer: { flexDirection: "row", alignItems: "center", gap: wp("2.5%"), backgroundColor: Colors.white, borderRadius: wp("3%"), paddingHorizontal: wp("4%"), height: hp("5.8%"), shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  searchInput: { flex: 1, fontSize: wp("3.5%"), color: Colors.textPrimary, height: "100%", includeFontPadding: false, textAlignVertical: "center" },
  newProductsBanner: { flexDirection: "row", alignItems: "center", gap: wp("2%"), backgroundColor: Colors.success, marginHorizontal: wp("4%"), marginTop: hp("1%"), borderRadius: wp("3%"), paddingHorizontal: wp("4%"), paddingVertical: hp("1.2%"), shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  newProductsBannerText: { flex: 1, fontSize: wp("3.2%"), fontWeight: "600", color: Colors.white },
  pageBody: { backgroundColor: Colors.background, paddingTop: hp("2%") },
  section: { paddingHorizontal: wp("4%"), marginBottom: hp("2.5%") },
  sectionTitle: { fontSize: wp("4.3%"), fontWeight: "800", color: Colors.textPrimary },
  titleWithIcon: { flexDirection: "row", alignItems: "center", gap: wp("2%") },
  categoryScrollContent: { gap: wp("3%"), paddingRight: wp("4%") },
  categoryTile: { alignItems: "center", width: wp("16%"), position: "relative" },
  categoryIconCircle: { width: wp("14%"), height: wp("14%"), borderRadius: wp("7%"), alignItems: "center", justifyContent: "center", marginBottom: hp("0.6%") },
  categoryEmoji: { fontSize: wp("6.5%") },
  categoryLabel: { fontSize: wp("2.8%"), fontWeight: "500", color: Colors.textSecondary, textAlign: "center" },
  categoryLabelActive: { color: Colors.primary, fontWeight: "700" },
  categoryActiveDot: { marginTop: hp("0.3%"), width: wp("1.2%"), height: wp("1.2%"), borderRadius: wp("0.6%"), backgroundColor: Colors.primary },
  productHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: hp("1.5%") },
  viewAllBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  viewAllText: { fontSize: wp("3.2%"), fontWeight: "600", color: Colors.primary, includeFontPadding: false, marginRight: wp("0.5%") },
  gridRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  gridCardWrapper: { width: "49%", marginBottom: hp("1.5%") },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: hp("8%"), paddingHorizontal: wp("10%") },
  emptyTitle: { fontSize: wp("4.2%"), fontWeight: "700", color: Colors.textPrimary, marginTop: hp("2%"), marginBottom: hp("0.8%") },
  emptyText: { fontSize: wp("3.3%"), color: Colors.textSecondary, textAlign: "center", lineHeight: wp("5%") },
  loadingText: { fontSize: wp("3.5%"), color: Colors.textSecondary, marginTop: hp("2%") },
  errorText: { fontSize: wp("4%"), color: Colors.textPrimary, marginTop: hp("2%"), textAlign: "center" },
  retryButton: { marginTop: hp("3%"), backgroundColor: Colors.primary, paddingHorizontal: wp("8%"), paddingVertical: hp("1.5%"), borderRadius: wp("3%") },
  retryText: { fontSize: wp("3.5%"), fontWeight: "700", color: Colors.white },
  warningBar: { position: "absolute", left: wp("4%"), right: wp("4%"), backgroundColor: "#FFF3E0", borderRadius: wp("3%"), paddingHorizontal: wp("4%"), paddingVertical: hp("1.3%"), flexDirection: "row", alignItems: "center", gap: wp("2.5%"), borderWidth: 1, borderColor: "#FFB74D", shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 8 },
  warningText: { flex: 1, fontSize: wp("3%"), fontWeight: "600", color: "#E65100" },
  cartBar: { position: "absolute", left: 0, right: 0, backgroundColor: Colors.white, paddingHorizontal: wp("4%"), paddingVertical: hp("1.2%"), borderTopWidth: 1, borderTopColor: Colors.border, shadowColor: "#000", shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 12 },
  cartBarInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cartLeft: { flexDirection: "row", alignItems: "center", gap: wp("3%") },
  cartIconWrap: { position: "relative", backgroundColor: Colors.primary, width: wp("10%"), height: wp("10%"), borderRadius: wp("5%"), alignItems: "center", justifyContent: "center" },
  cartCountBadge: { position: "absolute", top: -2, right: -2, backgroundColor: Colors.error, width: wp("4%"), height: wp("4%"), borderRadius: wp("2%"), alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: Colors.white },
  cartCountText: { fontSize: wp("2.2%"), fontWeight: "800", color: Colors.white, lineHeight: wp("3.5%"), includeFontPadding: false, textAlignVertical: "center" },
  cartLabel: { fontSize: wp("2.8%"), color: Colors.textSecondary },
  cartTotal: { fontSize: wp("4.2%"), fontWeight: "800", color: Colors.textPrimary },
  viewCartBtn: { backgroundColor: Colors.primary, borderRadius: wp("2.5%"), paddingHorizontal: wp("5%"), paddingVertical: hp("1.3%"), shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  viewCartBtnContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: wp("2%") },
  viewCartText: { top: hp("0.2%"), fontSize: wp("3.6%"), fontWeight: "700", color: Colors.white, includeFontPadding: false, textAlignVertical: "center" },
});

export default HomeScreen;