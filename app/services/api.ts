import AsyncStorage from "@react-native-async-storage/async-storage";

export const BASE_URL = "http://10.0.2.2:5000";

// ─── Token helpers ────────────────────────────────────────────────────────────
export const saveToken = async (token: string) => {
  await AsyncStorage.setItem("auth_token", token);
};

export const getToken = async (): Promise<string | null> => {
  return AsyncStorage.getItem("auth_token");
};

export const clearToken = async () => {
  await AsyncStorage.removeItem("auth_token");
};

// ─── Base fetch wrapper ───────────────────────────────────────────────────────
const apiFetch = async (
  path: string,
  options: RequestInit = {},
  withAuth = false,
) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (withAuth) {
    const token = await getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    // Throw so callers can catch and show the server's message
    throw {
      status: res.status,
      message: data.message || "Something went wrong.",
    };
  }

  return data;
};

// ─── Auth API calls ───────────────────────────────────────────────────────────

/** Check if a phone number is already registered */
export const apiCheckPhone = (phone: string) =>
  apiFetch(`/auth/check-phone?phone=${phone}`);

/** Send OTP to phone */
export const apiSendOtp = (phone: string) =>
  apiFetch("/auth/send-otp", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });

/** Verify OTP — returns { token, isNewUser, isProfileComplete, user } */
export const apiVerifyOtp = (phone: string, otp: string) =>
  apiFetch("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ phone, otp }),
  });

/** Save profile form — requires JWT in storage */
export const apiCompleteProfile = (payload: {
  contactName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  gstNumber?: string;
  latitude?: number | null;
  longitude?: number | null;
}) =>
  apiFetch(
    "/auth/signup/profile",
    { method: "POST", body: JSON.stringify(payload) },
    true, // withAuth = true
  );
