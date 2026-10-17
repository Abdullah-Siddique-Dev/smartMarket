import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  CreditCard,
  Search,
  Plus,
  Minus,
  Trash2,
  Percent,
  Receipt,
  Store,
  Users,
  Printer,
  X,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { Product, RetailShop, OrderBooker, Bill, PaymentStatus, Order } from "../db/schema";
import { createBill, getBillById } from "../db/posService";
import { getStoreSettings, StoreSettings } from "../db/settingsService";
import { updateOrderStatus } from "../db/orderService";

interface CartLine {
  product: Product;
  quantity: number;
  unitSellingPrice: number;
}

interface BillingPageProps {
  products: Product[];
  shops: RetailShop[];
  bookers: OrderBooker[];
  convertedOrder?: Order | null;
  onClearConvertedOrder?: () => void;
  onBillingComplete?: () => Promise<void>;
}

export const BillingPage: React.FC<BillingPageProps> = ({
  products,
  shops,
  bookers,
  convertedOrder,
  onClearConvertedOrder,
  onBillingComplete,
}) => {
  const [selectedShopId, setSelectedShopId] = useState<number>(shops[0]?.id || 1);
  const [selectedBookerId, setSelectedBookerId] = useState<number | "">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchSelectedIndex, setSearchSelectedIndex] = useState(0);

  // Modal states
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("PAID");
  const [tenderedAmount, setTenderedAmount] = useState<number>(0);
  const [partialPaidAmount, setPartialPaidAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdBill, setCreatedBill] = useState<Bill | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getStoreSettings().then(setStoreSettings);
  }, []);

  useEffect(() => {
    if (shops.length > 0 && !selectedShopId) {
      setSelectedShopId(shops[0].id);
    }
  }, [shops, selectedShopId]);

  useEffect(() => {
    if (convertedOrder) {
      if (convertedOrder.shopId) {
        setSelectedShopId(convertedOrder.shopId);
      }
      if (convertedOrder.orderBookerId) {
        setSelectedBookerId(convertedOrder.orderBookerId);
      }
      if (convertedOrder.items && convertedOrder.items.length > 0) {
        const orderLines: CartLine[] = [];
        for (const item of convertedOrder.items) {
          const prod = products.find((p) => p.id === item.productId);
          if (prod) {
            orderLines.push({
              product: prod,
              quantity: item.quantity,
              unitSellingPrice: item.unitPrice || prod.sellingPrice,
            });
          }
        }
        if (orderLines.length > 0) {
          setCart(orderLines);
        }
      }
    }
  }, [convertedOrder, products]);

  const selectedShop = useMemo(
    () => shops.find((s) => s.id === Number(selectedShopId)),
    [shops, selectedShopId]
  );

  // Filter products for search dropdown
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .slice(0, 8);
  }, [products, searchQuery]);

  // Cart calculations
  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity * item.unitSellingPrice, 0),
    [cart]
  );

  const totalCost = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity * item.product.purchasePrice, 0),
    [cart]
  );

  const netTotal = Math.max(0, subtotal - discountAmount);
  const estimatedProfit = Math.max(0, netTotal - totalCost);
  const totalUnits = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Add item to cart
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        { product, quantity: 1, unitSellingPrice: product.sellingPrice },
      ];
    });
    setSearchQuery("");
    setIsSearchFocused(false);
  };

  const updateCartQty = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartLine[]
    );
  };

  const updateCartPrice = (productId: number, newPrice: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, unitSellingPrice: Math.max(0, newPrice) } : item
      )
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const applyPercentDiscount = (percent: number) => {
    const d = Math.round((subtotal * percent) / 100);
    setDiscountAmount(d);
  };

  const stockShortages = useMemo(() => {
    return cart.filter((c) => c.quantity > c.product.currentStock);
  }, [cart]);

  const handleCheckoutOpen = () => {
    if (cart.length === 0) return;
    if (stockShortages.length > 0) {
      alert(
        `Cannot proceed to checkout - Insufficient Stock!\n\n` +
          stockShortages
            .map(
              (s) =>
                `• ${s.product.name}: Available ${s.product.currentStock} ${s.product.unit}, In Cart ${s.quantity}`
            )
            .join("\n") +
          `\n\nPlease reduce quantities or import stock before billing.`
      );
      return;
    }
    setPaymentStatus("PAID");
    setTenderedAmount(netTotal);
    setPartialPaidAmount(Math.round(netTotal / 2));
    setIsPaymentOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (cart.length === 0 || !selectedShopId) return;
    if (stockShortages.length > 0) {
      alert("Cannot create bill: Some products exceed available warehouse stock.");
      return;
    }
    setIsSubmitting(true);

    const actualPaid =
      paymentStatus === "PAID"
        ? netTotal
        : paymentStatus === "CREDIT"
        ? 0
        : Math.min(netTotal, partialPaidAmount);

    try {
      const billId = await createBill(
        {
          shopId: Number(selectedShopId),
          orderId: convertedOrder?.id || null,
          orderBookerId: selectedBookerId ? Number(selectedBookerId) : null,
          subtotal,
          discountAmount,
          netAmount: netTotal,
          paidAmount: actualPaid,
          paymentStatus,
          deductStock: true,
        },
        cart.map((c) => ({
          productId: c.product.id,
          quantity: c.quantity,
          unitSellingPrice: c.unitSellingPrice,
        }))
      );

      setIsPaymentOpen(false);
      setCart([]);
      setDiscountAmount(0);

      // Load created bill for preview
      const b = await getBillById(billId);
      setCreatedBill(b);
      setIsPreviewOpen(true);

      if (convertedOrder) {
        await updateOrderStatus(convertedOrder.id, "BILLED");
        if (onClearConvertedOrder) onClearConvertedOrder();
      }

      if (onBillingComplete) {
        await onBillingComplete();
      }
    } catch (err: any) {
      console.error("Failed to settle bill:", err);
      alert(err?.message || "Failed to settle bill due to insufficient stock or error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] gap-4">
      {/* Converted Order Banner */}
      {convertedOrder && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <Receipt className="size-4 text-emerald-600" />
            <span className="font-bold text-emerald-800 dark:text-emerald-300">
              Converting Order #{convertedOrder.orderNumber}
            </span>
            <span className="text-emerald-600 dark:text-emerald-400">
              • Preloaded from booking desk for {convertedOrder.shop_name}
            </span>
          </div>
          {onClearConvertedOrder && (
            <button
              type="button"
              onClick={onClearConvertedOrder}
              className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 text-[11px] font-bold underline cursor-pointer"
            >
              Clear Order
            </button>
          )}
        </div>
      )}
      {/* Top Header / Fast Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-xs">
        {/* Shop Selector */}
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <div className="size-9 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400 flex items-center justify-center shrink-0">
            <Store className="size-5" />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
              Wholesale Customer / Retail Shop
            </label>
            <select
              value={selectedShopId}
              onChange={(e) => setSelectedShopId(Number(e.target.value))}
              className="w-full text-xs font-semibold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.shopName} {s.ownerName ? `(${s.ownerName})` : ""} - Bal: Rs.{" "}
                  {s.outstandingBalance.toLocaleString()}
                </option>
              ))}
            </select>
          </div>
          {selectedShop && (
            <div className="hidden sm:flex flex-col text-right pl-2 border-l border-gray-200 dark:border-gray-800 shrink-0">
              <span className="text-[10px] text-gray-400 font-medium">Khata Balance</span>
              <span
                className={`text-xs font-bold font-mono ${
                  selectedShop.outstandingBalance > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                Rs. {selectedShop.outstandingBalance.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Booker Selector */}
        <div className="flex items-center gap-2 min-w-[200px]">
          <div className="size-9 rounded-xl bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 flex items-center justify-center shrink-0">
            <Users className="size-5" />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
              Order Booker (Optional)
            </label>
            <select
              value={selectedBookerId}
              onChange={(e) =>
                setSelectedBookerId(e.target.value ? Number(e.target.value) : "")
              }
              className="w-full text-xs font-semibold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              <option value="">Direct Counter Sale</option>
              {bookers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.territory || "Agent"}) - {b.commissionRate}%
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Product Bar */}
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search product by SKU or name (e.g. Oil, Flour)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchFocused(true);
            }}
            onFocus={() => setIsSearchFocused(true)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />

          {/* Search Dropdown */}
          {isSearchFocused && filteredProducts.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-theme-lg z-30 max-h-72 overflow-y-auto">
              {filteredProducts.map((p, idx) => (
                <div
                  key={p.id}
                  onClick={() => addToCart(p)}
                  onMouseEnter={() => setSearchSelectedIndex(idx)}
                  className={`flex items-center justify-between p-2.5 cursor-pointer border-b border-gray-100 dark:border-gray-800/60 hover:bg-brand-50/50 dark:hover:bg-brand-950/30 transition-colors ${
                    idx === searchSelectedIndex ? "bg-brand-50/40 dark:bg-brand-950/20" : ""
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-semibold text-xs text-gray-900 dark:text-gray-100 block truncate">
                      {p.name}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      SKU: {p.sku} • Unit: {p.unit}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-brand-600 dark:text-brand-400 font-mono block">
                      Rs. {p.sellingPrice.toLocaleString()}
                    </span>
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        p.currentStock <= p.minStockAlert
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                      }`}
                    >
                      Stock: {p.currentStock}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Terminal Grid: 8 Cols Cart, 4 Cols Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
        {/* Left: Cart Items Table */}
        <div className="lg:col-span-8 flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-xs overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40">
            <div className="flex items-center gap-2">
              <CreditCard className="size-4 text-brand-500" />
              <span className="font-bold text-xs text-gray-800 dark:text-gray-200">
                Invoice Cart Items ({cart.length})
              </span>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setCart([])}
                className="text-xs text-rose-500 hover:text-rose-600 font-medium flex items-center gap-1"
              >
                <Trash2 className="size-3.5" /> Clear Cart
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 text-gray-400">
                <Receipt className="size-12 stroke-[1.2] mb-3 text-gray-300 dark:text-gray-700" />
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                  Cart is currently empty
                </p>
                <p className="text-xs text-gray-400 mt-1 max-w-sm">
                  Search wholesale products above by SKU or name to add them to this invoice.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-gray-800">
                    <th className="py-2 px-3">Product / SKU</th>
                    <th className="py-2 px-3">Unit</th>
                    <th className="py-2 px-3">Rate (Rs.)</th>
                    <th className="py-2 px-3 text-center">Qty</th>
                    <th className="py-2 px-3 text-right">Total</th>
                    <th className="py-2 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 text-xs">
                  {cart.map((item) => {
                    const isShort = item.quantity > item.product.currentStock;
                    return (
                      <tr
                        key={item.product.id}
                        className={
                          isShort
                            ? "bg-rose-50/70 dark:bg-rose-950/40 border-l-4 border-rose-500"
                            : "hover:bg-gray-50/60 dark:hover:bg-gray-800/40"
                        }
                      >
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-gray-900 dark:text-gray-100 block">
                            {item.product.name}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-gray-400 font-mono">
                              {item.product.sku}
                            </span>
                            {isShort ? (
                              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                                <AlertTriangle className="size-3" />
                                Available: {item.product.currentStock} (Short by {item.quantity - item.product.currentStock})
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400 font-mono">
                                Stock: {item.product.currentStock}
                              </span>
                            )}
                          </div>
                        </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-gray-600 dark:text-gray-300">
                          {item.product.unit}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          value={item.unitSellingPrice}
                          onChange={(e) => updateCartPrice(item.product.id, Number(e.target.value))}
                          className="w-20 px-2 py-1 text-xs font-mono font-semibold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-right"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.product.id, -1)}
                            className="size-6 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 transition-colors"
                          >
                            <Minus className="size-3" />
                          </button>
                          <span className="w-8 text-center font-bold font-mono">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.product.id, 1)}
                            className="size-6 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 transition-colors"
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold font-mono text-gray-900 dark:text-gray-100">
                        Rs. {(item.quantity * item.unitSellingPrice).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-gray-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: Summary Panel */}
        <div className="lg:col-span-4 flex flex-col justify-between bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-xs p-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Receipt className="size-4 text-brand-500" />
                <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
                  Bill Summary
                </span>
              </div>
              <span className="text-[11px] font-semibold text-gray-400">
                {cart.length} items ({totalUnits} units)
              </span>
            </div>

            {/* Subtotal */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-bold font-mono text-sm text-gray-900 dark:text-gray-100">
                Rs. {subtotal.toLocaleString()}
              </span>
            </div>

            {/* Discount */}
            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800/60">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 flex items-center gap-1">
                  <Percent className="size-3.5 text-gray-400" /> Discount (Rs.)
                </span>
                <input
                  type="number"
                  min="0"
                  max={subtotal}
                  value={discountAmount || ""}
                  onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-24 text-right px-2 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-mono font-semibold"
                />
              </div>
              {subtotal > 0 && (
                <div className="flex items-center justify-end gap-1 text-[10px]">
                  <span className="text-gray-400">Quick:</span>
                  {[2, 5, 10].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => applyPercentDiscount(p)}
                      className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 hover:bg-brand-50 dark:hover:bg-brand-950 font-semibold text-gray-600 dark:text-gray-300 transition-colors"
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Estimated Gross Profit indicator */}
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <TrendingUp className="size-4" />
                <span className="text-xs font-semibold">Estimated Gross Profit</span>
              </div>
              <span className="text-xs font-bold font-mono text-emerald-700 dark:text-emerald-400">
                Rs. {estimatedProfit.toLocaleString()}
              </span>
            </div>

            {/* Net Total Card */}
            <div className="bg-gradient-to-br from-brand-600 to-blue-700 text-white rounded-2xl p-4 shadow-md shadow-brand-500/25">
              <span className="text-xs font-medium text-blue-100 uppercase tracking-wider block">
                Net Payable Amount
              </span>
              <span className="text-3xl font-black font-mono tracking-tight mt-1 block">
                Rs. {netTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Stock Shortage Alert */}
          {stockShortages.length > 0 && (
            <div className="mt-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl p-3 text-xs text-rose-700 dark:text-rose-400 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="size-4 text-rose-600 shrink-0" />
                <span>Cannot Settle: Warehouse Shortage</span>
              </div>
              <p className="text-[11px] text-rose-600/90 dark:text-rose-400/90">
                {stockShortages
                  .map(
                    (s) =>
                      `${s.product.name} (Stock: ${s.product.currentStock}, In Cart: ${s.quantity})`
                  )
                  .join(", ")}
              </p>
            </div>
          )}

          {/* Settle Action Button */}
          <div className="pt-4">
            <button
              type="button"
              disabled={cart.length === 0 || stockShortages.length > 0}
              onClick={handleCheckoutOpen}
              className={`w-full py-3.5 px-4 text-white font-bold text-sm rounded-xl shadow-theme-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed ${
                stockShortages.length > 0
                  ? "bg-rose-600 hover:bg-rose-700 opacity-80"
                  : "bg-brand-600 hover:bg-brand-700 disabled:opacity-50"
              }`}
            >
              {stockShortages.length > 0 ? (
                <>
                  <AlertTriangle className="size-5" /> Stock Shortage ({stockShortages.length} Items)
                </>
              ) : (
                <>
                  <CreditCard className="size-5" /> Settle & Checkout (F1)
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Payment Settlement Modal */}
      {isPaymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-md w-full p-6 shadow-theme-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Store className="size-5 text-brand-600" />
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Payment Settlement
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

            {/* Payment Mode Selector */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentStatus("PAID")}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                  paymentStatus === "PAID"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                }`}
              >
                Full Cash (Paid)
              </button>
              <button
                type="button"
                onClick={() => setPaymentStatus("PARTIAL")}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                  paymentStatus === "PARTIAL"
                    ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                    : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                }`}
              >
                Partial Cash
              </button>
              <button
                type="button"
                onClick={() => setPaymentStatus("CREDIT")}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                  paymentStatus === "CREDIT"
                    ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                    : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                }`}
              >
                Full Credit (Khata)
              </button>
            </div>

            {/* Breakdown based on mode */}
            {paymentStatus === "PAID" && (
              <div className="space-y-3 bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Net Invoice Amount</span>
                  <span className="font-bold font-mono">Rs. {netTotal.toLocaleString()}</span>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Cash Tendered by Customer
                  </label>
                  <input
                    type="number"
                    value={tenderedAmount || ""}
                    onChange={(e) => setTenderedAmount(Number(e.target.value) || 0)}
                    className="w-full text-base font-bold font-mono bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-right"
                  />
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700 text-xs">
                  <span className="font-semibold text-gray-600 dark:text-gray-300">Change Due</span>
                  <span className="font-black font-mono text-emerald-600 text-sm">
                    Rs. {Math.max(0, tenderedAmount - netTotal).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {paymentStatus === "PARTIAL" && (
              <div className="space-y-3 bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Net Invoice Amount</span>
                  <span className="font-bold font-mono">Rs. {netTotal.toLocaleString()}</span>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Cash Received Now
                  </label>
                  <input
                    type="number"
                    value={partialPaidAmount || ""}
                    onChange={(e) => setPartialPaidAmount(Number(e.target.value) || 0)}
                    className="w-full text-base font-bold font-mono bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-right"
                  />
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700 text-xs">
                  <span className="font-semibold text-amber-600">Balance Added to Khata</span>
                  <span className="font-black font-mono text-amber-600 text-sm">
                    Rs. {Math.max(0, netTotal - partialPaidAmount).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {paymentStatus === "CREDIT" && (
              <div className="bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 p-4 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-brand-700 dark:text-brand-300">
                  <AlertCircle className="size-4 shrink-0" />
                  <span className="text-xs font-semibold">100% Credit Sale</span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  The full amount of{" "}
                  <strong className="font-mono text-brand-600 dark:text-brand-400">
                    Rs. {netTotal.toLocaleString()}
                  </strong>{" "}
                  will be added to <strong>{selectedShop?.shopName}</strong>'s Khata balance.
                </p>
              </div>
            )}

            {/* Settle Action */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setIsPaymentOpen(false)}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmPayment}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-theme-xs flex items-center justify-center gap-2"
              >
                {isSubmitting ? "Generating..." : "Confirm & Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Receipt Preview Modal */}
      {isPreviewOpen && createdBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in print:static print:bg-white print:p-0 print:m-0">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-lg w-full p-6 shadow-theme-xl space-y-4 max-h-[90vh] overflow-y-auto print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:bg-white">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="size-5 text-brand-600" />
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Sale Invoice Receipt
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Printable Receipt Paper */}
            <div
              id="printable-receipt"
              className="bg-white text-gray-900 p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4 font-sans print:border-none print:shadow-none print:p-0"
            >
              <div className="text-center pb-3 border-b border-gray-200">
                <h2 className="text-lg font-black tracking-tight text-gray-900">
                  {storeSettings?.storeName || "SMART WHOLESALE MARKET"}
                </h2>
                <p className="text-[11px] text-gray-500">{storeSettings?.storeAddress}</p>
                <p className="text-[11px] text-gray-500 font-mono">
                  Ph: {storeSettings?.storePhone}
                </p>
              </div>

              <div className="flex justify-between text-xs pb-2 border-b border-gray-100">
                <div>
                  <p className="font-bold">Bill #: {createdBill.billNumber}</p>
                  <p className="text-gray-500">Customer: {createdBill.shop_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500">{new Date(createdBill.billDate).toLocaleDateString()}</p>
                  <p className="text-gray-500">{new Date(createdBill.billDate).toLocaleTimeString()}</p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-[10px] font-bold text-gray-600 uppercase">
                    <th className="py-1 text-left">Item</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Rate</th>
                    <th className="py-1 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {createdBill.items?.map((it, i) => (
                    <tr key={i}>
                      <td className="py-1.5 font-medium">{it.product_name}</td>
                      <td className="py-1.5 text-center font-mono">{it.quantity}</td>
                      <td className="py-1.5 text-right font-mono">
                        {it.unitSellingPrice.toLocaleString()}
                      </td>
                      <td className="py-1.5 text-right font-mono font-bold">
                        {it.lineTotal.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="pt-2 border-t border-gray-200 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-mono">Rs. {createdBill.subtotal.toLocaleString()}</span>
                </div>
                {createdBill.discountAmount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount:</span>
                    <span className="font-mono">-Rs. {createdBill.discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-200">
                  <span>Net Amount:</span>
                  <span className="font-mono">Rs. {createdBill.netAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Paid:</span>
                  <span className="font-mono">Rs. {createdBill.paidAmount.toLocaleString()}</span>
                </div>
                {createdBill.netAmount - createdBill.paidAmount > 0 && (
                  <div className="flex justify-between text-amber-600 font-bold">
                    <span>Balance Added to Khata:</span>
                    <span className="font-mono">
                      Rs. {(createdBill.netAmount - createdBill.paidAmount).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="text-center pt-3 border-t border-gray-100 text-[10px] text-gray-500 italic">
                {storeSettings?.receiptFooter}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-theme-xs cursor-pointer"
              >
                <Printer className="size-4" /> Print Invoice
              </button>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
