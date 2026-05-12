// context/ApprovalContext.tsx — FINAL FIXED VERSION
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { apiGetMe } from "../app/services/api";

const LAST_KNOWN_STATUS_KEY = "@last_known_approval_status";
const MODAL_SHOWN_KEY = "@approval_modal_shown";
const LAST_USER_ID_KEY = "@last_user_id";

interface ApprovalContextType {
  approvalStatus: string;
  showApprovalModal: boolean;
  setShowApprovalModal: (show: boolean) => void;
  checkApprovalStatus: () => Promise<void>;
  resetApprovalState: () => Promise<void>;
}

const ApprovalContext = createContext<ApprovalContextType>({
  approvalStatus: "pending",
  showApprovalModal: false,
  setShowApprovalModal: () => {},
  checkApprovalStatus: async () => {},
  resetApprovalState: async () => {},
});

export const useApproval = () => useContext(ApprovalContext);

export const ApprovalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [approvalStatus, setApprovalStatus] = useState<string>("pending");
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const isChecking = useRef(false);

  const getLastUserId = async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(LAST_USER_ID_KEY);
    } catch (e) {
      console.log("[Approval] ❌ Error reading last user ID:", e);
      return null;
    }
  };

  const saveLastUserId = async (userId: string) => {
    try {
      await AsyncStorage.setItem(LAST_USER_ID_KEY, userId);
    } catch (e) {
      console.log("[Approval] ❌ Error saving last user ID:", e);
    }
  };

  const wasModalAlreadyShown = async (userId: string): Promise<boolean> => {
    try {
      const lastUserId = await getLastUserId();

      // If user changed, reset everything
      if (lastUserId !== userId) {
        console.log(
          `[Approval] 🔄 User changed from ${lastUserId} to ${userId} - resetting state`,
        );
        await resetAllApprovalData();
        return false;
      }

      const val = await AsyncStorage.getItem(MODAL_SHOWN_KEY);
      console.log(`[Approval] 🔑 MODAL_SHOWN_KEY value = "${val}"`);
      return val === "true";
    } catch (e) {
      console.log("[Approval] ❌ Error reading MODAL_SHOWN_KEY:", e);
      return false;
    }
  };

  const saveLastKnownStatus = async (status: string) => {
    try {
      await AsyncStorage.setItem(LAST_KNOWN_STATUS_KEY, status);
      console.log(`[Approval] 💾 Saved lastKnownStatus = "${status}"`);
    } catch (e) {
      console.log("[Approval] ❌ Error saving lastKnownStatus:", e);
    }
  };

  const getLastKnownStatus = async (): Promise<string | null> => {
    try {
      const val = await AsyncStorage.getItem(LAST_KNOWN_STATUS_KEY);
      console.log(`[Approval] 🔑 LAST_KNOWN_STATUS_KEY value = "${val}"`);
      return val;
    } catch (e) {
      console.log("[Approval] ❌ Error reading lastKnownStatus:", e);
      return null;
    }
  };

  const markModalShown = async () => {
    try {
      await AsyncStorage.setItem(MODAL_SHOWN_KEY, "true");
      console.log("[Approval] ✅ Marked modal as shown");
    } catch (e) {
      console.log("[Approval] ❌ Error marking modal shown:", e);
    }
  };

  const clearModalShown = async () => {
    try {
      await AsyncStorage.removeItem(MODAL_SHOWN_KEY);
      console.log("[Approval] 🗑️ Cleared MODAL_SHOWN_KEY");
    } catch (e) {
      console.log("[Approval] ❌ Error clearing MODAL_SHOWN_KEY:", e);
    }
  };

  const resetAllApprovalData = async () => {
    try {
      await AsyncStorage.multiRemove([
        MODAL_SHOWN_KEY,
        LAST_KNOWN_STATUS_KEY,
        LAST_USER_ID_KEY,
      ]);
      console.log("[Approval] 🔄 Reset all approval data");
    } catch (e) {
      console.log("[Approval] ❌ Error resetting approval data:", e);
    }
  };

  const resetApprovalState = useCallback(async () => {
    await resetAllApprovalData();
    setShowApprovalModal(false);
    setApprovalStatus("pending");
    console.log("[Approval] 🔄 Complete reset of approval state");
  }, []);

  const checkApprovalStatus = useCallback(async () => {
    console.log(
      `[Approval] 🔄 checkApprovalStatus called | isChecking = ${isChecking.current}`,
    );

    if (isChecking.current) {
      console.log("[Approval] ⏭️ Skipping — already checking");
      return;
    }
    isChecking.current = true;

    try {
      console.log("[Approval] 📡 Calling apiGetMe...");
      const response = await apiGetMe();
      console.log(
        "[Approval] 📡 apiGetMe response:",
        JSON.stringify({
          success: response.success,
          approvalStatus: response.user?.approvalStatus,
          userId: response.user?._id || response.user?.id,
        }),
      );

      if (!response.success || !response.user) {
        console.log("[Approval] ❌ apiGetMe failed or no user in response");
        return;
      }

      const liveStatus: string = response.user.approvalStatus || "pending";
      const currentUserId: string = response.user._id || response.user.id;

      setApprovalStatus(liveStatus);
      console.log(
        `[Approval] 🟢 liveStatus = "${liveStatus}" for user ${currentUserId}`,
      );

      // Save current user ID
      await saveLastUserId(currentUserId);

      // CRITICAL FIX: Check if status is NOT approved and clear modal flag
      const isApprovedStatus =
        liveStatus === "approved" || liveStatus === "auto";

      if (!isApprovedStatus) {
        // Status is pending/manual/rejected - clear the modal flag so it can show later
        console.log(
          `[Approval] 📌 Status is "${liveStatus}" - clearing modal flag for future approval`,
        );
        await clearModalShown();
      }

      // Check if modal was already shown
      const alreadyShown = await wasModalAlreadyShown(currentUserId);
      console.log(`[Approval] 📋 alreadyShown = ${alreadyShown}`);

      // Get last known status
      const lastKnownStatus = await getLastKnownStatus();
      console.log(`[Approval] 🕓 lastKnownStatus = "${lastKnownStatus}"`);

      // ALWAYS save the current status
      await saveLastKnownStatus(liveStatus);

      // Only show modal if not already shown and there's a transition to approved
      if (!alreadyShown) {
        console.log(
          "[Approval] 🔍 Modal not shown yet, checking for transition...",
        );

        const wasApproved =
          lastKnownStatus === "approved" || lastKnownStatus === "auto";

        console.log(
          `[Approval] 🧮 isNowApproved = ${isApprovedStatus} | wasApproved = ${wasApproved}`,
        );

        if (isApprovedStatus && !wasApproved) {
          console.log(
            "[Approval] 🎉 Transition detected! Setting showApprovalModal = true",
          );
          setShowApprovalModal(true);
          await markModalShown();
        } else {
          console.log(
            `[Approval] ℹ️ No transition — isNowApproved:${isApprovedStatus} wasApproved:${wasApproved}`,
          );
        }
      } else {
        console.log("[Approval] ⏭️ Modal already shown for this user");
      }
    } catch (error) {
      console.error("[Approval] 💥 Unexpected error:", error);
    } finally {
      isChecking.current = false;
      console.log("[Approval] 🏁 Check complete");
    }
  }, []);

  const handleSetShowApprovalModal = useCallback(async (show: boolean) => {
    console.log(`[Approval] 🪟 setShowApprovalModal called with: ${show}`);
    setShowApprovalModal(show);
    if (!show) {
      await markModalShown();
    }
  }, []);

  // Initial check
  useEffect(() => {
    console.log(
      "[Approval] 🚀 ApprovalProvider mounted — scheduling initial check in 1.5s",
    );
    const timer = setTimeout(() => {
      console.log("[Approval] ⏰ Initial check firing");
      checkApprovalStatus();
    }, 1500);
    return () => clearTimeout(timer);
  }, [checkApprovalStatus]);

  // Poll every 20 seconds
  useEffect(() => {
    console.log("[Approval] ⏱️ Starting 20s polling interval");
    const interval = setInterval(async () => {
      console.log("[Approval] ⏱️ Interval tick");
      await checkApprovalStatus();
    }, 20000);

    return () => {
      console.log("[Approval] ⏱️ Clearing polling interval");
      clearInterval(interval);
    };
  }, [checkApprovalStatus]);

  return (
    <ApprovalContext.Provider
      value={{
        approvalStatus,
        showApprovalModal,
        setShowApprovalModal: handleSetShowApprovalModal,
        checkApprovalStatus,
        resetApprovalState,
      }}
    >
      {children}
    </ApprovalContext.Provider>
  );
};
