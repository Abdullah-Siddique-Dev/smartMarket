import { useState } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { SidebarProvider } from "./context/SidebarContext";
import { AppLayout } from "./components/layout/AppLayout";
import { NavTab } from "./components/layout/navTypes";
import { LoginPage } from "./pages/Login";
import { useAppData } from "./hooks/useAppData";
import { useGlobalShortcuts } from "./hooks/useGlobalShortcuts";
import { AppRouter } from "./components/AppRouter";
import { AppLoadingScreen } from "./components/ui/AppLoadingScreen";

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem("is_authenticated") === "true";
  });
  const [activeTab, setActiveTab] = useState<NavTab>("billing");

  const {
    products,
    shops,
    bookers,
    vendors,
    lowStockCount,
    pendingOrdersCount,
    isLoading,
    fetchAppData,
  } = useAppData(isAuthenticated);

  useGlobalShortcuts(isAuthenticated, setActiveTab);

  const handleLockSession = () => {
    sessionStorage.removeItem("is_authenticated");
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  if (isLoading) {
    return <AppLoadingScreen message="Initializing Smart Market SQLite engine & wholesale catalog..." />;
  }

  return (
    <AppLayout
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      productsCount={products.length}
      lowStockCount={lowStockCount}
      pendingOrdersCount={pendingOrdersCount}
      shopsCount={shops.length}
      vendorsCount={vendors.length}
      onQuickSale={() => setActiveTab("billing")}
      onLockSession={handleLockSession}
    >
      <AppRouter
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        products={products}
        shops={shops}
        bookers={bookers}
        vendors={vendors}
        isLoading={isLoading}
        fetchAppData={fetchAppData}
      />
    </AppLayout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <SidebarProvider>
        <AppContent />
      </SidebarProvider>
    </ThemeProvider>
  );
}

export default App;
