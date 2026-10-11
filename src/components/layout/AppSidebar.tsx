import React from "react";
import {
  CreditCard,
  Package,
  Truck,
  Boxes,
  Building2,
  DollarSign,
  Users,
  Store,
  BarChart3,
  ShieldCheck,
  Settings,
} from "lucide-react";
import { useSidebar } from "../../context/SidebarContext";
import { NavTab } from "./navTypes";
import { SidebarBrand } from "./SidebarBrand";
import { SidebarNavItem, NavItemConfig } from "./SidebarNavItem";
import { SidebarFooter } from "./SidebarFooter";

export type { NavTab };

interface AppSidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  productsCount: number;
  lowStockCount?: number;
  pendingOrdersCount?: number;
  shopsCount?: number;
  bookersCount?: number;
  vendorsCount?: number;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  onSelectTab,
  productsCount,
  lowStockCount = 0,
  pendingOrdersCount = 0,
  shopsCount = 0,
  vendorsCount = 0,
}) => {
  const { isExpanded, toggleSidebar, isMobileOpen, closeMobileSidebar } = useSidebar();

  const navItems: NavItemConfig[] = [
    { id: "billing", label: "Billing POS", icon: CreditCard, hotkey: "F1" },
    {
      id: "orders",
      label: "Orders",
      icon: Package,
      hotkey: "F2",
      badge: pendingOrdersCount > 0 ? `${pendingOrdersCount} Pending` : undefined,
      badgeType: pendingOrdersCount > 0 ? "warning" : "neutral",
    },
    { id: "dispatch", label: "Dispatch Slips", icon: Truck, hotkey: "F3" },
    {
      id: "inventory",
      label: "Inventory",
      icon: Boxes,
      hotkey: "F4",
      badge: lowStockCount > 0 ? `${lowStockCount} Low` : `${productsCount}`,
      badgeType: lowStockCount > 0 ? "warning" : "neutral",
    },
    {
      id: "shops",
      label: "Shops & Khata",
      icon: Store,
      hotkey: "F5",
      badge: shopsCount > 0 ? `${shopsCount}` : undefined,
      badgeType: "neutral",
    },
    { id: "bookers", label: "Order Bookers", icon: Users },
    {
      id: "vendors",
      label: "Vendors",
      icon: Building2,
      badge: vendorsCount > 0 ? `${vendorsCount}` : undefined,
      badgeType: "neutral",
    },
    { id: "expenses", label: "Expenses", icon: DollarSign },
    { id: "reports", label: "Profit Reports", icon: BarChart3 },
    { id: "audit", label: "Audit Ledger", icon: ShieldCheck },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <>
      {isMobileOpen && (
        <div onClick={closeMobileSidebar} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in" />
      )}
      <aside
        className={`fixed top-0 left-0 z-40 flex h-screen flex-col justify-between border-r border-gray-200 bg-white transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-950 ${
          isExpanded ? "w-[280px]" : "w-[88px]"
        } ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex flex-col flex-1 overflow-hidden">
          <SidebarBrand isExpanded={isExpanded} toggleSidebar={toggleSidebar} />
          <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1 scrollbar-thin">
            {isExpanded && (
              <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Wholesale Modules
              </p>
            )}
            {navItems.map((item) => (
              <SidebarNavItem
                key={item.id}
                item={item}
                isActive={activeTab === item.id}
                isExpanded={isExpanded}
                onClick={() => {
                  onSelectTab(item.id as NavTab);
                  closeMobileSidebar();
                }}
              />
            ))}
          </div>
        </div>
        <SidebarFooter isExpanded={isExpanded} />
      </aside>
    </>
  );
};
