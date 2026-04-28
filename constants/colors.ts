/**
 * Customer App — Color System
 */

const Colors = {
  // ─── Primary Brand (WhatsApp Green tones) ───────────────────────────────
  primary: "#00A884", // WhatsApp signature teal-green
  primaryDark: "#007A62", // Pressed / active states
  primaryLight: "#E7F7F4", // Tint backgrounds, selected rows
  primaryMuted: "#25D366", // Accent / badge highlights

  // ─── Secondary / Accent ─────────────────────────────────────────────────
  accent: "#128C7E", // Deep teal for headers / nav bar
  accentLight: "#DCF8C6", // Message bubble light green (delivered)

  // ─── Neutrals ───────────────────────────────────────────────────────────
  white: "#FFFFFF",
  background: "#F0F2F5", // WhatsApp chat background grey
  surface: "#FFFFFF", // Card / sheet surface
  surfaceAlt: "#F7F8FA", // Subtle alternate surface

  // ─── Text ───────────────────────────────────────────────────────────────
  textPrimary: "#111B21", // WhatsApp dark text
  textSecondary: "#54656F", // Secondary / meta text
  textMuted: "#8696A0", // Placeholders, hints
  textOnPrimary: "#FFFFFF", // Text on primary-colored surfaces

  // ─── Borders & Dividers ─────────────────────────────────────────────────
  border: "#E9EDEF", // Light border
  borderFocus: "#00A884", // Focused input border
  divider: "#E9EDEF",

  // ─── Status Colors ──────────────────────────────────────────────────────
  success: "#25D366",
  warning: "#FFA000",
  error: "#EA0038",
  info: "#34B7F1",

  // ─── OTP / Verification ─────────────────────────────────────────────────
  otpBox: "#FFFFFF",
  otpBoxActive: "#E7F7F4",
  otpBoxFilled: "#E7F7F4",

  // ─── Shadows ────────────────────────────────────────────────────────────
  shadow: "rgba(0, 0, 0, 0.08)",
  shadowMedium: "rgba(0, 0, 0, 0.14)",

  // ─── Overlay ────────────────────────────────────────────────────────────
  overlay: "rgba(0, 0, 0, 0.45)",
  overlayLight: "rgba(0, 0, 0, 0.12)",

  // ─── Gradient stops (for LinearGradient) ────────────────────────────────
  gradientStart: "#00A884",
  gradientEnd: "#128C7E",
} as const;

export type ColorKey = keyof typeof Colors;
export default Colors;
