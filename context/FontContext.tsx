// contexts/FontContext.tsx
import { useFonts } from "expo-font";
import { createContext, ReactNode, useContext } from "react";
import { Text as RNText, StyleSheet, TextProps, TextStyle } from "react-native";

interface FontContextType {
  fontsLoaded: boolean;
}

const FontContext = createContext<FontContextType>({ fontsLoaded: false });

export function FontProvider({ children }: { children: ReactNode }) {
  const [fontsLoaded] = useFonts({
    "Exotc-Regular": require("@/assets/fonts/exotic.ttf"),
    "Exotc-Bold": require("@/assets/fonts/Exotc350BdBTBold.ttf"),
  });

  return (
    <FontContext.Provider value={{ fontsLoaded }}>
      {children}
    </FontContext.Provider>
  );
}

export function useFont() {
  return useContext(FontContext);
}

const BOLD_WEIGHTS = new Set(["600", "700", "800", "900", "bold", "semibold"]);

export function Text({ style, children, ...props }: TextProps) {
  const { fontsLoaded } = useFont();

  if (!fontsLoaded) {
    return (
      <RNText style={style} {...props}>
        {children}
      </RNText>
    );
  }

  const flatStyle = StyleSheet.flatten(style) as TextStyle | undefined;
  const weight = String(flatStyle?.fontWeight ?? "normal");
  const fontFamily = BOLD_WEIGHTS.has(weight) ? "Exotc-Bold" : "Exotc-Regular";

  return (
    <RNText
      style={[
        flatStyle,
        {
          fontFamily,
          fontWeight: "normal", // prevent RN from doing a second font lookup
        },
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
}
