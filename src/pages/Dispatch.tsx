import React, { useState, useEffect } from "react";
import {
  Truck,
  Plus,
  Printer,
  CheckCircle,
  RotateCcw,
  X,
} from "lucide-react";
import { DispatchSlip, Product, OrderBooker } from "../db/schema";
import {
  getDispatchSlips,
  getDispatchSlipById,
  createDispatchSlip,
  reconcileDispatchSlip,
} from "../db/dispatchService";
import { PageHeader } from "../components/ui/PageHeader";

interface DispatchPageProps {
  products: Product[];
  bookers: OrderBooker[];
  onRefresh?: () => Promise<void>;
}

export const DispatchPage: React.FC<DispatchPageProps> = ({
  products,
  bookers,
  onRefresh,
}) => {
  const [slips, setSlips] = useState<DispatchSlip[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [bookerId, setBookerId] = useState<number>(bookers[0]?.id || 1);
  const [notes, setNotes] = useState("");
  const [dispatchItems, setDispatchItems] = useState<
    Array<{ productId: number; dispatchedQty: number }>
  >([{ productId: products[0]?.id || 1, dispatchedQty: 10 }]);

  // Detail / Reconciliation Modal
  const [selectedSlip, setSelectedSlip] = useState<DispatchSlip | null>(null);
  const [returnDrafts, setReturnDrafts] = useState<Record<number, { returned: number; billed: number }>>({});
  const [isReconciling, setIsReconciling] = useState(false);

  const fetchSlips = async () => {
    setIsLoading(true);
    try {
      const data = await getDispatchSlips();
      setSlips(data);
    } catch (err) {
      console.error("Failed to load dispatch slips:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSlips();
  }, []);

  const handleOpenDetail = async (slipId: number) => {
    const full = await getDispatchSlipById(slipId);
    if (full) {
      setSelectedSlip(full);
      const drafts: Record<number, { returned: number; billed: number }> = {};
      full.items?.forEach((it) => {
        drafts[it.productId] = {
          returned: it.returnedQty,
          billed: it.billedQty || Math.max(0, it.dispatchedQty - it.returnedQty),
        };
      });
      setReturnDrafts(drafts);
    }
  };

  const handleAddItem = () => {
    if (products.length === 0) return;
    setDispatchItems((prev) => [
      ...prev,
      { productId: products[0].id, dispatchedQty: 5 },
    ]);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dispatchItems.length === 0) return;

    try {
      await createDispatchSlip({ orderBookerId: Number(bookerId), notes }, dispatchItems);
      setIsCreateOpen(false);
      setNotes("");
      fetchSlips();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to create dispatch slip:", err);
    }
  };

  const handleReconcileSubmit = async () => {
    if (!selectedSlip) return;
    setIsReconciling(true);

    try {
      const payload = Object.entries(returnDrafts).map(([prodId, vals]) => ({
        productId: Number(prodId),
        returnedQty: Number(vals.returned) || 0,
        billedQty: Number(vals.billed) || 0,
      }));

      await reconcileDispatchSlip(selectedSlip.id, payload);
      setSelectedSlip(null);
      fetchSlips();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to reconcile slip:", err);
    } finally {
      setIsReconciling(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dispatch Slips & Gate Passes"
        description="Issue inventory to delivery bookers and reconcile daily field returns"
      >
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl shadow-theme-xs transition-colors cursor-pointer"
        >
          <Plus className="size-4" /> Issue Gate Pass
        </button>
      </PageHeader>

      {/* Slips List */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                <th className="py-3 px-4">Slip # (Gate Pass)</th>
                <th className="py-3 px-4">Assigned Booker</th>
                <th className="py-3 px-4">Dispatch Date</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent mx-auto mb-2" />
                    <span>Loading dispatch slips...</span>
                  </td>
                </tr>
              ) : slips.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <Truck className="size-10 stroke-[1.2] mx-auto mb-2 text-gray-300 dark:text-gray-700" />
                    No dispatch slips issued yet.
                  </td>
                </tr>
              ) : (
                slips.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-brand-600 dark:text-brand-400">
                      {s.slipNumber}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">
                      {s.booker_name}
                    </td>
                    <td className="py-3 px-4 text-gray-500 font-mono">{s.dispatchDate}</td>
                    <td className="py-3 px-4 text-center">
                      {s.status === "DISPATCHED" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400">
                          <Truck className="size-3" /> IN FIELD
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                          <CheckCircle className="size-3" /> RECONCILED
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-400 truncate max-w-xs">{s.notes || "—"}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(s.id)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                      >
                        Inspect / Reconcile
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue Gate Pass Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-lg w-full p-6 shadow-theme-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Truck className="size-5 text-brand-600" />
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Issue Dispatch Gate Pass
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Assign to Order Booker / Rep *
                </label>
                <select
                  value={bookerId}
                  onChange={(e) => setBookerId(Number(e.target.value))}
                  className="w-full text-xs font-semibold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                >
                  {bookers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.territory})
                    </option>
                  ))}
                </select>
              </div>

              {/* Items */}
              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Dispatched Stock Units
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="size-3.5" /> Add Product
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                  {dispatchItems.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={it.productId}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setDispatchItems((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, productId: val } : item))
                          );
                        }}
                        className="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.unit}) - Stock: {p.currentStock}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={it.dispatchedQty}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setDispatchItems((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, dispatchedQty: Math.max(1, val) } : item
                            )
                          );
                        }}
                        className="w-20 text-center text-xs font-mono font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-1.5"
                      />
                      {dispatchItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setDispatchItems((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="text-gray-400 hover:text-rose-500"
                        >
                          <X className="size-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Delivery Notes / Vehicle No
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Suzuki Carry # LEB-4091, Sector G-9 route"
                  className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-theme-xs cursor-pointer"
                >
                  Issue & Deduct Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect / Reconcile Modal */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-lg w-full p-6 shadow-theme-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Gate Pass: {selectedSlip.slipNumber}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Booker: {selectedSlip.booker_name} • Date: {selectedSlip.dispatchDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSlip(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                Dispatched Items & Daily Field Return:
              </span>

              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-[10px] font-bold text-gray-400 uppercase border-b border-gray-100 dark:border-gray-800">
                    <th className="py-1">Product</th>
                    <th className="py-1 text-center">Dispatched</th>
                    <th className="py-1 text-center">Returned Qty</th>
                    <th className="py-1 text-center">Billed Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {selectedSlip.items?.map((it) => (
                    <tr key={it.productId}>
                      <td className="py-2.5 font-medium">{it.product_name}</td>
                      <td className="py-2.5 text-center font-mono font-bold">
                        {it.dispatchedQty}
                      </td>
                      <td className="py-2.5 text-center">
                        <input
                          type="number"
                          min="0"
                          max={it.dispatchedQty}
                          disabled={selectedSlip.status === "RECONCILED"}
                          value={returnDrafts[it.productId]?.returned ?? it.returnedQty}
                          onChange={(e) => {
                            const ret = Math.min(it.dispatchedQty, Number(e.target.value) || 0);
                            setReturnDrafts((prev) => ({
                              ...prev,
                              [it.productId]: {
                                returned: ret,
                                billed: it.dispatchedQty - ret,
                              },
                            }));
                          }}
                          className="w-16 text-center py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-mono font-bold"
                        />
                      </td>
                      <td className="py-2.5 text-center font-mono font-bold text-emerald-600">
                        {returnDrafts[it.productId]?.billed ?? it.billedQty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => window.print()}
                className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5"
              >
                <Printer className="size-4" /> Print Slip
              </button>
              {selectedSlip.status === "DISPATCHED" && (
                <button
                  type="button"
                  disabled={isReconciling}
                  onClick={handleReconcileSubmit}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-theme-xs flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="size-4" /> Save Field Reconciliation
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
