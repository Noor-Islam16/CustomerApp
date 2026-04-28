// app/limited-stock.tsx or screens/LimitedStockScreen.tsx
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import ProductCard from "../components/ProductCard";
import Colors from "../constants/colors";
import {
  CATEGORIES,
  Product,
  PRODUCTS,
  ProductTag,
} from "../constants/products";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface CartItem {
  product: Product;
  quantity: number;
}

interface FilterState {
  categories: string[];
  tags: string[];
  priceRange: {
    min: number;
    max: number;
  };
  sortBy: "popularity" | "price_low" | "price_high" | "newest" | "rating";
  inStockOnly: boolean;
  discountedOnly: boolean;
}

const SORT_OPTIONS = [
  { id: "popularity", label: "Popularity", icon: "trending-up" },
  { id: "price_low", label: "Price: Low to High", icon: "arrow-up" },
  { id: "price_high", label: "Price: High to Low", icon: "arrow-down" },
  { id: "newest", label: "Newest First", icon: "clock" },
  { id: "rating", label: "Customer Rating", icon: "star" },
] as const;

const PRICE_RANGES = [
  { label: "Under ₹100", min: 0, max: 100 },
  { label: "₹100 - ₹300", min: 100, max: 300 },
  { label: "₹300 - ₹500", min: 300, max: 500 },
  { label: "₹500 - ₹1000", min: 500, max: 1000 },
  { label: "Above ₹1000", min: 1000, max: Infinity },
];

const AVAILABLE_TAGS: ProductTag[] = [
  "Best Seller",
  "Fast Moving",
  "Limited Stock",
  "Premium",
  "Organic",
  "Imported",
  "New Arrival",
  "Special Offer",
];

type LayoutType = "grid" | "list";

const LimitedStockScreen: React.FC = () => {
  // Get only Limited Stock products that are in stock
  const limitedStockProducts = PRODUCTS.filter(
    (p) => p.tags.includes("Limited Stock") && p.inStock,
  );

  // ── State ──
  const [filteredProducts, setFilteredProducts] =
    useState<Product[]>(limitedStockProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [layout, setLayout] = useState<LayoutType>("grid");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    tags: [],
    priceRange: { min: 0, max: Infinity },
    sortBy: "popularity",
    inStockOnly: false,
    discountedOnly: false,
  });

  const [tempFilters, setTempFilters] = useState<FilterState>(filters);
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  // ── Refs ──
  const scrollY = useRef(new Animated.Value(0)).current;

  // ── Animations ──
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // ── Entrance animation ──
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // ── Apply Filters and Sorting ──
  useEffect(() => {
    let result = [...limitedStockProducts];

    // Search filter
    if (searchQuery) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.category.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Category filter
    if (filters.categories.length > 0) {
      result = result.filter((p) => filters.categories.includes(p.category));
    }

    // Tags filter (excluding Limited Stock since it's already filtered)
    if (filters.tags.length > 0) {
      result = result.filter((p) =>
        p.tags.some((tag) => filters.tags.includes(tag)),
      );
    }

    // Price range
    result = result.filter(
      (p) =>
        p.price >= filters.priceRange.min && p.price <= filters.priceRange.max,
    );

    // In stock only (already filtered but kept for consistency)
    if (filters.inStockOnly) {
      result = result.filter((p) => p.inStock);
    }

    // Discounted only
    if (filters.discountedOnly) {
      result = result.filter((p) => p.discount && p.discount > 0);
    }

    // Sorting
    switch (filters.sortBy) {
      case "price_low":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price_high":
        result.sort((a, b) => b.price - a.price);
        break;
      case "newest":
        result.sort((a, b) => parseInt(b.id) - parseInt(a.id));
        break;
      case "rating":
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "popularity":
      default:
        result.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
        break;
    }

    setFilteredProducts(result);

    // Count active filters
    let count = 0;
    if (filters.categories.length > 0) count++;
    if (filters.tags.length > 0) count++;
    if (filters.priceRange.min > 0 || filters.priceRange.max < Infinity)
      count++;
    if (filters.inStockOnly) count++;
    if (filters.discountedOnly) count++;
    setActiveFilterCount(count);
  }, [filters, searchQuery]);

  // ── Handlers ──
  const handleProductPress = (product: Product) => {
    router.push(`/product/${product.id}`);
  };

  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleRemoveFromCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        return prev.filter((item) => item.product.id !== product.id);
      }
      return prev.map((item) =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity - 1 }
          : item,
      );
    });
  };

  const getCartQuantity = (productId: string): number =>
    cart.find((item) => item.product.id === productId)?.quantity || 0;

  const applyFilters = () => {
    setFilters(tempFilters);
    setShowFilterModal(false);
  };

  const resetFilters = () => {
    const resetState: FilterState = {
      categories: [],
      tags: [],
      priceRange: { min: 0, max: Infinity },
      sortBy: filters.sortBy,
      inStockOnly: false,
      discountedOnly: false,
    };
    setTempFilters(resetState);
    setFilters(resetState);
  };

  const clearAllFilters = () => {
    resetFilters();
    setShowFilterModal(false);
  };

  const toggleCategory = (categoryId: string) => {
    setTempFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter((c) => c !== categoryId)
        : [...prev.categories, categoryId],
    }));
  };

  const toggleTag = (tag: ProductTag) => {
    setTempFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const selectPriceRange = (min: number, max: number) => {
    setTempFilters((prev) => ({
      ...prev,
      priceRange: { min, max },
    }));
  };

  const selectSort = (sortBy: FilterState["sortBy"]) => {
    setFilters((prev) => ({ ...prev, sortBy }));
    setShowSortModal(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Colors.gradientStart}
      />

      {/* ── Animated Background Gradient ── */}
      <Animated.View style={[styles.gradientBg, { opacity: fadeAnim }]}>
        <View style={styles.gradientOverlay} />
      </Animated.View>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.7}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={wp("5.5%")}
              color={Colors.white}
            />
          </TouchableOpacity>
          <View>
            <View style={styles.headerTitleRow}>
              {/* <MaterialCommunityIcons
                name="alert-circle-outline"
                size={wp("5%")}
                color="#FF6B6B"
              /> */}
              <Text style={styles.headerTitle}>Limited Stock</Text>
            </View>
            <Text style={styles.headerSub}>
              {filteredProducts.length} products - Hurry up!
            </Text>
          </View>
        </View>
        {/* <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIcon}>
            <Feather name="share-2" size={wp("5%")} color={Colors.white} />
          </TouchableOpacity>
        </View> */}
      </View>

      <View style={styles.content}>
        {/* ── Search Bar ── */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <View style={styles.searchContainer}>
            <Feather name="search" size={wp("4.5%")} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search limited stock..."
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Feather
                  name="x-circle"
                  size={wp("4.5%")}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* ── Filter Bar ── */}
        <View style={styles.filterBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            <TouchableOpacity
              style={styles.filterChip}
              onPress={() => setShowSortModal(true)}
            >
              <Text style={styles.filterChipText}>
                {SORT_OPTIONS.find((s) => s.id === filters.sortBy)?.label ||
                  "Sort"}
              </Text>
              <Feather
                name="chevron-down"
                size={wp("3.5%")}
                color={Colors.primary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                activeFilterCount > 0 && styles.filterChipActive,
              ]}
              onPress={() => {
                setTempFilters(filters);
                setShowFilterModal(true);
              }}
            >
              <Feather
                name="filter"
                size={wp("3.8%")}
                color={activeFilterCount > 0 ? Colors.white : Colors.primary}
              />
              <Text
                style={[
                  styles.filterChipText,
                  activeFilterCount > 0 && styles.filterChipTextActive,
                ]}
              >
                Filter {activeFilterCount > 0 && `(${activeFilterCount})`}
              </Text>
            </TouchableOpacity>

            {/* Quick Filter Chips */}
            <TouchableOpacity
              style={[
                styles.quickChip,
                filters.discountedOnly && styles.quickChipActive,
              ]}
              onPress={() =>
                setFilters((prev) => ({
                  ...prev,
                  discountedOnly: !prev.discountedOnly,
                }))
              }
            >
              <Text
                style={[
                  styles.quickChipText,
                  filters.discountedOnly && styles.quickChipTextActive,
                ]}
              >
                Discounted
              </Text>
            </TouchableOpacity>

            {PRICE_RANGES.slice(0, 3).map((range) => (
              <TouchableOpacity
                key={range.label}
                style={[
                  styles.quickChip,
                  filters.priceRange.min === range.min &&
                    filters.priceRange.max === range.max &&
                    styles.quickChipActive,
                ]}
                onPress={() =>
                  setFilters((prev) => ({
                    ...prev,
                    priceRange: { min: range.min, max: range.max },
                  }))
                }
              >
                <Text
                  style={[
                    styles.quickChipText,
                    filters.priceRange.min === range.min &&
                      filters.priceRange.max === range.max &&
                      styles.quickChipTextActive,
                  ]}
                >
                  {range.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Layout Toggle */}
          <View style={styles.layoutToggle}>
            <TouchableOpacity
              style={[
                styles.layoutBtn,
                layout === "grid" && styles.layoutBtnActive,
              ]}
              onPress={() => setLayout("grid")}
            >
              <MaterialCommunityIcons
                name="view-grid"
                size={wp("4.5%")}
                color={layout === "grid" ? Colors.primary : Colors.textMuted}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.layoutBtn,
                layout === "list" && styles.layoutBtnActive,
              ]}
              onPress={() => setLayout("list")}
            >
              <MaterialCommunityIcons
                name="view-list"
                size={wp("4.5%")}
                color={layout === "list" ? Colors.primary : Colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Warning Banner ── */}
        {/* <View style={styles.warningBanner}>
          <MaterialCommunityIcons
            name="timer-sand"
            size={wp("7%")}
            color="#E65100"
          />
          <View style={styles.warningTextContainer}>
            <Text style={styles.warningTitle}>
              Limited Quantities Available!
            </Text>
            <Text style={styles.warningSubtitle}>
              These items are selling fast. Grab them before they're gone!
            </Text>
          </View>
        </View> */}

        {/* ── Product List ── */}
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          key={layout}
          numColumns={layout === "grid" ? 2 : 1}
          columnWrapperStyle={layout === "grid" ? styles.gridRow : undefined}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View
              style={
                layout === "list"
                  ? styles.listCardWrapper
                  : styles.gridCardWrapper
              }
            >
              <ProductCard
                product={item}
                onPress={handleProductPress}
                onAddToCart={handleAddToCart}
                onRemoveFromCart={handleRemoveFromCart}
                quantity={getCartQuantity(item.id)}
              />
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="package-variant-closed"
                size={wp("20%")}
                color={Colors.textMuted}
              />
              <Text style={styles.emptyTitle}>No products found</Text>
              <Text style={styles.emptyText}>
                Try adjusting your filters or search query
              </Text>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={clearAllFilters}
              >
                <Text style={styles.resetBtnText}>Clear All Filters</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </View>

      {/* ─────────────────────────────────────────────────────────────────────
          SORT MODAL
      ───────────────────────────────────────────────────────────────────── */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.sortModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort By</Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <Feather name="x" size={wp("5%")} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.sortOption}
                onPress={() => selectSort(option.id)}
              >
                <View style={styles.sortOptionLeft}>
                  <Feather
                    name={option.icon as any}
                    size={wp("4.5%")}
                    color={Colors.primary}
                  />
                  <Text style={styles.sortOptionText}>{option.label}</Text>
                </View>
                {filters.sortBy === option.id && (
                  <Feather
                    name="check"
                    size={wp("4.5%")}
                    color={Colors.primary}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────────────
          FILTER MODAL
      ───────────────────────────────────────────────────────────────────── */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Feather name="x" size={wp("5%")} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.filterContent}
            >
              {/* Categories */}
              <Text style={styles.filterSectionTitle}>Categories</Text>
              <View style={styles.filterChipsContainer}>
                {CATEGORIES.filter((c) => c.id !== "all").map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.filterChipBig,
                      tempFilters.categories.includes(category.id) &&
                        styles.filterChipBigActive,
                    ]}
                    onPress={() => toggleCategory(category.id)}
                  >
                    <Text style={styles.filterChipEmoji}>{category.icon}</Text>
                    <Text
                      style={[
                        styles.filterChipBigText,
                        tempFilters.categories.includes(category.id) &&
                          styles.filterChipBigTextActive,
                      ]}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Price Range */}
              <Text style={styles.filterSectionTitle}>Price Range</Text>
              <View style={styles.priceRangeContainer}>
                {PRICE_RANGES.map((range) => (
                  <TouchableOpacity
                    key={range.label}
                    style={[
                      styles.priceRangeChip,
                      tempFilters.priceRange.min === range.min &&
                        tempFilters.priceRange.max === range.max &&
                        styles.priceRangeChipActive,
                    ]}
                    onPress={() => selectPriceRange(range.min, range.max)}
                  >
                    <Text
                      style={[
                        styles.priceRangeText,
                        tempFilters.priceRange.min === range.min &&
                          tempFilters.priceRange.max === range.max &&
                          styles.priceRangeTextActive,
                      ]}
                    >
                      {range.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Tags */}
              <Text style={styles.filterSectionTitle}>Product Tags</Text>
              <View style={styles.filterChipsContainer}>
                {AVAILABLE_TAGS.filter((t) => t !== "Limited Stock").map(
                  (tag) => (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.tagChip,
                        tempFilters.tags.includes(tag) && styles.tagChipActive,
                      ]}
                      onPress={() => toggleTag(tag)}
                    >
                      <Text
                        style={[
                          styles.tagChipText,
                          tempFilters.tags.includes(tag) &&
                            styles.tagChipTextActive,
                        ]}
                      >
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
              </View>

              {/* Discount Toggle */}
              <Text style={styles.filterSectionTitle}>Offers</Text>
              <TouchableOpacity
                style={[styles.toggleRow, { borderBottomWidth: 0 }]}
                onPress={() =>
                  setTempFilters((prev) => ({
                    ...prev,
                    discountedOnly: !prev.discountedOnly,
                  }))
                }
              >
                <Text style={styles.toggleLabel}>Discounted Only</Text>
                <View
                  style={[
                    styles.toggle,
                    tempFilters.discountedOnly && styles.toggleActive,
                  ]}
                >
                  <View
                    style={[
                      styles.toggleKnob,
                      tempFilters.discountedOnly && styles.toggleKnobActive,
                    ]}
                  />
                </View>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.filterActions}>
              <TouchableOpacity style={styles.clearBtn} onPress={resetFilters}>
                <Text style={styles.clearBtnText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ── Gradient Background ──
  gradientBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.32,
    backgroundColor: Colors.gradientStart,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  gradientOverlay: {
    flex: 1,
    backgroundColor: Colors.gradientEnd,
    opacity: 0.3,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },

  // ── Header ──
  header: {
    paddingTop: Platform.OS === "ios" ? hp("6%") : hp("6%"),
    paddingHorizontal: wp("5%"),
    paddingBottom: hp("2%"),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("3%"),
  },
  backBtn: {
    width: wp("10%"),
    height: wp("10%"),
    borderRadius: wp("5%"),
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2%"),
  },
  headerTitle: {
    fontSize: wp("4.8%"),
    fontWeight: "700",
    color: Colors.white,
    letterSpacing: 0.2,
  },
  headerSub: {
    fontSize: wp("3%"),
    color: "rgba(255,255,255,0.8)",
    marginTop: hp("0.2%"),
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    width: wp("10%"),
    height: wp("10%"),
    borderRadius: wp("5%"),
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Content ──
  content: {
    flex: 1,
    paddingHorizontal: wp("4%"),
  },

  // ── Search ──
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2.5%"),
    backgroundColor: Colors.white,
    borderRadius: wp("3.5%"),
    paddingHorizontal: wp("4%"),
    height: hp("6%"),
    marginBottom: hp("1.5%"),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: wp("3.6%"),
    color: Colors.textPrimary,
    height: "100%",
  },

  // ── Warning Banner ──
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    borderRadius: wp("3.5%"),
    padding: wp("4%"),
    marginBottom: hp("2%"),
    borderWidth: 1,
    borderColor: "#FFB74D",
  },
  warningTextContainer: {
    flex: 1,
    marginLeft: wp("3%"),
  },
  warningTitle: {
    fontSize: wp("4%"),
    fontWeight: "800",
    color: "#E65100",
  },
  warningSubtitle: {
    fontSize: wp("3%"),
    color: "#BF360C",
  },

  // ── Filter Bar ──
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: hp("1.5%"),
  },
  filterScroll: {
    flex: 1,
    gap: wp("2%"),
    paddingRight: wp("2%"),
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("1.5%"),
    backgroundColor: Colors.white,
    paddingHorizontal: wp("3.5%"),
    paddingVertical: hp("0.9%"),
    borderRadius: wp("5%"),
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: wp("3.3%"),
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  quickChip: {
    backgroundColor: Colors.white,
    paddingHorizontal: wp("3.5%"),
    paddingVertical: hp("0.9%"),
    borderRadius: wp("5%"),
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  quickChipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  quickChipText: {
    fontSize: wp("3.3%"),
    color: Colors.textSecondary,
  },
  quickChipTextActive: {
    color: Colors.primary,
    fontWeight: "600",
  },
  layoutToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: wp("5%"),
    padding: wp("0.8%"),
    marginLeft: wp("2%"),
    borderWidth: 1,
    borderColor: Colors.border,
  },
  layoutBtn: {
    padding: wp("1.8%"),
    borderRadius: wp("4%"),
  },
  layoutBtnActive: {
    backgroundColor: Colors.primaryLight,
  },

  // ── Product List ──
  listContent: {
    paddingBottom: hp("3%"),
  },
  gridRow: {
    justifyContent: "space-between",
  },
  gridCardWrapper: {
    width: "48.5%",
    marginBottom: hp("1%"),
  },
  listCardWrapper: {
    width: "100%",
    marginBottom: hp("1.2%"),
  },

  // ── Empty State ──
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: hp("8%"),
    paddingHorizontal: wp("10%"),
  },
  emptyTitle: {
    fontSize: wp("4.5%"),
    fontWeight: "700",
    color: Colors.textPrimary,
    marginTop: hp("2%"),
    marginBottom: hp("1%"),
  },
  emptyText: {
    fontSize: wp("3.5%"),
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: wp("5%"),
    marginBottom: hp("3%"),
  },
  resetBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: wp("6%"),
    paddingVertical: hp("1.5%"),
    borderRadius: wp("3%"),
  },
  resetBtnText: {
    fontSize: wp("3.5%"),
    fontWeight: "700",
    color: Colors.white,
  },

  // ── Modals ──
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "flex-end",
  },
  sortModal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: wp("6%"),
    borderTopRightRadius: wp("6%"),
    paddingBottom: hp("3%"),
  },
  filterModal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: wp("6%"),
    borderTopRightRadius: wp("6%"),
    height: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: wp("5%"),
    paddingVertical: hp("2%"),
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: wp("4.5%"),
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: wp("5%"),
    paddingVertical: hp("1.8%"),
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sortOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("3%"),
  },
  sortOptionText: {
    fontSize: wp("3.8%"),
    color: Colors.textPrimary,
  },

  // Filter Content
  filterContent: {
    flex: 1,
    paddingHorizontal: wp("5%"),
    paddingTop: hp("2%"),
  },
  filterSectionTitle: {
    fontSize: wp("3.8%"),
    fontWeight: "700",
    color: Colors.textPrimary,
    marginTop: hp("2%"),
    marginBottom: hp("1.5%"),
  },
  filterChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: wp("2.5%"),
  },
  filterChipBig: {
    alignItems: "center",
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: wp("3%"),
    paddingVertical: hp("1.2%"),
    borderRadius: wp("3%"),
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: wp("20%"),
  },
  filterChipBigActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  filterChipEmoji: {
    fontSize: wp("5%"),
    marginBottom: hp("0.3%"),
  },
  filterChipBigText: {
    fontSize: wp("3%"),
    color: Colors.textSecondary,
  },
  filterChipBigTextActive: {
    color: Colors.primary,
    fontWeight: "600",
  },
  priceRangeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: wp("2.5%"),
  },
  priceRangeChip: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("1.2%"),
    borderRadius: wp("3%"),
    borderWidth: 1,
    borderColor: Colors.border,
  },
  priceRangeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  priceRangeText: {
    fontSize: wp("3.2%"),
    color: Colors.textSecondary,
  },
  priceRangeTextActive: {
    color: Colors.white,
    fontWeight: "600",
  },
  tagChip: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: wp("3.5%"),
    paddingVertical: hp("0.9%"),
    borderRadius: wp("5%"),
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tagChipText: {
    fontSize: wp("3%"),
    color: Colors.textSecondary,
  },
  tagChipTextActive: {
    color: Colors.white,
    fontWeight: "600",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: hp("1.5%"),
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  toggleLabel: {
    fontSize: wp("3.5%"),
    color: Colors.textPrimary,
  },
  toggle: {
    width: wp("12%"),
    height: hp("3%"),
    borderRadius: hp("1.5%"),
    backgroundColor: Colors.border,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: Colors.primary,
  },
  toggleKnob: {
    width: hp("2.5%"),
    height: hp("2.5%"),
    borderRadius: hp("1.25%"),
    backgroundColor: Colors.white,
  },
  toggleKnobActive: {
    alignSelf: "flex-end",
  },
  filterActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("3%"),
    paddingHorizontal: wp("5%"),
    paddingVertical: hp("2%"),
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  clearBtn: {
    flex: 1,
    paddingVertical: hp("1.5%"),
    borderRadius: wp("3%"),
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  clearBtnText: {
    fontSize: wp("3.5%"),
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  applyBtn: {
    flex: 2,
    paddingVertical: hp("1.5%"),
    borderRadius: wp("3%"),
    backgroundColor: Colors.primary,
    alignItems: "center",
  },
  applyBtnText: {
    fontSize: wp("3.5%"),
    fontWeight: "700",
    color: Colors.white,
  },
});

export default LimitedStockScreen;
