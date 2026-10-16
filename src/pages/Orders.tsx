import React, { useState, useEffect, useMemo } from "react";
import {
  Package,
  Plus,
  Search,
  Clock,
  Truck,
  FileCheck,
  XCircle,
  MessageSquare,
  Phone,
  User,
  Store,
  X,
  Trash2,
} from "lucide-react";
import { Order, OrderStatus, OrderSource, Product, RetailShop, OrderBooker } from "../db/schema";
import { getOrders, getOrderById, createOrder, updateOrderStatus, deleteOrder } from "../db/orderService";
import { PageHeader } from "../components/ui/PageHeader";

interface OrdersPageProps {
  products: Product[];
  shops: RetailShop[];
  bookers: OrderBooker[];
  onRefresh?: () => Promise<void>;
  onNavigateToBilling?: (order: Order) => void;
}

export const OrdersPage: React.FC<OrdersPageProps> = ({
  products,
  shops,
  bookers,
  onRefresh,
  onNavigateToBilling,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // New Order Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [orderShopId, setOrderShopId] = useState<number>(shops[0]?.id || 1);
  const [orderBookerId, setOrderBookerId] = useState<number | "">("");
  const [orderSource, setOrderSource] = useState<OrderSource>("MANUAL_WHATSAPP");
  const [orderNotes, setOrderNotes] = useState("");
  const [orderItems, setOrderItems] = useState<Array<{ productId: number; quantity: number; unitPrice: number }>>([
    { productId: products[0]?.id || 1, quantity: 5, unitPrice: products[0]?.sellingPrice || 0 },
  ]);

  // View Order Modal
  const [viewOrder, setViewOrder] = useState<Order | null>(null);

  const fetchOrdersData = async () => {
    setIsLoading(true);
    try {
      const data = await getOrders(selectedStatus === "ALL" ? undefined : (selectedStatus as OrderStatus));
      setOrders(data);
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersData();
  }, [selectedStatus]);

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.shop_name?.toLowerCase().includes(q) ||
        o.booker_name?.toLowerCase().includes(q)
    );
  }, [orders, searchQuery]);

  const handleOpenDetail = async (orderId: number) => {
    const full = await getOrderById(orderId);
    if (full) setViewOrder(full);
  };

  const handleConvertToBill = async (ord: Order) => {
    let orderToConvert = ord;
    if (!ord.items || ord.items.length === 0) {
      const full = await getOrderById(ord.id);
      if (full) orderToConvert = full;
    }
    if (onNavigateToBilling) {
      onNavigateToBilling(orderToConvert);
    }
  };

  const handleCancelOrder = async (ord: Order) => {
    const confirmMsg = `Cancel Wholesale Order #${ord.orderNumber}?\n\nThis will deduct Rs. ${ord.totalAmount.toLocaleString()} and its profit from your reports, restore inventory stock, and revert any customer credit.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await updateOrderStatus(ord.id, "CANCELLED");
      if (viewOrder && viewOrder.id === ord.id) {
        setViewOrder({ ...viewOrder, status: "CANCELLED" });
      }
      await fetchOrdersData();
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error("Failed to cancel order:", err);
      alert("Failed to cancel order. Please try again.");
    }
  };

  const handleDeleteOrder = async (ord: Order) => {
    const confirmMsg =
      ord.status === "BILLED"
        ? `Order #${ord.orderNumber} is marked as BILLED.\n\nDeleting will permanently remove the order, deduct its amount and profit from your reports, and restore inventory stock.\n\nAre you sure you want to proceed?`
        : `Delete Wholesale Order #${ord.orderNumber}?\n\nThis will remove the order and deduct its amount from your reports.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteOrder(ord.id);
      await fetchOrdersData();
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error("Failed to delete order:", err);
      alert("Failed to delete order. Please try again.");
    }
  };

  const handleAddOrderItem = () => {
    if (products.length === 0) return;
    setOrderItems((prev) => [
      ...prev,
      { productId: products[0].id, quantity: 1, unitPrice: products[0].sellingPrice },
    ]);
  };

  const handleRemoveOrderItem = (index: number) => {
    setOrderItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleItemProductChange = (index: number, prodId: number) => {
    const p = products.find((prod) => prod.id === prodId);
    setOrderItems((prev) =>
      prev.map((it, idx) =>
        idx === index
          ? { ...it, productId: prodId, unitPrice: p?.sellingPrice || it.unitPrice }
          : it
      )
    );
  };

  const handleItemQtyChange = (index: number, qty: number) => {
    setOrderItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, quantity: Math.max(1, qty) } : it))
    );
  };

  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orderItems.length === 0) return;

    try {
      await createOrder(
        {
          shopId: Number(orderShopId),
          orderBookerId: orderBookerId ? Number(orderBookerId) : null,
          orderSource,
          notes: orderNotes,
        },
        orderItems
      );
      setIsCreateOpen(false);
      setOrderNotes("");
      fetchOrdersData();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to create order:", err);
    }
  };

  const handleStatusChange = async (orderId: number, status: OrderStatus) => {
    if (status === "CANCELLED") {
      const confirmMsg =
        "Cancel this wholesale order?\n\nThis will deduct the order amount & profit from your reports, restore inventory stock, and revert any customer credit.";
      if (!window.confirm(confirmMsg)) return;
    }
    await updateOrderStatus(orderId, status);
    if (viewOrder && viewOrder.id === orderId) {
      setViewOrder({ ...viewOrder, status });
    }
    await fetchOrdersData();
    if (onRefresh) await onRefresh();
  };

  const getSourceIcon = (src: OrderSource) => {
    switch (src) {
      case "MANUAL_WHATSAPP":
        return <MessageSquare className="size-3 text-emerald-500 inline mr-1" />;
      case "DIRECT_PHONE":
        return <Phone className="size-3 text-sky-500 inline mr-1" />;
      case "MANUAL_IN_PERSON":
        return <User className="size-3 text-indigo-500 inline mr-1" />;
      default:
        return <Store className="size-3 text-amber-500 inline mr-1" />;
    }
  };

  const getStatusBadge = (status: string | OrderStatus) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
            <Clock className="size-3" /> PENDING
          </span>
        );
      case "DISPATCHED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400">
            <Truck className="size-3" /> DISPATCHED
          </span>
        );
      case "BILLED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
            <FileCheck className="size-3" /> BILLED
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
            <XCircle className="size-3" /> CANCELLED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wholesale Orders Management"
        description="Track incoming bookings from WhatsApp, phone calls, in-person bookers and walk-ins"
      >
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl shadow-theme-xs transition-colors cursor-pointer"
        >
          <Plus className="size-4" /> Book New Order
        </button>
      </PageHeader>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-xs">
        <div className="flex items-center gap-2 overflow-x-auto">
          {["ALL", "PENDING", "DISPATCHED", "BILLED", "CANCELLED"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                selectedStatus === st
                  ? "bg-brand-600 text-white shadow-xs"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search order number or shop name..."
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

      {/* Orders Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Shop / Customer</th>
                <th className="py-3 px-4">Booker / Rep</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent mx-auto mb-2" />
                    <span>Loading wholesale orders...</span>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <Package className="size-10 stroke-[1.2] mx-auto mb-2 text-gray-300 dark:text-gray-700" />
                    No orders found matching the filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => (
                  <tr
                    key={ord.id}
                    className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-brand-600 dark:text-brand-400">
                      {ord.orderNumber}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">
                      {ord.shop_name}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                      {ord.booker_name || "Direct Booking"}
                    </td>
                    <td className="py-3 px-4 capitalize">
                      {getSourceIcon(ord.orderSource as OrderSource)}
                      {ord.orderSource?.replace("MANUAL_", "").replace("DIRECT_", "").toLowerCase()}
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-500">{ord.orderDate}</td>
                    <td className="py-3 px-4 text-right font-bold font-mono text-gray-900 dark:text-gray-100">
                      Rs. {ord.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">{getStatusBadge(ord.status)}</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {ord.status !== "BILLED" && ord.status !== "CANCELLED" && (
                        <button
                          type="button"
                          onClick={() => handleConvertToBill(ord)}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors mr-1.5 cursor-pointer shadow-xs"
                          title="Generate POS bill from this order immediately"
                        >
                          Convert to Bill
                        </button>
                      )}
                      {ord.status !== "CANCELLED" && (
                        <button
                          type="button"
                          onClick={() => handleCancelOrder(ord)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 transition-colors mr-1.5 cursor-pointer"
                          title="Cancel Order & deduct from profit"
                        >
                          <XCircle className="size-3.5 inline mr-1" />
                          Cancel
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(ord.id)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer mr-1.5"
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteOrder(ord)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 transition-colors cursor-pointer"
                        title="Delete Order"
                      >
                        <Trash2 className="size-3.5 inline mr-1" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Book New Order Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-xl w-full p-6 shadow-theme-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Package className="size-5 text-brand-600" />
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Book New Wholesale Order
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

            <form onSubmit={handleCreateOrderSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Select Customer / Shop *
                  </label>
                  <select
                    value={orderShopId}
                    onChange={(e) => setOrderShopId(Number(e.target.value))}
                    className="w-full text-xs font-semibold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                  >
                    {shops.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.shopName} (Bal: Rs. {s.outstandingBalance.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Order Booker / Sales Rep
                  </label>
                  <select
                    value={orderBookerId}
                    onChange={(e) =>
                      setOrderBookerId(e.target.value ? Number(e.target.value) : "")
                    }
                    className="w-full text-xs font-semibold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                  >
                    <option value="">Direct / Walk-in Booking</option>
                    {bookers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.territory})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Order Source Channel
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(
                    [
                      ["MANUAL_WHATSAPP", "WhatsApp"],
                      ["DIRECT_PHONE", "Phone Call"],
                      ["MANUAL_IN_PERSON", "In-Person"],
                      ["DIRECT_WALKIN", "Walk-in"],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setOrderSource(val as OrderSource)}
                      className={`py-2 px-2 text-[11px] font-bold rounded-xl border text-center transition-all ${
                        orderSource === val
                          ? "bg-brand-50 text-brand-600 border-brand-500 dark:bg-brand-950/60 dark:text-brand-400"
                          : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Items List */}
              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Order Items
                  </span>
                  <button
                    type="button"
                    onClick={handleAddOrderItem}
                    className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="size-3.5" /> Add Item
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                  {orderItems.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={it.productId}
                        onChange={(e) => handleItemProductChange(idx, Number(e.target.value))}
                        className="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 font-medium"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.unit}) - Rs. {p.sellingPrice}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) => handleItemQtyChange(idx, Number(e.target.value))}
                        className="w-16 text-center text-xs font-mono font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-1.5"
                      />
                      <span className="text-xs font-bold font-mono w-20 text-right">
                        Rs. {(it.quantity * it.unitPrice).toLocaleString()}
                      </span>
                      {orderItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOrderItem(idx)}
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
                  Booking Notes
                </label>
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Special instructions or delivery route requirements..."
                  rows={2}
                  className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 focus:ring-2 focus:ring-brand-500 focus:outline-none"
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
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {viewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-lg w-full p-6 shadow-theme-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <span>Order: {viewOrder.orderNumber}</span>
                  {getStatusBadge(viewOrder.status)}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Booked on {viewOrder.orderDate} by {viewOrder.creator_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewOrder(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-gray-800/50 p-3.5 rounded-2xl text-xs">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Customer</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {viewOrder.shop_name}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Sales Agent</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {viewOrder.booker_name || "Direct Booking"}
                </span>
              </div>
            </div>

            {/* Line items */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                Ordered Products
              </span>
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-[10px] font-bold text-gray-400 uppercase border-b border-gray-100 dark:border-gray-800">
                    <th className="py-1">Product</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Rate</th>
                    <th className="py-1 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {viewOrder.items?.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2 font-medium">{it.product_name}</td>
                      <td className="py-2 text-center font-mono">{it.quantity}</td>
                      <td className="py-2 text-right font-mono">
                        Rs. {it.unitPrice.toLocaleString()}
                      </td>
                      <td className="py-2 text-right font-mono font-bold">
                        Rs. {(it.quantity * it.unitPrice).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-800 font-bold text-sm">
                <span>Total Amount:</span>
                <span className="font-mono text-brand-600 dark:text-brand-400">
                  Rs. {viewOrder.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Convert to Bill Action in Modal */}
            {viewOrder.status !== "BILLED" && viewOrder.status !== "CANCELLED" && (
              <button
                type="button"
                onClick={() => {
                  handleConvertToBill(viewOrder);
                  setViewOrder(null);
                }}
                className="w-full py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-theme-xs cursor-pointer flex items-center justify-center gap-2"
              >
                Convert Order Directly to POS Bill
              </button>
            )}

            {/* Status Change Controls */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">
                Transition Status
              </span>
              <div className="grid grid-cols-4 gap-2">
                {(["PENDING", "DISPATCHED", "BILLED", "CANCELLED"] as OrderStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleStatusChange(viewOrder.id, st)}
                    className={`py-1.5 px-2 text-[10px] font-bold rounded-xl border transition-all ${
                      viewOrder.status === st
                        ? "bg-brand-600 text-white border-brand-600"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const toDelete = viewOrder;
                  setViewOrder(null);
                  handleDeleteOrder(toDelete);
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="size-3.5" /> Delete Order
              </button>
              <button
                type="button"
                onClick={() => setViewOrder(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
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
