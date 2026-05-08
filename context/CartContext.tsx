// context/CartContext.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Product } from "../constants/products";

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  cartTotal: number;
  cartItemCount: number;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartQuantity: (productId: string) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "@customer_app_cart";

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart from storage on mount
  useEffect(() => {
    loadCart();
  }, []);

  // Save cart to storage whenever it changes
  useEffect(() => {
    if (isLoaded) {
      saveCart(cart);
    }
  }, [cart, isLoaded]);

  const loadCart = async () => {
    try {
      const storedCart = await AsyncStorage.getItem(CART_STORAGE_KEY);
      if (storedCart) {
        const parsedCart = JSON.parse(storedCart);
        // Validate that items have proper price data
        const validCart = parsedCart.filter(
          (item: CartItem) =>
            item.product && (item.product.sellingPrice || item.product.price),
        );
        setCart(validCart);
        console.log("📦 Cart loaded:", validCart.length, "items");
      }
    } catch (error) {
      console.error("Error loading cart:", error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveCart = async (cartItems: CartItem[]) => {
    try {
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (error) {
      console.error("Error saving cart:", error);
    }
  };

  const addToCart = (product: Product, quantity: number = 1) => {
    console.log(
      "➕ Adding to cart:",
      product.name,
      "price:",
      product.sellingPrice,
    );
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      }
      return [...prev, { product, quantity }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              quantity: Math.min(quantity, item.product.stockQuantity || 999),
            }
          : item,
      ),
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const getCartQuantity = (productId: string): number => {
    return cart.find((item) => item.product.id === productId)?.quantity || 0;
  };

  // ✅ FIXED: Use sellingPrice (API field) with fallbacks
  const cartTotal = cart.reduce((sum, item) => {
    // Try sellingPrice first (API field), then price (static data), then originalPrice, default to 0
    const itemPrice =
      item.product.sellingPrice ||
      item.product.price ||
      item.product.originalPrice ||
      0;

    console.log(
      "💰 Cart calc:",
      item.product.name,
      "price:",
      itemPrice,
      "qty:",
      item.quantity,
      "subtotal:",
      itemPrice * item.quantity,
    );

    return sum + itemPrice * item.quantity;
  }, 0);

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  console.log("🛒 Cart total:", cartTotal, "items:", cartItemCount);

  const value: CartContextType = {
    cart,
    cartTotal,
    cartItemCount,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartQuantity,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
