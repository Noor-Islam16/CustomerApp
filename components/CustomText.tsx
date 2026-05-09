// components/CustomText.tsx
import { Text as RNText, StyleSheet, TextProps } from "react-native";

interface CustomTextProps extends TextProps {
  // You can add custom props here if needed
}

export function Text({ style, ...props }: CustomTextProps) {
  return <RNText style={[styles.defaultFont, style]} {...props} />;
}

const styles = StyleSheet.create({
  defaultFont: {
    fontFamily: "Exotc350BdBTBold",
  },
});
