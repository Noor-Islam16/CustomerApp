import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
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
import Colors from "../../constants/colors";

// ─── Types ───────────────────────────────────────────────────────────────────
type Screen = "phone" | "otp";

interface CountryCode {
  flag: string;
  code: string;
  dial: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const { width, height } = Dimensions.get("window");
const COUNTRY: CountryCode = { flag: "🇮🇳", code: "IN", dial: "+91" };
const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

// ─── Main Component ──────────────────────────────────────────────────────────
const LoginScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  // ── State ──
  const [screen, setScreen] = useState<Screen>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [otpSent, setOtpSent] = useState(false);

  // ── Refs ──
  const otpRefs = useRef<(TextInput | null)[]>([]);
  const phoneRef = useRef<TextInput>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Animations ──
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const cardFadeAnim = useRef(new Animated.Value(0)).current;

  // ── Entrance animation ──
  useEffect(() => {
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
  }, []);

  // ── Re-animate on screen change ──
  useEffect(() => {
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

  // ── Phone validation ──
  const isPhoneValid = phone.replace(/\s/g, "").length === 10;

  // ── Send OTP ──
  const handleSendOtp = async () => {
    if (!isPhoneValid) {
      setError("Please enter a valid 10-digit mobile number.");
      triggerShake();
      return;
    }
    setError("");
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 1500));
      setOtpSent(true);
      setResendTimer(RESEND_COOLDOWN);
      setScreen("otp");
      setTimeout(() => otpRefs.current[0]?.focus(), 400);
    } catch {
      setError("Failed to send OTP. Please try again.");
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  // ── OTP Input handler ──
  const handleOtpChange = (value: string, index: number) => {
    const digit = value.replace(/[^0-9]/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError("");

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

  // ── OTP backspace handler ──
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
  // ── Verify OTP ──
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
      await new Promise((r) => setTimeout(r, 1500));

      // Check if OTP matches "252002"
      if (otpCode === "252002") {
        router.push("/(tabs)/home");
      } else {
        setError("Invalid OTP. Please try again.");
        triggerShake();
        setOtp(Array(OTP_LENGTH).fill(""));
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      }
    } catch {
      setError("Invalid OTP. Please try again.");
      triggerShake();
      setOtp(Array(OTP_LENGTH).fill(""));
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ──
  const handleResend = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    setOtp(Array(OTP_LENGTH).fill(""));
    setError("");
    try {
      await new Promise((r) => setTimeout(r, 1000));
      setResendTimer(RESEND_COOLDOWN);
      setTimeout(() => otpRefs.current[0]?.focus(), 300);
    } finally {
      setLoading(false);
    }
  };

  const otpFilled = otp.filter(Boolean).length;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Colors.gradientStart}
      />

      {/* ── Animated Background ── */}
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
          {/* ── Header ── */}
          <View style={styles.header}>
            {screen === "otp" && (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => {
                  setScreen("phone");
                  setOtp(Array(OTP_LENGTH).fill(""));
                  setError("");
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

          {/* ── Logo Section ── */}
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
            <Text style={styles.appName}>Customer App</Text>
            <Text style={styles.tagline}>Your Health • Your Way</Text>
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
            {screen === "phone" ? (
              /* ── PHONE SCREEN ── */
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
            ) : (
              /* ── OTP SCREEN ── */
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

            {/* ── Create Account Link ── */}
            <View style={styles.signupContainer}>
              <View style={styles.divider} />
              <View style={styles.signupRow}>
                <Text style={styles.signupLabel}>Don't have an account? </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate("signup")}
                >
                  <Text style={styles.signupLink}>Create Account</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* ── Footer ── */}
          <Text style={styles.footer}>Customer App © 2026</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
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
  headerSpacer: {
    width: wp("10%"),
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: hp("4%"),
  },
  logoSection: {
    alignItems: "center",
    marginTop: hp("3%"),
    marginBottom: hp("3%"),
  },
  logoContainer: {
    position: "relative",
    marginBottom: hp("2%"),
  },
  logoCircle: {
    width: wp("24%"),
    height: wp("24%"),
    borderRadius: wp("40%"),
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.shadowMedium,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  logoBadge: {
    position: "absolute",
    bottom: -5,
    right: -5,
    width: wp("8%"),
    height: wp("8%"),
    borderRadius: wp("4%"),
    backgroundColor: Colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.white,
  },
  logoImage: {
    width: wp("32%"),
    height: wp("32%"),
  },
  appName: {
    fontSize: wp("7%"),
    fontWeight: "800",
    color: Colors.white,
    letterSpacing: 0.5,
    textShadowColor: "rgba(0,0,0,0.1)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
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
  cardHeader: {
    marginBottom: hp("2.5%"),
  },
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
  phoneHighlight: {
    fontWeight: "700",
    color: Colors.primary,
  },
  inputSection: {
    marginBottom: hp("2%"),
  },
  inputLabel: {
    fontSize: wp("3.5%"),
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: hp("1%"),
    marginLeft: wp("1%"),
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("3%"),
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
  countryFlag: {
    fontSize: wp("5.5%"),
  },
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
  inputError: {
    borderColor: Colors.error,
    backgroundColor: "#FFF5F5",
  },
  otpSection: {
    marginBottom: hp("2%"),
  },
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
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  otpBoxFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.otpBoxFilled,
    color: Colors.primary,
  },
  otpBoxError: {
    borderColor: Colors.error,
    backgroundColor: "#FFF5F5",
  },
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
  progressDotFilled: {
    backgroundColor: Colors.primary,
    width: wp("4%"),
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: hp("1%"),
    marginLeft: wp("1%"),
  },
  errorText: {
    fontSize: wp("3.3%"),
    color: Colors.error,
    fontWeight: "500",
  },
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
  legalLink: {
    color: Colors.primary,
    fontWeight: "600",
  },
  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: hp("2%"),
  },
  resendLabel: {
    fontSize: wp("3.5%"),
    color: Colors.textSecondary,
  },
  resendLink: {
    fontSize: wp("3.5%"),
    fontWeight: "700",
    color: Colors.primary,
  },
  resendLinkDisabled: {
    color: Colors.textMuted,
    fontWeight: "400",
  },
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
  waHintText: {
    fontSize: wp("3.2%"),
    color: Colors.accent,
    fontWeight: "600",
  },
  signupContainer: {
    marginTop: hp("2.5%"),
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginBottom: hp("2%"),
  },
  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signupLabel: {
    fontSize: wp("3.5%"),
    color: Colors.textSecondary,
  },
  signupLink: {
    fontSize: wp("3.5%"),
    fontWeight: "700",
    color: Colors.primary,
  },
  footer: {
    textAlign: "center",
    marginTop: hp("3%"),
    fontSize: wp("3%"),
    color: Colors.textMuted,
  },
});

export default LoginScreen;
