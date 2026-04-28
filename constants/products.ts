// constants/products.ts

export interface Product {
  id: string;
  name: string;
  brand?: string;
  category: string;
  subCategory?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  stock: number;
  minOrderQty?: number;
  images: string[];
  tags: ProductTag[];
  description: string;
  unit: string;
  weight?: string;
  fastMoving: boolean;
  rating?: number;
  reviewCount?: number;
  inStock: boolean;
  featured?: boolean;
}

export type ProductTag =
  | "Limited Stock"
  | "Out of Stock"
  | "Fast Moving"
  | "New Arrival"
  | "Best Seller"
  | "Special Offer"
  | "Trending"
  | "Premium"
  | "Organic"
  | "Imported";

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  productCount: number;
}

// ─── Categories ───────────────────────────────────────────────────────────
export const CATEGORIES: Category[] = [
  { id: "all", name: "All", icon: "🛍️", color: "#00A884", productCount: 28 },
  {
    id: "groceries",
    name: "Groceries",
    icon: "🛒",
    color: "#4CAF50",
    productCount: 8,
  },
  {
    id: "snacks",
    name: "Snacks",
    icon: "🍿",
    color: "#FF9800",
    productCount: 6,
  },
  {
    id: "beverages",
    name: "Beverages",
    icon: "🥤",
    color: "#2196F3",
    productCount: 5,
  },
  {
    id: "household",
    name: "Household",
    icon: "🏠",
    color: "#9C27B0",
    productCount: 5,
  },
  {
    id: "personal",
    name: "Personal Care",
    icon: "🧴",
    color: "#E91E63",
    productCount: 4,
  },
];

// ─── Products Data ────────────────────────────────────────────────────────
export const PRODUCTS: Product[] = [
  // Groceries
  {
    id: "1",
    name: "Premium Basmati Rice",
    brand: "India Gate",
    category: "groceries",
    subCategory: "Rice & Grains",
    price: 185,
    originalPrice: 220,
    discount: 16,
    stock: 50,
    minOrderQty: 2,
    images: [
      "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400",
    ],
    tags: ["Best Seller", "Fast Moving"],
    description:
      "Premium aged basmati rice, extra long grain, perfect for biryani and pulao.",
    unit: "kg",
    weight: "5kg",
    fastMoving: true,
    rating: 4.8,
    reviewCount: 1250,
    inStock: true,
    featured: true,
  },
  {
    id: "2",
    name: "Organic Toor Dal",
    brand: "Tata Sampann",
    category: "groceries",
    subCategory: "Pulses",
    price: 145,
    originalPrice: 165,
    discount: 12,
    stock: 35,
    minOrderQty: 1,
    images: [
      "https://images.unsplash.com/photo-1585996744277-3a2f3b9d0a1b?w=400",
    ],
    tags: ["Organic", "Best Seller"],
    description: "Unpolished toor dal, rich in protein and fiber.",
    unit: "kg",
    weight: "1kg",
    fastMoving: true,
    rating: 4.6,
    reviewCount: 890,
    inStock: true,
  },
  {
    id: "3",
    name: "Fortune Refined Oil",
    brand: "Fortune",
    category: "groceries",
    subCategory: "Oils",
    price: 210,
    originalPrice: 240,
    discount: 12,
    stock: 42,
    minOrderQty: 1,
    images: [
      "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400",
    ],
    tags: ["Special Offer"],
    description: "Refined sunflower oil, rich in Vitamin E.",
    unit: "ltr",
    weight: "1ltr",
    fastMoving: true,
    rating: 4.5,
    reviewCount: 670,
    inStock: true,
  },
  {
    id: "4",
    name: "Aashirvaad Atta",
    brand: "Aashirvaad",
    category: "groceries",
    subCategory: "Flour",
    price: 320,
    originalPrice: 350,
    discount: 8,
    stock: 28,
    minOrderQty: 1,
    images: [
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400",
    ],
    tags: ["Best Seller"],
    description: "100% whole wheat atta, perfect for soft rotis.",
    unit: "kg",
    weight: "5kg",
    fastMoving: true,
    rating: 4.7,
    reviewCount: 2100,
    inStock: true,
  },

  // Snacks
  {
    id: "5",
    name: "Lay's Classic Salted",
    brand: "Lay's",
    category: "snacks",
    subCategory: "Chips",
    price: 30,
    originalPrice: 35,
    discount: 14,
    stock: 100,
    images: [
      "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400",
    ],
    tags: ["Fast Moving"],
    description: "Classic salted potato chips, crispy and delicious.",
    unit: "pack",
    weight: "52g",
    fastMoving: true,
    rating: 4.4,
    reviewCount: 3400,
    inStock: true,
  },
  {
    id: "6",
    name: "Kurkure Masala Munch",
    brand: "Kurkure",
    category: "snacks",
    subCategory: "Namkeen",
    price: 20,
    originalPrice: 20,
    stock: 85,
    images: [
      "https://images.unsplash.com/photo-1600952841320-db2e40d1b0b5?w=400",
    ],
    tags: ["Fast Moving", "Trending"],
    description: "Crunchy masala flavored corn puffs.",
    unit: "pack",
    weight: "45g",
    fastMoving: true,
    rating: 4.5,
    reviewCount: 1800,
    inStock: true,
  },
  {
    id: "7",
    name: "Cadbury Dairy Milk",
    brand: "Cadbury",
    category: "snacks",
    subCategory: "Chocolate",
    price: 45,
    originalPrice: 50,
    discount: 10,
    stock: 60,
    images: ["https://images.unsplash.com/photo-1548907040-4baa42d10919?w=400"],
    tags: ["Best Seller"],
    description: "Smooth and creamy milk chocolate.",
    unit: "pack",
    weight: "52g",
    fastMoving: true,
    rating: 4.8,
    reviewCount: 5200,
    inStock: true,
  },
  {
    id: "8",
    name: "Haldiram's Bhujia",
    brand: "Haldiram's",
    category: "snacks",
    subCategory: "Namkeen",
    price: 55,
    originalPrice: 60,
    discount: 8,
    stock: 15,
    images: [
      "https://images.unsplash.com/photo-1582550945154-66ea8fff25e1?w=400",
    ],
    tags: ["Limited Stock", "Premium"],
    description: "Traditional crispy bhujia, authentic taste.",
    unit: "pack",
    weight: "200g",
    fastMoving: false,
    rating: 4.6,
    reviewCount: 950,
    inStock: true,
  },

  // Beverages
  {
    id: "9",
    name: "Coca-Cola Soft Drink",
    brand: "Coca-Cola",
    category: "beverages",
    subCategory: "Soft Drinks",
    price: 40,
    originalPrice: 40,
    stock: 120,
    images: ["https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400"],
    tags: ["Fast Moving"],
    description: "Original taste, refreshing cola drink.",
    unit: "can",
    weight: "330ml",
    fastMoving: true,
    rating: 4.5,
    reviewCount: 4100,
    inStock: true,
  },
  {
    id: "10",
    name: "Tata Tea Gold",
    brand: "Tata Tea",
    category: "beverages",
    subCategory: "Tea",
    price: 350,
    originalPrice: 380,
    discount: 8,
    stock: 40,
    images: ["https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400"],
    tags: ["Premium", "Best Seller"],
    description: "Premium tea leaves with rich aroma and taste.",
    unit: "pack",
    weight: "500g",
    fastMoving: true,
    rating: 4.7,
    reviewCount: 1600,
    inStock: true,
  },
  {
    id: "11",
    name: "Nescafe Classic Coffee",
    brand: "Nescafe",
    category: "beverages",
    subCategory: "Coffee",
    price: 280,
    originalPrice: 300,
    discount: 7,
    stock: 35,
    images: ["https://images.unsplash.com/photo-1551030173-122aabc4489c?w=400"],
    tags: ["Fast Moving"],
    description: "100% pure instant coffee, rich flavor.",
    unit: "jar",
    weight: "100g",
    fastMoving: true,
    rating: 4.6,
    reviewCount: 2300,
    inStock: true,
  },
  {
    id: "12",
    name: "Real Fruit Juice",
    brand: "Real",
    category: "beverages",
    subCategory: "Juices",
    price: 110,
    originalPrice: 120,
    discount: 8,
    stock: 0,
    images: [
      "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400",
    ],
    tags: ["Out of Stock", "Premium"],
    description: "Mixed fruit juice, no added sugar.",
    unit: "tetra pack",
    weight: "1ltr",
    fastMoving: false,
    rating: 4.4,
    reviewCount: 780,
    inStock: false,
  },

  // Household
  {
    id: "13",
    name: "Surf Excel Matic",
    brand: "Surf Excel",
    category: "household",
    subCategory: "Detergent",
    price: 420,
    originalPrice: 450,
    discount: 7,
    stock: 30,
    images: [
      "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400",
    ],
    tags: ["Best Seller"],
    description: "Front load washing machine detergent powder.",
    unit: "pack",
    weight: "2kg",
    fastMoving: true,
    rating: 4.7,
    reviewCount: 890,
    inStock: true,
  },
  {
    id: "14",
    name: "Lizol Floor Cleaner",
    brand: "Lizol",
    category: "household",
    subCategory: "Cleaners",
    price: 180,
    originalPrice: 195,
    discount: 8,
    stock: 45,
    images: [
      "https://images.unsplash.com/photo-1585421514738-7a1f9b5e1a1b?w=400",
    ],
    tags: ["Special Offer"],
    description: "Disinfectant floor cleaner, kills 99.9% germs.",
    unit: "bottle",
    weight: "1ltr",
    fastMoving: true,
    rating: 4.5,
    reviewCount: 560,
    inStock: true,
  },
  {
    id: "15",
    name: "Harpic Bathroom Cleaner",
    brand: "Harpic",
    category: "household",
    subCategory: "Cleaners",
    price: 120,
    originalPrice: 130,
    discount: 8,
    stock: 55,
    images: [
      "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=400",
    ],
    tags: ["Fast Moving"],
    description: "Powerful bathroom cleaner, removes tough stains.",
    unit: "bottle",
    weight: "500ml",
    fastMoving: true,
    rating: 4.4,
    reviewCount: 420,
    inStock: true,
  },

  // Personal Care
  {
    id: "16",
    name: "Dove Shampoo",
    brand: "Dove",
    category: "personal",
    subCategory: "Hair Care",
    price: 340,
    originalPrice: 360,
    discount: 6,
    stock: 25,
    images: [
      "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400",
    ],
    tags: ["Premium", "Best Seller"],
    description: "Intense repair shampoo for damaged hair.",
    unit: "bottle",
    weight: "340ml",
    fastMoving: true,
    rating: 4.6,
    reviewCount: 1200,
    inStock: true,
  },
  {
    id: "17",
    name: "Pears Soap",
    brand: "Pears",
    category: "personal",
    subCategory: "Bath & Body",
    price: 85,
    originalPrice: 90,
    discount: 6,
    stock: 70,
    images: [
      "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400",
    ],
    tags: ["Organic"],
    description: "Pure and gentle glycerin soap.",
    unit: "pack",
    weight: "125g (3 pcs)",
    fastMoving: true,
    rating: 4.7,
    reviewCount: 890,
    inStock: true,
  },
  {
    id: "18",
    name: "Colgate Toothpaste",
    brand: "Colgate",
    category: "personal",
    subCategory: "Oral Care",
    price: 95,
    originalPrice: 105,
    discount: 10,
    stock: 50,
    images: [
      "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=400",
    ],
    tags: ["Best Seller"],
    description: "Strong teeth and fresh breath toothpaste.",
    unit: "pack",
    weight: "200g",
    fastMoving: true,
    rating: 4.5,
    reviewCount: 2100,
    inStock: true,
  },
  {
    id: "19",
    name: "Nivea Body Lotion",
    brand: "Nivea",
    category: "personal",
    subCategory: "Skin Care",
    price: 280,
    originalPrice: 300,
    discount: 7,
    stock: 5,
    images: [
      "https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe84?w=400",
    ],
    tags: ["Limited Stock", "Premium"],
    description: "Deep moisture body lotion for dry skin.",
    unit: "bottle",
    weight: "400ml",
    fastMoving: false,
    rating: 4.6,
    reviewCount: 750,
    inStock: true,
  },
  {
    id: "20",
    name: "Imported Dark Chocolate",
    brand: "Lindt",
    category: "snacks",
    subCategory: "Chocolate",
    price: 450,
    originalPrice: 500,
    discount: 10,
    stock: 12,
    images: [
      "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=400",
    ],
    tags: ["Premium", "Imported", "Limited Stock"],
    description: "Swiss dark chocolate, 70% cocoa.",
    unit: "pack",
    weight: "100g",
    fastMoving: false,
    rating: 4.9,
    reviewCount: 340,
    inStock: true,
  },
];

// ─── Helper Functions ─────────────────────────────────────────────────────
export const getProductsByCategory = (categoryId: string): Product[] => {
  if (categoryId === "all") return PRODUCTS;
  return PRODUCTS.filter((p) => p.category === categoryId);
};

export const getFeaturedProducts = (): Product[] => {
  return PRODUCTS.filter(
    (p) => p.featured || p.tags.includes("Best Seller"),
  ).slice(0, 6);
};

export const getFastMovingProducts = (): Product[] => {
  return PRODUCTS.filter((p) => p.fastMoving);
};

export const getProductById = (id: string): Product | undefined => {
  return PRODUCTS.find((p) => p.id === id);
};

export const searchProducts = (query: string): Product[] => {
  const searchTerm = query.toLowerCase();
  return PRODUCTS.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm) ||
      p.brand?.toLowerCase().includes(searchTerm) ||
      p.category.toLowerCase().includes(searchTerm) ||
      p.description.toLowerCase().includes(searchTerm),
  );
};

// ─── Banner Data ──────────────────────────────────────────────────────────
export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  backgroundColor: string;
  textColor: string;
  icon: string;
  type: "offer" | "info" | "warning";
}

export const BANNERS: Banner[] = [
  {
    id: "1",
    title: "Free Delivery",
    subtitle: "On orders above ₹999",
    backgroundColor: "#E8F5E9",
    textColor: "#2E7D32",
    icon: "🚚",
    type: "offer",
  },
  {
    id: "2",
    title: "20% OFF",
    subtitle: "On first order! Use code: WELCOME20",
    backgroundColor: "#FFF3E0",
    textColor: "#E65100",
    icon: "🎉",
    type: "offer",
  },
  {
    id: "3",
    title: "Min Order: ₹500",
    subtitle: "Free delivery on orders above ₹999",
    backgroundColor: "#E3F2FD",
    textColor: "#1565C0",
    icon: "ℹ️",
    type: "info",
  },
];
