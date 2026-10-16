import React from "react";
import { AppSidebar, NavTab } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { useSidebar } from "../../context/SidebarContext";
import { Product, RetailShop, Vendor } from "../../db/schema";

interface AppLayoutProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  products?: Product[];
  shops?: RetailShop[];
  vendors?: Vendor[];
  productsCount: number;
  lowStockCount?: number;
  pendingOrdersCount?: number;
  shopsCount?: number;
  vendorsCount?: number;
  children: React.ReactNode;
  onQuickSale?: () => void;
  onLockSession?: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  activeTab,
  onSelectTab,
  products = [],
  shops = [],
  vendors = [],
  productsCount,
  lowStockCount,
  pendingOrdersCount,
  shopsCount,
  vendorsCount,
  children,
  onQuickSale,
  onLockSession,
}) => {
  const { isExpanded } = useSidebar();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-outfit text-gray-900 dark:text-gray-100 transition-colors">
      <AppSidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        productsCount={productsCount}
        lowStockCount={lowStockCount}
        pendingOrdersCount={pendingOrdersCount}
        shopsCount={shopsCount}
        vendorsCount={vendorsCount}
      />

      <div
        className={`flex min-h-screen flex-col transition-all duration-300 ease-in-out ${
          isExpanded ? "lg:pl-[280px]" : "lg:pl-[88px]"
        }`}
      >
        <AppHeader
          products={products}
          shops={shops}
          vendors={vendors}
          onNavigateTab={onSelectTab}
          onOpenQuickSale={onQuickSale}
          onLockSession={onLockSession}
        />

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
