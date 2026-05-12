import { getToken } from "./api";

const BASE_URL = "https://customer-7bcb.onrender.com";

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
  maxOrderQuantity?: number;
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

export const fetchProducts = async (params?: {
  page?: number;
  limit?: number;
  category?: string;
  brand?: string;
  featured?: boolean;
  fastMoving?: boolean;
  search?: string;
  compatibility?: string;
  color?: string;
}): Promise<ApiProduct[]> => {
  try {
    const query = new URLSearchParams();

    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.category && params.category !== "all") {
      query.set("category", params.category);
    }
    if (params?.brand) query.set("brand", params.brand);
    if (params?.featured) query.set("featured", "true");
    if (params?.fastMoving) query.set("fastMoving", "true");
    if (params?.search) query.set("search", params.search);
    if (params?.compatibility) query.set("compatibility", params.compatibility);
    if (params?.color) query.set("color", params.color);

    const url = `${BASE_URL}/api/products?${query.toString()}`;
    console.log("📡 Fetching electronics products:", url);

    const token = await getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: ProductsResponse = await response.json();

    if (!data.success || !data.data?.products) {
      throw new Error(data.message || "Failed to fetch products");
    }

    console.log(
      `✅ Fetched ${data.data.products.length} electronics products from API`,
    );
    return data.data.products;
  } catch (error) {
    console.error("❌ Error fetching products:", error);
    throw error;
  }
};

export const fetchAllProducts = async (): Promise<ApiProduct[]> => {
  try {
    const allData = await fetchProducts({ limit: 200 });
    return allData;
  } catch (error) {
    console.error("❌ Error fetching all products:", error);
    throw error;
  }
};

// Fetch featured products
export const fetchFeaturedProducts = async (): Promise<ApiProduct[]> => {
  try {
    const data = await fetchProducts({ featured: true, limit: 10 });
    return data;
  } catch (error) {
    console.error("❌ Error fetching featured products:", error);
    throw error;
  }
};

// Fetch fast moving products
export const fetchFastMovingProducts = async (): Promise<ApiProduct[]> => {
  try {
    const data = await fetchProducts({ fastMoving: true, limit: 10 });
    return data;
  } catch (error) {
    console.error("❌ Error fetching fast moving products:", error);
    throw error;
  }
};
