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
    "Exotc-Bold": require("@/assets/fonts/Exotc350BdBTBold.ttf"),
    "VivoSans-Regular": require("@/assets/fonts/vivoSansGlobal-Regular.ttf"),
    "VivoSans-Medium": require("@/assets/fonts/vivoSansGlobal-Medium.ttf"),
    "VivoSans-Semibold": require("@/assets/fonts/vivoSansGlobal-Demibold.ttf"),
    "VivoSans-Bold": require("@/assets/fonts/vivoSansGlobal-Bold.ttf"),
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

const VIVO_SEMIBOLD_WEIGHTS = new Set(["600", "semibold"]);
const VIVO_MEDIUM_WEIGHTS = new Set(["500"]);
const BOLD_WEIGHTS = new Set(["700", "800", "900", "bold"]);

type BoldVariant = "vivo" | "exotc"; // only matters at 700+

interface CustomTextProps extends TextProps {
  boldVariant?: BoldVariant;
}

function resolveFontFamily(weight: string, boldVariant: BoldVariant): string {
  if (BOLD_WEIGHTS.has(weight)) {
    return boldVariant === "vivo" ? "VivoSans-Bold" : "Exotc-Bold";
  }
  if (VIVO_SEMIBOLD_WEIGHTS.has(weight)) return "VivoSans-Semibold";
  if (VIVO_MEDIUM_WEIGHTS.has(weight)) return "VivoSans-Medium";
  return "VivoSans-Regular";
}

export function Text({
  style,
  children,
  boldVariant = "vivo",
  ...props
}: CustomTextProps) {
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
  const fontFamily = resolveFontFamily(weight, boldVariant);

  return (
    <RNText
      style={[
        flatStyle,
        {
          fontFamily,
          fontWeight: "normal",
          includeFontPadding: false, // ← add this globally
          textAlignVertical: "center", // ← fixes vertical alignment in row layouts
        },
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
}
