import { useEffect } from "react";
import { NavTab } from "../components/layout/navTypes";

export function useGlobalShortcuts(
  isAuthenticated: boolean,
  setActiveTab: (tab: NavTab) => void
) {
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap: Record<string, NavTab> = {
        F1: "billing",
        F2: "orders",
        F3: "dispatch",
        F4: "inventory",
        F5: "shops",
        F6: "bookers",
        F7: "vendors",
        F8: "expenses",
        F9: "reports",
        F10: "settings",
      };

      if (keyMap[e.key]) {
        e.preventDefault();
        setActiveTab(keyMap[e.key]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAuthenticated, setActiveTab]);
}
