// ─────────────────────────────────────────────────────────────────────────────
// STEP 4 — app/editprofile.tsx  (full file, replace yours)
// ─────────────────────────────────────────────────────────────────────────────
import { Text } from "@/components/CustomText";
import { Ionicons } from "@expo/vector-icons";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
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
import Colors from "../constants/colors";
import { apiGetMe, apiUpdateProfile } from "./services/api";

// ─── Constants ────────────────────────────────────────────────────────────────
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

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const isGstValid = (gst: string) => GST_REGEX.test(gst.trim().toUpperCase());

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) => (
  <View style={sectionStyles.row}>
    <View style={sectionStyles.iconBg}>{icon}</View>
    <Text style={sectionStyles.title}>{title}</Text>
    <View style={sectionStyles.line} />
  </View>
);

const sectionStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2%"),
    marginTop: hp("1.5%"),
    marginBottom: hp("2.2%"),
  },
  iconBg: {
    width: wp("7.5%"),
    height: wp("7.5%"),
    borderRadius: wp("2.2%"),
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: wp("3.8%"),
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: 0.2,
  },
  line: { flex: 1, height: 1, backgroundColor: Colors.border },
});

// ─── Field Wrapper ────────────────────────────────────────────────────────────
const Field = ({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) => (
  <View style={fieldStyles.wrapper}>
    <View style={fieldStyles.labelRow}>
      <Text style={fieldStyles.label}>
        {label}
        {required && <Text style={fieldStyles.star}> *</Text>}
      </Text>
      {hint && <Text style={fieldStyles.hint}>{hint}</Text>}
    </View>
    {children}
  </View>
);

const fieldStyles = StyleSheet.create({
  wrapper: { marginBottom: hp("2.2%") },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: hp("0.8%"),
  },
  label: {
    fontSize: wp("3.5%"),
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  star: { color: Colors.error },
  hint: { fontSize: wp("3%"), color: Colors.textMuted },
});

// ─── Dropdown Picker ──────────────────────────────────────────────────────────
const DropdownPicker = ({
  options,
  value,
  placeholder,
  onSelect,
}: {
  options: string[];
  value: string;
  placeholder: string;
  onSelect: (v: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const toggleOpen = () => {
    Animated.timing(rotateAnim, {
      toValue: open ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
      easing: Easing.out(Easing.quad),
    }).start();
    setOpen(!open);
  };

  const chevronRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <>
      <TouchableOpacity
        style={[
          styles.input,
          styles.dropdownBtn,
          value ? styles.inputFilled : undefined,
        ]}
        onPress={toggleOpen}
        activeOpacity={0.8}
      >
        <Text
          style={[styles.dropdownText, !value && { color: Colors.textMuted }]}
        >
          {value || placeholder}
        </Text>
        <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
          <Feather
            name="chevron-down"
            size={18}
            color={value ? Colors.primary : Colors.textMuted}
          />
        </Animated.View>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setOpen(false)}
          activeOpacity={1}
        >
          <View style={styles.modalSheet}>
            <View style={styles.handleBar} />
            <Text style={styles.modalTitle}>{placeholder}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionRow,
                    value === item && styles.optionRowActive,
                  ]}
                  onPress={() => {
                    onSelect(item);
                    setOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionText,
                      value === item && styles.optionTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                  {value === item && (
                    <View style={styles.checkCircle}>
                      <Text style={styles.checkmark}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const EditProfileScreen = () => {
  // ── Loading / saving states ──
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Read-only meta ──
  const [phone, setPhone] = useState("");

  // ── Editable fields (mirror IProfile exactly) ──
  const [contactName, setContactName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [gstNumber, setGstNumber] = useState("");

  // ── UI state ──
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [stateSearch, setStateSearch] = useState("");

  // ── Validation ──
  const isValid =
    contactName.trim().length > 1 &&
    addressLine1.trim().length > 3 &&
    city.trim().length > 0 &&
    state.trim().length > 0 &&
    pincode.trim().length === 6;

  const filteredStates = INDIAN_STATES.filter((s) =>
    s.toLowerCase().includes(stateSearch.toLowerCase()),
  );

  // ── Fetch profile on mount ────────────────────────────────────────────────
  const loadProfile = useCallback(async () => {
    try {
      setPageLoading(true);
      setLoadError(null);

      const data = await apiGetMe();
      const u = data.user;
      const p = u.profile ?? {};

      // Read-only
      setPhone(u.phone ?? "");

      // Editable — map directly from IProfile fields
      setContactName(p.contactName ?? "");
      setAddressLine1(p.addressLine1 ?? "");
      setAddressLine2(p.addressLine2 ?? "");
      setCity(p.city ?? "");
      setState(p.state ?? "");
      setPincode(p.pincode ?? "");
      setGstNumber(p.gstNumber ?? "");

      setHasChanges(false); // fresh load → no pending changes
    } catch (err: any) {
      setLoadError(err.message ?? "Failed to load profile.");
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // ── Mark changed helper ───────────────────────────────────────────────────
  const markChanged = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setHasChanges(true);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!isValid || saving) return;

    if (gstNumber.trim() && !isGstValid(gstNumber)) {
      Alert.alert("Invalid GST", "Please fix the GST number before saving.");
      return;
    }

    try {
      setSaving(true);
      await apiUpdateProfile({
        contactName: contactName.trim(),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        gstNumber: gstNumber.trim().toUpperCase(),
      });

      setHasChanges(false);
      Alert.alert(
        "Profile Updated",
        "Your profile has been saved successfully.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (err: any) {
      Alert.alert(
        "Save Failed",
        err.message ?? "Something went wrong. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Discard ───────────────────────────────────────────────────────────────
  const handleDiscard = () => {
    if (!hasChanges) {
      router.back();
      return;
    }
    Alert.alert(
      "Discard Changes?",
      "You have unsaved changes. Are you sure you want to go back?",
      [
        { text: "Keep Editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: () => router.back() },
      ],
    );
  };

  // ── Input style helper ────────────────────────────────────────────────────
  const inputStyle = (field: string, filled?: boolean) => [
    styles.input,
    focusedField === field && styles.inputFocused,
    filled && styles.inputFilled,
  ];

  // ─── Loading screen ───────────────────────────────────────────────────────
  if (pageLoading) {
    return (
      <View style={styles.centerScreen}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={Colors.background}
        />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading your profile…</Text>
      </View>
    );
  }

  // ─── Error screen ─────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <View style={styles.centerScreen}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={Colors.background}
        />
        <Feather name="wifi-off" size={wp("12%")} color={Colors.error} />
        <Text style={styles.errorTitle}>Couldn't load profile</Text>
        <Text style={styles.errorMessage}>{loadError}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadProfile}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Main form ────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleDiscard}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <View style={styles.backBtnInner}>
              <Ionicons
                name="arrow-back"
                size={wp("5.5%")}
                color={Colors.textPrimary}
              />
            </View>
          </TouchableOpacity>

          <Text style={styles.screenTitle}>Edit Profile</Text>

          <TouchableOpacity
            style={[
              styles.saveChip,
              (!isValid || !hasChanges || saving) && styles.saveChipDisabled,
            ]}
            onPress={handleSave}
            disabled={!isValid || !hasChanges || saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text
                style={[
                  styles.saveChipText,
                  (!isValid || !hasChanges) && styles.saveChipTextDisabled,
                ]}
              >
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Contact Details Card ── */}
        <View style={styles.card}>
          <SectionHeader
            icon={<FontAwesome5 name="user" size={16} color={Colors.primary} />}
            title="Contact Details"
          />

          <Field label="Contact Person Name" required>
            <TextInput
              style={inputStyle("contactName", contactName !== "")}
              value={contactName}
              onChangeText={markChanged(setContactName)}
              placeholder="e.g. Rajesh Patel"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
              returnKeyType="next"
              onFocus={() => setFocusedField("contactName")}
              onBlur={() => setFocusedField(null)}
            />
          </Field>

          {/* Phone is read-only — pulled from user.phone, never editable */}
          <Field label="Mobile Number">
            <View style={[styles.input, styles.disabledInput]}>
              <Text style={styles.disabledText}>+91 {phone}</Text>
              <View style={styles.verifiedBadge}>
                <Feather name="check-circle" size={13} color={Colors.success} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>
          </Field>
        </View>

        {/* ── Delivery Address Card ── */}
        <View style={styles.card}>
          <SectionHeader
            icon={
              <FontAwesome5
                name="map-marker-alt"
                size={16}
                color={Colors.primary}
              />
            }
            title="Delivery Address"
          />

          <Field label="Address Line 1" required>
            <TextInput
              style={inputStyle("addressLine1", addressLine1 !== "")}
              value={addressLine1}
              onChangeText={markChanged(setAddressLine1)}
              placeholder="Shop / Flat No., Building Name"
              placeholderTextColor={Colors.textMuted}
              returnKeyType="next"
              onFocus={() => setFocusedField("addressLine1")}
              onBlur={() => setFocusedField(null)}
            />
          </Field>

          <Field label="Address Line 2" hint="Optional">
            <TextInput
              style={inputStyle("addressLine2", addressLine2 !== "")}
              value={addressLine2}
              onChangeText={markChanged(setAddressLine2)}
              placeholder="Street, Area, Landmark"
              placeholderTextColor={Colors.textMuted}
              returnKeyType="next"
              onFocus={() => setFocusedField("addressLine2")}
              onBlur={() => setFocusedField(null)}
            />
          </Field>

          <View style={styles.rowFields}>
            <View style={{ flex: 1 }}>
              <Field label="City" required>
                <TextInput
                  style={[
                    inputStyle("city", city !== ""),
                    { fontSize: wp("3.6%") },
                  ]}
                  value={city}
                  onChangeText={markChanged(setCity)}
                  placeholder="e.g. Surat"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onFocus={() => setFocusedField("city")}
                  onBlur={() => setFocusedField(null)}
                />
              </Field>
            </View>

            <View style={{ flex: 1 }}>
              <Field label="State" required>
                <TouchableOpacity
                  style={[
                    styles.input,
                    styles.dropdownBtn,
                    state ? styles.inputFilled : undefined,
                  ]}
                  onPress={() => setShowStateDropdown(true)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      !state && { color: Colors.textMuted },
                    ]}
                  >
                    {state || "Select State"}
                  </Text>
                  <Feather
                    name="chevron-down"
                    size={18}
                    color={Colors.textMuted}
                  />
                </TouchableOpacity>
              </Field>
            </View>
          </View>

          <Field label="Pincode" required hint="6 digits">
            <TextInput
              style={inputStyle("pincode", pincode !== "")}
              value={pincode}
              onChangeText={(t) =>
                markChanged(setPincode)(t.replace(/[^0-9]/g, ""))
              }
              placeholder="e.g. 395003"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              maxLength={6}
              returnKeyType="next"
              onFocus={() => setFocusedField("pincode")}
              onBlur={() => setFocusedField(null)}
            />
          </Field>
        </View>

        {/* ── GST Details Card ── */}
        <View style={styles.card}>
          <SectionHeader
            icon={
              <FontAwesome5
                name="credit-card"
                size={16}
                color={Colors.primary}
              />
            }
            title="GST Details"
          />
          <View style={styles.optionalChip}>
            <Text style={styles.optionalChipText}>Optional</Text>
          </View>

          <Field label="GST Number">
            <View>
              <TextInput
                style={[
                  inputStyle("gstNumber", gstNumber !== ""),
                  styles.gstInput,
                ]}
                value={gstNumber}
                onChangeText={(t) => markChanged(setGstNumber)(t.toUpperCase())}
                placeholder="e.g. 24AABCU9603R1ZX"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="characters"
                maxLength={15}
                returnKeyType="done"
                onFocus={() => setFocusedField("gstNumber")}
                onBlur={() => setFocusedField(null)}
              />
              {gstNumber.length > 0 && (
                <View style={styles.gstStatusContainer}>
                  {isGstValid(gstNumber) ? (
                    <View
                      style={[
                        styles.gstStatusChip,
                        { backgroundColor: Colors.success + "20" },
                      ]}
                    >
                      <Feather
                        name="check-circle"
                        size={wp("3%")}
                        color={Colors.success}
                      />
                      <Text
                        style={[
                          styles.gstStatusText,
                          { color: Colors.success },
                        ]}
                      >
                        Valid GST
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.gstStatusChip,
                        { backgroundColor: Colors.error + "20" },
                      ]}
                    >
                      <Feather
                        name="alert-circle"
                        size={wp("3%")}
                        color={Colors.error}
                      />
                      <Text
                        style={[styles.gstStatusText, { color: Colors.error }]}
                      >
                        Invalid GST
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </Field>
        </View>

        {/* ── Action Buttons ── */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!isValid || !hasChanges || saving) && styles.submitBtnDisabled,
          ]}
          onPress={handleSave}
          activeOpacity={0.88}
          disabled={!isValid || !hasChanges || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <Feather name="check" size={wp("4.5%")} color={Colors.white} />
              <Text style={styles.submitText}>SAVE CHANGES</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.discardBtn}
          onPress={handleDiscard}
          activeOpacity={0.8}
        >
          <Text style={styles.discardText}>Discard Changes</Text>
        </TouchableOpacity>
      </ScrollView>

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
                placeholder="Search state…"
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
              {filteredStates.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.dropdownItem,
                    state === s && styles.dropdownItemSelected,
                  ]}
                  onPress={() => {
                    setState(s);
                    setHasChanges(true);
                    setShowStateDropdown(false);
                    setStateSearch("");
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      state === s && styles.dropdownItemTextSelected,
                    ]}
                  >
                    {s}
                  </Text>
                  {state === s && (
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
    </KeyboardAvoidingView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: {
    flexGrow: 1,
    paddingHorizontal: wp("5%"),
    paddingTop: Platform.OS === "ios" ? hp("6%") : hp("6%"),
    paddingBottom: hp("6%"),
    backgroundColor: Colors.background,
  },

  // Center screens (loading / error)
  centerScreen: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp("10%"),
    gap: hp("2%"),
  },
  loadingText: {
    fontSize: wp("3.8%"),
    color: Colors.textSecondary,
    marginTop: hp("1%"),
  },
  errorTitle: {
    fontSize: wp("4.5%"),
    fontWeight: "700",
    color: Colors.textPrimary,
    marginTop: hp("1%"),
  },
  errorMessage: {
    fontSize: wp("3.5%"),
    color: Colors.textMuted,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: hp("1%"),
    paddingHorizontal: wp("8%"),
    paddingVertical: hp("1.5%"),
    borderRadius: wp("3%"),
    backgroundColor: Colors.primary,
  },
  retryText: {
    fontSize: wp("4%"),
    color: Colors.white,
    fontWeight: "700",
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: hp("3%"),
  },
  backBtn: {},
  backBtnInner: {
    width: wp("10%"),
    height: wp("10%"),
    borderRadius: wp("3%"),
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  screenTitle: {
    fontSize: wp("5%"),
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  saveChip: {
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("0.7%"),
    borderRadius: wp("5%"),
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
    minWidth: wp("14%"),
    alignItems: "center",
    justifyContent: "center",
  },
  saveChipDisabled: {
    backgroundColor: Colors.textMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveChipText: {
    fontSize: wp("3.5%"),
    color: Colors.white,
    fontWeight: "700",
  },
  saveChipTextDisabled: { color: Colors.white },

  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: wp("4%"),
    padding: wp("5%"),
    marginBottom: hp("2.5%"),
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    position: "relative",
  },
  optionalChip: {
    position: "absolute",
    top: wp("4%"),
    right: wp("5%"),
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

  // Input
  input: {
    width: "100%",
    minHeight: hp("6.2%"),
    borderRadius: wp("2.8%"),
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: wp("3.8%"),
    paddingVertical: hp("1%"),
    fontSize: wp("3.9%"),
    color: Colors.textPrimary,
    flexDirection: "row",
    alignItems: "center",
  },
  inputFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  inputFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceAlt,
  },
  gstInput: {
    letterSpacing: 1.2,
    fontWeight: "600",
    fontSize: wp("3.6%"),
    textTransform: "uppercase",
  },
  rowFields: { flexDirection: "row", gap: wp("3%") },
  disabledInput: {
    backgroundColor: Colors.surfaceAlt,
    borderColor: Colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  disabledText: {
    fontSize: wp("3.9%"),
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("1%"),
    backgroundColor: "#D1FAE5",
    paddingHorizontal: wp("2.5%"),
    paddingVertical: hp("0.4%"),
    borderRadius: wp("3%"),
  },
  verifiedText: {
    fontSize: wp("3%"),
    color: Colors.success,
    fontWeight: "700",
  },

  // Dropdown trigger
  dropdownBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownText: { fontSize: wp("3.9%"), color: Colors.textPrimary, flex: 1 },

  // GST status
  gstStatusContainer: { marginTop: hp("0.8%") },
  gstStatusChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: wp("3%"),
    paddingHorizontal: wp("2.5%"),
    paddingVertical: hp("0.4%"),
    gap: wp("1%"),
  },
  gstStatusText: { fontSize: wp("2.8%"), fontWeight: "700" },

  // Modal overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "flex-end",
  },

  // State dropdown card
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

  // Bottom sheet (DropdownPicker)
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: wp("6%"),
    borderTopRightRadius: wp("6%"),
    paddingTop: hp("1.5%"),
    paddingHorizontal: wp("5%"),
    paddingBottom: Platform.OS === "ios" ? hp("5%") : hp("3%"),
    maxHeight: hp("55%"),
  },
  handleBar: {
    width: wp("10%"),
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginBottom: hp("1.8%"),
  },
  modalTitle: {
    fontSize: wp("4.5%"),
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: hp("2%"),
    textAlign: "center",
    letterSpacing: -0.3,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: hp("1.8%"),
    paddingHorizontal: wp("3%"),
    borderRadius: wp("2.5%"),
    marginBottom: hp("0.5%"),
  },
  optionRowActive: { backgroundColor: Colors.primaryLight },
  optionText: { fontSize: wp("4%"), color: Colors.textSecondary },
  optionTextActive: { color: Colors.primary, fontWeight: "700" },
  checkCircle: {
    width: wp("6%"),
    height: wp("6%"),
    borderRadius: wp("3%"),
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: { fontSize: wp("3.2%"), color: Colors.white, fontWeight: "800" },

  // Submit
  submitBtn: {
    width: "100%",
    height: hp("7%"),
    borderRadius: wp("3.5%"),
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp("2%"),
    marginBottom: hp("1.5%"),
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  submitBtnDisabled: {
    backgroundColor: Colors.textMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitText: {
    fontSize: wp("4%"),
    color: Colors.white,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  // Discard
  discardBtn: {
    width: "100%",
    height: hp("6.5%"),
    borderRadius: wp("3.5%"),
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  discardText: {
    fontSize: wp("3.8%"),
    color: Colors.textMuted,
    fontWeight: "600",
  },
});

export default EditProfileScreen;
