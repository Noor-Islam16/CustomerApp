// context/AuthContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { apiGetMe, clearToken, getToken, saveToken } from "../app/services/api";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import auth from "@react-native-firebase/auth";

interface User {
  _id: string;
  email: string;
  phone?: string;
  countryCode?: string;
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
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  const refreshUser = useCallback(async () => {
    try {
      const token = await getToken();
      if (token) {
        const response = await apiGetMe();
        if (response.success && response.user) {
          setUser(response.user);
        } else {
          await clearToken();
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to refresh user:", error);
      await clearToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(
    async (token: string) => {
      await saveToken(token);
      await refreshUser();
    },
    [refreshUser],
  );

  const logout = useCallback(async () => {
    try {
      await auth().signOut();
    } catch (e) {
      console.warn("Firebase signOut error:", e);
    }
    try {
      await GoogleSignin.revokeAccess();
    } catch (e) {
      console.warn("Google Sign-In revokeAccess error:", e);
    }
    try {
      await GoogleSignin.signOut();
    } catch (e) {
      console.warn("Google Sign-In signOut error:", e);
    }
    await clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
