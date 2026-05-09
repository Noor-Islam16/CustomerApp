import { Text } from "@/components/CustomText";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
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
import Colors from "../../constants/colors";
import {
  apiCompleteProfile,
  apiGetMe,
  apiSendOtp,
  apiVerifyOtp,
  getToken,
  saveToken,
} from "../services/api";

// ─── Types ────────────────────────────────────────────────────────────────────
type Screen = "phone" | "otp" | "profile";

interface CountryCode {
  flag: string;
  code: string;
  dial: string;
}

interface ProfileForm {
  contactName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  gstNumber: string;
  latitude?: number;
  longitude?: number;
}

interface FieldError {
  contactName?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstNumber?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const { height } = Dimensions.get("window");
const COUNTRY: CountryCode = { flag: "🇮🇳", code: "IN", dial: "+91" };
const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const isGstValid = (gst: string) => GST_REGEX.test(gst.trim().toUpperCase());

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Assam",
  "Bihar",
  "Delhi",
  "Gujarat",
  "Haryana",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "West Bengal",
];

// ─── Main Component ───────────────────────────────────────────────────────────
const LoginScreen: React.FC = () => {
  // ── Screen state ──
  const [screen, setScreen] = useState<Screen>("phone");
  const [checkingAuth, setCheckingAuth] = useState(true);

  // ── Phone / OTP state ──
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  // ── Profile form state ──
  const [form, setForm] = useState<ProfileForm>({
    contactName: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    gstNumber: "",
    latitude: undefined,
    longitude: undefined,
  });
  const [fieldErrors, setFieldErrors] = useState<FieldError>({});
  const [activeField, setActiveField] = useState<string | null>(null);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [stateSearch, setStateSearch] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<"auto" | "manual">(
    "manual",
  );
  const [locationLoading, setLocationLoading] = useState(false);

  // ── Refs ──
  const otpRefs = useRef<(TextInput | null)[]>([]);
  const phoneRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);
  const addr1Ref = useRef<TextInput>(null);
  const addr2Ref = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);
  const pincodeRef = useRef<TextInput>(null);
  const gstRef = useRef<TextInput>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Animations ──
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const cardFadeAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.7)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  // ── Auto-login check ──────────────────────────────────────────────────────
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        const token = await getToken();
        if (token) {
          try {
            const userData = await apiGetMe();
            if (userData.success && userData.user) {
              if (userData.user.isProfileComplete) {
                router.replace("/(tabs)/home");
              }
              return;
            }
          } catch {
            // Token expired — fall through to login
          }
        }
      } catch (e) {
        console.error("Auth check failed:", e);
      } finally {
        setCheckingAuth(false);
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.parallel([
            Animated.spring(logoScale, {
              toValue: 1,
              tension: 50,
              friction: 7,
              useNativeDriver: true,
            }),
            Animated.timing(cardFadeAnim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      }
    };
    checkExistingAuth();
  }, []);

  // ── Re-animate card on screen change ──
  useEffect(() => {
    if (checkingAuth) return;
    cardFadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(cardFadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [screen]);

  // ── Resend countdown ──
  useEffect(() => {
    if (resendTimer > 0) {
      timerRef.current = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resendTimer]);

  // ── Shake ──
  const triggerShake = useCallback(() => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shakeAnim]);

  const isPhoneValid = phone.replace(/\s/g, "").length === 10;

  // ── Send OTP ──────────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!isPhoneValid) {
      setError("Please enter a valid 10-digit mobile number.");
      triggerShake();
      return;
    }
    setError("");
    setLoading(true);
    try {
      await apiSendOtp(phone);
      setResendTimer(RESEND_COOLDOWN);
      setScreen("otp");
      setTimeout(() => otpRefs.current[0]?.focus(), 400);
    } catch (err: any) {
      setError(err.message || "Failed to send OTP. Please try again.");
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  // ── OTP handlers ──
  const handleOtpChange = (value: string, index: number) => {
    const digit = value.replace(/[^0-9]/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError("");
    if (digit && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
    if (digit && index === OTP_LENGTH - 1) {
      const filled = [...newOtp.slice(0, OTP_LENGTH - 1), digit];
      if (filled.every((d) => d !== "")) handleVerifyOtp(filled.join(""));
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === "Backspace") {
      const newOtp = [...otp];
      if (newOtp[index]) {
        newOtp[index] = "";
        setOtp(newOtp);
      } else if (index > 0) {
        otpRefs.current[index - 1]?.focus();
        newOtp[index - 1] = "";
        setOtp(newOtp);
      }
    }
  };

  // ── Verify OTP ────────────────────────────────────────────────────────────
  const handleVerifyOtp = async (code?: string) => {
    const otpCode = code ?? otp.join("");
    if (otpCode.length < OTP_LENGTH) {
      setError("Please enter the complete 6-digit OTP.");
      triggerShake();
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await apiVerifyOtp(phone, otpCode);
      await saveToken(data.token);

      if (data.isNewUser || !data.isProfileComplete) {
        // New user — show profile form (same login UI)
        setScreen("profile");
        setTimeout(() => nameRef.current?.focus(), 400);
      } else {
        router.replace("/(tabs)/home");
      }
    } catch (err: any) {
      setError(err.message || "Invalid OTP. Please try again.");
      triggerShake();
      setOtp(Array(OTP_LENGTH).fill(""));
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    setOtp(Array(OTP_LENGTH).fill(""));
    setError("");
    try {
      await apiSendOtp(phone);
      setResendTimer(RESEND_COOLDOWN);
      setTimeout(() => otpRefs.current[0]?.focus(), 300);
    } catch (err: any) {
      setError(err.message || "Failed to resend OTP.");
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  // ── Profile form helpers ──
  const updateForm = (key: keyof ProfileForm) => (val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    if (fieldErrors[key as keyof FieldError])
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const isAutoApproval = form.gstNumber.trim() && isGstValid(form.gstNumber);

  // ── Auto Location Detection ───────────────────────────────────────────────
  const handlePickLocation = async () => {
    setLocationLoading(true);
    setError(""); // Clear any previous errors
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission is required to auto-fill address.");
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
        setForm((prev) => ({
          ...prev,
          addressLine1: address.street || address.name || prev.addressLine1,
          city: address.city || address.subregion || prev.city,
          state: address.region || prev.state,
          pincode: address.postalCode || prev.pincode,
          latitude,
          longitude,
        }));
        // Clear related field errors
        setFieldErrors((prev) => ({
          ...prev,
          addressLine1: undefined,
          city: undefined,
          state: undefined,
          pincode: undefined,
        }));
      }
    } catch {
      setError("Could not fetch location. Please enter manually.");
    } finally {
      setLocationLoading(false);
    }
  };

  const validateProfile = (): boolean => {
    const e: FieldError = {};
    if (!form.contactName.trim()) e.contactName = "Contact name is required.";
    else if (form.contactName.trim().length < 2)
      e.contactName = "Please enter a valid name.";
    if (!form.addressLine1.trim()) e.addressLine1 = "Address is required.";
    if (!form.city.trim()) e.city = "City is required.";
    if (!form.state.trim()) e.state = "State is required.";
    if (!form.pincode.trim()) e.pincode = "Pincode is required.";
    else if (!/^\d{6}$/.test(form.pincode.trim()))
      e.pincode = "Enter a valid 6-digit pincode.";
    if (form.gstNumber && !isGstValid(form.gstNumber))
      e.gstNumber = "Invalid GST number format.";
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit profile ────────────────────────────────────────────────────────
  const handleSubmitProfile = async () => {
    if (!validateProfile()) {
      triggerShake();
      return;
    }
    setLoading(true);
    try {
      const data = await apiCompleteProfile({
        contactName: form.contactName,
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        gstNumber: form.gstNumber,
        latitude: form.latitude ?? null,
        longitude: form.longitude ?? null,
      });
      setApprovalStatus(data.approvalStatus as "auto" | "manual");
      setShowSuccessModal(true);
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(successScale, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(successOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }, 100);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const otpFilled = otp.filter(Boolean).length;
  const filteredStates = INDIAN_STATES.filter((s) =>
    s.toLowerCase().includes(stateSearch.toLowerCase()),
  );

  const inputBorderColor = (field: keyof FieldError) =>
    fieldErrors[field]
      ? Colors.error
      : activeField === field
        ? Colors.primary
        : Colors.border;
  const inputBg = (field: keyof FieldError) =>
    fieldErrors[field]
      ? "#FFF5F5"
      : activeField === field
        ? (Colors.primaryLight ?? "#EEF3FF")
        : Colors.surfaceAlt;

  // ── Auth check loading screen ──
  if (checkingAuth) {
    return (
      <View
        style={[
          styles.root,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor={Colors.gradientStart}
        />
        <View style={styles.gradientBg}>
          <View style={styles.gradientOverlay} />
        </View>
        <ActivityIndicator size="large" color={Colors.white} />
        <Text style={styles.autoLoginText}>Checking login...</Text>
      </View>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Colors.gradientStart}
      />

      {/* Background */}
      <Animated.View style={[styles.gradientBg, { opacity: fadeAnim }]}>
        <View style={styles.gradientOverlay} />
      </Animated.View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header row */}
          <View style={styles.header}>
            {(screen === "otp" || screen === "profile") && (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => {
                  if (screen === "otp") {
                    setScreen("phone");
                    setOtp(Array(OTP_LENGTH).fill(""));
                    setError("");
                  } else if (screen === "profile") {
                    setScreen("otp");
                    setError("");
                  }
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="arrow-back"
                  size={wp("5.5%")}
                  color={Colors.white}
                />
              </TouchableOpacity>
            )}
            <View style={styles.headerSpacer} />
          </View>

          {/* Logo */}
          <Animated.View
            style={[
              styles.logoSection,
              { opacity: fadeAnim, transform: [{ scale: logoScale }] },
            ]}
          >
            <View style={styles.logoContainer}>
              <Image
                source={require("../../assets/images/logo.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            {/* <Text style={styles.appName}>Thump Beyond Limits</Text> */}
            <Text style={styles.tagline}>
              Electronic Accessories In Your Way.
            </Text>
          </Animated.View>

          {/* ── Main Card ── */}
          <Animated.View
            style={[
              styles.card,
              {
                opacity: cardFadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { translateX: shakeAnim },
                ],
              },
            ]}
          >
            {/* ══ PHONE SCREEN ══════════════════════════════════════════════ */}
            {screen === "phone" && (
              <>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Welcome Back</Text>
                  <Text style={styles.cardSubtitle}>
                    Sign in to continue to your account
                  </Text>
                </View>

                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Mobile Number</Text>
                  <View style={styles.phoneRow}>
                    <View style={styles.countryBox}>
                      <Text style={styles.countryFlag}>{COUNTRY.flag}</Text>
                      <Text style={styles.countryDial}>{COUNTRY.dial}</Text>
                      <Ionicons
                        name="chevron-down"
                        size={wp("3%")}
                        color={Colors.textMuted}
                      />
                    </View>
                    <TextInput
                      ref={phoneRef}
                      style={[
                        styles.phoneInput,
                        error ? styles.inputError : null,
                      ]}
                      placeholder="Enter mobile number"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={phone}
                      onChangeText={(t) => {
                        setPhone(t.replace(/[^0-9]/g, ""));
                        setError("");
                      }}
                      returnKeyType="done"
                      onSubmitEditing={handleSendOtp}
                      autoFocus
                    />
                  </View>
                  {!!error && (
                    <View style={styles.errorContainer}>
                      <Ionicons
                        name="warning-outline"
                        size={wp("4%")}
                        color={Colors.error}
                        style={{ marginRight: wp("1.5%") }}
                      />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    !isPhoneValid && styles.primaryBtnDisabled,
                  ]}
                  onPress={handleSendOtp}
                  activeOpacity={0.85}
                  disabled={loading || !isPhoneValid}
                >
                  {loading ? (
                    <ActivityIndicator color={Colors.white} size="small" />
                  ) : (
                    <>
                      <Text style={styles.primaryBtnText}>Continue</Text>
                      <Ionicons
                        name="arrow-forward"
                        size={wp("5%")}
                        color={Colors.white}
                        style={{ marginLeft: wp("2%") }}
                      />
                    </>
                  )}
                </TouchableOpacity>

                <Text style={styles.legalNote}>
                  By continuing, you agree to our{" "}
                  <Text style={styles.legalLink}>Terms</Text> &{" "}
                  <Text style={styles.legalLink}>Privacy Policy</Text>
                </Text>
              </>
            )}

            {/* ══ OTP SCREEN ════════════════════════════════════════════════ */}
            {screen === "otp" && (
              <>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Verify OTP</Text>
                  <Text style={styles.cardSubtitle}>
                    We've sent a 6-digit code to{" "}
                    <Text style={styles.phoneHighlight}>
                      {COUNTRY.dial} {phone}
                    </Text>
                  </Text>
                </View>

                <View style={styles.otpSection}>
                  <View style={styles.otpRow}>
                    {otp.map((digit, i) => (
                      <TextInput
                        key={i}
                        ref={(el) => (otpRefs.current[i] = el)}
                        style={[
                          styles.otpBox,
                          digit ? styles.otpBoxFilled : null,
                          error ? styles.otpBoxError : null,
                        ]}
                        value={digit}
                        onChangeText={(v) => handleOtpChange(v, i)}
                        onKeyPress={({ nativeEvent }) =>
                          handleOtpKeyPress(nativeEvent.key, i)
                        }
                        keyboardType="number-pad"
                        maxLength={1}
                        textAlign="center"
                        selectTextOnFocus
                      />
                    ))}
                  </View>
                  {!!error && (
                    <View style={styles.errorContainer}>
                      <Ionicons
                        name="warning-outline"
                        size={wp("4%")}
                        color={Colors.error}
                        style={{ marginRight: wp("1.5%") }}
                      />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    otpFilled < OTP_LENGTH && styles.primaryBtnDisabled,
                  ]}
                  onPress={() => handleVerifyOtp()}
                  activeOpacity={0.85}
                  disabled={loading || otpFilled < OTP_LENGTH}
                >
                  {loading ? (
                    <ActivityIndicator color={Colors.white} size="small" />
                  ) : (
                    <>
                      <Text style={styles.primaryBtnText}>
                        Verify & Continue
                      </Text>
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={wp("5%")}
                        color={Colors.white}
                        style={{ marginLeft: wp("2%") }}
                      />
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.resendRow}>
                  <Text style={styles.resendLabel}>Didn't receive it? </Text>
                  <TouchableOpacity
                    onPress={handleResend}
                    disabled={resendTimer > 0 || loading}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.resendLink,
                        resendTimer > 0 && styles.resendLinkDisabled,
                      ]}
                    >
                      {resendTimer > 0
                        ? `Resend in ${resendTimer}s`
                        : "Resend Code"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.waHint}>
                  <MaterialCommunityIcons
                    name="whatsapp"
                    size={wp("4.5%")}
                    color={Colors.accent}
                  />
                  <Text style={styles.waHintText}>
                    OTP sent via WhatsApp / SMS
                  </Text>
                </View>
              </>
            )}

            {/* ══ PROFILE SETUP (NEW USER) ════════════════════════════════ */}
            {screen === "profile" && (
              <>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Complete Profile</Text>
                  <Text style={styles.cardSubtitle}>
                    You're new here! Just a few details to get you started.
                  </Text>
                </View>

                {/* ─ Contact Name ─ */}
                <View style={styles.profileFieldWrap}>
                  <Text style={styles.inputLabel}>
                    Contact Person Name{" "}
                    <Text style={{ color: Colors.error }}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.profileInputWrapper,
                      {
                        borderColor: inputBorderColor("contactName"),
                        backgroundColor: inputBg("contactName"),
                      },
                    ]}
                  >
                    <Feather
                      name="user"
                      size={wp("4.5%")}
                      color={
                        activeField === "contactName"
                          ? Colors.primary
                          : Colors.textMuted
                      }
                      style={styles.profileInputIcon}
                    />
                    <TextInput
                      ref={nameRef}
                      style={styles.profileInput}
                      placeholder="e.g. Rajesh Patel"
                      placeholderTextColor={Colors.textMuted}
                      value={form.contactName}
                      onChangeText={updateForm("contactName")}
                      onFocus={() => setActiveField("contactName")}
                      onBlur={() => setActiveField(null)}
                      returnKeyType="next"
                      onSubmitEditing={() => addr1Ref.current?.focus()}
                      autoCapitalize="words"
                    />
                  </View>
                  {!!fieldErrors.contactName && (
                    <Text style={styles.fieldErrorText}>
                      {fieldErrors.contactName}
                    </Text>
                  )}
                </View>

                {/* ─ Verified phone display ─ */}
                <View style={styles.profileFieldWrap}>
                  <Text style={styles.inputLabel}>Verified Mobile</Text>
                  <View
                    style={[
                      styles.profileInputWrapper,
                      {
                        borderColor: Colors.primary,
                        backgroundColor: Colors.primaryLight ?? "#EEF3FF",
                      },
                    ]}
                  >
                    {/* <Feather
                      name="phone"
                      size={wp("4.5%")}
                      color={Colors.primary}
                      style={styles.profileInputIcon}
                    /> */}
                    <Image
                      source={require("../../assets/images/whatsapp-icon.png")}
                      style={[
                        styles.profileInputIcon,
                        { width: wp("4.5%"), height: wp("4.5%") },
                      ]}
                      resizeMode="contain"
                    />
                    <Text
                      style={[
                        styles.profileInput,
                        { color: Colors.primary, fontWeight: "700" },
                      ]}
                    >
                      +91 {phone}
                    </Text>
                    <MaterialCommunityIcons
                      name="check-decagram"
                      size={wp("4.5%")}
                      color={Colors.success ?? "#22C55E"}
                    />
                  </View>
                </View>

                {/* ─ Divider ─ */}
                <View style={styles.profileDivider}>
                  <View style={styles.profileDividerLine} />
                  <Text style={styles.profileDividerText}>
                    Delivery Address
                  </Text>
                  <View style={styles.profileDividerLine} />
                </View>

                {/* ─ Address Line 1 ─ */}
                <View style={styles.profileFieldWrap}>
                  <Text style={styles.inputLabel}>
                    Address Line 1{" "}
                    <Text style={{ color: Colors.error }}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.profileInputWrapper,
                      {
                        borderColor: inputBorderColor("addressLine1"),
                        backgroundColor: inputBg("addressLine1"),
                      },
                    ]}
                  >
                    <Feather
                      name="map-pin"
                      size={wp("4.5%")}
                      color={
                        activeField === "addressLine1"
                          ? Colors.primary
                          : Colors.textMuted
                      }
                      style={styles.profileInputIcon}
                    />
                    <TextInput
                      ref={addr1Ref}
                      style={styles.profileInput}
                      placeholder="Shop / Flat No., Building Name"
                      placeholderTextColor={Colors.textMuted}
                      value={form.addressLine1}
                      onChangeText={updateForm("addressLine1")}
                      onFocus={() => setActiveField("addressLine1")}
                      onBlur={() => setActiveField(null)}
                      returnKeyType="next"
                      onSubmitEditing={() => addr2Ref.current?.focus()}
                    />
                  </View>
                  {!!fieldErrors.addressLine1 && (
                    <Text style={styles.fieldErrorText}>
                      {fieldErrors.addressLine1}
                    </Text>
                  )}
                </View>

                {/* ─ Address Line 2 ─ */}
                <View style={styles.profileFieldWrap}>
                  <Text style={styles.inputLabel}>
                    Address Line 2{" "}
                    <Text style={styles.optionalText}>(Optional)</Text>
                  </Text>
                  <View
                    style={[
                      styles.profileInputWrapper,
                      {
                        borderColor:
                          activeField === "addressLine2"
                            ? Colors.primary
                            : Colors.border,
                        backgroundColor:
                          activeField === "addressLine2"
                            ? (Colors.primaryLight ?? "#EEF3FF")
                            : Colors.surfaceAlt,
                      },
                    ]}
                  >
                    <Feather
                      name="navigation"
                      size={wp("4.5%")}
                      color={
                        activeField === "addressLine2"
                          ? Colors.primary
                          : Colors.textMuted
                      }
                      style={styles.profileInputIcon}
                    />
                    <TextInput
                      ref={addr2Ref}
                      style={styles.profileInput}
                      placeholder="Street, Area, Landmark"
                      placeholderTextColor={Colors.textMuted}
                      value={form.addressLine2}
                      onChangeText={updateForm("addressLine2")}
                      onFocus={() => setActiveField("addressLine2")}
                      onBlur={() => setActiveField(null)}
                      returnKeyType="next"
                      onSubmitEditing={() => cityRef.current?.focus()}
                    />
                  </View>
                </View>

                {/* ─ City + State row ─ */}
                <View style={styles.twoColRow}>
                  <View style={[styles.profileFieldWrap, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>
                      City <Text style={{ color: Colors.error }}>*</Text>
                    </Text>
                    <View
                      style={[
                        styles.profileInputWrapper,
                        {
                          borderColor: inputBorderColor("city"),
                          backgroundColor: inputBg("city"),
                        },
                      ]}
                    >
                      <Feather
                        name="home"
                        size={wp("4%")}
                        color={
                          activeField === "city"
                            ? Colors.primary
                            : Colors.textMuted
                        }
                        style={styles.profileInputIcon}
                      />
                      <TextInput
                        ref={cityRef}
                        style={[styles.profileInput, { fontSize: wp("3.6%") }]}
                        placeholder="e.g. Surat"
                        placeholderTextColor={Colors.textMuted}
                        value={form.city}
                        onChangeText={updateForm("city")}
                        onFocus={() => setActiveField("city")}
                        onBlur={() => setActiveField(null)}
                        returnKeyType="next"
                        autoCapitalize="words"
                      />
                    </View>
                    {!!fieldErrors.city && (
                      <Text style={styles.fieldErrorText}>
                        {fieldErrors.city}
                      </Text>
                    )}
                  </View>

                  <View style={[styles.profileFieldWrap, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>
                      State <Text style={{ color: Colors.error }}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.profileInputWrapper,
                        {
                          borderColor: inputBorderColor("state"),
                          backgroundColor: inputBg("state"),
                        },
                      ]}
                      onPress={() => setShowStateDropdown(true)}
                      activeOpacity={0.7}
                    >
                      <Feather
                        name="map"
                        size={wp("4%")}
                        color={form.state ? Colors.primary : Colors.textMuted}
                        style={styles.profileInputIcon}
                      />
                      <Text
                        style={[
                          styles.profileInput,
                          {
                            fontSize: wp("3.6%"),
                            color: form.state
                              ? Colors.textPrimary
                              : Colors.textMuted,
                          },
                        ]}
                      >
                        {form.state || "Select"}
                      </Text>
                      <Ionicons
                        name="chevron-down"
                        size={wp("4%")}
                        color={Colors.textMuted}
                      />
                    </TouchableOpacity>
                    {!!fieldErrors.state && (
                      <Text style={styles.fieldErrorText}>
                        {fieldErrors.state}
                      </Text>
                    )}
                  </View>
                </View>

                {/* ─ Pincode ─ */}
                <View style={styles.profileFieldWrap}>
                  <Text style={styles.inputLabel}>
                    Pincode <Text style={{ color: Colors.error }}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.profileInputWrapper,
                      {
                        borderColor: inputBorderColor("pincode"),
                        backgroundColor: inputBg("pincode"),
                      },
                    ]}
                  >
                    <Feather
                      name="hash"
                      size={wp("4.5%")}
                      color={
                        activeField === "pincode"
                          ? Colors.primary
                          : Colors.textMuted
                      }
                      style={styles.profileInputIcon}
                    />
                    <TextInput
                      ref={pincodeRef}
                      style={styles.profileInput}
                      placeholder="e.g. 395003"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="number-pad"
                      maxLength={6}
                      value={form.pincode}
                      onChangeText={(t) =>
                        updateForm("pincode")(t.replace(/[^0-9]/g, ""))
                      }
                      onFocus={() => setActiveField("pincode")}
                      onBlur={() => setActiveField(null)}
                      returnKeyType="next"
                      onSubmitEditing={() => gstRef.current?.focus()}
                    />
                  </View>
                  {!!fieldErrors.pincode && (
                    <Text style={styles.fieldErrorText}>
                      {fieldErrors.pincode}
                    </Text>
                  )}
                </View>
                {/* ─ Auto Location Detection Button ─ */}
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
                        Pick location on Google Maps
                      </Text>
                      <Feather
                        name="arrow-right"
                        size={wp("4.5%")}
                        color={Colors.primary}
                      />
                    </>
                  )}
                </TouchableOpacity>

                {form.latitude && form.longitude && (
                  <View style={styles.locationDetected}>
                    <Feather
                      name="check-circle"
                      size={wp("3.5%")}
                      color={Colors.success ?? "#22C55E"}
                    />
                    <Text style={styles.locationDetectedText}>
                      📍 Location detected and address auto-filled
                    </Text>
                  </View>
                )}

                {/* ─ GST Divider ─ */}
                <View style={styles.profileDivider}>
                  <View style={styles.profileDividerLine} />
                  <Text style={styles.profileDividerText}>
                    GST Details{" "}
                    <Text style={styles.optionalText}>(Optional)</Text>
                  </Text>
                  <View style={styles.profileDividerLine} />
                </View>

                {/* ─ Approval banner ─ */}
                <View
                  style={[
                    styles.approvalBanner,
                    { backgroundColor: isAutoApproval ? "#E6F9F0" : "#FFF8E1" },
                  ]}
                >
                  <Feather
                    name={isAutoApproval ? "zap" : "clock"}
                    size={wp("4.5%")}
                    color={
                      isAutoApproval
                        ? (Colors.success ?? "#22C55E")
                        : (Colors.warning ?? "#F59E0B")
                    }
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.approvalTitle,
                        {
                          color: isAutoApproval
                            ? (Colors.success ?? "#22C55E")
                            : (Colors.warning ?? "#F59E0B"),
                        },
                      ]}
                    >
                      {isAutoApproval ? "Auto Approval" : "Manual Approval"}
                    </Text>
                    <Text style={styles.approvalDesc}>
                      {isAutoApproval
                        ? "Valid GST — account will be approved instantly."
                        : "Without GST, admin will review within 24hrs."}
                    </Text>
                  </View>
                </View>

                {/* ─ GST Input ─ */}
                <View style={styles.profileFieldWrap}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: hp("0.8%"),
                    }}
                  >
                    <Text style={styles.inputLabel}>GST Number</Text>
                    {form.gstNumber.length > 0 && (
                      <View
                        style={[
                          styles.gstChip,
                          {
                            backgroundColor: isGstValid(form.gstNumber)
                              ? "#E6F9F020"
                              : "#FFF5F5",
                          },
                        ]}
                      >
                        <Feather
                          name={
                            isGstValid(form.gstNumber)
                              ? "check-circle"
                              : "alert-circle"
                          }
                          size={wp("3%")}
                          color={
                            isGstValid(form.gstNumber)
                              ? (Colors.success ?? "#22C55E")
                              : Colors.error
                          }
                        />
                        <Text
                          style={[
                            styles.gstChipText,
                            {
                              color: isGstValid(form.gstNumber)
                                ? (Colors.success ?? "#22C55E")
                                : Colors.error,
                            },
                          ]}
                        >
                          {isGstValid(form.gstNumber) ? "Valid" : "Invalid"}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View
                    style={[
                      styles.profileInputWrapper,
                      {
                        borderColor: inputBorderColor("gstNumber"),
                        backgroundColor: inputBg("gstNumber"),
                      },
                    ]}
                  >
                    <Feather
                      name="credit-card"
                      size={wp("4.5%")}
                      color={
                        activeField === "gstNumber"
                          ? Colors.primary
                          : Colors.textMuted
                      }
                      style={styles.profileInputIcon}
                    />
                    <TextInput
                      ref={gstRef}
                      style={[
                        styles.profileInput,
                        { letterSpacing: 1.2, fontWeight: "600" },
                      ]}
                      placeholder="e.g. 24AABCU9603R1ZX"
                      placeholderTextColor={Colors.textMuted}
                      autoCapitalize="characters"
                      maxLength={15}
                      value={form.gstNumber}
                      onChangeText={(t) =>
                        updateForm("gstNumber")(t.toUpperCase())
                      }
                      onFocus={() => setActiveField("gstNumber")}
                      onBlur={() => setActiveField(null)}
                      returnKeyType="done"
                    />
                  </View>
                  {!!fieldErrors.gstNumber && (
                    <Text style={styles.fieldErrorText}>
                      {fieldErrors.gstNumber}
                    </Text>
                  )}
                </View>

                {!!error && (
                  <View
                    style={[styles.errorContainer, { marginBottom: hp("1%") }]}
                  >
                    <Ionicons
                      name="warning-outline"
                      size={wp("4%")}
                      color={Colors.error}
                      style={{ marginRight: wp("1.5%") }}
                    />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* ─ Submit ─ */}
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    { marginTop: hp("1%") },
                    loading && { opacity: 0.8 },
                  ]}
                  onPress={handleSubmitProfile}
                  activeOpacity={0.85}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={Colors.white} size="small" />
                  ) : (
                    <>
                      <Text style={styles.primaryBtnText}>
                        Complete Registration
                      </Text>
                      <Ionicons
                        name="arrow-forward"
                        size={wp("5%")}
                        color={Colors.white}
                        style={{ marginLeft: wp("2%") }}
                      />
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </Animated.View>

          <Text style={styles.footer}>Thump Beyond Limits ©2026</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── State Dropdown Modal ── */}
      <Modal
        visible={showStateDropdown}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStateDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dropdownCard}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Select State</Text>
              <TouchableOpacity onPress={() => setShowStateDropdown(false)}>
                <Text style={styles.dropdownClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dropdownSearch}>
              <TextInput
                style={styles.dropdownSearchInput}
                placeholder="Search state..."
                placeholderTextColor={Colors.textMuted}
                value={stateSearch}
                onChangeText={setStateSearch}
                autoFocus
              />
            </View>
            <ScrollView
              style={styles.dropdownList}
              showsVerticalScrollIndicator={false}
            >
              {filteredStates.map((state) => (
                <TouchableOpacity
                  key={state}
                  style={[
                    styles.dropdownItem,
                    form.state === state && styles.dropdownItemSelected,
                  ]}
                  onPress={() => {
                    updateForm("state")(state);
                    setShowStateDropdown(false);
                    setStateSearch("");
                    setTimeout(() => pincodeRef.current?.focus(), 300);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      form.state === state && styles.dropdownItemTextSelected,
                    ]}
                  >
                    {state}
                  </Text>
                  {form.state === state && (
                    <Feather
                      name="check-circle"
                      size={wp("4%")}
                      color={Colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Success Modal ── */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.successModalOverlay}>
          <Animated.View
            style={[
              styles.successCard,
              { opacity: successOpacity, transform: [{ scale: successScale }] },
            ]}
          >
            <View
              style={[
                styles.modalIconCircle,
                {
                  backgroundColor:
                    approvalStatus === "auto" ? "#E6F9F0" : "#FFF8E1",
                },
              ]}
            >
              <Feather
                name={approvalStatus === "auto" ? "zap" : "clock"}
                size={wp("10%")}
                color={
                  approvalStatus === "auto"
                    ? (Colors.success ?? "#22C55E")
                    : (Colors.warning ?? "#F59E0B")
                }
              />
            </View>
            <Text style={styles.modalTitle}>
              {approvalStatus === "auto"
                ? "Account Approved!"
                : "Registration Submitted!"}
            </Text>
            <Text style={styles.modalBody}>
              {approvalStatus === "auto"
                ? "Your GST number verified instantly. Your account is now active and ready to place orders."
                : "Your profile is under review. Our admin team will verify and approve within 24 hours. We'll notify you on WhatsApp."}
            </Text>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor:
                    approvalStatus === "auto" ? "#E6F9F0" : "#FFF8E1",
                },
              ]}
            >
              <Feather
                name={approvalStatus === "auto" ? "check-circle" : "clock"}
                size={wp("3.5%")}
                color={
                  approvalStatus === "auto"
                    ? (Colors.success ?? "#22C55E")
                    : (Colors.warning ?? "#F59E0B")
                }
              />
              <Text
                style={[
                  styles.statusPillText,
                  {
                    color:
                      approvalStatus === "auto"
                        ? (Colors.success ?? "#22C55E")
                        : (Colors.warning ?? "#F59E0B"),
                  },
                ]}
              >
                {approvalStatus === "auto"
                  ? "Auto Approved"
                  : "Pending Admin Review"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.modalBtn}
              activeOpacity={0.87}
              onPress={() => {
                setShowSuccessModal(false);
                router.replace("/(tabs)/home");
              }}
            >
              <Text style={styles.modalBtnText}>
                {approvalStatus === "auto" ? "Start Shopping" : "Got it!"}
              </Text>
              <Feather
                name="arrow-right"
                size={wp("4.5%")}
                color={Colors.white}
              />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  keyboardView: { flex: 1 },
  gradientBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.45,
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
  header: {
    paddingTop: Platform.OS === "ios" ? hp("7%") : hp("5%"),
    paddingHorizontal: wp("5%"),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: wp("10%"),
    height: wp("10%"),
    borderRadius: wp("5%"),
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: { width: wp("10%") },
  scroll: { flexGrow: 1, paddingBottom: hp("4%") },
  logoSection: {
    alignItems: "center",
    marginTop: hp("3%"),
    marginBottom: hp("3%"),
  },
  logoContainer: { position: "relative", marginBottom: hp("2%") },
  logoImage: { width: wp("32%"), height: wp("32%") },
  appName: {
    fontSize: wp("7%"),
    fontWeight: "800",
    color: Colors.white,
    letterSpacing: 0.5,
  },
  tagline: {
    fontFamily: "Exotc350BdBTBold",
    fontSize: wp("3.6%"),
    color: "rgba(255,255,255,0.9)",
    marginTop: hp("0.5%"),
    fontWeight: "500",
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: wp("6%"),
    paddingHorizontal: wp("6%"),
    paddingTop: hp("3%"),
    paddingBottom: hp("3%"),
    marginHorizontal: wp("5%"),
    shadowColor: Colors.shadowMedium,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  cardHeader: { marginBottom: hp("2.5%") },
  cardTitle: {
    fontSize: wp("6%"),
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: hp("0.5%"),
  },
  cardSubtitle: {
    fontSize: wp("3.6%"),
    color: Colors.textSecondary,
    lineHeight: wp("5.5%"),
  },
  phoneHighlight: { fontWeight: "700", color: Colors.primary },

  inputSection: { marginBottom: hp("2%") },
  inputLabel: {
    fontSize: wp("3.5%"),
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: hp("1%"),
    marginLeft: wp("1%"),
  },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: wp("3%") },
  countryBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceAlt,
    borderRadius: wp("3.5%"),
    paddingHorizontal: wp("3.5%"),
    paddingVertical: hp("1.6%"),
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: wp("1.5%"),
  },
  countryFlag: { fontSize: wp("5.5%") },
  countryDial: {
    fontSize: wp("3.8%"),
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: wp("3.5%"),
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("1.6%"),
    fontSize: wp("4.2%"),
    fontWeight: "500",
    color: Colors.textPrimary,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  inputError: { borderColor: Colors.error, backgroundColor: "#FFF5F5" },

  otpSection: { marginBottom: hp("2%") },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: wp("2%"),
  },
  otpBox: {
    flex: 1,
    aspectRatio: 0.85,
    backgroundColor: Colors.otpBox,
    borderRadius: wp("3.5%"),
    fontSize: wp("6.5%"),
    fontWeight: "700",
    color: Colors.textPrimary,
    borderWidth: 1.5,
    borderColor: Colors.border,
    textAlign: "center",
    elevation: 2,
  },
  otpBoxFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.otpBoxFilled,
    color: Colors.primary,
  },
  otpBoxError: { borderColor: Colors.error, backgroundColor: "#FFF5F5" },

  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: hp("1%"),
    marginLeft: wp("1%"),
  },
  errorText: { fontSize: wp("3.3%"), color: Colors.error, fontWeight: "500" },

  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: wp("3.5%"),
    paddingVertical: hp("2%"),
    paddingHorizontal: wp("6%"),
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: hp("1%"),
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryBtnDisabled: {
    backgroundColor: Colors.textMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnText: {
    fontSize: wp("4.2%"),
    fontWeight: "700",
    color: Colors.textOnPrimary,
    letterSpacing: 0.5,
  },

  legalNote: {
    fontSize: wp("3%"),
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: wp("4.5%"),
    marginTop: hp("2%"),
  },
  legalLink: { color: Colors.primary, fontWeight: "600" },

  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: hp("2%"),
  },
  resendLabel: { fontSize: wp("3.5%"), color: Colors.textSecondary },
  resendLink: {
    fontSize: wp("3.5%"),
    fontWeight: "700",
    color: Colors.primary,
  },
  resendLinkDisabled: { color: Colors.textMuted, fontWeight: "400" },

  waHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.accentLight,
    borderRadius: wp("3%"),
    paddingVertical: hp("1.2%"),
    paddingHorizontal: wp("4%"),
    marginTop: hp("2%"),
    gap: wp("2%"),
  },
  waHintText: { fontSize: wp("3.2%"), color: Colors.accent, fontWeight: "600" },

  // ── Profile form styles ──
  profileFieldWrap: { marginBottom: hp("1.8%") },
  profileInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: wp("3.5%"),
    borderWidth: 1.5,
    paddingHorizontal: wp("3.5%"),
    paddingVertical: hp("0.2%"),
  },
  profileInputIcon: { marginRight: wp("2.5%") },
  profileInput: {
    flex: 1,
    paddingVertical: hp("1.6%"),
    fontSize: wp("3.8%"),
    color: Colors.textPrimary,
    fontWeight: "500",
  },
  fieldErrorText: {
    fontSize: wp("3%"),
    color: Colors.error,
    fontWeight: "500",
    marginTop: hp("0.4%"),
    marginLeft: wp("1%"),
  },
  optionalText: {
    fontSize: wp("3%"),
    color: Colors.textMuted,
    fontWeight: "400",
  },
  twoColRow: { flexDirection: "row", gap: wp("3%") },

  profileDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2.5%"),
    marginTop: hp("0.5%"),
    marginBottom: hp("2%"),
  },
  profileDividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  profileDividerText: {
    fontSize: wp("3.2%"),
    fontWeight: "600",
    color: Colors.textSecondary,
  },

  // ── Auto Location Detection Styles ──
  mapPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primaryLight ?? "#EEF3FF",
    borderRadius: wp("3.5%"),
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("1.4%"),
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
  locationDetected: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: hp("-0.5%"),
    marginBottom: hp("1.5%"),
    gap: wp("2%"),
  },
  locationDetectedText: {
    fontSize: wp("3%"),
    color: Colors.success ?? "#22C55E",
    fontWeight: "500",
  },

  approvalBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: wp("3.5%"),
    padding: wp("3.5%"),
    marginBottom: hp("1.8%"),
    gap: wp("2.5%"),
  },
  approvalTitle: {
    fontSize: wp("3.4%"),
    fontWeight: "700",
    marginBottom: hp("0.2%"),
  },
  approvalDesc: {
    fontSize: wp("3%"),
    color: Colors.textSecondary,
    lineHeight: wp("4.5%"),
  },

  gstChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: wp("3%"),
    paddingHorizontal: wp("2.5%"),
    paddingVertical: hp("0.4%"),
    gap: wp("1%"),
  },
  gstChipText: { fontSize: wp("2.8%"), fontWeight: "700" },

  footer: {
    textAlign: "center",
    marginTop: hp("3%"),
    fontSize: wp("3%"),
    color: Colors.textMuted,
  },
  autoLoginText: {
    fontSize: wp("4%"),
    color: Colors.white,
    marginTop: hp("2%"),
    fontWeight: "500",
  },

  // ── Modals ──
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "flex-end",
  },
  dropdownCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: wp("6%"),
    borderTopRightRadius: wp("6%"),
    maxHeight: hp("60%"),
  },
  dropdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: wp("5%"),
    paddingTop: hp("2.5%"),
    paddingBottom: hp("1.5%"),
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownTitle: {
    fontSize: wp("4.5%"),
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  dropdownClose: {
    fontSize: wp("5%"),
    color: Colors.textMuted,
    padding: wp("2%"),
  },
  dropdownSearch: {
    paddingHorizontal: wp("5%"),
    paddingVertical: hp("1.5%"),
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownSearchInput: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: wp("3%"),
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("1.4%"),
    fontSize: wp("3.8%"),
    color: Colors.textPrimary,
  },
  dropdownList: { paddingHorizontal: wp("5%"), paddingVertical: hp("1%") },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: hp("1.8%"),
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownItemSelected: {
    backgroundColor: Colors.primaryLight ?? "#EEF3FF",
    marginHorizontal: -wp("2%"),
    paddingHorizontal: wp("2%"),
    borderRadius: wp("2%"),
  },
  dropdownItemText: { fontSize: wp("3.8%"), color: Colors.textPrimary },
  dropdownItemTextSelected: { color: Colors.primary, fontWeight: "600" },

  successModalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: wp("5%"),
  },
  successCard: {
    backgroundColor: Colors.surface,
    borderRadius: wp("5%"),
    padding: wp("7%"),
    alignItems: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  modalIconCircle: {
    width: wp("20%"),
    height: wp("20%"),
    borderRadius: wp("10%"),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: hp("2.5%"),
  },
  modalTitle: {
    fontSize: wp("5.5%"),
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: hp("1.5%"),
    textAlign: "center",
  },
  modalBody: {
    fontSize: wp("3.5%"),
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: wp("5.5%"),
    marginBottom: hp("2.5%"),
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: wp("5%"),
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("0.8%"),
    gap: wp("2%"),
    marginBottom: hp("3%"),
  },
  statusPillText: { fontSize: wp("3.3%"), fontWeight: "700" },
  modalBtn: {
    backgroundColor: Colors.primary,
    borderRadius: wp("3.5%"),
    paddingVertical: hp("1.8%"),
    paddingHorizontal: wp("10%"),
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2%"),
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  modalBtnText: {
    fontSize: wp("4.2%"),
    fontWeight: "800",
    color: Colors.white,
  },
});

export default LoginScreen;
