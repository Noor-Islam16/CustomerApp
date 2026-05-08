export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  subCategory: string;
  type: string;
  compatibility: string[];
  sellingPrice: number;
  originalPrice: number;
  color: string;
  material: string;
  dimensions: string;
  weight: string;
  warranty: string;
  stockQuantity: number;
  minOrderQuantity: number;
  description: string;
  images: {
    url: string;
    publicId: string;
    isPrimary: boolean;
    altText?: string;
  }[];
  specifications: Record<string, string>;
  tags: string[];
  inStock: boolean;
  isFastMoving: boolean;
  isFeatured: boolean;
}

// Banners - Updated for electronics
export const BANNERS = [
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
    title: "25% OFF",
    subtitle: "On mobile accessories! Code: TECH25",
    backgroundColor: "#FFF3E0",
    textColor: "#E65100",
    icon: "⚡",
    type: "offer",
  },
  {
    id: "3",
    title: "New Arrivals",
    subtitle: "Latest tech accessories in stock",
    backgroundColor: "#E3F2FD",
    textColor: "#1565C0",
    icon: "🆕",
    type: "info",
  },
];

// Categories - Updated for electronics accessories
export const CATEGORIES = [
  { id: "all", name: "All", icon: "📱", color: "#FF6B6B" },
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

// Product Tags - Updated for electronics
export const AVAILABLE_TAGS = [
  "New Arrival",
  "Best Seller",
  "Fast Charging",
  "Wireless",
  "Gaming",
  "Premium",
  "Budget Friendly",
  "Waterproof",
  "MagSafe",
  "Limited Edition",
  "Eco-Friendly",
  "Travel Ready",
];

// Compatibility options for filtering
export const COMPATIBILITY_OPTIONS = [
  "iPhone 15",
  "iPhone 14",
  "iPhone 13",
  "Android USB-C",
  "iPad",
  "MacBook",
  "Universal",
];

// Warranty options for filtering
export const WARRANTY_OPTIONS = [
  "No Warranty",
  "6 Months",
  "1 Year",
  "2 Years",
  "3 Years",
  "Lifetime",
];

// These functions are no longer needed but keep for backward compatibility
export const getProductsByCategory = (category: string): Product[] => [];
export const searchProducts = (query: string): Product[] => [];
export const PRODUCTS: Product[] = [];
