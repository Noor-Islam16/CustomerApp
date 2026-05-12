// app/privacy.tsx or screens/PrivacyPolicyScreen.tsx
import { Text } from "@/context/FontContext";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
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
import Colors from "../constants/colors";

// ─── Simplified Privacy Sections ─────────────────────────────────────────────
const PRIVACY_SECTIONS = [
  {
    id: "collect",
    title: "Information We Collect",
    icon: "database",
    content:
      "We collect your name, phone number, address, and order details to process your orders and provide our services.",
  },
  {
    id: "use",
    title: "How We Use It",
    icon: "trending-up",
    content:
      "Your information is used to process orders, communicate about deliveries, improve our service, and send promotional offers if you opt in.",
  },
  // {
  //   id: "share",
  //   title: "Sharing Information",
  //   icon: "share-2",
  //   content:
  //     "We share your address with delivery partners only to fulfill orders. We never sell your personal data to third parties.",
  // },
  // {
  //   id: "security",
  //   title: "Data Security",
  //   icon: "shield",
  //   content:
  //     "We use SSL encryption and secure servers to protect your data. Payment processing is handled through PCI-compliant gateways.",
  // },
  {
    id: "rights",
    title: "Your Rights",
    icon: "users",
    content:
      "You can request access, correction, or deletion of your data anytime by contacting our support team.",
  },
  {
    id: "contact",
    title: "Contact Us",
    icon: "mail",
    content:
      "Questions? Reach us at support@thump.com or call +91 1800 123 4567. We respond within 48 hours.",
  },
];

// ─── Section Component ───────────────────────────────────────────────────────
const PolicyCard = ({
  section,
  isExpanded,
  onToggle,
}: {
  section: (typeof PRIVACY_SECTIONS)[0];
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isExpanded]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.cardIcon}>
          <Feather
            name={section.icon as any}
            size={wp("4%")}
            color={Colors.primary}
          />
        </View>
        <Text style={styles.cardTitle}>{section.title}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Feather
            name="chevron-down"
            size={wp("4.5%")}
            color={Colors.textMuted}
          />
        </Animated.View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.cardContent}>
          <Text style={styles.cardText}>{section.content}</Text>
        </View>
      )}
    </View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
const PrivacyPolicyScreen = () => {
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Colors.gradientStart}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={wp("5%")} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo & Summary */}
        <View style={styles.summary}>
          <Image
            source={require("../assets/images/logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.summaryText}>
            We collect minimal data needed to serve you better. Your information
            is encrypted, never sold, and you control it.
          </Text>
        </View>

        {/* Policy Cards */}
        {PRIVACY_SECTIONS.map((section) => (
          <PolicyCard
            key={section.id}
            section={section}
            isExpanded={expandedSections.includes(section.id)}
            onToggle={() => toggleSection(section.id)}
          />
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <Feather
            name="check-circle"
            size={wp("3.5%")}
            color={Colors.success}
          />
          <Text style={styles.footerText}>
            By using our app, you agree to this privacy policy.
          </Text>
        </View>

        <View style={{ height: hp("5%") }} />
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    paddingTop: Platform.OS === "ios" ? hp("6%") : hp("6%"),
    paddingBottom: hp("2%"),
    paddingHorizontal: wp("5%"),
    backgroundColor: Colors.gradientStart,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomLeftRadius: wp("5%"),
    borderBottomRightRadius: wp("5%"),
  },
  backBtn: {
    width: wp("9%"),
    height: wp("9%"),
    borderRadius: wp("4.5%"),
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: wp("4.8%"),
    fontWeight: "800",
    color: Colors.white,
    textAlign: "center",
  },
  headerSpacer: {
    width: wp("9%"),
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: wp("5%"),
    paddingTop: hp("2%"),
  },

  // Summary
  summary: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: wp("4%"),
    padding: wp("5%"),
    marginBottom: hp("2%"),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  logoImage: {
    width: wp("50%"),
    height: wp("22%"),
    marginBottom: hp("1.5%"),
  },
  summaryText: {
    fontSize: wp("3.2%"),
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: hp("2.5%"),
  },

  // Cards
  card: {
    backgroundColor: Colors.surface,
    borderRadius: wp("3.5%"),
    marginBottom: hp("1%"),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: wp("3.5%"),
    gap: wp("2.5%"),
  },
  cardIcon: {
    width: wp("8%"),
    height: wp("8%"),
    borderRadius: wp("2%"),
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    flex: 1,
    fontSize: wp("3.6%"),
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  cardContent: {
    paddingHorizontal: wp("3.5%"),
    paddingBottom: wp("3.5%"),
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  cardText: {
    fontSize: wp("3.2%"),
    color: Colors.textSecondary,
    lineHeight: hp("2.4%"),
    marginTop: hp("1%"),
  },

  // Footer
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp("2%"),
    marginTop: hp("2%"),
    paddingVertical: hp("1.5%"),
    backgroundColor: Colors.surface,
    borderRadius: wp("3%"),
  },
  footerText: {
    fontSize: wp("3%"),
    color: Colors.textSecondary,
    fontWeight: "500",
  },
});

export default PrivacyPolicyScreen;
