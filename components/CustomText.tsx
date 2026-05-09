// components/CustomText.tsx
import { useFonts } from "expo-font";
import { Platform, Text as RNText, TextProps } from "react-native";

interface CustomTextProps extends TextProps {
  // You can add custom props here if needed
}

export function Text({ style, children, ...props }: CustomTextProps) {
  const [fontsLoaded] = useFonts({
    Exotc350BdBTBold: require("@/assets/fonts/Exotc350BdBTBold.ttf"),
  });

  // While fonts are loading, render without custom font
  if (!fontsLoaded) {
    return (
      <RNText style={style} {...props}>
        {children}
      </RNText>
    );
  }

  return (
    <RNText
      style={[
        {
          fontFamily: "Exotc350BdBTBold",
          // Ensure text is visible on both platforms
          ...(Platform.OS === "android" && {
            includeFontPadding: false,
          }),
        },
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
}
