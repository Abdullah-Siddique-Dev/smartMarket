import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Truck,
  RotateCcw,
  X,
} from "lucide-react";
import { InventoryLedgerEntry, Product } from "../db/schema";
import { getInventoryLedger } from "../db/auditService";
import { PageHeader } from "../components/ui/PageHeader";

interface AuditPageProps {
  products: Product[];
}

export const AuditPage: React.FC<AuditPageProps> = ({ products }) => {
  const [entries, setEntries] = useState<InventoryLedgerEntry[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | "">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    getInventoryLedger(selectedProductId ? Number(selectedProductId) : undefined)
      .then(setEntries)
      .finally(() => setIsLoading(false));
  }, [selectedProductId]);

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter(
      (e) =>
        e.product_name?.toLowerCase().includes(q) ||
        e.sku?.toLowerCase().includes(q) ||
        e.notes?.toLowerCase().includes(q) ||
        e.transactionType.toLowerCase().includes(q)
    );
  }, [entries, searchQuery]);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "IMPORT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
            <ArrowDownLeft className="size-3" /> IMPORT
          </span>
        );
      case "SALE_BILL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
            <ArrowUpRight className="size-3" /> SALE BILL
          </span>
        );
      case "BOOKER_DISPATCH":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400">
            <Truck className="size-3" /> DISPATCH
          </span>
        );
      case "BOOKER_RETURN":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
            <RotateCcw className="size-3" /> RETURN
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Immutable Inventory Audit Ledger"
        description="Comprehensive anti-corruption audit log of every warehouse stock movement and balance change"
      />

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-xs">
        <div className="flex items-center gap-2">
          <select
            value={selectedProductId}
            onChange={(e) =>
              setSelectedProductId(e.target.value ? Number(e.target.value) : "")
            }
            className="text-xs font-semibold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5"
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search notes or reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              title="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">SKU Code</th>
                <th className="py-3 px-4 text-center">Operation</th>
                <th className="py-3 px-4 text-center">Quantity Change</th>
                <th className="py-3 px-4 text-center">Balance After</th>
                <th className="py-3 px-4">Audit Notes / Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-400">
                    <div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent mx-auto mb-2" />
                    <span>Loading audit records...</span>
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-400">
                    <ShieldCheck className="size-10 stroke-[1.2] mx-auto mb-2 text-gray-300 dark:text-gray-700" />
                    No audit log entries recorded yet.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                    <td className="py-3 px-4 font-mono text-gray-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">
                      {log.product_name}
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-400">{log.sku}</td>
                    <td className="py-3 px-4 text-center">{getTypeBadge(log.transactionType)}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold">
                      <span
                        className={
                          log.changeQty > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }
                      >
                        {log.changeQty > 0 ? `+${log.changeQty}` : log.changeQty} {log.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-gray-800 dark:text-gray-200">
                      {log.balanceAfter} {log.unit}
                    </td>
                    <td className="py-3 px-4 text-gray-500 max-w-xs truncate">
                      {log.notes || log.referenceType}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
