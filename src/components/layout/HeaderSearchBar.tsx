import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  Command,
  Menu,
  X,
  Package,
  ShoppingCart,
  Store,
  Building2,
  ClipboardList,
  Layers,
  TrendingUp,
  Wallet,
  History,
  Settings,
  ArrowRight,
} from "lucide-react";
import { useSidebar } from "../../context/SidebarContext";
import { Product, RetailShop, Vendor, Order } from "../../db/schema";
import { getOrders } from "../../db/orderService";
import { NavTab } from "./navTypes";

interface HeaderSearchBarProps {
  products?: Product[];
  shops?: RetailShop[];
  vendors?: Vendor[];
  onNavigateTab?: (tab: NavTab) => void;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
}

interface ModuleItem {
  tab: NavTab;
  name: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string[];
}

const APP_MODULES: ModuleItem[] = [
  { tab: "billing", name: "Billing POS", desc: "Fast Wholesale Invoicing & Point of Sale", icon: ShoppingCart, keywords: ["pos", "billing", "bill", "invoice", "sale", "cash", "f1"] },
  { tab: "orders", name: "Wholesale Orders", desc: "Booked orders from WhatsApp, phone & reps", icon: ClipboardList, keywords: ["orders", "order", "booking", "whatsapp", "f2"] },
  { tab: "dispatch", name: "Dispatch Slips", desc: "Order booker dispatch delivery & gate passes", icon: Package, keywords: ["dispatch", "slips", "gate pass", "delivery", "f3"] },
  { tab: "inventory", name: "Inventory Master", desc: "Stock catalog, pricing, SKU & imports", icon: Layers, keywords: ["inventory", "stock", "products", "items", "warehouse", "sku", "f4"] },
  { tab: "shops", name: "Shops & Khata", desc: "Retail customer accounts, credit & ledger", icon: Store, keywords: ["shops", "khata", "customers", "receivables", "ledger", "f5"] },
  { tab: "bookers", name: "Order Bookers", desc: "Sales representatives & route commissions", icon: Store, keywords: ["bookers", "sales reps", "agents", "f6"] },
  { tab: "vendors", name: "Suppliers & Vendors", desc: "Wholesale procurement accounts & payables", icon: Building2, keywords: ["vendors", "suppliers", "purchases", "payables", "f7"] },
  { tab: "expenses", name: "Daily Expenses", desc: "Operating overheads, vehicle fuel & warehouse rent", icon: Wallet, keywords: ["expenses", "kharcha", "fuel", "rent", "utilities", "f8"] },
  { tab: "reports", name: "Profit Analytics & Reports", desc: "Wholesale gross profit, margins & simulator", icon: TrendingUp, keywords: ["reports", "profit", "margins", "analytics", "simulator", "f9"] },
  { tab: "audit", name: "Audit Ledger", desc: "Immutable inventory audit trail and stock log", icon: History, keywords: ["audit", "log", "trail", "ledger", "history"] },
  { tab: "settings", name: "Settings & Backups", desc: "Store branding, receipt printer & database backups", icon: Settings, keywords: ["settings", "backup", "store", "profile", "password", "f10"] },
];

export const HeaderSearchBar: React.FC<HeaderSearchBarProps> = ({
  products = [],
  shops = [],
  vendors = [],
  onNavigateTab,
  searchTerm = "",
  onSearchChange,
}) => {
  const { toggleMobileSidebar } = useSidebar();
  const [internalQuery, setInternalQuery] = useState(searchTerm);
  const [isOpen, setIsOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const query = (onSearchChange ? searchTerm : internalQuery) || "";

  const handleQueryChange = (val: string) => {
    setInternalQuery(val);
    if (onSearchChange) onSearchChange(val);
    if (!isOpen) setIsOpen(true);
  };

  // Pre-load orders when user focuses search bar
  const handleFocus = async () => {
    setIsOpen(true);
    try {
      const ords = await getOrders();
      setOrders(ords);
    } catch (err) {
      console.error("Failed to load orders for search:", err);
    }
  };

  // Global Ctrl+K / Cmd+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        handleFocus();
      } else if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered Results
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return {
        modules: APP_MODULES.slice(0, 4),
        products: products.slice(0, 4),
        orders: orders.slice(0, 3),
        shops: shops.slice(0, 3),
        vendors: vendors.slice(0, 2),
        total: 16,
      };
    }

    const matchedModules = APP_MODULES.filter(
      (m) => m.name.toLowerCase().includes(q) || m.keywords.some((k) => k.includes(q))
    ).slice(0, 3);

    const matchedProducts = products
      .filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .slice(0, 5);

    const matchedOrders = orders
      .filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.shop_name?.toLowerCase().includes(q) ||
          o.booker_name?.toLowerCase().includes(q)
      )
      .slice(0, 4);

    const matchedShops = shops
      .filter(
        (s) =>
          s.shopName.toLowerCase().includes(q) ||
          (s.ownerName && s.ownerName.toLowerCase().includes(q)) ||
          (s.phone && s.phone.includes(q))
      )
      .slice(0, 4);

    const matchedVendors = vendors
      .filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          (v.contactPerson && v.contactPerson.toLowerCase().includes(q)) ||
          (v.city && v.city.toLowerCase().includes(q))
      )
      .slice(0, 3);

    const total =
      matchedModules.length +
      matchedProducts.length +
      matchedOrders.length +
      matchedShops.length +
      matchedVendors.length;

    return {
      modules: matchedModules,
      products: matchedProducts,
      orders: matchedOrders,
      shops: matchedShops,
      vendors: matchedVendors,
      total,
    };
  }, [query, products, orders, shops, vendors]);

  const handleSelectModule = (tab: NavTab) => {
    if (onNavigateTab) onNavigateTab(tab);
    setIsOpen(false);
  };

  const handleClear = () => {
    handleQueryChange("");
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="flex flex-1 items-center gap-3 md:gap-4 relative">
      <button
        onClick={toggleMobileSidebar}
        className="flex size-9 items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 lg:hidden dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-900 shrink-0"
        title="Open Menu"
      >
        <Menu className="size-4" />
      </button>

      <div className="relative w-full max-w-lg flex items-center">
        <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={handleFocus}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search items, SKU, orders, shops, vendors (Ctrl+K)..."
          className="tail-input-sm pl-8.5 pr-16 text-xs w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
        />

        <div className="absolute top-1/2 right-2.5 -translate-y-1/2 flex items-center gap-1.5">
          {query.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-800 transition-colors"
              title="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 pointer-events-none">
            <Command className="size-3" />K
          </kbd>
        </div>

        {/* Global Search Results Dropdown */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-theme-xl overflow-hidden z-50 animate-in fade-in max-h-[75vh] flex flex-col">
            <div className="p-2.5 overflow-y-auto space-y-3 divide-y divide-gray-100 dark:divide-gray-800/80">
              {results.total === 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs">
                  <Search className="size-7 mx-auto mb-2 text-gray-300 dark:text-gray-600 stroke-[1.5]" />
                  <span>No results matching &ldquo;{query}&rdquo;</span>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Try searching for product names, SKU numbers, orders, customer shops, or modules.
                  </p>
                </div>
              ) : (
                <>
                  {/* Products Section */}
                  {results.products.length > 0 && (
                    <div className="pt-1.5 first:pt-0">
                      <div className="flex items-center justify-between px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        <span className="flex items-center gap-1">
                          <Layers className="size-3 text-brand-500" /> Products / Inventory
                        </span>
                        <span>{results.products.length} found</span>
                      </div>
                      <div className="space-y-1">
                        {results.products.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectModule("inventory")}
                            className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-brand-50/50 dark:hover:bg-brand-950/30 transition-colors group cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 shrink-0">
                                {p.sku}
                              </span>
                              <div className="truncate">
                                <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 block truncate group-hover:text-brand-600 dark:group-hover:text-brand-400">
                                  {p.name}
                                </span>
                                <span className="text-[10px] text-gray-400 block">
                                  Stock: {p.currentStock} {p.unit}
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0 pl-2">
                              <span className="text-xs font-mono font-bold text-gray-900 dark:text-gray-100 block">
                                Rs. {p.sellingPrice.toLocaleString()}
                              </span>
                              <span className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold flex items-center justify-end gap-0.5">
                                View in Inventory <ArrowRight className="size-2.5" />
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Wholesale Orders Section */}
                  {results.orders.length > 0 && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        <span className="flex items-center gap-1">
                          <ClipboardList className="size-3 text-blue-500" /> Wholesale Orders
                        </span>
                        <span>{results.orders.length} found</span>
                      </div>
                      <div className="space-y-1">
                        {results.orders.map((ord) => (
                          <button
                            key={ord.id}
                            type="button"
                            onClick={() => handleSelectModule("orders")}
                            className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors group cursor-pointer"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                                  {ord.orderNumber}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                                  {ord.status}
                                </span>
                              </div>
                              <span className="text-[11px] text-gray-600 dark:text-gray-300 block truncate">
                                {ord.shop_name} • {ord.booker_name || "Direct Booking"}
                              </span>
                            </div>
                            <div className="text-right shrink-0 pl-2">
                              <span className="text-xs font-mono font-bold text-gray-900 dark:text-gray-100 block">
                                Rs. {ord.totalAmount.toLocaleString()}
                              </span>
                              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold flex items-center justify-end gap-0.5">
                                Open Orders <ArrowRight className="size-2.5" />
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Retail Shops & Khata Section */}
                  {results.shops.length > 0 && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        <span className="flex items-center gap-1">
                          <Store className="size-3 text-amber-500" /> Retail Shops & Khata
                        </span>
                        <span>{results.shops.length} found</span>
                      </div>
                      <div className="space-y-1">
                        {results.shops.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => handleSelectModule("shops")}
                            className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-amber-50/50 dark:hover:bg-amber-950/30 transition-colors group cursor-pointer"
                          >
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 block truncate group-hover:text-amber-600">
                                {s.shopName}
                              </span>
                              <span className="text-[10px] text-gray-400 block truncate">
                                {s.ownerName || "Customer"} {s.phone ? `• ${s.phone}` : ""}
                              </span>
                            </div>
                            <div className="text-right shrink-0 pl-2">
                              <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400 block">
                                Rs. {s.outstandingBalance.toLocaleString()}
                              </span>
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center justify-end gap-0.5">
                                View Khata <ArrowRight className="size-2.5" />
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suppliers & Vendors Section */}
                  {results.vendors.length > 0 && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        <span className="flex items-center gap-1">
                          <Building2 className="size-3 text-indigo-500" /> Wholesale Suppliers
                        </span>
                        <span>{results.vendors.length} found</span>
                      </div>
                      <div className="space-y-1">
                        {results.vendors.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => handleSelectModule("vendors")}
                            className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors group cursor-pointer"
                          >
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 block truncate group-hover:text-indigo-600">
                                {v.name}
                              </span>
                              <span className="text-[10px] text-gray-400 block truncate">
                                {v.contactPerson || "Supplier"} {v.city ? `• ${v.city}` : ""}
                              </span>
                            </div>
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-0.5 shrink-0 pl-2">
                              Open Vendors <ArrowRight className="size-2.5" />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick App Navigation Section */}
                  {results.modules.length > 0 && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        <span>System Modules & Shortcuts</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {results.modules.map((m) => {
                          const Icon = m.icon;
                          return (
                            <button
                              key={m.tab}
                              type="button"
                              onClick={() => handleSelectModule(m.tab)}
                              className="flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group cursor-pointer"
                            >
                              <div className="size-7 rounded-lg bg-gray-100 dark:bg-gray-800 group-hover:bg-brand-100 dark:group-hover:bg-brand-950/60 text-gray-600 dark:text-gray-400 group-hover:text-brand-600 flex items-center justify-center shrink-0">
                                <Icon className="size-3.5" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 block group-hover:text-brand-600">
                                  {m.name}
                                </span>
                                <span className="text-[10px] text-gray-400 block truncate">
                                  {m.desc}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer Bar */}
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[10px] text-gray-400">
              <span className="flex items-center gap-1.5">
                <kbd className="px-1 py-0.5 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-mono">
                  Ctrl+K
                </kbd>
                <span>to focus search</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1 py-0.5 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-mono">
                  ESC
                </kbd>
                <span>to close</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
