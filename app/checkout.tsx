// app/checkout.tsx
import { Text } from "@/context/FontContext";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
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
import Colors from "../constants/colors";
import { useCart } from "../context/CartContext";
import {
  apiGetMe,
  apiPlaceOrder,
  apiUpdateProfile,
  BASE_URL,
  Order,
  PlaceOrderPayload,
} from "./services/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CartOrderData {
  items: any[];
  subtotal: number;
  couponCode?: string;
  couponDiscount: number;
  totalAmount: number;
  appliedCoupon: string | null;
}

interface UserProfile {
  contactName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstNumber?: string;
}

// ─── Helper: Get price from product ────────────────────────────────────────
const getProductPrice = (product: any): number => {
  if (product.sellingPrice !== undefined && product.sellingPrice !== null) {
    return product.sellingPrice;
  }
  return product.price || product.originalPrice || 0;
};

const getItemTotal = (item: any): number => {
  const price = getProductPrice(item.product);
  return price * item.quantity;
};

// ─── Component ────────────────────────────────────────────────────────────────

const CheckoutScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { cart, clearCart } = useCart();

  // ── State ──
  const [orderData, setOrderData] = useState<CartOrderData | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userPhone, setUserPhone] = useState<string>("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [approvalStatus, setApprovalStatus] = useState<string>("pending");

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  // Edit modal state
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddressLine1, setEditAddressLine1] = useState("");
  const [editAddressLine2, setEditAddressLine2] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editPincode, setEditPincode] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);

  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [upiId, setUpiId] = useState<string>("");
  const [loadingQR, setLoadingQR] = useState(false);

  const slideAnim = useRef(new Animated.Value(300)).current;
  const editSlideAnim = useRef(new Animated.Value(300)).current;

  // ── Parse cart data from params ──
  useEffect(() => {
    if (params.orderData) {
      try {
        const parsed = JSON.parse(params.orderData as string);

        if (parsed.items) {
          parsed.items = parsed.items.map((item: any) => ({
            ...item,
            product: {
              ...item.product,
              sellingPrice: getProductPrice(item.product),
            },
          }));
        }

        setOrderData(parsed);
      } catch {
        Alert.alert("Error", "Failed to load order details.");
        router.back();
      }
    }
  }, [params.orderData]);

  // ── Fetch user profile for delivery address ──
  const fetchProfile = useCallback(async () => {
    try {
      setLoadingProfile(true);
      const res = await apiGetMe();
      setUserProfile(res.user.profile);
      setUserPhone(res.user.phone || "");
      setApprovalStatus(res.user.approvalStatus || "pending");
    } catch {
      setUserProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // ── Payment Modal animation ──
  useEffect(() => {
    if (showPaymentModal) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(300);
    }
  }, [showPaymentModal]);

  // ── Edit Modal animation ──
  useEffect(() => {
    if (showEditModal) {
      // Populate edit fields with current profile data
      setEditName(userProfile?.contactName || "");
      setEditPhone(userPhone || "");
      setEditAddressLine1(userProfile?.addressLine1 || "");
      setEditAddressLine2(userProfile?.addressLine2 || "");
      setEditCity(userProfile?.city || "");
      setEditState(userProfile?.state || "");
      setEditPincode(userProfile?.pincode || "");

      Animated.spring(editSlideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      editSlideAnim.setValue(300);
    }
  }, [showEditModal, userProfile, userPhone]);

  const handlePickLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Location permission is required to auto-fill address.",
        );
        setLocationLoading(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = location.coords;
      const [address] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      if (address) {
        setEditAddressLine1(address.street || address.name || editAddressLine1);
        setEditCity(address.city || address.subregion || editCity);
        setEditState(address.region || editState);
        setEditPincode(address.postalCode || editPincode);
      }
    } catch {
      Alert.alert("Error", "Could not fetch location. Please enter manually.");
    } finally {
      setLocationLoading(false);
    }
  };

  // ── Fetch QR Code from Admin ─────────────────────────────────────────────
  const fetchQRCode = useCallback(async () => {
    try {
      setLoadingQR(true);
      // Try to get the customer's auth token if available
      const token = await AsyncStorage.getItem("auth_token");

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Add customer token if available
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${BASE_URL}/api/admin/qr-code`, {
        headers,
      });
      const data = await response.json();
      console.log("QR Code Response:", data); // For debugging

      if (data.success && data.data) {
        setQrCodeUrl(data.data.qrCodeUrl || "");
        setUpiId(data.data.upiId || "");
      }
    } catch (error) {
      console.error("Failed to fetch QR code:", error);
    } finally {
      setLoadingQR(false);
    }
  }, []);

  // Fetch QR code when payment modal opens
  useEffect(() => {
    if (showPaymentModal) {
      fetchQRCode();
    }
  }, [showPaymentModal, fetchQRCode]);

  const handleConfirmPayment = useCallback(async () => {
    setShowPaymentModal(false);

    if (!orderData || !userProfile) return;

    if (
      !userProfile.contactName ||
      !userProfile.addressLine1 ||
      !userProfile.city ||
      !userProfile.state ||
      !userProfile.pincode
    ) {
      Alert.alert(
        "Incomplete Address",
        "Please complete your personal information in your profile before placing an order.",
        [{ text: "Go to Profile", onPress: () => router.push("/(tabs)/home") }],
      );
      return;
    }

    setIsPlacingOrder(true);

    try {
      // ✅ FIX: Use "productId" instead of "product"
      const payload: PlaceOrderPayload = {
        items: orderData.items.map((item: any) => ({
          productId: item.product._id || item.product.id, // 👈 Changed to productId
          quantity: item.quantity,
        })),
        deliveryAddress: {
          contactName: userProfile.contactName.trim(),
          addressLine1: userProfile.addressLine1.trim(),
          addressLine2: (userProfile.addressLine2 || "").trim(),
          city: userProfile.city.trim(),
          state: userProfile.state.trim(),
          pincode: userProfile.pincode.trim(),
          phone: userPhone,
        },
        paymentMethod: "upi",
        couponDiscount: orderData.couponDiscount || 0,
        totalAmount: orderData.totalAmount,
        subtotal: orderData.subtotal,
      };

      console.log("📤 Sending order:", JSON.stringify(payload, null, 2));

      const result = await apiPlaceOrder(payload);

      console.log("✅ Order placed:", result);

      clearCart();

      Alert.alert(
        "Order Placed! 🎉",
        `Your order ${result.data.orderNumber} has been placed successfully.`,
        [
          {
            text: "View Order",
            onPress: () =>
              router.replace({
                pathname: "/(tabs)/myorders",
                params: { orderId: result.data._id },
              }),
          },
          {
            text: "Continue Shopping",
            onPress: () => router.replace("/(tabs)/home"),
          },
        ],
      );
    } catch (err: any) {
      console.error("❌ Order failed:", err);

      let errorMessage =
        err?.message || "Something went wrong. Please try again.";

      // If there are validation errors, show them
      if (err?.errors) {
        errorMessage = Array.isArray(err.errors)
          ? err.errors.join("\n")
          : err.errors;
      }

      Alert.alert("Order Failed", errorMessage, [{ text: "OK" }]);
    } finally {
      setIsPlacingOrder(false);
    }
  }, [orderData, userProfile, userPhone, clearCart]);

  const handlePlaceOrder = () => {
    if (!userProfile?.contactName) {
      Alert.alert(
        "Complete Profile",
        "Please complete your profile with personal information before placing an order.",
        [
          { text: "Go to Profile", onPress: () => router.push("/(tabs)/home") },
          { text: "Cancel", style: "cancel" },
        ],
      );
      return;
    }

    if (approvalStatus === "pending" || approvalStatus === "manual") {
      setShowApprovalModal(true);
      return;
    }

    if (approvalStatus === "rejected") {
      Alert.alert(
        "Account Not Approved",
        "Your account has been rejected. Please contact support for more information.",
        [{ text: "Go to Home", onPress: () => router.push("/(tabs)/home") }],
      );
      return;
    }

    setShowPaymentModal(true);
  };

  const handleCloseModal = () => {
    setShowPaymentModal(false);
  };

  // ─── Edit Profile Handlers ───────────────────────────────────────────────

  const handleSaveEditProfile = async () => {
    if (
      !editName.trim() ||
      !editAddressLine1.trim() ||
      !editCity.trim() ||
      !editState.trim() ||
      !editPincode.trim()
    ) {
      Alert.alert("Required Fields", "Please fill in all required fields.");
      return;
    }

    if (editPincode.trim().length !== 6) {
      Alert.alert("Invalid Pincode", "Please enter a valid 6-digit pincode.");
      return;
    }

    try {
      setIsSavingProfile(true);
      await apiUpdateProfile({
        contactName: editName.trim(),
        phone: editPhone.trim(),
        addressLine1: editAddressLine1.trim(),
        addressLine2: editAddressLine2.trim(),
        city: editCity.trim(),
        state: editState.trim(),
        pincode: editPincode.trim(),
      });

      // Refresh profile data
      await fetchProfile();
      setShowEditModal(false);
      Alert.alert("Success", "Your profile information has been updated.");
    } catch (err: any) {
      Alert.alert(
        "Update Failed",
        err.message || "Something went wrong. Please try again.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
  };

  // ─── Loading / Empty states ───────────────────────────────────────────────

  if (!orderData || loadingProfile) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading checkout...</Text>
      </View>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const hasAddress =
    userProfile?.contactName && userProfile?.addressLine1 && userProfile?.city;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#008080" />

      {/* Header */}
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd, Colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.headerGradient]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={wp("5.5%")}
              color={Colors.white}
            />
          </TouchableOpacity>

          {/* Title and Subtitle grouped together */}
          <View style={styles.headerTextGroup}>
            <Text style={styles.headerTitle}>Checkout</Text>
            <Text style={styles.headerSubtitle}>
              Review your order and place it
            </Text>
          </View>

          <View style={{ width: wp("10%") }} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: hp("14%") }}
      >
        {/* ── Delivery Address ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <View style={styles.addressCard}>
            <View style={styles.addressHeader}>
              <View style={styles.addressHeaderLeft}>
                <MaterialCommunityIcons
                  name="home"
                  size={wp("5%")}
                  color={Colors.primary}
                />
                <View style={styles.addressTypeBadge}>
                  <Text style={styles.addressTypeText}>Home</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.changeAddressBtn}
                onPress={() => setShowEditModal(true)}
              >
                <Text style={styles.changeAddressText}>
                  {hasAddress ? "Change" : "Add"}
                </Text>
              </TouchableOpacity>
            </View>

            {hasAddress ? (
              <>
                <Text style={styles.addressName}>
                  {userProfile?.contactName}
                </Text>
                <Text style={styles.addressText}>
                  {userProfile?.addressLine1}
                  {userProfile?.addressLine2
                    ? `,\n${userProfile.addressLine2}`
                    : ""}
                  {`\n${userProfile?.city}, ${userProfile?.state} - ${userProfile?.pincode}`}
                </Text>
                <View style={styles.addressPhoneRow}>
                  <Feather
                    name="phone"
                    size={wp("3.5%")}
                    style={{ marginBottom: wp("0.5%") }}
                    color="#666"
                  />
                  <Text style={styles.addressPhone}>
                    {userPhone || "Phone not available"}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.missingAddressBox}>
                <Feather name="alert-circle" size={wp("4%")} color="#ff6b6b" />
                <Text style={styles.missingAddressText}>
                  Delivery address is incomplete. Please update your profile.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Order Summary ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryCard}>
            {orderData.items.map((item: any, index: number) => (
              <View key={index} style={styles.summaryItem}>
                <Image
                  source={{
                    uri:
                      item.product.images?.[0]?.url ||
                      "https://via.placeholder.com/100",
                  }}
                  style={styles.summaryItemImage}
                  resizeMode="cover"
                />
                <View style={styles.summaryItemContent}>
                  <Text style={styles.summaryItemName} numberOfLines={2}>
                    {item.product.name}
                  </Text>
                  <Text style={styles.summaryItemVariant}>
                    {item.product.color || "Default"}
                  </Text>
                </View>
                <View style={styles.summaryItemRight}>
                  <View style={styles.summaryItemQtyBadge}>
                    <Text style={styles.summaryItemQtyText}>
                      ×{item.quantity}
                    </Text>
                  </View>
                  <Text style={styles.summaryItemPrice}>
                    ₹{getItemTotal(item)}
                  </Text>
                </View>
              </View>
            ))}

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>
                ₹{orderData.subtotal || 0}
              </Text>
            </View>

            <View style={[styles.divider, { marginTop: hp("0.75%") }]} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>
                ₹{orderData.totalAmount || 0}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Payment Method ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.paymentCard}>
            <View style={styles.paymentOption}>
              <View style={styles.paymentOptionLeft}>
                <MaterialCommunityIcons
                  name="qrcode-scan"
                  size={wp("6%")}
                  color={Colors.primary}
                />
                <View>
                  <Text style={styles.paymentOptionTitle}>UPI / QR Code</Text>
                  <Text style={styles.paymentOptionSubtitle}>
                    Pay securely using any UPI app
                  </Text>
                </View>
              </View>
              <View style={styles.radioButtonSelected}>
                <View style={styles.radioButtonInner} />
              </View>
            </View>

            <TouchableOpacity style={styles.addUPIOption}>
              <Text style={styles.addUPIText}>+ Add New UPI ID</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* ── Bottom Bar ── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom }]}>
        <View style={styles.bottomBarContent}>
          <View style={styles.bottomBarLeft}>
            <Text style={styles.bottomBarLabel}>Total Amount</Text>
            <Text style={styles.bottomBarAmount}>
              ₹{orderData.totalAmount || 0}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.placeOrderBtn, isPlacingOrder && { opacity: 0.7 }]}
            onPress={handlePlaceOrder}
            activeOpacity={0.9}
            disabled={isPlacingOrder}
          >
            <LinearGradient
              colors={[
                Colors.gradientStart,
                Colors.gradientEnd,
                Colors.primaryDark,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.placeOrderGradient}
            >
              {isPlacingOrder ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Feather
                    name="lock"
                    size={wp("4%")}
                    style={{ marginBottom: wp("1%") }}
                    color={Colors.white}
                  />
                  <Text style={styles.placeOrderText}>Place Order</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Edit Address Modal ── */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseEditModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.editModalContent,
              {
                transform: [{ translateY: editSlideAnim }],
                paddingBottom: insets.bottom + hp("2%"),
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile Information</Text>
              <TouchableOpacity onPress={handleCloseEditModal}>
                <Feather name="x" size={wp("5%")} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.editModalScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Contact Name */}
              <View style={styles.editField}>
                <Text style={styles.editLabel}>
                  Contact Name <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  style={styles.editInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter your full name"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="words"
                />
              </View>

              {/* Phone (Read-only) */}
              <View style={styles.editField}>
                <Text style={styles.editLabel}>Mobile Number</Text>
                <View style={[styles.editInput, styles.editInputDisabled]}>
                  <Text style={styles.editDisabledText}>+91 {editPhone}</Text>
                  <View style={styles.editVerifiedBadge}>
                    <Feather
                      name="check-circle"
                      size={wp("3%")}
                      color={Colors.success}
                    />
                    <Text style={styles.editVerifiedText}>Verified</Text>
                  </View>
                </View>
              </View>

              {/* ── Auto Location Detection Button ── */}
              <TouchableOpacity
                style={styles.mapPickerBtn}
                onPress={handlePickLocation}
                activeOpacity={0.8}
                disabled={locationLoading}
              >
                {locationLoading ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="map-marker-check"
                      size={wp("5%")}
                      color={Colors.primary}
                    />
                    <Text style={styles.mapPickerText}>
                      Use Current Location
                    </Text>
                    <Feather
                      name="arrow-right"
                      size={wp("4.5%")}
                      color={Colors.primary}
                    />
                  </>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.editDivider}>
                <View style={styles.editDividerLine} />
                <Text style={styles.editDividerText}>Delivery Address</Text>
                <View style={styles.editDividerLine} />
              </View>

              {/* Address Line 1 */}
              <View style={styles.editField}>
                <Text style={styles.editLabel}>
                  Address Line 1 <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  style={styles.editInput}
                  value={editAddressLine1}
                  onChangeText={setEditAddressLine1}
                  placeholder="Shop / Flat No., Building Name"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>

              {/* Address Line 2 */}
              <View style={styles.editField}>
                <Text style={styles.editLabel}>Address Line 2 (Optional)</Text>
                <TextInput
                  style={styles.editInput}
                  value={editAddressLine2}
                  onChangeText={setEditAddressLine2}
                  placeholder="Street, Area, Landmark"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>

              {/* City & State */}
              <View style={styles.editRow}>
                <View
                  style={[styles.editField, { flex: 1, marginRight: wp("2%") }]}
                >
                  <Text style={styles.editLabel}>
                    City <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.editInput}
                    value={editCity}
                    onChangeText={setEditCity}
                    placeholder="e.g. Surat"
                    placeholderTextColor={Colors.textMuted}
                    autoCapitalize="words"
                  />
                </View>
                <View
                  style={[styles.editField, { flex: 1, marginLeft: wp("2%") }]}
                >
                  <Text style={styles.editLabel}>
                    State <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.editInput}
                    value={editState}
                    onChangeText={setEditState}
                    placeholder="e.g. Gujarat"
                    placeholderTextColor={Colors.textMuted}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Pincode */}
              <View style={styles.editField}>
                <Text style={styles.editLabel}>
                  Pincode <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  style={styles.editInput}
                  value={editPincode}
                  onChangeText={(text) =>
                    setEditPincode(text.replace(/[^0-9]/g, ""))
                  }
                  placeholder="6-digit pincode"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
            </ScrollView>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.editSaveBtn, isSavingProfile && { opacity: 0.7 }]}
              onPress={handleSaveEditProfile}
              activeOpacity={0.9}
              disabled={isSavingProfile}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.editSaveGradient}
              >
                {isSavingProfile ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <Feather
                      name="check"
                      size={wp("4.5%")}
                      color={Colors.white}
                    />
                    <Text style={styles.editSaveText}>Save Changes</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* ── Approval Pending Modal ── */}
      <Modal
        visible={showApprovalModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowApprovalModal(false)}
      >
        <View style={styles.approvalModalOverlay}>
          <View style={styles.approvalModalContent}>
            <View style={styles.approvalIconCircle}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={wp("12%")}
                color="#D97706"
              />
            </View>
            <Text style={styles.approvalModalTitle}>
              Account Under Review ⏳
            </Text>
            <Text style={styles.approvalModalMessage}>
              {approvalStatus === "manual"
                ? "Your profile is under manual review by our admin team. You'll be able to place orders once your account is approved."
                : "Your account is currently pending approval. Our admin team will review your profile within 24 hours. We'll notify you once approved."}
            </Text>
            <TouchableOpacity
              style={styles.approvalGoHomeBtn}
              onPress={() => {
                setShowApprovalModal(false);
                router.push("/(tabs)/home");
              }}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#008080", "#006666"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.approvalGoHomeGradient}
              >
                <Feather name="home" size={wp("4.5%")} color={Colors.white} />
                <Text style={styles.approvalGoHomeText}>Go to Home</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Payment QR Modal ── */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContent,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Scan & Pay</Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Feather name="x" size={wp("5%")} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Scan the QR code with any UPI app to pay
            </Text>

            <View style={styles.qrContainer}>
              {loadingQR ? (
                <View style={styles.qrLoadingContainer}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.qrLoadingText}>Loading QR code...</Text>
                </View>
              ) : qrCodeUrl ? (
                <View style={styles.qrImageWrapper}>
                  <Image
                    source={{ uri: qrCodeUrl }}
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                </View>
              ) : (
                <View style={styles.qrPlaceholder}>
                  <MaterialCommunityIcons
                    name="qrcode"
                    size={wp("30%")}
                    color="#008080"
                  />
                  <Text style={styles.qrPlaceholderText}>
                    QR code not available
                  </Text>
                </View>
              )}
            </View>

            {/* Amount Display */}
            <View style={styles.amountContainer}>
              <Text style={styles.amountLabel}>Amount to Pay</Text>
              <Text style={styles.amountValue}>
                ₹{orderData.totalAmount?.toLocaleString("en-IN") || 0}
              </Text>
              {upiId ? (
                <View style={styles.upiIdContainer}>
                  <Text style={styles.upiIdLabel}>UPI ID</Text>
                  <Text style={styles.upiIdValue}>{upiId}</Text>
                </View>
              ) : null}
            </View>

            <TouchableOpacity
              style={[
                styles.confirmPaymentBtn,
                isPlacingOrder && { opacity: 0.7 },
              ]}
              onPress={handleConfirmPayment}
              disabled={isPlacingOrder}
            >
              {isPlacingOrder ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.confirmPaymentText}>I've Paid</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f5f5f5" },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
    gap: hp("2%"),
  },
  loadingText: { fontSize: wp("3.8%"), color: "#666" },
  headerGradient: {
    paddingTop: Platform.OS === "ios" ? hp("6%") : hp("6%"),
    paddingHorizontal: wp("5%"),
    paddingBottom: hp("3%"),
    borderBottomLeftRadius: wp("8%"),
    borderBottomRightRadius: wp("8%"),
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  headerTextGroup: {
    flex: 1,
    marginLeft: wp("3%"),
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: wp("4.5%"),
    fontWeight: "700",
    color: Colors.white,
    lineHeight: wp("5%"),
  },
  headerSubtitle: {
    fontSize: wp("3.5%"),
    color: "rgba(255,255,255,0.8)",
    marginTop: hp("0.8%"),
    lineHeight: wp("4%"),
  },
  backBtn: {
    width: wp("10%"),
    height: wp("10%"),
    borderRadius: wp("5%"),
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: wp("4%"),
    paddingTop: hp("2%"),
  },
  section: {
    marginBottom: hp("2%"),
  },
  sectionTitle: {
    fontSize: wp("4%"),
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: hp("1.5%"),
  },
  addressCard: {
    backgroundColor: Colors.white,
    borderRadius: wp("3%"),
    paddingVertical: wp("2%"),
    paddingHorizontal: wp("4%"),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  addressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: hp("0.5%"),
  },
  addressHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2%"),
  },
  addressTypeBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: wp("3%"),
    paddingVertical: hp("0.3%"),
    borderRadius: wp("1.5%"),
  },
  addressTypeText: {
    top: hp("0.15%"),
    fontSize: wp("3%"),
    fontWeight: "600",
    color: Colors.primary,
  },
  addressName: {
    fontSize: wp("3.8%"),
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: hp("0.25%"),
  },
  addressText: {
    fontWeight: "600",
    fontSize: wp("3.3%"),
    color: "#666",
    lineHeight: wp("5%"),
    marginBottom: hp("0.25%"),
  },
  addressPhoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("1%"),
    marginTop: hp("0.25%"),
  },
  addressPhone: {
    fontWeight: "600",
    fontSize: wp("3.3%"),
    color: "#666",
  },
  changeAddressBtn: {
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("0.25%"),
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: wp("2%"),
  },
  changeAddressText: {
    top: hp("0.125%"),
    fontSize: wp("3%"),
    fontWeight: "600",
    color: Colors.primary,
  },
  missingAddressBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: wp("2%"),
    backgroundColor: "#FFF0F0",
    padding: wp("3%"),
    borderRadius: wp("2%"),
    borderWidth: 1,
    borderColor: "#ff6b6b40",
  },
  missingAddressText: {
    flex: 1,
    fontSize: wp("3.2%"),
    color: "#ff6b6b",
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: wp("3%"),
    paddingVertical: wp("2%"),
    paddingHorizontal: wp("4%"),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: hp("1%"),
  },
  summaryItemImage: {
    width: wp("12%"),
    height: wp("12%"),
    borderRadius: wp("1.5%"),
    backgroundColor: "#f8f8f8",
  },
  summaryItemContent: {
    flex: 1,
    marginLeft: wp("3%"),
    justifyContent: "center",
  },
  summaryItemName: {
    fontSize: wp("3.3%"),
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  summaryItemVariant: {
    fontWeight: "600",
    fontSize: wp("2.8%"),
    color: "#999",
    marginTop: hp("0.2%"),
  },
  summaryItemRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: wp("2%"),
    marginLeft: wp("2%"),
  },
  summaryItemQtyBadge: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: wp("2%"),
    paddingVertical: hp("0.3%"),
    borderRadius: wp("1%"),
    justifyContent: "center",
    alignItems: "center",
  },
  summaryItemQtyText: {
    fontSize: wp("2.8%"),
    fontWeight: "600",
    color: "#666",
  },
  summaryItemPrice: {
    fontSize: wp("3.3%"),
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: hp("1.5%"),
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: hp("0.6%"),
  },
  summaryLabel: {
    fontWeight: "600",
    fontSize: wp("3.3%"),
    color: "#666",
  },
  summaryValue: {
    fontSize: wp("3.3%"),
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  discountValue: {
    fontSize: wp("3.3%"),
    fontWeight: "700",
    color: Colors.primary,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: wp("3.8%"),
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  totalValue: {
    fontSize: wp("4%"),
    fontWeight: "700",
    color: Colors.primary,
  },
  paymentCard: {
    backgroundColor: Colors.white,
    borderRadius: wp("3%"),
    padding: wp("4%"),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: hp("1%"),
  },
  paymentOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("3%"),
  },
  paymentOptionTitle: {
    fontSize: wp("3.5%"),
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  paymentOptionSubtitle: {
    fontWeight: "600",
    fontSize: wp("2.8%"),
    color: "#999",
  },
  paymentDivider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: hp("1%"),
  },
  radioButtonSelected: {
    width: wp("5%"),
    height: wp("5%"),
    borderRadius: wp("2.5%"),
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  radioButton: {
    width: wp("5%"),
    height: wp("5%"),
    borderRadius: wp("2.5%"),
    borderWidth: 1.5,
    borderColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
  },
  radioButtonInner: {
    width: wp("2.5%"),
    height: wp("2.5%"),
    borderRadius: wp("1.25%"),
    backgroundColor: Colors.primary,
  },
  addUPIOption: {
    marginTop: hp("1.5%"),
    paddingTop: hp("1.5%"),
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  addUPIText: {
    fontSize: wp("3.5%"),
    fontWeight: "600",
    color: Colors.primary,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  bottomBarContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: wp("4%"),
    paddingTop: hp("1.5%"),
  },
  bottomBarLeft: {
    flex: 1,
  },
  bottomBarLabel: {
    fontSize: wp("3%"),
    color: "#999",
  },
  bottomBarAmount: {
    fontSize: wp("4.5%"),
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  placeOrderBtn: {
    borderRadius: wp("2%"),
    overflow: "hidden",
  },
  placeOrderGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2%"),
    paddingHorizontal: wp("5%"),
    paddingVertical: hp("1.5%"),
  },
  placeOrderText: {
    marginTop: hp("0.2%"),
    fontSize: wp("3.5%"),
    fontWeight: "600",
    color: Colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: wp("6%"),
    borderTopRightRadius: wp("6%"),
    padding: wp("5%"),
    paddingBottom: Platform.OS === "ios" ? hp("4%") : hp("6%"),
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: hp("1%"),
  },
  modalTitle: {
    fontSize: wp("5%"),
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: wp("3.5%"),
    color: "#666",
    marginBottom: hp("2.5%"),
  },
  // Replace the existing qrCode style and add new QR styles
  qrContainer: {
    alignItems: "center",
    marginBottom: hp("2%"),
  },
  qrLoadingContainer: {
    width: wp("60%"),
    aspectRatio: 1,
    backgroundColor: "#f8f8f8",
    borderRadius: wp("4%"),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderStyle: "dashed",
    gap: hp("1%"),
  },
  qrLoadingText: {
    fontSize: wp("3%"),
    color: Colors.textMuted,
    fontWeight: "500",
  },
  qrImageWrapper: {
    width: wp("65%"),
    aspectRatio: 1,
    backgroundColor: Colors.white,
    borderRadius: wp("4%"),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.border,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  qrImage: {
    width: "90%",
    height: "90%",
  },
  qrPlaceholder: {
    width: wp("60%"),
    aspectRatio: 1,
    backgroundColor: "#f8f8f8",
    borderRadius: wp("4%"),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderStyle: "dashed",
    gap: hp("1%"),
  },
  qrPlaceholderText: {
    fontSize: wp("3%"),
    color: Colors.textMuted,
    fontWeight: "500",
  },
  qrAmount: {
    fontSize: wp("5%"),
    fontWeight: "800",
    color: Colors.primary,
    marginTop: hp("1%"),
  },

  // ── Amount Display ──
  amountContainer: {
    backgroundColor: Colors.primaryLight,
    borderRadius: wp("3%"),
    padding: wp("4%"),
    marginBottom: hp("2%"),
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.accentLight,
  },
  amountLabel: {
    fontSize: wp("3%"),
    color: Colors.textSecondary,
    fontWeight: "600",
    marginBottom: hp("0.5%"),
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: wp("7%"),
    fontWeight: "800",
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  upiIdContainer: {
    marginTop: hp("1.5%"),
    paddingTop: hp("1.5%"),
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    width: "100%",
    alignItems: "center",
  },
  upiIdLabel: {
    fontSize: wp("2.8%"),
    color: Colors.textMuted,
    fontWeight: "500",
    marginBottom: hp("0.3%"),
  },
  upiIdValue: {
    fontSize: wp("3.5%"),
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  confirmPaymentBtn: {
    backgroundColor: Colors.primary,
    borderRadius: wp("3%"),
    paddingVertical: hp("1.6%"),
    alignItems: "center",
    minHeight: hp("5.5%"),
    justifyContent: "center",
  },
  confirmPaymentText: {
    fontSize: wp("4%"),
    fontWeight: "700",
    color: Colors.white,
  },

  // ── Edit Modal Styles ──────────────────────────────────────────────────
  editModalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: wp("6%"),
    borderTopRightRadius: wp("6%"),
    padding: wp("5%"),
    maxHeight: hp("85%"),
  },
  editModalScroll: {
    marginBottom: hp("2%"),
  },
  editField: {
    marginBottom: hp("2%"),
  },
  editLabel: {
    fontSize: wp("3.5%"),
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: hp("0.8%"),
  },
  requiredStar: {
    color: Colors.error,
  },
  editInput: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: wp("2.5%"),
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: wp("3.5%"),
    paddingVertical: hp("1.3%"),
    fontSize: wp("3.6%"),
    color: Colors.textPrimary,
  },
  editInputDisabled: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.surfaceAlt,
    borderColor: Colors.border,
  },
  editDisabledText: {
    fontSize: wp("3.6%"),
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  editVerifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("1%"),
    backgroundColor: "#D1FAE5",
    paddingHorizontal: wp("2%"),
    paddingVertical: hp("0.3%"),
    borderRadius: wp("2%"),
  },
  editVerifiedText: {
    fontSize: wp("2.8%"),
    color: Colors.success,
    fontWeight: "700",
  },
  mapPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primaryLight,
    borderRadius: wp("2.5%"),
    paddingHorizontal: wp("3.5%"),
    paddingVertical: hp("1.3%"),
    marginBottom: hp("1.5%"),
    borderWidth: 1.5,
    borderColor: Colors.primary + "40",
    gap: wp("2.5%"),
  },
  mapPickerText: {
    flex: 1,
    fontSize: wp("3.4%"),
    fontWeight: "600",
    color: Colors.primary,
  },
  editDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2.5%"),
    marginBottom: hp("2%"),
  },
  editDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  editDividerText: {
    fontSize: wp("3.2%"),
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  editRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  editSaveBtn: {
    borderRadius: wp("3%"),
    overflow: "hidden",
  },
  editSaveGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp("2%"),
    paddingVertical: hp("1.6%"),
  },
  editSaveText: {
    fontSize: wp("4%"),
    fontWeight: "700",
    color: Colors.white,
  },

  // ── Approval Modal Styles ──────────────────────────────────────────────────
  approvalModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: wp("8%"),
  },
  approvalModalContent: {
    backgroundColor: Colors.white,
    borderRadius: wp("6%"),
    padding: wp("6%"),
    alignItems: "center",
    width: "100%",
  },
  approvalIconCircle: {
    width: wp("22%"),
    height: wp("22%"),
    borderRadius: wp("11%"),
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: hp("2.5%"),
  },
  approvalModalTitle: {
    fontSize: wp("5%"),
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: hp("1.5%"),
  },
  approvalModalMessage: {
    fontSize: wp("3.5%"),
    color: "#666",
    textAlign: "center",
    lineHeight: wp("5.5%"),
    marginBottom: hp("2%"),
  },
  approvalGoHomeBtn: {
    width: "100%",
    borderRadius: wp("3.5%"),
    overflow: "hidden",
  },
  approvalGoHomeGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp("2.5%"),
    paddingVertical: hp("1.8%"),
  },
  approvalGoHomeText: {
    fontSize: wp("4%"),
    fontWeight: "700",
    color: Colors.white,
  },
});

export default CheckoutScreen;
