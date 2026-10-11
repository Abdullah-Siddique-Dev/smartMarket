import { lazy, Suspense } from "react";
import { NavTab } from "./layout/navTypes";
import { Product, RetailShop, OrderBooker, Vendor, Order } from "../db/schema";

const BillingPage = lazy(() => import("../pages/Billing").then((m) => ({ default: m.BillingPage })));
const OrdersPage = lazy(() => import("../pages/Orders").then((m) => ({ default: m.OrdersPage })));
const DispatchPage = lazy(() => import("../pages/Dispatch").then((m) => ({ default: m.DispatchPage })));
const InventoryPage = lazy(() => import("../pages/Inventory").then((m) => ({ default: m.InventoryPage })));
const ShopsPage = lazy(() => import("../pages/Shops").then((m) => ({ default: m.ShopsPage })));
const BookersPage = lazy(() => import("../pages/Bookers").then((m) => ({ default: m.BookersPage })));
const VendorsPage = lazy(() => import("../pages/Vendors").then((m) => ({ default: m.VendorsPage })));
const ExpensesPage = lazy(() => import("../pages/Expenses").then((m) => ({ default: m.ExpensesPage })));
const ReportsPage = lazy(() => import("../pages/Reports").then((m) => ({ default: m.ReportsPage })));
const AuditPage = lazy(() => import("../pages/Audit").then((m) => ({ default: m.AuditPage })));
const SettingsPage = lazy(() => import("../pages/Settings").then((m) => ({ default: m.SettingsPage })));

const PageLoader = () => (
  <div className="flex h-64 w-full items-center justify-center">
    <div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
  </div>
);

interface AppRouterProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  products: Product[];
  shops: RetailShop[];
  bookers: OrderBooker[];
  vendors: Vendor[];
  convertedOrder?: Order | null;
  onClearConvertedOrder?: () => void;
  onOrderToBilling?: (order: Order) => void;
  isLoading: boolean;
  fetchAppData: () => Promise<void>;
}

export const AppRouter: React.FC<AppRouterProps> = ({
  activeTab,
  setActiveTab,
  products,
  shops,
  bookers,
  vendors,
  convertedOrder,
  onClearConvertedOrder,
  onOrderToBilling,
  isLoading,
  fetchAppData,
}) => {
  return (
    <Suspense fallback={<PageLoader />}>
      {activeTab === "billing" && (
        <BillingPage
          products={products}
          shops={shops}
          bookers={bookers}
          convertedOrder={convertedOrder}
          onClearConvertedOrder={onClearConvertedOrder}
          onBillingComplete={fetchAppData}
        />
      )}
      {activeTab === "orders" && (
        <OrdersPage
          products={products}
          shops={shops}
          bookers={bookers}
          onRefresh={fetchAppData}
          onNavigateToBilling={onOrderToBilling || (() => setActiveTab("billing"))}
        />
      )}
      {activeTab === "dispatch" && (
        <DispatchPage
          products={products}
          bookers={bookers}
          onRefresh={fetchAppData}
        />
      )}
      {activeTab === "inventory" && (
        <InventoryPage
          products={products}
          vendors={vendors}
          isLoading={isLoading}
          onRefresh={fetchAppData}
        />
      )}
      {activeTab === "shops" && (
        <ShopsPage
          shops={shops}
          onRefresh={fetchAppData}
        />
      )}
      {activeTab === "bookers" && (
        <BookersPage
          bookers={bookers}
          onRefresh={fetchAppData}
        />
      )}
      {activeTab === "vendors" && (
        <VendorsPage
          vendors={vendors}
          onRefresh={fetchAppData}
        />
      )}
      {activeTab === "expenses" && (
        <ExpensesPage />
      )}
      {activeTab === "reports" && (
        <ReportsPage products={products} />
      )}
      {activeTab === "audit" && (
        <AuditPage products={products} />
      )}
      {activeTab === "settings" && (
        <SettingsPage />
      )}
    </Suspense>
  );
};
