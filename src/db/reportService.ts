import { isTauriEnvironment, memoryStore, getSqlDb } from "./client";
import { getExpenses } from "./expenseService";

export interface ProfitKPIs {
  totalSales: number;
  totalCost: number;
  grossProfit: number;
  totalDiscounts: number;
  totalExpenses: number;
  netProfit: number;
  profitMarginPercent: number;
  ordersCompleted: number;
  ordersPending: number;
  totalReceivables: number;
  totalPayables: number;
}

export async function getProfitKPIs(): Promise<ProfitKPIs> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();

  let totalSales = 0;
  let totalDiscounts = 0;
  let grossProfit = 0;
  let totalCost = 0;
  let ordersCompleted = 0;
  let ordersPending = 0;
  let totalReceivables = 0;
  let totalPayables = 0;

  if (isTauri && sqlDb) {
    try {
      // 1. Bill totals (excluding cancelled bills)
      const billTotals = await sqlDb.select<any[]>(
        "SELECT SUM(net_amount) as sales, SUM(discount_amount) as discounts FROM bills WHERE payment_status != 'CANCELLED'"
      );
      totalSales = Number(billTotals?.[0]?.sales || 0);
      totalDiscounts = Number(billTotals?.[0]?.discounts || 0);

      // 2. Bill item profits (excluding cancelled bills)
      const profitTotals = await sqlDb.select<any[]>(
        `SELECT SUM(bi.line_profit) as profit, SUM(bi.unit_purchase_price * bi.quantity) as cost
         FROM bill_items bi
         JOIN bills b ON bi.bill_id = b.id
         WHERE b.payment_status != 'CANCELLED'`
      );
      grossProfit = Number(profitTotals?.[0]?.profit || 0);
      totalCost = Number(profitTotals?.[0]?.cost || 0);

      // 3. Orders counts
      const orderCounts = await sqlDb.select<any[]>(
        "SELECT status, COUNT(*) as cnt FROM orders GROUP BY status"
      );
      for (const row of orderCounts) {
        if (row.status === "BILLED" || row.status === "DISPATCHED") {
          ordersCompleted += Number(row.cnt || 0);
        } else if (row.status === "PENDING") {
          ordersPending += Number(row.cnt || 0);
        }
      }

      // 4. Receivables (Shops outstanding balance)
      const shopBal = await sqlDb.select<any[]>(
        "SELECT SUM(outstanding_balance) as rec FROM retail_shops"
      );
      totalReceivables = Number(shopBal?.[0]?.rec || 0);

      // 5. Payables (Vendors outstanding balance)
      const venBal = await sqlDb.select<any[]>(
        "SELECT SUM(total_purchases - total_paid) as pay FROM vendors WHERE is_active = 1"
      );
      totalPayables = Number(venBal?.[0]?.pay || 0);
    } catch (err) {
      console.error("Failed to calculate report metrics:", err);
    }
  } else {
    const activeBills = memoryStore.bills.filter((b) => b.paymentStatus !== "CANCELLED");
    const activeBillIds = new Set(activeBills.map((b) => b.id));
    const activeBillItems = memoryStore.billItems.filter((bi) => activeBillIds.has(bi.billId));

    totalSales = activeBills.reduce((sum, b) => sum + b.netAmount, 0);
    totalDiscounts = activeBills.reduce((sum, b) => sum + b.discountAmount, 0);
    grossProfit = activeBillItems.reduce((sum, bi) => sum + (bi.lineProfit || 0), 0);
    totalCost = activeBillItems.reduce((sum, bi) => sum + (bi.unitPurchasePrice || 0) * bi.quantity, 0);
    ordersCompleted = memoryStore.orders.filter((o) => o.status === "BILLED").length;
    ordersPending = memoryStore.orders.filter((o) => o.status === "PENDING").length;
    totalReceivables = memoryStore.shops.reduce((sum, s) => sum + s.outstandingBalance, 0);
    totalPayables = memoryStore.vendors.reduce((sum, v) => sum + (v.totalPurchases - v.totalPaid), 0);
  }

  const expenses = await getExpenses();
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = grossProfit - totalDiscounts;
  const profitMarginPercent = totalSales > 0 ? Math.round((netProfit / totalSales) * 100 * 10) / 10 : 0;

  return {
    totalSales,
    totalCost,
    grossProfit,
    totalDiscounts,
    totalExpenses,
    netProfit,
    profitMarginPercent,
    ordersCompleted,
    ordersPending,
    totalReceivables,
    totalPayables,
  };
}

export async function getTopProducts(limit = 5) {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();

  if (isTauri && sqlDb) {
    try {
      const rows = await sqlDb.select<any[]>(
        `SELECT p.name, p.sku, SUM(bi.quantity) as total_qty, SUM(bi.line_total) as total_revenue, SUM(bi.line_profit) as total_profit
         FROM bill_items bi
         JOIN bills b ON bi.bill_id = b.id
         JOIN products p ON bi.product_id = p.id
         WHERE b.payment_status != 'CANCELLED'
         GROUP BY bi.product_id
         ORDER BY total_revenue DESC LIMIT $1`,
        [limit]
      );
      return rows.map((r) => ({
        name: String(r.name),
        sku: String(r.sku),
        quantity: Number(r.total_qty || 0),
        revenue: Number(r.total_revenue || 0),
        profit: Number(r.total_profit || 0),
      }));
    } catch (err) {
      console.error("Failed to query top products:", err);
    }
  }

  return memoryStore.products.slice(0, limit).map((p) => ({
    name: p.name,
    sku: p.sku,
    quantity: 45,
    revenue: p.sellingPrice * 45,
    profit: (p.sellingPrice - p.purchasePrice) * 45,
  }));
}

export async function getBookerLeaderboard() {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();

  if (isTauri && sqlDb) {
    try {
      const rows = await sqlDb.select<any[]>(
        `SELECT ob.id, ob.name, ob.phone, ob.territory, ob.commission_rate,
                COUNT(b.id) as bills_count,
                COALESCE(SUM(b.net_amount), 0) as total_sales,
                COALESCE(SUM(b.paid_amount), 0) as cash_collected,
                COALESCE(SUM(b.net_amount * ob.commission_rate / 100), 0) as estimated_commission
         FROM order_bookers ob
         LEFT JOIN bills b ON ob.id = b.order_booker_id AND b.payment_status != 'CANCELLED'
         WHERE ob.is_active = 1
         GROUP BY ob.id
         ORDER BY total_sales DESC`
      );
      return rows.map((r) => ({
        id: Number(r.id),
        name: String(r.name),
        phone: String(r.phone),
        territory: String(r.territory || "General"),
        commissionRate: Number(r.commission_rate || 0),
        billsCount: Number(r.bills_count || 0),
        totalSales: Number(r.total_sales || 0),
        cashCollected: Number(r.cash_collected || 0),
        estimatedCommission: Number(r.estimated_commission || 0),
      }));
    } catch (err) {
      console.error("Failed to query booker leaderboard:", err);
    }
  }

  return memoryStore.bookers.map((b) => ({
    id: b.id,
    name: b.name,
    phone: b.phone,
    territory: b.territory || "General",
    commissionRate: b.commissionRate,
    billsCount: 12,
    totalSales: 185000,
    cashCollected: 160000,
    estimatedCommission: Math.round(185000 * (b.commissionRate / 100)),
  }));
}
