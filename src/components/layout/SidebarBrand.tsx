import React from "react";
import { Store, PanelLeftClose } from "lucide-react";

interface SidebarBrandProps {
  isExpanded: boolean;
  toggleSidebar: () => void;
}

export const SidebarBrand: React.FC<SidebarBrandProps> = ({ isExpanded, toggleSidebar }) => {
  return (
    <div
      className={`flex h-16 items-center border-b border-gray-200 dark:border-gray-800 ${
        isExpanded ? "justify-between px-5" : "justify-center px-0"
      }`}
    >
      <div
        onClick={() => !isExpanded && toggleSidebar()}
        className="flex items-center gap-3 cursor-pointer select-none group"
      >
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-blue-600 text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform shrink-0">
          <Store className="size-5" />
        </div>
        {isExpanded && (
          <div className="flex flex-col truncate">
            <span className="text-base font-extrabold tracking-tight text-gray-900 dark:text-white">
              Smart Market <span className="text-brand-500">OS</span>
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-medium text-gray-400">Wholesale ERP v1.0</span>
            </div>
          </div>
        )}
      </div>

      {isExpanded && (
        <button
          type="button"
          onClick={toggleSidebar}
          className="hidden size-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-gray-700 lg:flex dark:border-gray-800 dark:hover:bg-gray-900 dark:hover:text-gray-200 transition-colors"
          title="Collapse Sidebar"
        >
          <PanelLeftClose className="size-4" />
        </button>
      )}
    </div>
  );
};
