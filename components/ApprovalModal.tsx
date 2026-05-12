// components/ApprovalModal.tsx
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import Colors from "../constants/colors";

const { width } = Dimensions.get("window");

interface ApprovalModalProps {
  visible: boolean;
  onClose: () => void;
}

const ApprovalModal: React.FC<ApprovalModalProps> = ({ visible, onClose }) => {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Celebration Icon */}
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={["#059669", "#34D399"]}
              style={styles.iconGradient}
            >
              <Feather name="check-circle" size={wp("12%")} color="#fff" />
            </LinearGradient>
          </View>

          {/* Title */}
          <Text style={styles.title}>Congratulations! 🎉</Text>
          <Text style={styles.subtitle}>Your Profile is Verified</Text>

          {/* Message */}
          <View style={styles.messageCard}>
            <Feather name="info" size={wp("4%")} color="#059669" />
            <Text style={styles.message}>
              Your account has been approved by our admin team. You can now
              start placing orders and enjoy shopping!
            </Text>
          </View>

          {/* What you can do */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <Feather name="shopping-bag" size={wp("4%")} color="#059669" />
              <Text style={styles.featureText}>Place Orders</Text>
            </View>
            <View style={styles.featureItem}>
              <Feather name="credit-card" size={wp("4%")} color="#059669" />
              <Text style={styles.featureText}>Secure Payments</Text>
            </View>
          </View>

          {/* Start Shopping Button */}
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              onClose();
              router.push("/products");
            }}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Feather name="shopping-cart" size={wp("4.5%")} color="#fff" />
              <Text style={styles.buttonText}>Start Shopping</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Maybe Later */}
          <TouchableOpacity style={styles.laterButton} onPress={onClose}>
            <Text style={styles.laterText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: wp("6%"),
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: wp("5%"),
    padding: wp("6%"),
    alignItems: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  iconContainer: {
    marginBottom: hp("2%"),
    alignItems: "center",
    position: "relative",
  },
  iconGradient: {
    width: wp("22%"),
    height: wp("22%"),
    borderRadius: wp("11%"),
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: wp("5.5%"),
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: hp("0.5%"),
  },
  subtitle: {
    fontSize: wp("3.8%"),
    fontWeight: "600",
    color: "#059669",
    textAlign: "center",
    marginBottom: hp("2%"),
  },
  messageCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#D1FAE5",
    borderRadius: wp("3%"),
    padding: wp("3.5%"),
    gap: wp("2.5%"),
    marginBottom: hp("2%"),
    borderWidth: 1,
    borderColor: "#A7F3D0",
    width: "100%",
  },
  message: {
    flex: 1,
    fontSize: wp("3.3%"),
    color: "#065F46",
    lineHeight: wp("5%"),
    fontWeight: "500",
  },
  featuresContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: hp("2.5%"),
    paddingVertical: hp("1%"),
    backgroundColor: "#F0FDF4",
    borderRadius: wp("3%"),
  },
  featureItem: {
    alignItems: "center",
    gap: hp("0.5%"),
  },
  featureText: {
    fontSize: wp("2.8%"),
    color: "#059669",
    fontWeight: "600",
  },
  button: {
    width: "100%",
    borderRadius: wp("3.5%"),
    overflow: "hidden",
    marginBottom: hp("1.2%"),
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp("2.5%"),
    paddingVertical: hp("1.8%"),
  },
  buttonText: {
    fontSize: wp("4%"),
    fontWeight: "700",
    color: "#fff",
  },
  laterButton: {
    paddingVertical: hp("1.2%"),
    paddingHorizontal: wp("6%"),
  },
  laterText: {
    fontSize: wp("3.5%"),
    color: Colors.textMuted,
    fontWeight: "600",
  },
});

export default ApprovalModal;
