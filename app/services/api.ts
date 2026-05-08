import AsyncStorage from "@react-native-async-storage/async-storage";

export const BASE_URL = "https://customer-7bcb.onrender.com";

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

  console.log(`📡 ${options.method || "GET"} ${BASE_URL}${path}`);

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
    console.error(
      `❌ Non-JSON response (${res.status}):`,
      text.substring(0, 200),
    );
    throw {
      status: res.status,
      message: text || `Unexpected response (status ${res.status})`,
    };
  }

  if (!res.ok) {
    throw {
      status: res.status,
      message: data.message || "Something went wrong.",
    };
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
  apiFetch(
    "/auth/profile",
    { method: "PUT", body: JSON.stringify(payload) },
    true,
  );

export const apiCheckPhone = (phone: string) =>
  apiFetch(`/auth/check-phone?phone=${phone}`);

export const apiSendOtp = (phone: string) =>
  apiFetch("/auth/send-otp", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });

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

// ─── Updated Order Types for Electronics Accessories ──────────────────────────

export interface OrderItemImage {
  url: string;
  publicId: string;
  isPrimary: boolean;
  altText?: string;
}

export interface OrderItem {
  _id?: string;
  product: string;
  name: string;
  brand?: string;
  category?: string;
  type?: string;
  color?: string;
  warranty?: string;
  imageUrl?: string;
  images?: OrderItemImage[];
  specifications?: Record<string, string>;
  compatibility?: string[];
  dimensions?: string;
  weight?: string;
  material?: string;
  sellingPrice: number;
  originalPrice?: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  _id: string;
  orderNumber: string;
  customer: {
    _id: string;
    phone: string;
    profile?: {
      contactName?: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      pincode?: string;
      gstNumber?: string;
    };
  };
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
  cancellationReason?: string;
  note?: string;
}

/** Place a new order — requires JWT */
export const apiPlaceOrder = (
  payload: PlaceOrderPayload,
): Promise<{ success: boolean; message: string; data: Order }> =>
  apiFetch(
    "/api/orders",
    { method: "POST", body: JSON.stringify(payload) },
    true,
  );

/** Get my orders list — requires JWT */
export const apiGetMyOrders = (params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<{
  success: boolean;
  data: {
    orders: Order[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}> => {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.status) query.set("status", params.status);
  return apiFetch(`/api/orders/my?${query.toString()}`, {}, true);
};

/** Get single order by ID — requires JWT */
export const apiGetOrderById = (
  orderId: string,
): Promise<{ success: boolean; data: Order }> =>
  apiFetch(`/api/orders/${orderId}`, {}, true);

/** Cancel an order — requires JWT */
export const apiCancelOrder = (
  orderId: string,
  reason?: string,
): Promise<{ success: boolean; message: string; data: Order }> =>
  apiFetch(
    `/api/orders/${orderId}/cancel`,
    { method: "PATCH", body: JSON.stringify({ reason }) },
    true,
  );

// ─── Products ─────────────────────────────────────────────────────────────────

export interface ProductImage {
  url: string;
  publicId: string;
  isPrimary: boolean;
  altText?: string;
}

export interface ApiProduct {
  _id: string;
  name: string;
  brand?: string;
  category: string;
  subCategory?: string;
  type?: string;
  compatibility?: string[];
  sellingPrice: number;
  originalPrice?: number;
  color?: string;
  material?: string;
  dimensions?: string;
  weight?: string;
  warranty?: string;
  stockQuantity: number;
  minOrderQuantity: number;
  description?: string;
  specifications?: Record<string, string>;
  images: ProductImage[];
  tags: string[];
  isFastMoving: boolean;
  isFeatured: boolean;
  isActive: boolean;
  alertAt?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductsResponse {
  success: boolean;
  message: string;
  data: {
    products: ApiProduct[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

/** Fetch products with optional filters */
export const apiGetProducts = async (params?: {
  page?: number;
  limit?: number;
  category?: string;
  brand?: string;
  featured?: boolean;
  fastMoving?: boolean;
  search?: string;
  compatibility?: string;
  color?: string;
}): Promise<ProductsResponse> => {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.category && params.category !== "all")
    query.set("category", params.category);
  if (params?.brand) query.set("brand", params.brand);
  if (params?.featured) query.set("featured", "true");
  if (params?.fastMoving) query.set("fastMoving", "true");
  if (params?.search) query.set("search", params.search);
  if (params?.compatibility) query.set("compatibility", params.compatibility);
  if (params?.color) query.set("color", params.color);

  return apiFetch(`/api/products?${query.toString()}`);
};

/** Fetch all products (up to 200) */
export const apiGetAllProducts = async (): Promise<ApiProduct[]> => {
  try {
    const data = await apiGetProducts({ limit: 200 });
    return data.data.products;
  } catch (error) {
    console.error("Failed to fetch all products:", error);
    throw error;
  }
};

/** Fetch single product by ID */
export const apiGetProductById = async (
  productId: string,
): Promise<{ success: boolean; data: ApiProduct }> => {
  return apiFetch(`/api/products/${productId}`);
};

// ─── Categories (static fallback) ─────────────────────────────────────────────

export const CATEGORIES = [
  {
    id: "charging-cables",
    name: "Charging Cables",
    icon: "🔌",
    color: "#4CAF50",
  },
  {
    id: "chargers-adapters",
    name: "Chargers & Adapters",
    icon: "⚡",
    color: "#FF9800",
  },
  { id: "power-banks", name: "Power Banks", icon: "🔋", color: "#2196F3" },
  {
    id: "headphones-earphones",
    name: "Headphones & Earphones",
    icon: "🎧",
    color: "#9C27B0",
  },
  { id: "speakers", name: "Speakers", icon: "🔊", color: "#E91E63" },
  {
    id: "screen-protectors",
    name: "Screen Protectors",
    icon: "🛡️",
    color: "#607D8B",
  },
  { id: "cases-covers", name: "Cases & Covers", icon: "📱", color: "#795548" },
  {
    id: "mounts-stands",
    name: "Mounts & Stands",
    icon: "📐",
    color: "#00BCD4",
  },
  {
    id: "cables-connectors",
    name: "Cables & Connectors",
    icon: "🔗",
    color: "#FF5722",
  },
  {
    id: "storage-devices",
    name: "Storage Devices",
    icon: "💾",
    color: "#3F51B5",
  },
  {
    id: "gaming-accessories",
    name: "Gaming Accessories",
    icon: "🎮",
    color: "#8BC34A",
  },
  {
    id: "smartwatch-accessories",
    name: "Smartwatch Acc.",
    icon: "⌚",
    color: "#FFC107",
  },
  {
    id: "keyboard-mouse",
    name: "Keyboard & Mouse",
    icon: "⌨️",
    color: "#009688",
  },
  {
    id: "webcam-microphone",
    name: "Webcam & Microphone",
    icon: "📹",
    color: "#673AB7",
  },
  {
    id: "other-accessories",
    name: "Other Accessories",
    icon: "🔧",
    color: "#F44336",
  },
];
