// contexts/FontContext.tsx
import { useFonts } from "expo-font";
import { createContext, ReactNode, useContext } from "react";
import { Text as RNText, StyleSheet, TextProps } from "react-native";

interface FontContextType {
  fontsLoaded: boolean;
  fontFamily: string;
}

const FontContext = createContext<FontContextType>({
  fontsLoaded: false,
  fontFamily: "System",
});

export function FontProvider({ children }: { children: ReactNode }) {
  const [fontsLoaded] = useFonts({
    Exotc350BdBTBold: require("@/assets/fonts/exotic.ttf"),
  });

  return (
    <FontContext.Provider
      value={{
        fontsLoaded,
        fontFamily: fontsLoaded ? "Exotc350BdBTBold" : "System",
      }}
    >
      {children}
    </FontContext.Provider>
  );
}

export function useFont() {
  return useContext(FontContext);
}

// Custom Text component that uses the font context
export function Text({ style, children, ...props }: TextProps) {
  const { fontFamily, fontsLoaded } = useFont();

  if (!fontsLoaded) {
    return (
      <RNText style={style} {...props}>
        {children}
      </RNText>
    );
  }

  return (
    <RNText style={[styles.defaultFont, { fontFamily }, style]} {...props}>
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  defaultFont: {
    fontFamily: "Exotc350BdBTBold",
  },
});
