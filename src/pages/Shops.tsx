import React, { useState, useMemo } from "react";
import {
  Store,
  Plus,
  Search,
  DollarSign,
  X,
} from "lucide-react";
import { RetailShop } from "../db/schema";
import { addShop, recordShopPayment, getShopLedger } from "../db/shopService";
import { PageHeader } from "../components/ui/PageHeader";

interface ShopsPageProps {
  shops: RetailShop[];
  onRefresh?: () => Promise<void>;
}

export const ShopsPage: React.FC<ShopsPageProps> = ({ shops, onRefresh }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedShop, setSelectedShop] = useState<RetailShop | null>(null);

  // New Shop form
  const [shopName, setShopName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [creditLimit, setCreditLimit] = useState<number>(50000);

  // Payment form
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentNotes, setPaymentNotes] = useState("");

  // Ledger modal
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);

  const filteredShops = useMemo(() => {
    if (!searchQuery.trim()) return shops;
    const q = searchQuery.toLowerCase();
    return shops.filter(
      (s) =>
        s.shopName.toLowerCase().includes(q) ||
        (s.ownerName && s.ownerName.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q))
    );
  }, [shops, searchQuery]);

  const totalOutstanding = useMemo(
    () => shops.reduce((sum, s) => sum + s.outstandingBalance, 0),
    [shops]
  );

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) return;

    try {
      await addShop({
        shopName,
        ownerName,
        phone,
        address,
        creditLimit,
      });
      setIsAddOpen(false);
      setShopName("");
      setOwnerName("");
      setPhone("");
      setAddress("");
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to add shop:", err);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShop || paymentAmount <= 0) return;

    try {
      await recordShopPayment({
        shopId: selectedShop.id,
        amount: paymentAmount,
        paymentMethod,
        notes: paymentNotes,
      });
      setIsPaymentOpen(false);
      setPaymentAmount(0);
      setPaymentNotes("");
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to record payment:", err);
    }
  };

  const openLedger = async (shop: RetailShop) => {
    setSelectedShop(shop);
    const data = await getShopLedger(shop.id);
    setLedgerEntries(data || []);
    setIsLedgerOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wholesale Retail Shops & Khata"
        description="Manage wholesale customer accounts, track credit limits & settle balance payments"
      >
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl shadow-theme-xs transition-colors cursor-pointer"
        >
          <Plus className="size-4" /> Add Retail Shop
        </button>
      </PageHeader>

      {/* Summary metric card & search */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-2xl shadow-theme-xs">
          <span className="text-[10px] uppercase font-bold text-gray-400">Total Registered Shops</span>
          <span className="text-2xl font-black font-mono text-gray-900 dark:text-gray-100 block mt-1">
            {shops.length}
          </span>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-2xl shadow-theme-xs">
          <span className="text-[10px] uppercase font-bold text-gray-400">Total Khata Receivables</span>
          <span className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 block mt-1">
            Rs. {totalOutstanding.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-2xl shadow-theme-xs">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search shop or owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Shops Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                <th className="py-3 px-4">Shop Name</th>
                <th className="py-3 px-4">Owner Name</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Address</th>
                <th className="py-3 px-4 text-right">Credit Limit</th>
                <th className="py-3 px-4 text-right">Khata Balance</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {filteredShops.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <Store className="size-10 stroke-[1.2] mx-auto mb-2 text-gray-300 dark:text-gray-700" />
                    No retail shops found.
                  </td>
                </tr>
              ) : (
                filteredShops.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                    <td className="py-3 px-4 font-bold text-gray-900 dark:text-gray-100">
                      {s.shopName}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                      {s.ownerName || "—"}
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-500">{s.phone || "—"}</td>
                    <td className="py-3 px-4 text-gray-400 truncate max-w-xs">{s.address || "—"}</td>
                    <td className="py-3 px-4 text-right font-mono text-gray-500">
                      Rs. {s.creditLimit.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      <span
                        className={
                          s.outstandingBalance > 0
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }
                      >
                        Rs. {s.outstandingBalance.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedShop(s);
                            setPaymentAmount(Math.min(s.outstandingBalance, s.outstandingBalance));
                            setIsPaymentOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 transition-colors"
                        >
                          Collect Cash
                        </button>
                        <button
                          type="button"
                          onClick={() => openLedger(s)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                        >
                          Ledger
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Shop Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-md w-full p-6 shadow-theme-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Store className="size-5 text-brand-600" />
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Register Retail Customer / Shop
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
                  Shop Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Al-Madina Superstore"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full text-xs font-semibold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Owner / Proprietor Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Haji Abdul Rasheed"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Phone / Mobile
                  </label>
                  <input
                    type="text"
                    placeholder="0300-1234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs font-mono bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Credit Limit (Rs.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(Number(e.target.value) || 0)}
                    className="w-full text-xs font-mono font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-right"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Shop Address / Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Market, Sector G-9, Islamabad"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                />
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
                  Save Shop
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collect Cash Modal */}
      {isPaymentOpen && selectedShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-sm w-full p-6 shadow-theme-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <DollarSign className="size-5 text-emerald-600" />
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Collect Khata Payment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 p-3.5 rounded-2xl text-xs space-y-1">
              <span className="text-gray-400 font-medium block">Customer</span>
              <span className="font-bold text-sm text-gray-900 dark:text-gray-100 block">
                {selectedShop.shopName}
              </span>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-500">Current Balance:</span>
                <span className="font-bold font-mono text-amber-600">
                  Rs. {selectedShop.outstandingBalance.toLocaleString()}
                </span>
              </div>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Amount Received (Rs.) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={paymentAmount || ""}
                  onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
                  className="w-full text-base font-black font-mono bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-right text-emerald-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Payment Mode
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full text-xs font-semibold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                >
                  <option value="CASH">Cash in Hand</option>
                  <option value="BANK">Bank Transfer / Online</option>
                  <option value="CHEQUE">Cheque Clearance</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Notes / Voucher No
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Received via Booker Tariq"
                  className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentOpen(false)}
                  className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-theme-xs cursor-pointer"
                >
                  Confirm Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ledger Statement Modal */}
      {isLedgerOpen && selectedShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-2xl w-full p-6 shadow-theme-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Khata Statement: {selectedShop.shopName}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Current Balance: Rs. {selectedShop.outstandingBalance.toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLedgerOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 text-[10px] font-bold text-gray-400 uppercase">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Reference</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-right">Debit (Sales)</th>
                    <th className="py-2.5 px-3 text-right">Credit (Paid)</th>
                    <th className="py-2.5 px-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {ledgerEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">
                        No transactions recorded for this shop yet.
                      </td>
                    </tr>
                  ) : (
                    ledgerEntries.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                        <td className="py-2 px-3 font-mono text-gray-500">
                          {new Date(row.date).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-3 font-mono font-semibold text-brand-600 dark:text-brand-400">
                          {row.ref}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.type === "INVOICE"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                            }`}
                          >
                            {row.type}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold">
                          {Number(row.debit) > 0 ? `Rs. ${Number(row.debit).toLocaleString()}` : "—"}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-600">
                          {Number(row.credit) > 0 ? `Rs. ${Number(row.credit).toLocaleString()}` : "—"}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          Rs. {Number(row.runningBalance).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
