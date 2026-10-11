import React, { useState, useMemo } from "react";
import {
  Boxes,
  Plus,
  Search,
  ArrowDownLeft,
  AlertTriangle,
  X,
} from "lucide-react";
import { Product, Vendor, PRODUCT_UNITS, ProductUnit } from "../db/schema";
import { addProduct, importStock } from "../db/productService";
import { PageHeader } from "../components/ui/PageHeader";

interface InventoryPageProps {
  products: Product[];
  vendors: Vendor[];
  isLoading?: boolean;
  onRefresh?: () => Promise<void>;
}

export const InventoryPage: React.FC<InventoryPageProps> = ({
  products,
  vendors,
  isLoading,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);

  // Add Product Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<ProductUnit>("CARTON");
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [initialStock, setInitialStock] = useState<number>(0);
  const [minAlert, setMinAlert] = useState<number>(10);

  // Inward Stock Receiving Modal
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importProductId, setImportProductId] = useState<number>(products[0]?.id || 1);
  const [importVendorId, setImportVendorId] = useState<number | "">("");
  const [importQty, setImportQty] = useState<number>(10);
  const [importCost, setImportCost] = useState<number>(0);
  const [supplierInfo, setSupplierInfo] = useState("");

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLow = filterLowStockOnly ? p.currentStock <= p.minStockAlert : true;
      return matchesSearch && matchesLow;
    });
  }, [products, searchQuery, filterLowStockOnly]);

  const lowStockCount = useMemo(
    () => products.filter((p) => p.currentStock <= p.minStockAlert).length,
    [products]
  );

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim()) return;

    try {
      await addProduct({
        sku,
        name,
        unit,
        purchasePrice,
        sellingPrice,
        currentStock: initialStock,
        minStockAlert: minAlert,
        isActive: 1,
      });

      setIsAddOpen(false);
      setSku("");
      setName("");
      setPurchasePrice(0);
      setSellingPrice(0);
      setInitialStock(0);

      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to add product:", err);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (importQty <= 0) return;

    try {
      await importStock({
        productId: Number(importProductId),
        quantity: Number(importQty),
        unitCost: Number(importCost),
        vendorId: importVendorId ? Number(importVendorId) : undefined,
        supplierInfo,
      });

      setIsImportOpen(false);
      setSupplierInfo("");
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to import stock:", err);
    }
  };

  const openImportForProduct = (prod: Product) => {
    setImportProductId(prod.id);
    setImportCost(prod.purchasePrice);
    setIsImportOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wholesale Inventory Master"
        description="Catalog products, maintain unit specifications, track warehouse stock & receive inwards"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (products.length > 0) {
                setImportProductId(products[0].id);
                setImportCost(products[0].purchasePrice);
              }
              setIsImportOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-theme-xs transition-colors cursor-pointer"
          >
            <ArrowDownLeft className="size-4" /> Inward Stock Receiving
          </button>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl shadow-theme-xs transition-colors cursor-pointer"
          >
            <Plus className="size-4" /> Add New Product
          </button>
        </div>
      </PageHeader>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all ${
              filterLowStockOnly
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            <AlertTriangle className="size-3.5" />
            <span>Low Stock Alerts ({lowStockCount})</span>
          </button>
        </div>

        <div className="relative min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by SKU or Product name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                <th className="py-3 px-4">SKU Code</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Unit</th>
                <th className="py-3 px-4 text-right">Purchase Cost</th>
                <th className="py-3 px-4 text-right">Selling Rate</th>
                <th className="py-3 px-4 text-right">Margin</th>
                <th className="py-3 px-4 text-center">Warehouse Stock</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent mx-auto mb-2" />
                    <span>Loading wholesale product catalog...</span>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <Boxes className="size-10 stroke-[1.2] mx-auto mb-2 text-gray-300 dark:text-gray-700" />
                    No products found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const marginAmt = p.sellingPrice - p.purchasePrice;
                  const marginPct =
                    p.sellingPrice > 0 ? Math.round((marginAmt / p.sellingPrice) * 100) : 0;
                  const isLow = p.currentStock <= p.minStockAlert;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-brand-600 dark:text-brand-400">
                        {p.sku}
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">
                        {p.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-gray-600 dark:text-gray-300">
                          {p.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-gray-500">
                        Rs. {p.purchasePrice.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-gray-900 dark:text-gray-100">
                        Rs. {p.sellingPrice.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-600 font-semibold">
                        +{marginPct}%
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            isLow
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                          }`}
                        >
                          {p.currentStock} {p.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => openImportForProduct(p)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 transition-colors mr-1"
                        >
                          Receive Stock
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-md w-full p-6 shadow-theme-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Boxes className="size-5 text-brand-600" />
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Register New Product
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
                  SKU Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OIL-5L-TIN"
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  className="w-full text-xs font-mono font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pure Cooking Oil (5L Tin)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs font-semibold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Packaging Unit
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as ProductUnit)}
                    className="w-full text-xs font-semibold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                  >
                    {PRODUCT_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Opening Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={initialStock || ""}
                    onChange={(e) => setInitialStock(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full text-xs font-mono font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Purchase Cost (Rs.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={purchasePrice || ""}
                    onChange={(e) => setPurchasePrice(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full text-xs font-mono font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-right"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Selling Price (Rs.) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={sellingPrice || ""}
                    onChange={(e) => setSellingPrice(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full text-xs font-mono font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-right"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Low Stock Threshold Alert
                </label>
                <input
                  type="number"
                  min="1"
                  value={minAlert}
                  onChange={(e) => setMinAlert(Number(e.target.value) || 10)}
                  className="w-full text-xs font-mono font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
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
                  Register Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inward Stock Receiving Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-md w-full p-6 shadow-theme-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="size-5 text-emerald-600" />
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Receive Inward Stock
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsImportOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Product *
                </label>
                <select
                  value={importProductId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setImportProductId(id);
                    const prod = products.find((p) => p.id === id);
                    if (prod) setImportCost(prod.purchasePrice);
                  }}
                  className="w-full text-xs font-semibold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.unit}) - Curr: {p.currentStock}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Supplier / Vendor (Optional)
                </label>
                <select
                  value={importVendorId}
                  onChange={(e) =>
                    setImportVendorId(e.target.value ? Number(e.target.value) : "")
                  }
                  className="w-full text-xs font-semibold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                >
                  <option value="">Spot Cash / Market Purchase</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.city || "Vendor"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Units Received *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={importQty}
                    onChange={(e) => setImportQty(Number(e.target.value) || 0)}
                    className="w-full text-xs font-mono font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Unit Purchase Cost (Rs.)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={importCost}
                    onChange={(e) => setImportCost(Number(e.target.value) || 0)}
                    className="w-full text-xs font-mono font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-right"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Supplier Bill / Bilty Reference
                </label>
                <input
                  type="text"
                  value={supplierInfo}
                  onChange={(e) => setSupplierInfo(e.target.value)}
                  placeholder="e.g. Bilty # 8829, Goods transport"
                  className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                />
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl flex justify-between items-center text-xs">
                <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                  Total Purchase Value:
                </span>
                <span className="font-bold font-mono text-emerald-700 dark:text-emerald-400 text-sm">
                  Rs. {(importQty * importCost).toLocaleString()}
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportOpen(false)}
                  className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-theme-xs cursor-pointer"
                >
                  Confirm Inward Receiving
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
