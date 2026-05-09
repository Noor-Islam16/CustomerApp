// app/privacy.tsx or screens/PrivacyPolicyScreen.tsx
import { Text } from "@/components/CustomText";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  Share,
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

const { width: SW } = Dimensions.get("window");

// ─── Privacy Policy Sections ─────────────────────────────────────────────────
interface PolicySection {
  id: string;
  title: string;
  icon: string;
  content: string[];
  lastUpdated?: string;
}

const PRIVACY_SECTIONS: PolicySection[] = [
  {
    id: "intro",
    title: "Introduction",
    icon: "info",
    content: [
      'Welcome to Thump Beyond Limits ("we", "our", "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.',
      "Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the application.",
    ],
  },
  {
    id: "info-collect",
    title: "Information We Collect",
    icon: "database",
    content: [
      "We collect personal information that you voluntarily provide to us when you register on the App, express an interest in obtaining information about us or our products and services, when you participate in activities on the App, or otherwise when you contact us.",
      "• Personal Information: Name, email address, phone number, and address details",
      "• Payment Information: Credit/debit card details, UPI IDs, and billing addresses",
      "• Order Information: Purchase history, delivery preferences, and order notes",
      "• Usage Data: How you interact with our app, pages visited, time spent, and features used",
      "• Device Information: Device model, operating system, unique device identifiers, and IP address",
      "• Location Data: Approximate location based on IP address or precise location if you grant permission",
    ],
  },
  {
    id: "use-info",
    title: "How We Use Your Information",
    icon: "trending-up",
    content: [
      "We use the information we collect or receive to:",
      "• Process and manage your orders for products",
      "• Communicate with you about your orders, updates, and promotional offers",
      "• Improve our services and develop new features",
      "• Prevent fraudulent transactions and ensure security",
      "• Comply with legal obligations and regulatory requirements",
      "• Personalize your experience and provide tailored recommendations",
      "• Send you important notifications about your orders and account",
    ],
  },
  {
    id: "share-info",
    title: "Sharing Your Information",
    icon: "share-2",
    content: [
      "We may share your information in the following situations:",
      "• With Delivery Partners: To ship your orders to your provided address",
      "• With Payment Processors: To securely process your payments",
      "• With Legal Authorities: When required by law or to protect our rights",
      "• With Your Consent: When you have given us explicit permission to share your data",
      "",
      "We do not sell your personal information to third parties.",
    ],
  },
  {
    id: "data-security",
    title: "Data Security",
    icon: "shield",
    content: [
      "We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process.",
      "• SSL/TLS encryption for all data transmission",
      "• Regular security audits and vulnerability assessments",
      "• Access controls and authentication protocols",
      "• Encrypted storage of sensitive information",
      "• Secure payment gateway with PCI-DSS compliance",
      "",
      "However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.",
    ],
  },
  {
    id: "data-retention",
    title: "Data Retention",
    icon: "clock",
    content: [
      "We will retain your personal information only for as long as is necessary for the purposes set out in this Privacy Policy. We will retain and use your information to the extent necessary to comply with our legal obligations, resolve disputes, and enforce our policies.",
      "• Order history: 5 years (as required by tax laws)",
      "• Account information: Until you request deletion",
      "• Usage data: 12 months for analytics purposes",
      "",
      "When we no longer need your personal information, we will securely delete or anonymize it.",
    ],
  },
  {
    id: "user-rights",
    title: "Your Rights",
    icon: "users",
    content: [
      "Depending on your location, you may have certain rights regarding your personal information:",
      "• Access: Request a copy of your personal data",
      "• Correction: Request correction of inaccurate data",
      "• Deletion: Request deletion of your personal data",
      "• Restriction: Request restriction of data processing",
      "• Portability: Request transfer of your data to another service",
      "• Objection: Object to certain data processing activities",
      "",
      "To exercise these rights, please contact us using the information provided in the 'Contact Us' section.",
    ],
  },
  {
    id: "cookies",
    title: "Cookies & Tracking",
    icon: "globe",
    content: [
      "We use cookies and similar tracking technologies to track activity on our app and store certain information. Tracking technologies used include:",
      "• Session Cookies: To operate our app and maintain your login session",
      "• Preference Cookies: To remember your preferences and settings",
      "• Security Cookies: For security purposes and fraud prevention",
      "• Analytics Cookies: To understand how users interact with our app",
      "",
      "You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our app.",
    ],
  },
  {
    id: "children",
    title: "Children's Privacy",
    icon: "heart",
    content: [
      "Our service is not intended for use by children under the age of 13. We do not knowingly collect personally identifiable information from children under 13.",
      "If you are a parent or guardian and you are aware that your child has provided us with personal information, please contact us. If we become aware that we have collected personal information from children without verification of parental consent, we will take steps to remove that information from our servers.",
    ],
  },
  {
    id: "policy-updates",
    title: "Updates to This Policy",
    icon: "refresh-cw",
    content: [
      "We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the 'Last Updated' date.",
      "You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.",
      "For material changes, we will provide a more prominent notice (including email notification for certain changes).",
    ],
  },
  {
    id: "contact",
    title: "Contact Us",
    icon: "mail",
    content: [
      "If you have any questions about this Privacy Policy, please contact us:",
      "• Email: support@thump.com",
      "• Phone: +91 1800 123 4567",
      "• Address: Thump Beyond Limits, 123 Business Plaza, Mumbai - 400001, India",
      "• Support Hours: Monday to Saturday, 9:00 AM to 8:00 PM IST",
      "",
      "We will respond to your inquiry within 48 hours.",
    ],
  },
];

// ─── Quick Navigation Links ──────────────────────────────────────────────────
const QUICK_LINKS = [
  { id: "intro", label: "Introduction", icon: "info" },
  { id: "info-collect", label: "Information We Collect", icon: "database" },
  { id: "use-info", label: "How We Use Your Info", icon: "trending-up" },
  { id: "share-info", label: "Sharing Your Info", icon: "share-2" },
  { id: "data-security", label: "Data Security", icon: "shield" },
  { id: "user-rights", label: "Your Rights", icon: "users" },
  { id: "contact", label: "Contact Us", icon: "mail" },
];

// ─── Section Component ───────────────────────────────────────────────────────
const PolicySection = ({
  section,
  isExpanded,
  onToggle,
}: {
  section: PolicySection;
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
    <View style={styles.sectionCard}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.sectionHeaderLeft}>
          <View style={styles.sectionIcon}>
            <Feather
              name={section.icon as any}
              size={wp("4.5%")}
              color={Colors.primary}
            />
          </View>
          <Text style={styles.sectionTitle}>{section.title}</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Feather
            name="chevron-down"
            size={wp("5%")}
            color={Colors.textMuted}
          />
        </Animated.View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.sectionContent}>
          {section.content.map((paragraph, index) => (
            <Text key={index} style={styles.sectionText}>
              {paragraph}
            </Text>
          ))}
          {section.lastUpdated && (
            <Text style={styles.lastUpdated}>
              Last updated: {section.lastUpdated}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

// ─── Quick Navigation Modal ──────────────────────────────────────────────────
const QuickNavModal = ({
  visible,
  onClose,
  onNavigate,
}: {
  visible: boolean;
  onClose: () => void;
  onNavigate: (id: string) => void;
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.navModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Quick Navigation</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={wp("5%")} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.navLinksContainer}>
              {QUICK_LINKS.map((link) => (
                <TouchableOpacity
                  key={link.id}
                  style={styles.navLink}
                  onPress={() => {
                    onNavigate(link.id);
                    onClose();
                  }}
                >
                  <View style={styles.navLinkIcon}>
                    <Feather
                      name={link.icon as any}
                      size={wp("4%")}
                      color={Colors.primary}
                    />
                  </View>
                  <Text style={styles.navLinkText}>{link.label}</Text>
                  <Feather
                    name="chevron-right"
                    size={wp("4%")}
                    color={Colors.textMuted}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Privacy Policy Screen ──────────────────────────────────────────────
const PrivacyPolicyScreen = () => {
  const [expandedSections, setExpandedSections] = useState<string[]>(["intro"]);
  const [showNavModal, setShowNavModal] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const sectionRefs = useRef<{ [key: string]: View | null }>({});

  const toggleSection = (id: string) => {
    setExpandedSections((prev) =>
      prev.includes(id)
        ? prev.filter((sectionId) => sectionId !== id)
        : [...prev, id],
    );
  };

  const scrollToSection = (id: string) => {
    if (sectionRefs.current[id]) {
      sectionRefs.current[id]?.measureLayout(
        scrollViewRef.current as any,
        (x, y) => {
          scrollViewRef.current?.scrollTo({ y: y - 100, animated: true });
        },
      );
    }
    if (!expandedSections.includes(id)) {
      setExpandedSections([...expandedSections, id]);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message:
          "Check out Thump Beyond Limits Privacy Policy. We value your privacy and data security.\n\nDownload the app to learn more.",
        title: "Privacy Policy - Thump Beyond Limits",
      });
    } catch (error) {
      Alert.alert("Error", "Unable to share at this moment");
    }
  };

  const handleDownloadPDF = () => {
    Alert.alert(
      "Download Privacy Policy",
      "Would you like to download the Privacy Policy as PDF?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Download",
          onPress: () =>
            Alert.alert("Success", "PDF will be downloaded shortly"),
        },
      ],
    );
  };

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Colors.gradientStart}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.8}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={wp("5.5%")} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
          <TouchableOpacity
            style={styles.menuBtn}
            activeOpacity={0.8}
            onPress={() => setShowNavModal(true)}
          >
            <Feather name="menu" size={wp("5%")} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Last Updated Badge */}
        <View style={styles.lastUpdatedBadge}>
          <Feather
            name="calendar"
            size={wp("3%")}
            color={Colors.primaryLight}
          />
          <Text style={styles.lastUpdatedBadgeText}>
            Last Updated: {currentDate}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
          <Feather name="share-2" size={wp("4%")} color={Colors.primary} />
          <Text style={styles.actionBtnText}>Share</Text>
        </TouchableOpacity>
        <View style={styles.actionDivider} />
        <TouchableOpacity style={styles.actionBtn} onPress={handleDownloadPDF}>
          <Feather name="download" size={wp("4%")} color={Colors.primary} />
          <Text style={styles.actionBtnText}>Download PDF</Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Feather name="shield" size={wp("12%")} color={Colors.primary} />
          </View>
          <Text style={styles.heroTitle}>Your Privacy Matters</Text>
          <Text style={styles.heroSubtitle}>
            We are committed to protecting your personal information with the
            highest standards of security and transparency.
          </Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>100%</Text>
            <Text style={styles.statLabel}>Encrypted Data</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>24/7</Text>
            <Text style={styles.statLabel}>Security Monitoring</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>GDPR</Text>
            <Text style={styles.statLabel}>Compliant</Text>
          </View>
        </View>

        {/* Policy Sections */}
        {PRIVACY_SECTIONS.map((section) => (
          <View
            key={section.id}
            ref={(ref) => {
              if (ref) sectionRefs.current[section.id] = ref;
            }}
          >
            <PolicySection
              section={section}
              isExpanded={expandedSections.includes(section.id)}
              onToggle={() => toggleSection(section.id)}
            />
          </View>
        ))}

        {/* Footer Note */}
        <View style={styles.footerNote}>
          <Feather name="check-circle" size={wp("4%")} color={Colors.success} />
          <Text style={styles.footerNoteText}>
            By using our app, you agree to the collection and use of information
            in accordance with this policy.
          </Text>
        </View>

        <View style={{ height: hp("5%") }} />
      </ScrollView>

      {/* Quick Navigation Modal */}
      <QuickNavModal
        visible={showNavModal}
        onClose={() => setShowNavModal(false)}
        onNavigate={scrollToSection}
      />
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
    paddingTop: Platform.OS === "ios" ? hp("6%") : hp("5%"),
    paddingBottom: hp("2%"),
    paddingHorizontal: wp("5%"),
    backgroundColor: Colors.gradientStart,
    borderBottomLeftRadius: wp("6%"),
    borderBottomRightRadius: wp("6%"),
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: hp("1.5%"),
  },
  backBtn: {
    width: wp("10%"),
    height: wp("10%"),
    borderRadius: wp("5%"),
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: wp("5.5%"),
    fontWeight: "800",
    color: Colors.white,
    letterSpacing: -0.3,
  },
  menuBtn: {
    width: wp("10%"),
    height: wp("10%"),
    borderRadius: wp("5%"),
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  lastUpdatedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("1.5%"),
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: wp("3%"),
    paddingVertical: hp("0.5%"),
    borderRadius: wp("4%"),
  },
  lastUpdatedBadgeText: {
    fontSize: wp("2.8%"),
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
  },

  // Action Buttons
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
    marginHorizontal: wp("5%"),
    marginTop: hp("2%"),
    borderRadius: wp("4%"),
    paddingVertical: hp("1%"),
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp("2%"),
    paddingVertical: hp("1%"),
  },
  actionBtnText: {
    fontSize: wp("3.2%"),
    fontWeight: "600",
    color: Colors.primary,
  },
  actionDivider: {
    width: 1,
    height: hp("2.5%"),
    backgroundColor: Colors.border,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: wp("5%"),
    paddingTop: hp("2%"),
  },

  // Hero Section
  heroSection: {
    alignItems: "center",
    marginBottom: hp("3%"),
  },
  heroIcon: {
    width: wp("20%"),
    height: wp("20%"),
    borderRadius: wp("10%"),
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: hp("1.5%"),
  },
  heroTitle: {
    fontSize: wp("6%"),
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: hp("0.5%"),
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: wp("3.5%"),
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: hp("3%"),
    paddingHorizontal: wp("5%"),
  },

  // Stats Container
  statsContainer: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: wp("4%"),
    paddingVertical: hp("2%"),
    marginBottom: hp("3%"),
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: wp("4.5%"),
    fontWeight: "800",
    color: Colors.primary,
  },
  statLabel: {
    fontSize: wp("2.8%"),
    color: Colors.textMuted,
    marginTop: hp("0.3%"),
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: hp("0.5%"),
  },

  // Section Card
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: wp("4%"),
    marginBottom: hp("1.5%"),
    overflow: "hidden",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: wp("4%"),
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2.5%"),
    flex: 1,
  },
  sectionIcon: {
    width: wp("8%"),
    height: wp("8%"),
    borderRadius: wp("2%"),
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: wp("3.8%"),
    fontWeight: "700",
    color: Colors.textPrimary,
    flex: 1,
  },
  sectionContent: {
    paddingHorizontal: wp("4%"),
    paddingBottom: wp("4%"),
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
  },
  sectionText: {
    fontSize: wp("3.3%"),
    color: Colors.textSecondary,
    lineHeight: hp("3%"),
    marginTop: hp("1.5%"),
  },
  lastUpdated: {
    fontSize: wp("3%"),
    color: Colors.primary,
    fontWeight: "600",
    marginTop: hp("1.5%"),
    fontStyle: "italic",
  },

  // Footer Note
  footerNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2.5%"),
    backgroundColor: Colors.primaryLight,
    borderRadius: wp("4%"),
    padding: wp("4%"),
    marginTop: hp("2%"),
  },
  footerNoteText: {
    flex: 1,
    fontSize: wp("3.2%"),
    color: Colors.textSecondary,
    lineHeight: hp("2.8%"),
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "flex-end",
  },
  navModalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: wp("6%"),
    borderTopRightRadius: wp("6%"),
    maxHeight: hp("80%"),
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
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: wp("8%"),
    height: wp("8%"),
    borderRadius: wp("4%"),
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  navLinksContainer: {
    padding: wp("4%"),
  },
  navLink: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: hp("1.5%"),
    paddingHorizontal: wp("3%"),
    borderRadius: wp("3%"),
    marginBottom: hp("0.5%"),
  },
  navLinkIcon: {
    width: wp("8%"),
    height: wp("8%"),
    borderRadius: wp("2%"),
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: wp("3%"),
  },
  navLinkText: {
    flex: 1,
    fontSize: wp("3.5%"),
    fontWeight: "600",
    color: Colors.textPrimary,
  },
});

export default PrivacyPolicyScreen;
