import React, { useState, useMemo } from "react";
import {
  Building2,
  Plus,
  Search,
  X,
  CreditCard,
  Pencil,
  Trash2,
} from "lucide-react";
import { Vendor } from "../db/schema";
import { addVendor, updateVendor, deleteVendor, recordVendorPayment } from "../db/vendorService";
import { PageHeader } from "../components/ui/PageHeader";

interface VendorsPageProps {
  vendors: Vendor[];
  onRefresh?: () => Promise<void>;
}

export const VendorsPage: React.FC<VendorsPageProps> = ({ vendors, onRefresh }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  // Add form
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  // Edit form
  const [editName, setEditName] = useState("");
  const [editContactPerson, setEditContactPerson] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Payment form
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const filteredVendors = useMemo(() => {
    if (!searchQuery.trim()) return vendors;
    const q = searchQuery.toLowerCase();
    return vendors.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        (v.contactPerson && v.contactPerson.toLowerCase().includes(q)) ||
        (v.city && v.city.toLowerCase().includes(q))
    );
  }, [vendors, searchQuery]);

  const totalPayables = useMemo(
    () => vendors.reduce((sum, v) => sum + (v.totalPurchases - v.totalPaid), 0),
    [vendors]
  );

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await addVendor({
        name,
        contactPerson,
        phone,
        email,
        city,
        address,
        notes,
        isActive: 1,
        createdBy: 1,
      });

      setIsAddOpen(false);
      setName("");
      setContactPerson("");
      setPhone("");
      setEmail("");
      setCity("");
      setAddress("");
      setNotes("");
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to add vendor:", err);
    }
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor || paymentAmount <= 0) return;

    try {
      await recordVendorPayment({
        vendorId: selectedVendor.id,
        amount: paymentAmount,
        paymentMethod,
        reference: paymentRef,
        notes: paymentNotes,
      });

      setIsPayOpen(false);
      setPaymentAmount(0);
      setPaymentRef("");
      setPaymentNotes("");
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to pay vendor:", err);
    }
  };

  const handleOpenEdit = (v: Vendor) => {
    setEditingVendor(v);
    setEditName(v.name);
    setEditContactPerson(v.contactPerson || "");
    setEditPhone(v.phone || "");
    setEditEmail(v.email || "");
    setEditCity(v.city || "");
    setEditAddress(v.address || "");
    setEditNotes(v.notes || "");
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVendor || !editName.trim()) return;

    try {
      await updateVendor(editingVendor.id, {
        name: editName.trim(),
        contactPerson: editContactPerson.trim() || null,
        phone: editPhone.trim() || null,
        email: editEmail.trim() || null,
        city: editCity.trim() || null,
        address: editAddress.trim() || null,
        notes: editNotes.trim() || null,
      });

      setIsEditOpen(false);
      setEditingVendor(null);
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error("Failed to update vendor:", err);
      alert("Failed to update supplier details.");
    }
  };

  const handleDeleteVendor = async (v: Vendor) => {
    const bal = v.totalPurchases - v.totalPaid;
    const confirmMsg =
      bal > 0
        ? `Warning: Supplier "${v.name}" has an outstanding payable balance of Rs. ${bal.toLocaleString()}.\n\nAre you sure you want to delete this supplier?`
        : `Are you sure you want to delete supplier "${v.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteVendor(v.id);
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error("Failed to delete supplier:", err);
      alert("Failed to delete supplier. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wholesale Suppliers & Vendors"
        description="Maintain procurement vendors, track inward purchasing history and payables"
      >
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl shadow-theme-xs transition-colors cursor-pointer"
        >
          <Plus className="size-4" /> Add New Supplier
        </button>
      </PageHeader>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-2xl shadow-theme-xs">
          <span className="text-[10px] uppercase font-bold text-gray-400">Total Suppliers</span>
          <span className="text-2xl font-black font-mono text-gray-900 dark:text-gray-100 block mt-1">
            {vendors.length}
          </span>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-2xl shadow-theme-xs">
          <span className="text-[10px] uppercase font-bold text-gray-400">Total Supplier Payables</span>
          <span className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400 block mt-1">
            Rs. {totalPayables.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-2xl shadow-theme-xs">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search vendor or city..."
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
      </div>

      {/* Vendors Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                <th className="py-3 px-4">Vendor Company</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Phone / City</th>
                <th className="py-3 px-4 text-right">Total Purchases</th>
                <th className="py-3 px-4 text-right">Total Paid</th>
                <th className="py-3 px-4 text-right">Payable Balance</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <Building2 className="size-10 stroke-[1.2] mx-auto mb-2 text-gray-300 dark:text-gray-700" />
                    No suppliers found matching the query.
                  </td>
                </tr>
              ) : (
                filteredVendors.map((v) => {
                  const bal = v.totalPurchases - v.totalPaid;
                  return (
                    <tr key={v.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                      <td className="py-3 px-4 font-bold text-gray-900 dark:text-gray-100">
                        {v.name}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                        {v.contactPerson || "—"}
                      </td>
                      <td className="py-3 px-4 text-gray-500 font-mono">
                        {v.phone || "—"} {v.city ? `(${v.city})` : ""}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">
                        Rs. {v.totalPurchases.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-600 font-semibold">
                        Rs. {v.totalPaid.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span className={bal > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600"}>
                          Rs. {bal.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedVendor(v);
                              setPaymentAmount(Math.max(0, bal));
                              setIsPayOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 transition-colors cursor-pointer"
                          >
                            Record Payment
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(v)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer flex items-center gap-1"
                            title="Edit Supplier"
                          >
                            <Pencil className="size-3" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteVendor(v)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 transition-colors cursor-pointer flex items-center gap-1"
                            title="Delete Supplier"
                          >
                            <Trash2 className="size-3" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Vendor Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-md w-full p-6 shadow-theme-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Building2 className="size-5 text-brand-600" />
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Register Supplier / Vendor
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
                  Vendor / Company Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Premier Food Distributors"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs font-semibold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shahid Rafique"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lahore / Rawalpindi"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Phone / Office
                  </label>
                  <input
                    type="text"
                    placeholder="042-35889900"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs font-mono bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="orders@supplier.pk"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs font-mono bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Warehouse / Depot Address
                </label>
                <input
                  type="text"
                  placeholder="Plot 42, Quaid-e-Azam Industrial Estate"
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
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Vendor Payment Modal */}
      {isPayOpen && selectedVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-sm w-full p-6 shadow-theme-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <CreditCard className="size-5 text-emerald-600" />
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Record Vendor Payment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPayOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 p-3.5 rounded-2xl text-xs space-y-1">
              <span className="text-gray-400 font-medium">Paying Supplier</span>
              <span className="font-bold text-sm text-gray-900 dark:text-gray-100 block">
                {selectedVendor.name}
              </span>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-500">Payable Balance:</span>
                <span className="font-bold font-mono text-rose-600">
                  Rs. {(selectedVendor.totalPurchases - selectedVendor.totalPaid).toLocaleString()}
                </span>
              </div>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Amount Paid (Rs.) *
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
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full text-xs font-semibold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                >
                  <option value="CASH">Cash in Hand</option>
                  <option value="BANK">Bank Transfer / IBFT</option>
                  <option value="CHEQUE">Bank Cheque</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Cheque / Transfer Reference
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="e.g. Cheque # 904128, HBL"
                  className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPayOpen(false)}
                  className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-theme-xs cursor-pointer"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {isEditOpen && editingVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-md w-full p-6 shadow-theme-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Building2 className="size-5 text-brand-600" />
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Edit Wholesale Supplier
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditOpen(false);
                  setEditingVendor(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Supplier / Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Premier Food Distributors"
                  className="w-full text-xs font-semibold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={editContactPerson}
                    onChange={(e) => setEditContactPerson(e.target.value)}
                    placeholder="e.g. Shahid Rafique"
                    className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Phone / Mobile
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="0300-1234567"
                    className="w-full text-xs font-mono bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    City / Hub
                  </label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    placeholder="Lahore"
                    className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="sales@vendor.com"
                    className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Warehouse / Depot Address
                </label>
                <input
                  type="text"
                  placeholder="Plot 42, Quaid-e-Azam Industrial Estate"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="Terms, delivery days, etc."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditOpen(false);
                    setEditingVendor(null);
                  }}
                  className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-theme-xs cursor-pointer"
                >
                  Update Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
