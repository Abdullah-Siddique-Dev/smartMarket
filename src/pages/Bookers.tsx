import React, { useState, useEffect } from "react";
import {
  Users,
  Plus,
  RotateCcw,
  MapPin,
  Phone,
  X,
  History,
} from "lucide-react";
import { OrderBooker, BookerReconciliation } from "../db/schema";
import {
  addBooker,
  reconcileBooker,
  getBookerReconciliations,
} from "../db/bookerService";
import { PageHeader } from "../components/ui/PageHeader";

interface BookersPageProps {
  bookers: OrderBooker[];
  onRefresh?: () => Promise<void>;
}

export const BookersPage: React.FC<BookersPageProps> = ({ bookers, onRefresh }) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isReconcileOpen, setIsReconcileOpen] = useState(false);
  const [selectedBooker, setSelectedBooker] = useState<OrderBooker | null>(null);
  const [reconciliations, setReconciliations] = useState<BookerReconciliation[]>([]);

  // Add Booker form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [territory, setTerritory] = useState("");
  const [commissionRate, setCommissionRate] = useState<number>(2.5);

  // Reconciliation form
  const [recTotalOrders, setRecTotalOrders] = useState<number>(10);
  const [recCollectedOrders, setRecCollectedOrders] = useState<number>(8);
  const [recPendingOrders, setRecPendingOrders] = useState<number>(2);
  const [recCashSubmitted, setRecCashSubmitted] = useState<number>(85000);
  const [recCreditIssued, setRecCreditIssued] = useState<number>(25000);
  const [recExpectedCash, setRecExpectedCash] = useState<number>(85000);

  useEffect(() => {
    getBookerReconciliations().then(setReconciliations);
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    try {
      await addBooker({
        name,
        phone,
        territory,
        commissionRate,
      });
      setIsAddOpen(false);
      setName("");
      setPhone("");
      setTerritory("");
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to add booker:", err);
    }
  };

  const handleReconcileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooker) return;

    const shortage = Math.max(0, recExpectedCash - recCashSubmitted);

    try {
      await reconcileBooker({
        orderBookerId: selectedBooker.id,
        ordersCountTotal: Number(recTotalOrders),
        ordersCountCollected: Number(recCollectedOrders),
        ordersCountPending: Number(recPendingOrders),
        totalCashSubmitted: Number(recCashSubmitted),
        totalCreditIssued: Number(recCreditIssued),
        shortageAmount: shortage,
      });

      setIsReconcileOpen(false);
      const updated = await getBookerReconciliations();
      setReconciliations(updated);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to reconcile:", err);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Order Bookers & Field Representatives"
        description="Manage sales representatives, track field routes & perform daily end-of-day cash reconciliation"
      >
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl shadow-theme-xs transition-colors cursor-pointer"
        >
          <Plus className="size-4" /> Add Order Booker
        </button>
      </PageHeader>

      {/* Bookers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bookers.map((b) => (
          <div
            key={b.id}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-theme-xs space-y-4 hover:border-brand-500/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                  {b.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">{b.name}</h4>
                  <div className="flex items-center gap-1 text-[11px] text-gray-400">
                    <MapPin className="size-3" />
                    <span>{b.territory || "General Market"}</span>
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-400 text-[10px] font-extrabold font-mono">
                {b.commissionRate}% COMM
              </span>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded-xl flex justify-between items-center text-xs">
              <span className="text-gray-400 flex items-center gap-1">
                <Phone className="size-3.5" /> Mobile
              </span>
              <span className="font-mono font-semibold text-gray-700 dark:text-gray-200">
                {b.phone}
              </span>
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedBooker(b);
                  setIsReconcileOpen(true);
                }}
                className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <RotateCcw className="size-3.5" /> Daily Cash Reconciliation
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Field Reconciliations Audit */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-xs p-5 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
          <History className="size-4 text-brand-500" />
          <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
            Recent Daily Field Reconciliations
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-[10px] font-bold text-gray-400 uppercase">
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Booker ID</th>
                <th className="py-2 px-3 text-center">Orders (Total / Done / Pend)</th>
                <th className="py-2 px-3 text-right">Cash Handed Over</th>
                <th className="py-2 px-3 text-right">Credit Issued</th>
                <th className="py-2 px-3 text-right">Shortage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {reconciliations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-400">
                    No field reconciliations entered yet.
                  </td>
                </tr>
              ) : (
                reconciliations.map((r) => {
                  const bName = bookers.find((b) => b.id === r.orderBookerId)?.name || `Booker #${r.orderBookerId}`;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                      <td className="py-2.5 px-3 font-mono text-gray-500">{r.reconciliationDate}</td>
                      <td className="py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">
                        {bName}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {r.ordersCountTotal} / {r.ordersCountCollected} / {r.ordersCountPending}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                        Rs. {r.totalCashSubmitted.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-gray-500">
                        Rs. {r.totalCreditIssued.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {r.shortageAmount > 0 ? (
                          <span className="text-rose-600 font-bold">
                            -Rs. {r.shortageAmount.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-semibold">Cleared (Rs. 0)</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Booker Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-md w-full p-6 shadow-theme-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Users className="size-5 text-brand-600" />
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Register Order Booker
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tariq Mehmood"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs font-semibold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Phone / Mobile *
                </label>
                <input
                  type="text"
                  required
                  placeholder="0301-4455667"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs font-mono bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Route / Territory
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. North Zone"
                    value={territory}
                    onChange={(e) => setTerritory(e.target.value)}
                    className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Commission (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(Number(e.target.value) || 0)}
                    className="w-full text-xs font-mono font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-right"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-theme-xs cursor-pointer"
                >
                  Save Representative
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Daily Reconciliation Modal */}
      {isReconcileOpen && selectedBooker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-md w-full p-6 shadow-theme-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <RotateCcw className="size-5 text-emerald-600" />
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Daily Field Cash Reconciliation
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsReconcileOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded-2xl text-xs space-y-1">
              <span className="text-gray-400">Representative</span>
              <span className="font-bold text-sm text-gray-900 dark:text-gray-100 block">
                {selectedBooker.name} ({selectedBooker.territory})
              </span>
            </div>

            <form onSubmit={handleReconcileSubmit} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">
                    Total Orders
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={recTotalOrders}
                    onChange={(e) => setRecTotalOrders(Number(e.target.value) || 0)}
                    className="w-full text-xs font-mono font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2 text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">
                    Collected
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={recCollectedOrders}
                    onChange={(e) => setRecCollectedOrders(Number(e.target.value) || 0)}
                    className="w-full text-xs font-mono font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2 text-center text-emerald-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">
                    Pending
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={recPendingOrders}
                    onChange={(e) => setRecPendingOrders(Number(e.target.value) || 0)}
                    className="w-full text-xs font-mono font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2 text-center text-amber-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Expected Cash from Deliveries (Rs.)
                </label>
                <input
                  type="number"
                  value={recExpectedCash}
                  onChange={(e) => setRecExpectedCash(Number(e.target.value) || 0)}
                  className="w-full text-xs font-mono font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-right"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Actual Cash Submitted to Counter (Rs.) *
                </label>
                <input
                  type="number"
                  required
                  value={recCashSubmitted}
                  onChange={(e) => setRecCashSubmitted(Number(e.target.value) || 0)}
                  className="w-full text-sm font-black font-mono bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-right text-emerald-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Credit Invoices Handed (Rs.)
                </label>
                <input
                  type="number"
                  value={recCreditIssued}
                  onChange={(e) => setRecCreditIssued(Number(e.target.value) || 0)}
                  className="w-full text-xs font-mono font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-right text-gray-500"
                />
              </div>

              {recExpectedCash > recCashSubmitted && (
                <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 rounded-xl flex justify-between items-center text-xs">
                  <span className="font-bold text-rose-700 dark:text-rose-400">
                    Calculated Shortage:
                  </span>
                  <span className="font-black font-mono text-rose-600 text-sm">
                    Rs. {(recExpectedCash - recCashSubmitted).toLocaleString()}
                  </span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReconcileOpen(false)}
                  className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-theme-xs cursor-pointer"
                >
                  Save Daily Reconciliation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
