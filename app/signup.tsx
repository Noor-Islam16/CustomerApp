import {
  Feather,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
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
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import Colors from "../constants/colors";

// ─── Types ───────────────────────────────────────────────────────────────────
type Step = "phone" | "otp" | "profile";

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

type ApprovalStatus = "auto" | "manual" | null;

// ─── Constants ───────────────────────────────────────────────────────────────
const OTP_LENGTH = 6;
const VALID_OTP = "252002";
const RESEND_COOLDOWN = 30;
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const isGstValid = (gst: string) => GST_REGEX.test(gst.trim().toUpperCase());

const INDIAN_STATES = [
  "Gujarat",
  "Maharashtra",
  "Delhi",
  "Karnataka",
  "Tamil Nadu",
  "Uttar Pradesh",
  "Rajasthan",
  "Madhya Pradesh",
  "West Bengal",
  "Punjab",
  "Haryana",
  "Kerala",
  "Andhra Pradesh",
  "Telangana",
  "Odisha",
  "Bihar",
  "Assam",
];

// ─── Main Component ──────────────────────────────────────────────────────────
const ProfileSetupScreen: React.FC = () => {
  // ── Step State ──
  const [step, setStep] = useState<Step>("phone");

  // ── Phone State ──
  const [phone, setPhone] = useState("");
  const [isPhoneRegistered, setIsPhoneRegistered] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);

  // ── OTP State ──
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // ── Profile Form State ──
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

  const [errors, setErrors] = useState<FieldError>({});
  const [loading, setLoading] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [activeField, setActiveField] = useState<keyof ProfileForm | null>(
    null,
  );
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [stateSearch, setStateSearch] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);

  // ── Refs ──
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const successScale = useRef(new Animated.Value(0.7)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const otpShakeAnim = useRef(new Animated.Value(0)).current;

  const phoneRef = useRef<TextInput>(null);
  const otpRefs = useRef<(TextInput | null)[]>([]);
  const nameRef = useRef<TextInput>(null);
  const addr1Ref = useRef<TextInput>(null);
  const addr2Ref = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);
  const pincodeRef = useRef<TextInput>(null);
  const gstRef = useRef<TextInput>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollViewRef = useRef<KeyboardAwareScrollView>(null);

  // ── Entrance animation ──
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 550,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 55,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (step === "profile") {
      Animated.timing(progressWidth, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }).start();
    }
  }, [step]);

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

  // ── Approval status derived from GST ──
  useEffect(() => {
    if (form.gstNumber && isGstValid(form.gstNumber)) {
      setApprovalStatus("auto");
    } else {
      setApprovalStatus("manual");
    }
  }, [form.gstNumber]);

  // ── Shake animation ──
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
        toValue: 6,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -6,
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

  const triggerOtpShake = useCallback(() => {
    otpShakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(otpShakeAnim, {
        toValue: 8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(otpShakeAnim, {
        toValue: -8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(otpShakeAnim, {
        toValue: 4,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(otpShakeAnim, {
        toValue: -4,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(otpShakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [otpShakeAnim]);

  // ── Check if phone is registered ──
  const checkPhoneRegistration = async (phoneNumber: string) => {
    if (phoneNumber.length === 10) {
      setCheckingPhone(true);
      try {
        await new Promise((r) => setTimeout(r, 800));
        const registered = Math.random() > 0.5;
        setIsPhoneRegistered(registered);
        return registered;
      } finally {
        setCheckingPhone(false);
      }
    }
    return false;
  };

  // ── Send OTP ──
  const handleSendOtp = async () => {
    if (phone.length !== 10) {
      Alert.alert(
        "Invalid Number",
        "Please enter a valid 10-digit mobile number.",
      );
      triggerShake();
      return;
    }

    setOtpLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 1200));
      setResendTimer(RESEND_COOLDOWN);
      setStep("otp");
      setTimeout(() => otpRefs.current[0]?.focus(), 400);
    } catch {
      Alert.alert("Error", "Failed to send OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  // ── OTP Input handler ──
  const handleOtpChange = (value: string, index: number) => {
    const digit = value.replace(/[^0-9]/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setOtpError("");

    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }

    if (digit && index === OTP_LENGTH - 1) {
      const filled = [...newOtp.slice(0, OTP_LENGTH - 1), digit];
      if (filled.every((d) => d !== "")) {
        handleVerifyOtp(filled.join(""));
      }
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

  // ── Verify OTP ──
  const handleVerifyOtp = async (code?: string) => {
    const otpCode = code ?? otp.join("");
    if (otpCode.length < OTP_LENGTH) {
      setOtpError("Please enter the complete 6-digit OTP.");
      triggerOtpShake();
      return;
    }

    setOtpLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 1000));

      if (otpCode === VALID_OTP) {
        setStep("profile");
        setTimeout(() => nameRef.current?.focus(), 400);
      } else {
        setOtpError("Invalid OTP. Please try again.");
        triggerOtpShake();
        setOtp(Array(OTP_LENGTH).fill(""));
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      }
    } finally {
      setOtpLoading(false);
    }
  };

  // ── Resend OTP ──
  const handleResend = async () => {
    if (resendTimer > 0) return;
    setOtpLoading(true);
    setOtp(Array(OTP_LENGTH).fill(""));
    setOtpError("");
    try {
      await new Promise((r) => setTimeout(r, 1000));
      setResendTimer(RESEND_COOLDOWN);
      setTimeout(() => otpRefs.current[0]?.focus(), 300);
    } finally {
      setOtpLoading(false);
    }
  };

  // ── Pick Location ──
  const handlePickLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission is required to pick address.",
        );
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
          addressLine1: address.street || address.name || "",
          city: address.city || address.subregion || "",
          state: address.region || "",
          pincode: address.postalCode || "",
          latitude,
          longitude,
        }));

        Alert.alert(
          "📍 Location Detected",
          "Address has been auto-filled from your current location.",
        );
      }
    } catch (error) {
      Alert.alert("Error", "Could not fetch location. Please enter manually.");
    } finally {
      setLocationLoading(false);
    }
  };

  // ── Profile Form Handlers ──
  const update = (key: keyof ProfileForm) => (val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    if (errors[key as keyof FieldError]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: FieldError = {};

    if (!form.contactName.trim()) {
      newErrors.contactName = "Contact person name is required.";
    } else if (form.contactName.trim().length < 2) {
      newErrors.contactName = "Please enter a valid name.";
    }

    if (!form.addressLine1.trim()) {
      newErrors.addressLine1 = "Address is required.";
    }

    if (!form.city.trim()) {
      newErrors.city = "City is required.";
    }

    if (!form.state.trim()) {
      newErrors.state = "State is required.";
    }

    if (!form.pincode.trim()) {
      newErrors.pincode = "Pincode is required.";
    } else if (!/^\d{6}$/.test(form.pincode.trim())) {
      newErrors.pincode = "Enter a valid 6-digit pincode.";
    }

    if (form.gstNumber && !isGstValid(form.gstNumber)) {
      newErrors.gstNumber = "Invalid GST number format.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      triggerShake();
      return;
    }
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 1800));
      const isAutoApproved = form.gstNumber && isGstValid(form.gstNumber);
      setApprovalStatus(isAutoApproved ? "auto" : "manual");
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
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Derived values ──
  const filteredStates = INDIAN_STATES.filter((s) =>
    s.toLowerCase().includes(stateSearch.toLowerCase()),
  );
  const isAutoApproval = form.gstNumber.trim() && isGstValid(form.gstNumber);
  const otpFilled = otp.filter(Boolean).length;
  const progressPercentage = progressWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const inputBorderColor = (field: keyof FieldError) =>
    errors[field]
      ? Colors.error
      : activeField === field
        ? Colors.borderFocus
        : Colors.border;

  const inputBg = (field: keyof FieldError) =>
    errors[field]
      ? "#FFF5F5"
      : activeField === field
        ? Colors.primaryLight
        : Colors.surfaceAlt;

  const getStepNumber = () => {
    if (step === "phone") return "1/3";
    if (step === "otp") return "2/3";
    return "3/3";
  };

  const getHeaderTitle = () => {
    if (step === "phone") return "Enter Mobile Number";
    if (step === "otp") return "Verify OTP";
    return "Complete Profile";
  };

  const getHeaderSub = () => {
    if (step === "phone") return "Step 1 of 3 — Let's get started!";
    if (step === "otp") return "Step 2 of 3 — Verify your number";
    return "Step 3 of 3 — Almost done!";
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Colors.gradientStart}
      />

      {/* ── Header ── */}
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            {step !== "phone" && (
              <TouchableOpacity
                style={styles.backBtn}
                activeOpacity={0.7}
                onPress={() => {
                  if (step === "otp") setStep("phone");
                  else if (step === "profile") setStep("otp");
                }}
              >
                <Ionicons
                  name="chevron-back"
                  color={Colors.white}
                  size={wp("6%")}
                />
              </TouchableOpacity>
            )}
            <View>
              <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
              <Text style={styles.headerSub}>{getHeaderSub()}</Text>
            </View>
          </View>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>{getStepNumber()}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Progress Bar ── */}
      <View style={styles.progressBarBg}>
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              width:
                step === "phone"
                  ? "33%"
                  : step === "otp"
                    ? "66%"
                    : progressPercentage,
            },
          ]}
        />
      </View>

      <KeyboardAwareScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={Platform.OS === "ios" ? 20 : 80}
        extraHeight={Platform.OS === "ios" ? 20 : 80}
      >
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          {/* ────────────────────────────────────────────────
              STEP 1 — PHONE INPUT
          ──────────────────────────────────────────────── */}
          {step === "phone" && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.sectionIconBox}>
                  <Feather
                    name="phone"
                    size={wp("5%")}
                    color={Colors.primary}
                  />
                </View>
                <Text style={styles.cardTitle}>What's your mobile number?</Text>
                <Text style={styles.cardSubtitle}>
                  We'll send a verification code to confirm it's you.
                </Text>
              </View>

              <View style={styles.phoneInputContainer}>
                <View style={styles.countryBox}>
                  <Text style={styles.countryFlag}>🇮🇳</Text>
                  <Text style={styles.countryDial}>+91</Text>
                  <Ionicons
                    name="chevron-down"
                    size={wp("3.5%")}
                    color={Colors.textMuted}
                  />
                </View>
                <TextInput
                  ref={phoneRef}
                  style={styles.phoneInput}
                  placeholder="Enter mobile number"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={async (t) => {
                    const cleaned = t.replace(/[^0-9]/g, "");
                    setPhone(cleaned);
                    setIsPhoneRegistered(false);
                    if (cleaned.length === 10) {
                      await checkPhoneRegistration(cleaned);
                    }
                  }}
                  autoFocus
                />
              </View>

              {phone.length === 10 && (
                <View
                  style={[
                    styles.phoneStatus,
                    {
                      backgroundColor: isPhoneRegistered
                        ? "#E6F9F0"
                        : "#FFF8E1",
                    },
                  ]}
                >
                  {checkingPhone ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : isPhoneRegistered ? (
                    <>
                      <Feather
                        name="check-circle"
                        size={wp("4%")}
                        color={Colors.success}
                      />
                      <Text
                        style={[
                          styles.phoneStatusText,
                          { color: Colors.success },
                        ]}
                      >
                        Number verified! Continue to complete your profile.
                      </Text>
                    </>
                  ) : (
                    <>
                      <Feather
                        name="alert-circle"
                        size={wp("4%")}
                        color={Colors.warning}
                      />
                      <Text
                        style={[
                          styles.phoneStatusText,
                          { color: Colors.warning },
                        ]}
                      >
                        This number is not registered. Verify to create an
                        account.
                      </Text>
                    </>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  phone.length !== 10 && styles.primaryBtnDisabled,
                ]}
                onPress={handleSendOtp}
                activeOpacity={0.87}
                disabled={otpLoading || phone.length !== 10}
              >
                {otpLoading ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Send OTP</Text>
                    <Feather
                      name="arrow-right"
                      color={Colors.white}
                      size={wp("5%")}
                    />
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.legalNote}>
                By continuing, you agree to our{" "}
                <Text style={styles.legalLink}>Terms</Text> &{" "}
                <Text style={styles.legalLink}>Privacy Policy</Text>
              </Text>
            </View>
          )}

          {/* ────────────────────────────────────────────────
              STEP 2 — OTP VERIFICATION
          ──────────────────────────────────────────────── */}
          {step === "otp" && (
            <Animated.View
              style={{ transform: [{ translateX: otpShakeAnim }] }}
            >
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.sectionIconBox}>
                    <MaterialCommunityIcons
                      name="message-text"
                      size={wp("5%")}
                      color={Colors.primary}
                    />
                  </View>
                  <Text style={styles.cardTitle}>Enter verification code</Text>
                  <Text style={styles.cardSubtitle}>
                    We've sent a 6-digit code to{" "}
                    <Text style={styles.phoneHighlight}>+91 {phone}</Text>
                  </Text>
                </View>

                <View style={styles.otpContainer}>
                  <View style={styles.otpRow}>
                    {otp.map((digit, i) => (
                      <TextInput
                        key={i}
                        ref={(el) => (otpRefs.current[i] = el)}
                        style={[
                          styles.otpBox,
                          digit ? styles.otpBoxFilled : null,
                          otpError ? styles.otpBoxError : null,
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

                  {!!otpError && (
                    <View style={styles.errorContainer}>
                      <Feather
                        name="alert-circle"
                        size={wp("3.5%")}
                        color={Colors.error}
                      />
                      <Text style={styles.fieldError}>{otpError}</Text>
                    </View>
                  )}

                  <View style={styles.progressRow}>
                    {Array(OTP_LENGTH)
                      .fill(0)
                      .map((_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.progressDot,
                            i < otpFilled && styles.progressDotFilled,
                          ]}
                        />
                      ))}
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    otpFilled < OTP_LENGTH && styles.primaryBtnDisabled,
                  ]}
                  onPress={() => handleVerifyOtp()}
                  activeOpacity={0.87}
                  disabled={otpLoading || otpFilled < OTP_LENGTH}
                >
                  {otpLoading ? (
                    <ActivityIndicator color={Colors.white} size="small" />
                  ) : (
                    <>
                      <Text style={styles.primaryBtnText}>
                        Verify & Continue
                      </Text>
                      <Feather
                        name="arrow-right"
                        color={Colors.white}
                        size={wp("5%")}
                      />
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.resendRow}>
                  <Text style={styles.resendLabel}>Didn't receive it? </Text>
                  <TouchableOpacity
                    onPress={handleResend}
                    disabled={resendTimer > 0 || otpLoading}
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
                    color="#25D366"
                  />
                  <Text style={styles.waHintText}>
                    OTP sent via WhatsApp / SMS
                  </Text>
                </View>
              </View>
            </Animated.View>
          )}

          {/* ────────────────────────────────────────────────
              STEP 3 — PROFILE FORM
          ──────────────────────────────────────────────── */}
          {step === "profile" && (
            <>
              {/* Contact Details */}
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconBox}>
                  <FontAwesome5
                    name="user"
                    size={wp("4.5%")}
                    color={Colors.primary}
                  />
                </View>
                <Text style={styles.sectionTitle}>Contact Details</Text>
              </View>

              <View style={styles.card}>
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>
                    Contact Person Name <Text style={styles.required}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        borderColor: inputBorderColor("contactName"),
                        backgroundColor: inputBg("contactName"),
                      },
                    ]}
                  >
                    <FontAwesome5
                      name="user"
                      color={
                        activeField === "contactName"
                          ? Colors.primary
                          : Colors.textMuted
                      }
                      size={wp("4.5%")}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      ref={nameRef}
                      style={styles.inputWithIcon}
                      placeholder="e.g. Rajesh Patel"
                      placeholderTextColor={Colors.textMuted}
                      value={form.contactName}
                      onChangeText={update("contactName")}
                      onFocus={() => setActiveField("contactName")}
                      onBlur={() => setActiveField(null)}
                      returnKeyType="next"
                      onSubmitEditing={() => addr1Ref.current?.focus()}
                      autoCapitalize="words"
                    />
                  </View>
                  {errors.contactName && (
                    <View style={styles.errorContainer}>
                      <Feather
                        name="alert-circle"
                        size={wp("3.5%")}
                        color={Colors.error}
                      />
                      <Text style={styles.fieldError}>
                        {errors.contactName}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Verified Mobile</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        backgroundColor: Colors.primaryLight,
                        borderColor: Colors.primary,
                        paddingVertical: hp("1.5%"),
                      },
                    ]}
                  >
                    <Feather
                      name="phone"
                      size={wp("4.5%")}
                      color={Colors.primary}
                      style={styles.inputIcon}
                    />
                    <Text style={styles.verifiedPhoneText}>+91 {phone}</Text>
                    <MaterialCommunityIcons
                      name="check-decagram"
                      size={wp("4%")}
                      color={Colors.success}
                    />
                  </View>
                </View>
              </View>

              {/* Delivery Address */}
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconBox}>
                  <FontAwesome5
                    name="map-marker-alt"
                    size={wp("4.5%")}
                    color={Colors.primary}
                  />
                </View>
                <Text style={styles.sectionTitle}>Delivery Address</Text>
              </View>

              <View style={styles.card}>
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>
                    Address Line 1 <Text style={styles.required}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        borderColor: inputBorderColor("addressLine1"),
                        backgroundColor: inputBg("addressLine1"),
                      },
                    ]}
                  >
                    <FontAwesome5
                      name="building"
                      color={
                        activeField === "addressLine1"
                          ? Colors.primary
                          : Colors.textMuted
                      }
                      size={wp("4.5%")}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      ref={addr1Ref}
                      style={styles.inputWithIcon}
                      placeholder="Shop / Flat No., Building Name"
                      placeholderTextColor={Colors.textMuted}
                      value={form.addressLine1}
                      onChangeText={update("addressLine1")}
                      onFocus={() => setActiveField("addressLine1")}
                      onBlur={() => setActiveField(null)}
                      returnKeyType="next"
                      onSubmitEditing={() => addr2Ref.current?.focus()}
                    />
                  </View>
                  {errors.addressLine1 && (
                    <View style={styles.errorContainer}>
                      <Feather
                        name="alert-circle"
                        size={wp("3.5%")}
                        color={Colors.error}
                      />
                      <Text style={styles.fieldError}>
                        {errors.addressLine1}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>
                    Address Line 2{" "}
                    <Text style={styles.optional}>(Optional)</Text>
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        borderColor:
                          activeField === "addressLine2"
                            ? Colors.borderFocus
                            : Colors.border,
                        backgroundColor:
                          activeField === "addressLine2"
                            ? Colors.primaryLight
                            : Colors.surfaceAlt,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="store"
                      color={
                        activeField === "addressLine2"
                          ? Colors.primary
                          : Colors.textMuted
                      }
                      size={wp("4.5%")}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      ref={addr2Ref}
                      style={styles.inputWithIcon}
                      placeholder="Street, Area, Landmark"
                      placeholderTextColor={Colors.textMuted}
                      value={form.addressLine2}
                      onChangeText={update("addressLine2")}
                      onFocus={() =>
                        setActiveField("addressLine2" as keyof ProfileForm)
                      }
                      onBlur={() => setActiveField(null)}
                      returnKeyType="next"
                      onSubmitEditing={() => cityRef.current?.focus()}
                    />
                  </View>
                </View>

                <View style={styles.twoColRow}>
                  <View style={[styles.fieldWrap, styles.halfField]}>
                    <Text style={styles.label}>
                      City <Text style={styles.required}>*</Text>
                    </Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        {
                          borderColor: inputBorderColor("city"),
                          backgroundColor: inputBg("city"),
                        },
                      ]}
                    >
                      <FontAwesome5
                        name="building"
                        color={
                          activeField === "city"
                            ? Colors.primary
                            : Colors.textMuted
                        }
                        size={wp("4%")}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        ref={cityRef}
                        style={[styles.inputWithIcon, { fontSize: wp("3.6%") }]}
                        placeholder="e.g. Surat"
                        placeholderTextColor={Colors.textMuted}
                        value={form.city}
                        onChangeText={update("city")}
                        onFocus={() => setActiveField("city")}
                        onBlur={() => setActiveField(null)}
                        returnKeyType="next"
                        onSubmitEditing={() => setShowStateDropdown(true)}
                        autoCapitalize="words"
                      />
                    </View>
                    {errors.city && (
                      <View style={styles.errorContainer}>
                        <Feather
                          name="alert-circle"
                          size={wp("3%")}
                          color={Colors.error}
                        />
                        <Text style={styles.fieldError}>{errors.city}</Text>
                      </View>
                    )}
                  </View>

                  <View style={[styles.fieldWrap, styles.halfField]}>
                    <Text style={styles.label}>
                      State <Text style={styles.required}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.inputWrapper,
                        {
                          borderColor: inputBorderColor("state"),
                          backgroundColor: inputBg("state"),
                        },
                      ]}
                      onPress={() => setShowStateDropdown(true)}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons
                        name="map-marker"
                        color={
                          activeField === "state"
                            ? Colors.primary
                            : Colors.textMuted
                        }
                        size={wp("4%")}
                        style={styles.inputIcon}
                      />
                      <Text
                        style={[
                          styles.inputWithIcon,
                          {
                            fontSize: wp("3.6%"),
                            color: form.state
                              ? Colors.textPrimary
                              : Colors.textMuted,
                          },
                        ]}
                      >
                        {form.state || "Select State"}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={wp("4%")}
                        color={Colors.textMuted}
                      />
                    </TouchableOpacity>
                    {errors.state && (
                      <View style={styles.errorContainer}>
                        <Feather
                          name="alert-circle"
                          size={wp("3%")}
                          color={Colors.error}
                        />
                        <Text style={styles.fieldError}>{errors.state}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>
                    Pincode <Text style={styles.required}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        borderColor: inputBorderColor("pincode"),
                        backgroundColor: inputBg("pincode"),
                      },
                    ]}
                  >
                    <Feather
                      name="hash"
                      color={
                        activeField === "pincode"
                          ? Colors.primary
                          : Colors.textMuted
                      }
                      size={wp("4.5%")}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      ref={pincodeRef}
                      style={styles.inputWithIcon}
                      placeholder="e.g. 395003"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="number-pad"
                      maxLength={6}
                      value={form.pincode}
                      onChangeText={(t) =>
                        update("pincode")(t.replace(/[^0-9]/g, ""))
                      }
                      onFocus={() => setActiveField("pincode")}
                      onBlur={() => setActiveField(null)}
                      returnKeyType="next"
                      onSubmitEditing={() => gstRef.current?.focus()}
                    />
                  </View>
                  {errors.pincode && (
                    <View style={styles.errorContainer}>
                      <Feather
                        name="alert-circle"
                        size={wp("3.5%")}
                        color={Colors.error}
                      />
                      <Text style={styles.fieldError}>{errors.pincode}</Text>
                    </View>
                  )}
                </View>

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
                      color={Colors.success}
                    />
                    <Text style={styles.locationDetectedText}>
                      📍 Location detected and address auto-filled
                    </Text>
                  </View>
                )}
              </View>

              {/* GST Details */}
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconBox}>
                  <MaterialCommunityIcons
                    name="receipt"
                    size={wp("4.5%")}
                    color={Colors.primary}
                  />
                </View>
                <Text style={styles.sectionTitle}>GST Details</Text>
                <View style={styles.optionalChip}>
                  <Text style={styles.optionalChipText}>Optional</Text>
                </View>
              </View>

              <View
                style={[
                  styles.approvalBanner,
                  { backgroundColor: isAutoApproval ? "#E6F9F0" : "#FFF8E1" },
                ]}
              >
                {isAutoApproval ? (
                  <Feather name="zap" size={wp("5%")} color={Colors.success} />
                ) : (
                  <Feather
                    name="clock"
                    size={wp("5%")}
                    color={Colors.warning}
                  />
                )}
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.approvalTitle,
                      {
                        color: isAutoApproval ? Colors.success : Colors.warning,
                      },
                    ]}
                  >
                    {isAutoApproval ? "Auto Approval" : "Manual Approval"}
                  </Text>
                  <Text style={styles.approvalDesc}>
                    {isAutoApproval
                      ? "Valid GST detected — your account will be approved instantly."
                      : "Without GST, your account will be reviewed by admin (usually within 24hrs)."}
                  </Text>
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.fieldWrap}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>GST Number</Text>
                    {form.gstNumber.length > 0 && (
                      <View
                        style={[
                          styles.gstStatusChip,
                          {
                            backgroundColor: isGstValid(form.gstNumber)
                              ? Colors.success + "20"
                              : Colors.error + "20",
                          },
                        ]}
                      >
                        {isGstValid(form.gstNumber) ? (
                          <Feather
                            name="check-circle"
                            size={wp("3%")}
                            color={Colors.success}
                          />
                        ) : (
                          <Feather
                            name="alert-circle"
                            size={wp("3%")}
                            color={Colors.error}
                          />
                        )}
                        <Text
                          style={[
                            styles.gstStatusText,
                            {
                              color: isGstValid(form.gstNumber)
                                ? Colors.success
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
                      styles.inputWrapper,
                      {
                        borderColor: inputBorderColor("gstNumber"),
                        backgroundColor: inputBg("gstNumber"),
                      },
                    ]}
                  >
                    <FontAwesome5
                      name="credit-card"
                      color={
                        activeField === "gstNumber"
                          ? Colors.primary
                          : Colors.textMuted
                      }
                      size={wp("4.5%")}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      ref={gstRef}
                      style={[styles.inputWithIcon, styles.gstInput]}
                      placeholder="e.g. 24AABCU9603R1ZX"
                      placeholderTextColor={Colors.textMuted}
                      autoCapitalize="characters"
                      maxLength={15}
                      value={form.gstNumber}
                      onChangeText={(t) => update("gstNumber")(t.toUpperCase())}
                      onFocus={() => setActiveField("gstNumber")}
                      onBlur={() => setActiveField(null)}
                      returnKeyType="done"
                    />
                  </View>
                  {errors.gstNumber && (
                    <View style={styles.errorContainer}>
                      <Feather
                        name="alert-circle"
                        size={wp("3.5%")}
                        color={Colors.error}
                      />
                      <Text style={styles.fieldError}>{errors.gstNumber}</Text>
                    </View>
                  )}
                  <View style={styles.fieldHint}>
                    <Feather
                      name="zap"
                      size={wp("3.5%")}
                      color={Colors.warning}
                    />
                    <Text style={styles.hintText}>
                      Adding GST enables instant account approval.
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnLoading]}
                onPress={handleSubmit}
                activeOpacity={0.87}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <>
                    <Text style={styles.submitBtnText}>
                      Complete Registration
                    </Text>
                    <Feather
                      name="arrow-right"
                      color={Colors.white}
                      size={wp("5%")}
                    />
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </KeyboardAwareScrollView>

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
                    update("state")(state);
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

      {/* ── Success Modal (Centered) ── */}
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
                    approvalStatus === "auto" ? Colors.primaryLight : "#FFF8E1",
                },
              ]}
            >
              {approvalStatus === "auto" ? (
                <Feather name="zap" size={wp("10%")} color={Colors.success} />
              ) : (
                <Feather name="clock" size={wp("10%")} color={Colors.warning} />
              )}
            </View>
            <Text style={styles.modalTitle}>
              {approvalStatus === "auto"
                ? "Account Approved!"
                : "Registration Submitted!"}
            </Text>
            <Text style={styles.modalBody}>
              {approvalStatus === "auto"
                ? "Your GST number verified instantly. Your account is now active and ready to place orders."
                : "Your profile is under review. Our admin team will verify and approve your account within 24 hours. We'll notify you on WhatsApp."}
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
              {approvalStatus === "auto" ? (
                <Feather
                  name="check-circle"
                  size={wp("3.5%")}
                  color={Colors.success}
                />
              ) : (
                <Feather
                  name="clock"
                  size={wp("3.5%")}
                  color={Colors.warning}
                />
              )}
              <Text
                style={[
                  styles.statusPillText,
                  {
                    color:
                      approvalStatus === "auto"
                        ? Colors.success
                        : Colors.warning,
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

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: Platform.OS === "ios" ? hp("6%") : hp("6%"),
    paddingBottom: hp("2%"),
    paddingHorizontal: wp("5%"),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 6,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: wp("3%") },
  backBtn: {
    width: wp("9%"),
    height: wp("9%"),
    borderRadius: wp("4.5%"),
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
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
  stepBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: wp("3%"),
    paddingHorizontal: wp("3.5%"),
    paddingVertical: hp("0.6%"),
  },
  stepBadgeText: {
    fontSize: wp("3.2%"),
    fontWeight: "700",
    color: Colors.white,
  },
  progressBarBg: { height: hp("0.4%"), backgroundColor: Colors.border },
  progressBarFill: { height: "100%", backgroundColor: Colors.primary },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: wp("4.5%"),
    paddingTop: hp("2.5%"),
    paddingBottom: hp("5%"),
  },

  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: wp("4.5%"),
    padding: wp("5%"),
    marginBottom: hp("2.5%"),
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 5,
  },
  cardHeader: { alignItems: "center", marginBottom: hp("2%") },
  cardTitle: {
    fontSize: wp("5%"),
    fontWeight: "700",
    color: Colors.textPrimary,
    marginTop: hp("1.5%"),
    textAlign: "center",
  },
  cardSubtitle: {
    fontSize: wp("3.5%"),
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: wp("5%"),
    marginTop: hp("0.5%"),
  },
  phoneHighlight: { fontWeight: "700", color: Colors.primary },

  // Phone Input
  phoneInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("3%"),
    marginBottom: hp("1.5%"),
  },
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
  phoneStatus: {
    flexDirection: "row",
    alignItems: "center",
    padding: wp("3.5%"),
    borderRadius: wp("3%"),
    marginBottom: hp("2%"),
    gap: wp("2%"),
  },
  phoneStatusText: { flex: 1, fontSize: wp("3.3%"), fontWeight: "500" },
  verifiedPhoneText: {
    flex: 1,
    fontSize: wp("3.8%"),
    fontWeight: "600",
    color: Colors.primary,
  },

  // OTP
  otpContainer: { marginBottom: hp("1.5%") },
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
  },
  otpBoxFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.otpBoxFilled,
    color: Colors.primary,
  },
  otpBoxError: { borderColor: Colors.error, backgroundColor: "#FFF5F5" },
  progressRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: wp("2.5%"),
    marginTop: hp("2%"),
  },
  progressDot: {
    width: wp("1.8%"),
    height: wp("1.8%"),
    borderRadius: wp("0.9%"),
    backgroundColor: Colors.border,
  },
  progressDotFilled: { backgroundColor: Colors.primary, width: wp("4%") },
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
    backgroundColor: "#E7F5E8",
    borderRadius: wp("3%"),
    paddingVertical: hp("1.2%"),
    paddingHorizontal: wp("4%"),
    marginTop: hp("2%"),
    gap: wp("2%"),
  },
  waHintText: { fontSize: wp("3.2%"), color: "#075E54", fontWeight: "600" },

  // Form Sections
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: hp("1.5%"),
    marginTop: hp("1%"),
    gap: wp("2.5%"),
  },
  sectionIconBox: {
    width: wp("8.5%"),
    height: wp("8.5%"),
    borderRadius: wp("4.25%"),
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: wp("4.2%"),
    fontWeight: "700",
    color: Colors.textPrimary,
    flex: 1,
  },
  optionalChip: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: wp("3%"),
    paddingHorizontal: wp("2.5%"),
    paddingVertical: hp("0.4%"),
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionalChipText: {
    fontSize: wp("2.8%"),
    color: Colors.textMuted,
    fontWeight: "500",
  },

  // Fields
  fieldWrap: { marginBottom: hp("2%") },
  label: {
    fontSize: wp("3.5%"),
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: hp("0.8%"),
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: hp("0.8%"),
  },
  required: { color: Colors.error, fontWeight: "700" },
  optional: { color: Colors.textMuted, fontWeight: "400", fontSize: wp("3%") },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: wp("3.5%"),
    borderWidth: 1.5,
    paddingHorizontal: wp("3.5%"),
  },
  inputIcon: { marginRight: wp("2.5%") },
  inputWithIcon: {
    flex: 1,
    paddingVertical: hp("1.6%"),
    fontSize: wp("3.8%"),
    color: Colors.textPrimary,
    fontWeight: "500",
  },
  gstInput: { letterSpacing: 1.2, fontWeight: "600", fontSize: wp("3.6%") },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: hp("0.5%"),
    gap: wp("1.5%"),
  },
  fieldError: { fontSize: wp("3%"), color: Colors.error, fontWeight: "500" },
  fieldHint: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: hp("0.8%"),
    gap: wp("1.5%"),
  },
  hintText: { fontSize: wp("3%"), color: Colors.textMuted },

  twoColRow: { flexDirection: "row", gap: wp("3%") },
  halfField: { flex: 1 },

  // Map Picker
  mapPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primaryLight,
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
    color: Colors.success,
    fontWeight: "500",
  },

  // GST
  gstStatusChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: wp("3%"),
    paddingHorizontal: wp("2.5%"),
    paddingVertical: hp("0.4%"),
    gap: wp("1%"),
  },
  gstStatusText: { fontSize: wp("2.8%"), fontWeight: "700" },
  approvalBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: wp("4%"),
    padding: wp("4%"),
    marginBottom: hp("2%"),
    gap: wp("3%"),
  },
  approvalTitle: {
    fontSize: wp("3.6%"),
    fontWeight: "700",
    marginBottom: hp("0.4%"),
  },
  approvalDesc: {
    fontSize: wp("3.1%"),
    color: Colors.textSecondary,
    lineHeight: wp("4.8%"),
  },

  // Buttons
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: wp("3.5%"),
    paddingVertical: hp("2%"),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp("2.5%"),
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
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
    color: Colors.white,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: wp("3.5%"),
    paddingVertical: hp("2%"),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: hp("2%"),
    gap: wp("2.5%"),
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  submitBtnLoading: { opacity: 0.8 },
  submitBtnText: {
    fontSize: wp("4.4%"),
    fontWeight: "800",
    color: Colors.white,
  },
  legalNote: {
    fontSize: wp("3%"),
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: hp("2%"),
  },
  legalLink: { color: Colors.primary, fontWeight: "600" },

  // Dropdown Modal
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
    borderBottomColor: Colors.divider,
  },
  dropdownItemSelected: {
    backgroundColor: Colors.primaryLight,
    marginHorizontal: -wp("2%"),
    paddingHorizontal: wp("2%"),
    borderRadius: wp("2%"),
  },
  dropdownItemText: { fontSize: wp("3.8%"), color: Colors.textPrimary },
  dropdownItemTextSelected: { color: Colors.primary, fontWeight: "600" },

  // Success Modal (Centered)
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

export default ProfileSetupScreen;
