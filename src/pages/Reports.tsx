import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  DollarSign,
  Package,
  Award,
  ArrowDownRight,
  Store,
  Building2,
} from "lucide-react";
import { getProfitKPIs, getTopProducts, getBookerLeaderboard, ProfitKPIs } from "../db/reportService";
import { PageHeader } from "../components/ui/PageHeader";

export const ReportsPage: React.FC = () => {
  const [kpis, setKpis] = useState<ProfitKPIs | null>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [bookersLeaderboard, setBookersLeaderboard] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profit Analytics & Performance Dashboard"
        description="Real-time wholesale profitability, gross margins, expense deductions and sales rep performance"
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

          {/* Gross Margin */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-theme-xs space-y-2">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-[10px] uppercase font-bold tracking-wider">Gross Profit</span>
              <TrendingUp className="size-4 text-emerald-500" />
            </div>
            <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 block">
              Rs. {kpis.grossProfit.toLocaleString()}
            </span>
            <div className="text-[11px] text-gray-500 flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
              <span>Procurement Cost</span>
              <span className="font-bold font-mono">Rs. {kpis.totalCost.toLocaleString()}</span>
            </div>
          </div>

          {/* Operational Overheads */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-theme-xs space-y-2">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-[10px] uppercase font-bold tracking-wider">Expenses & Discounts</span>
              <ArrowDownRight className="size-4 text-rose-500" />
            </div>
            <span className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400 block">
              Rs. {(kpis.totalExpenses + kpis.totalDiscounts).toLocaleString()}
            </span>
            <div className="text-[11px] text-gray-500 flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
              <span>Operating Expenses</span>
              <span className="font-bold font-mono">Rs. {kpis.totalExpenses.toLocaleString()}</span>
            </div>
          </div>

          {/* Net Profit */}
          <div className="bg-gradient-to-br from-brand-600 to-blue-700 text-white p-5 rounded-2xl shadow-md shadow-brand-500/20 space-y-2">
            <div className="flex items-center justify-between text-blue-100">
              <span className="text-[10px] uppercase font-bold tracking-wider">Net Clean Profit</span>
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
