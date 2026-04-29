import AsyncStorage from "@react-native-async-storage/async-storage";

export const BASE_URL = "http://192.168.1.4:5000";

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

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch (networkErr) {
    throw {
      status: 0,
      message: "Network error. Check your connection or server address.",
    };
  }

  let data: any;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      data = await res.json();
    } catch {
      throw { status: res.status, message: "Server returned invalid JSON." };
    }
  } else {
    const text = await res.text();
    throw {
      status: res.status,
      message: text || `Unexpected response (status ${res.status})`,
    };
  }

  if (!res.ok) {
    throw { status: res.status, message: data.message || "Something went wrong." };
  }

  return data;
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const apiGetMe = (): Promise<{
  success: boolean;
  user: {
    _id: string;
    phone: string;
    countryCode: string;
    role: string;
    isProfileComplete: boolean;
    approvalStatus: string;
    isActive: boolean;
    profile: {
      contactName?: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      pincode?: string;
      gstNumber?: string;
      latitude?: number | null;
      longitude?: number | null;
    };
  };
}> => apiFetch("/auth/me", {}, true);

export const apiUpdateProfile = (payload: {
  contactName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  gstNumber?: string;
}): Promise<{ success: boolean; message: string; user: object }> =>
  apiFetch("/auth/profile", { method: "PUT", body: JSON.stringify(payload) }, true);

export const apiCheckPhone = (phone: string) =>
  apiFetch(`/auth/check-phone?phone=${phone}`);

export const apiSendOtp = (phone: string) =>
  apiFetch("/auth/send-otp", { method: "POST", body: JSON.stringify({ phone }) });

export const apiVerifyOtp = (phone: string, otp: string) =>
  apiFetch("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ phone, otp }),
  });

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
    true,
  );

// ─── Orders ───────────────────────────────────────────────────────────────────

export interface PlaceOrderPayload {
  items: { productId: string; quantity: number }[];
  deliveryAddress: {
    contactName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };
  couponCode?: string;
  couponDiscount?: number;
  deliveryCharge?: number;
  platformFee?: number;
  gst?: number;
  deliveryTip?: number;
  paymentMethod?: "upi" | "cod" | "card" | "netbanking";
  transactionId?: string;
}

export interface OrderItem {
  product: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  unit: string;
  weightOrSize?: string;
  sellingPrice: number;
  originalPrice?: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  _id: string;
  orderNumber: string;
  customer: string;
  items: OrderItem[];
  deliveryAddress: {
    contactName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };
  subtotal: number;
  couponCode?: string;
  couponDiscount: number;
  deliveryCharge: number;
  platformFee: number;
  gst: number;
  deliveryTip: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  statusHistory: { status: string; timestamp: string; note?: string }[];
  placedAt: string;
  createdAt: string;
  updatedAt: string;
}

/** Place a new order — requires JWT */
export const apiPlaceOrder = (
  payload: PlaceOrderPayload,
): Promise<{ success: boolean; message: string; data: Order }> =>
  apiFetch("/orders", { method: "POST", body: JSON.stringify(payload) }, true);

/** Get my orders list — requires JWT */
export const apiGetMyOrders = (params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<{
  success: boolean;
  data: {
    orders: Order[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  };
}> => {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.status) query.set("status", params.status);
  return apiFetch(`/orders/my?${query.toString()}`, {}, true);
};

/** Get single order by ID — requires JWT */
export const apiGetOrderById = (
  orderId: string,
): Promise<{ success: boolean; data: Order }> =>
  apiFetch(`/orders/${orderId}`, {}, true);

/** Cancel an order — requires JWT */
export const apiCancelOrder = (
  orderId: string,
  reason?: string,
): Promise<{ success: boolean; message: string; data: Order }> =>
  apiFetch(
    `/orders/${orderId}/cancel`,
    { method: "PATCH", body: JSON.stringify({ reason }) },
    true,
  );