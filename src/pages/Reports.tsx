import React, { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  DollarSign,
  Package,
  Award,
  Store,
  Building2,
  Calculator,
  Sparkles,
} from "lucide-react";
import { getProfitKPIs, getTopProducts, getBookerLeaderboard, ProfitKPIs } from "../db/reportService";
import { Product } from "../db/schema";
import { PageHeader } from "../components/ui/PageHeader";

interface ReportsPageProps {
  products?: Product[];
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ products = [] }) => {
  const [kpis, setKpis] = useState<ProfitKPIs | null>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [bookersLeaderboard, setBookersLeaderboard] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Profit Simulator State
  const [selectedSimProduct, setSelectedSimProduct] = useState<string>("ALL");
  const [simQty, setSimQty] = useState<number>(0);
  const [simCostPrice, setSimCostPrice] = useState<number>(0);
  const [simSellingPrice, setSimSellingPrice] = useState<number>(0);

  useEffect(() => {
    async function loadReports() {
      setIsLoading(true);
      try {
        const [k, p, b] = await Promise.all([
          getProfitKPIs(),
          getTopProducts(6),
          getBookerLeaderboard(),
        ]);
        setKpis(k);
        setTopProducts(p);
        setBookersLeaderboard(b);
      } catch (err) {
        console.error("Failed to load reports:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadReports();
  }, []);

  // Auto-fetch actual inventory stock for Profit Simulator
  useEffect(() => {
    if (selectedSimProduct === "ALL") {
      const totalUnits = products.reduce((acc, p) => acc + p.currentStock, 0);
      const totalCost = products.reduce((acc, p) => acc + (p.currentStock * p.purchasePrice), 0);
      const totalRev = products.reduce((acc, p) => acc + (p.currentStock * p.sellingPrice), 0);
      setSimQty(totalUnits);
      setSimCostPrice(totalUnits > 0 ? Math.round(totalCost / totalUnits) : 0);
      setSimSellingPrice(totalUnits > 0 ? Math.round(totalRev / totalUnits) : 0);
    } else {
      const prod = products.find((p) => p.id === Number(selectedSimProduct));
      if (prod) {
        // Auto-fetch actual current quantity from warehouse inventory (no hardcoded 100)
        setSimQty(prod.currentStock);
        setSimCostPrice(prod.purchasePrice);
        setSimSellingPrice(prod.sellingPrice);
      }
    }
  }, [selectedSimProduct, products]);

  // Simulator Calculations
  const simRevenue = useMemo(() => {
    if (selectedSimProduct === "ALL") {
      return products.reduce((acc, p) => acc + (p.currentStock * p.sellingPrice), 0);
    }
    return simQty * simSellingPrice;
  }, [selectedSimProduct, products, simQty, simSellingPrice]);

  const simCost = useMemo(() => {
    if (selectedSimProduct === "ALL") {
      return products.reduce((acc, p) => acc + (p.currentStock * p.purchasePrice), 0);
    }
    return simQty * simCostPrice;
  }, [selectedSimProduct, products, simQty, simCostPrice]);

  const simGrossProfit = simRevenue - simCost;
  const simMarginPct = simRevenue > 0 ? Math.round((simGrossProfit / simRevenue) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profit Analytics & Performance Dashboard"
        description="Real-time wholesale profitability, gross margins and sales rep performance"
      />

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <div className="size-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent mb-3" />
          <p className="text-xs">Computing wholesale profit analytics & ledger margins...</p>
        </div>
      ) : kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Gross Sales */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-theme-xs space-y-2">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-[10px] uppercase font-bold tracking-wider">Gross Sales</span>
              <DollarSign className="size-4 text-brand-500" />
            </div>
            <span className="text-2xl font-black font-mono text-gray-900 dark:text-gray-100 block">
              Rs. {kpis.totalSales.toLocaleString()}
            </span>
            <div className="text-[11px] text-gray-500 flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
              <span>Orders Completed</span>
              <span className="font-bold font-mono">{kpis.ordersCompleted}</span>
            </div>
          </div>

          {/* Procurement Cost */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-theme-xs space-y-2">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-[10px] uppercase font-bold tracking-wider">Procurement Cost</span>
              <Package className="size-4 text-blue-500" />
            </div>
            <span className="text-2xl font-black font-mono text-gray-900 dark:text-gray-100 block">
              Rs. {kpis.totalCost.toLocaleString()}
            </span>
            <div className="text-[11px] text-gray-500 flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
              <span>Cost of Sold Goods</span>
              <span className="font-bold font-mono">Wholesale Basis</span>
            </div>
          </div>

          {/* Gross Trading Profit */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-theme-xs space-y-2">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-[10px] uppercase font-bold tracking-wider">Gross Trading Profit</span>
              <TrendingUp className="size-4 text-emerald-500" />
            </div>
            <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 block">
              Rs. {kpis.grossProfit.toLocaleString()}
            </span>
            <div className="text-[11px] text-gray-500 flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
              <span>Trading Markup</span>
              <span className="font-bold font-mono text-emerald-600">Active Stock</span>
            </div>
          </div>

          {/* Net Clean Profit */}
          <div className="bg-gradient-to-br from-brand-600 to-blue-700 text-white p-5 rounded-2xl shadow-md shadow-brand-500/20 space-y-2">
            <div className="flex items-center justify-between text-blue-100">
              <span className="text-[10px] uppercase font-bold tracking-wider">Net Sales Profit</span>
              <Award className="size-4" />
            </div>
            <span className="text-3xl font-black font-mono block">
              Rs. {kpis.netProfit.toLocaleString()}
            </span>
            <div className="text-[11px] text-blue-100 flex items-center justify-between pt-2 border-t border-white/20">
              <span>Net Profit Margin</span>
              <span className="font-black font-mono">+{kpis.profitMarginPercent}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Profit & Margin Simulator */}
      <div className="bg-white dark:bg-gray-900 border border-brand-200 dark:border-brand-900/60 rounded-3xl p-5 shadow-theme-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400 flex items-center justify-center">
              <Calculator className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <span>Wholesale Profit & Margin Simulator</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center gap-1">
                  <Sparkles className="size-3" /> Auto-Synced Inventory Stock
                </span>
              </h3>
              <p className="text-[11px] text-gray-400">
                Simulate potential earnings and gross margin on available warehouse stock
              </p>
            </div>
          </div>
        </div>

        {/* Simulator Form Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-gray-50/70 dark:bg-gray-800/40 p-3.5 rounded-2xl">
          {/* Product Select */}
          <div className="lg:col-span-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
              Select Product *
            </label>
            <select
              value={selectedSimProduct}
              onChange={(e) => setSelectedSimProduct(e.target.value)}
              className="w-full text-xs font-semibold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-2.5 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              <option value="ALL">📦 All Products (Total Available Stock)</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.unit}) - Stock: {p.currentStock}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
              Stock Quantity {selectedSimProduct !== "ALL" && "(Auto-Fetched)"}
            </label>
            <input
              type="number"
              min="0"
              disabled={selectedSimProduct === "ALL"}
              value={simQty}
              onChange={(e) => setSimQty(Math.max(0, Number(e.target.value) || 0))}
              className={`w-full text-xs font-mono font-bold border border-gray-200 dark:border-gray-700 rounded-xl px-2.5 py-2 text-center ${
                selectedSimProduct === "ALL"
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed"
                  : "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              }`}
            />
          </div>

          {/* Purchase Cost */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
              Cost Price (Rs.) {selectedSimProduct === "ALL" && "(Avg)"}
            </label>
            <input
              type="number"
              min="0"
              disabled={selectedSimProduct === "ALL"}
              value={simCostPrice}
              onChange={(e) => setSimCostPrice(Math.max(0, Number(e.target.value) || 0))}
              className={`w-full text-xs font-mono font-bold border border-gray-200 dark:border-gray-700 rounded-xl px-2.5 py-2 text-right ${
                selectedSimProduct === "ALL"
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed"
                  : "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              }`}
            />
          </div>

          {/* Selling Price */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
              Selling Rate (Rs.) {selectedSimProduct === "ALL" && "(Avg)"}
            </label>
            <input
              type="number"
              min="0"
              disabled={selectedSimProduct === "ALL"}
              value={simSellingPrice}
              onChange={(e) => setSimSellingPrice(Math.max(0, Number(e.target.value) || 0))}
              className={`w-full text-xs font-mono font-bold border border-gray-200 dark:border-gray-700 rounded-xl px-2.5 py-2 text-right ${
                selectedSimProduct === "ALL"
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed"
                  : "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              }`}
            />
          </div>
        </div>

        {/* Simulator Outputs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
            <span className="text-[10px] font-bold text-gray-400 uppercase block">Projected Revenue</span>
            <span className="text-base font-black font-mono text-gray-900 dark:text-gray-100">
              Rs. {simRevenue.toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
            <span className="text-[10px] font-bold text-gray-400 uppercase block">Projected Cost</span>
            <span className="text-base font-black font-mono text-gray-900 dark:text-gray-100">
              Rs. {simCost.toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase block">
              Projected Gross Profit
            </span>
            <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
              +Rs. {simGrossProfit.toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-brand-50/80 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800">
            <span className="text-[10px] font-bold text-brand-700 dark:text-brand-300 uppercase block">
              Projected Margin
            </span>
            <span className="text-base font-black font-mono text-brand-600 dark:text-brand-400">
              +{simMarginPct}%
            </span>
          </div>
        </div>
      </div>

      {/* Receivables vs Payables */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-theme-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 flex items-center justify-center">
                <Store className="size-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">
                  Khata Receivables from Retailers
                </span>
                <span className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">
                  Rs. {kpis.totalReceivables.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-theme-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 flex items-center justify-center">
                <Building2 className="size-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">
                  Total Supplier Payables (Vendors)
                </span>
                <span className="text-xl font-black font-mono text-rose-600 dark:text-rose-400">
                  Rs. {kpis.totalPayables.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid: Top Products and Booker Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <Package className="size-4 text-brand-500" />
              <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                Top Products by Revenue & Profit
              </h4>
            </div>
          </div>

          <div className="space-y-3">
            {topProducts.map((p, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50/70 dark:bg-gray-800/40"
              >
                <div>
                  <span className="font-semibold text-xs text-gray-900 dark:text-gray-100 block">
                    {p.name}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    SKU: {p.sku} • Units Sold: {p.quantity}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold font-mono text-gray-900 dark:text-gray-100 block">
                    Rs. {p.revenue.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    Profit: +Rs. {p.profit.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Booker Leaderboard */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <Award className="size-4 text-emerald-500" />
              <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                Order Booker Leaderboard & Commission
              </h4>
            </div>
          </div>

          <div className="space-y-3">
            {bookersLeaderboard.map((b, idx) => (
              <div
                key={b.id}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50/70 dark:bg-gray-800/40"
              >
                <div className="flex items-center gap-3">
                  <span className="size-6 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 flex items-center justify-center font-bold text-xs font-mono">
                    #{idx + 1}
                  </span>
                  <div>
                    <span className="font-semibold text-xs text-gray-900 dark:text-gray-100 block">
                      {b.name}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      Route: {b.territory} • {b.billsCount} Bills
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold font-mono text-gray-900 dark:text-gray-100 block">
                    Rs. {b.totalSales.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-semibold font-mono text-brand-600 dark:text-brand-400">
                    Comm: Rs. {b.estimatedCommission.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
