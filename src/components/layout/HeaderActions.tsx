import React from "react";
import { Sun, Moon, CreditCard, Lock } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

interface HeaderActionsProps {
  onOpenQuickSale?: () => void;
  onLockSession?: () => void;
}

export const HeaderActions: React.FC<HeaderActionsProps> = ({
  onOpenQuickSale,
  onLockSession,
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex items-center gap-2.5 sm:gap-3.5">
      {onOpenQuickSale && (
        <button
          onClick={onOpenQuickSale}
          className="hidden sm:inline-flex items-center gap-1.5 py-1.5 px-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-theme-xs transition-colors cursor-pointer"
        >
          <CreditCard className="size-3.5" />
          <span>Billing POS (F1)</span>
        </button>
      )}

      <button
        onClick={toggleTheme}
        className="flex size-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-all hover:bg-gray-100 hover:text-gray-900 active:scale-95 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
        title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
      >
        {theme === "dark" ? (
          <Sun className="size-4 text-warning-400 transition-transform rotate-0 hover:rotate-45" />
        ) : (
          <Moon className="size-4 text-gray-700 transition-transform rotate-0 hover:-rotate-12" />
        )}
      </button>

      {onLockSession && (
        <button
          onClick={onLockSession}
          className="flex size-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-all hover:bg-gray-100 hover:text-gray-900 active:scale-95 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
          title="Lock Terminal Screen"
        >
          <Lock className="size-3.5" />
        </button>
      )}

      <div className="flex items-center gap-3 pl-2 border-l border-gray-200 dark:border-gray-800">
        <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-tr from-brand-600 to-blue-600 text-xs font-bold text-white shadow-theme-xs">
          SM
        </div>
        <div className="hidden flex-col md:flex">
          <span className="text-xs font-semibold text-gray-900 dark:text-white">Wholesale Admin</span>
          <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Terminal Online
          </span>
        </div>
      </div>
    </div>
  );
};
