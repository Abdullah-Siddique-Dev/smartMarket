import { isTauriEnvironment, memoryStore, getSqlDb } from "./client";
import { Order, OrderItem, OrderStatus, OrderSource } from "./schema";

export async function getOrders(statusFilter?: OrderStatus): Promise<Order[]> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();

  if (isTauri && sqlDb) {
    try {
      const query = statusFilter
        ? `SELECT o.*, rs.shop_name, ob.name as booker_name, u.full_name as creator_name
           FROM orders o
           JOIN retail_shops rs ON o.shop_id = rs.id
           LEFT JOIN order_bookers ob ON o.order_booker_id = ob.id
           LEFT JOIN system_users u ON o.created_by = u.id
           WHERE o.status = $1
           ORDER BY o.id DESC`
        : `SELECT o.*, rs.shop_name, ob.name as booker_name, u.full_name as creator_name
           FROM orders o
           JOIN retail_shops rs ON o.shop_id = rs.id
           LEFT JOIN order_bookers ob ON o.order_booker_id = ob.id
           LEFT JOIN system_users u ON o.created_by = u.id
           ORDER BY o.id DESC`;

      const rows = await sqlDb.select<any[]>(query, statusFilter ? [statusFilter] : []);
      return rows.map((r) => ({
        id: Number(r.id),
        orderNumber: String(r.order_number),
        shopId: Number(r.shop_id),
        shop_name: String(r.shop_name),
        orderBookerId: r.order_booker_id ? Number(r.order_booker_id) : null,
        booker_name: r.booker_name ? String(r.booker_name) : null,
        orderSource: r.order_source as OrderSource,
        orderDate: String(r.order_date),
        status: r.status as OrderStatus,
        totalAmount: Number(r.total_amount),
        notes: r.notes ? String(r.notes) : null,
        createdBy: Number(r.created_by),
        creator_name: r.creator_name ? String(r.creator_name) : "Admin",
        createdAt: String(r.created_at),
      }));
    } catch (err) {
      console.error("Failed to query orders:", err);
    }
  }

  return memoryStore.orders.filter((o) => !statusFilter || o.status === statusFilter);
}

export async function getOrderById(id: number): Promise<Order | null> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();

  if (isTauri && sqlDb) {
    try {
      const rows = await sqlDb.select<any[]>(
        `SELECT o.*, rs.shop_name, ob.name as booker_name, u.full_name as creator_name
         FROM orders o
         JOIN retail_shops rs ON o.shop_id = rs.id
         LEFT JOIN order_bookers ob ON o.order_booker_id = ob.id
         LEFT JOIN system_users u ON o.created_by = u.id
         WHERE o.id = $1`,
        [id]
      );
      if (!rows || rows.length === 0) return null;
      const r = rows[0];

      const itemRows = await sqlDb.select<any[]>(
        `SELECT oi.*, p.name as product_name, p.sku
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = $1`,
        [id]
      );

      const items: OrderItem[] = itemRows.map((it) => ({
        id: Number(it.id),
        orderId: Number(it.order_id),
        productId: Number(it.product_id),
        product_name: String(it.product_name),
        sku: String(it.sku),
        quantity: Number(it.quantity),
        unitPrice: Number(it.unit_price),
        lineTotal: Number(it.line_total),
      }));

      return {
        id: Number(r.id),
        orderNumber: String(r.order_number),
        shopId: Number(r.shop_id),
        shop_name: String(r.shop_name),
        orderBookerId: r.order_booker_id ? Number(r.order_booker_id) : null,
        booker_name: r.booker_name ? String(r.booker_name) : null,
        orderSource: r.order_source as OrderSource,
        orderDate: String(r.order_date),
        status: r.status as OrderStatus,
        totalAmount: Number(r.total_amount),
        notes: r.notes ? String(r.notes) : null,
        createdBy: Number(r.created_by),
        creator_name: r.creator_name ? String(r.creator_name) : "Admin",
        createdAt: String(r.created_at),
        items,
      };
    } catch (err) {
      console.error("Failed to query order by id:", err);
    }
  }

  const o = memoryStore.orders.find((ord) => ord.id === id);
  if (!o) return null;
  const items = memoryStore.orderItems.filter((i) => i.orderId === id);
  return { ...o, items };
}

export async function createOrder(
  order: {
    shopId: number;
    orderBookerId?: number | null;
    orderSource?: OrderSource;
    notes?: string;
  },
  items: Array<{ productId: number; quantity: number; unitPrice: number }>
): Promise<number> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();
  const now = new Date().toISOString();
  const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  if (isTauri && sqlDb) {
    const res = await sqlDb.execute(
      `INSERT INTO orders (order_number, shop_id, order_booker_id, order_source, order_date, status, total_amount, notes, created_by, created_at)
       VALUES ($1, $2, $3, $4, date('now', 'localtime'), 'PENDING', $5, $6, 1, $7)`,
      [
        orderNumber,
        order.shopId,
        order.orderBookerId || null,
        order.orderSource || "MANUAL_WHATSAPP",
        totalAmount,
        order.notes || "",
        now,
      ]
    );

    const newOrderId = Number(res.lastInsertId) || 1;
    for (const it of items) {
      const lineTotal = it.quantity * it.unitPrice;
      await sqlDb.execute(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total)
         VALUES ($1, $2, $3, $4, $5)`,
        [newOrderId, it.productId, it.quantity, it.unitPrice, lineTotal]
      );
    }
    return newOrderId;
  }

  const newId = memoryStore.orders.length > 0 ? Math.max(...memoryStore.orders.map((o) => o.id)) + 1 : 1;
  const shop = memoryStore.shops.find((s) => s.id === order.shopId);
  const booker = order.orderBookerId ? memoryStore.bookers.find((b) => b.id === order.orderBookerId) : null;

  const newOrder: Order = {
    id: newId,
    orderNumber,
    shopId: order.shopId,
    shop_name: shop?.shopName || "Unknown Shop",
    orderBookerId: order.orderBookerId || null,
    booker_name: booker?.name || null,
    orderSource: order.orderSource || "MANUAL_WHATSAPP",
    orderDate: now.slice(0, 10),
    status: "PENDING",
    totalAmount,
    notes: order.notes || null,
    createdBy: 1,
    creator_name: "Business Owner",
    createdAt: now,
  };
  memoryStore.orders.unshift(newOrder);

  for (const it of items) {
    const p = memoryStore.products.find((prod) => prod.id === it.productId);
    memoryStore.orderItems.push({
      id: memoryStore.orderItems.length + 1,
      orderId: newId,
      productId: it.productId,
      product_name: p?.name,
      sku: p?.sku,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      lineTotal: it.quantity * it.unitPrice,
    });
  }

  return newId;
}

async function cancelLinkedBillsForOrder(sqlDb: any, orderId: number): Promise<void> {
  try {
    // 1. Fetch bills linked to this order that are not already cancelled
    const linkedBills = (await sqlDb.select(
      "SELECT id, bill_number, shop_id, net_amount, paid_amount, payment_status FROM bills WHERE order_id = $1 AND payment_status != 'CANCELLED'",
      [orderId]
    )) as any[];

    for (const b of linkedBills) {
      const billId = Number(b.id);
      const shopId = Number(b.shop_id);
      const unpaidDiff = Number(b.net_amount || 0) - Number(b.paid_amount || 0);

      // Restore product inventory stock
      const items = (await sqlDb.select(
        "SELECT product_id, quantity FROM bill_items WHERE bill_id = $1",
        [billId]
      )) as any[];

      for (const it of items) {
        const prodId = Number(it.product_id);
        const qty = Number(it.quantity);

        await sqlDb.execute(
          "UPDATE products SET current_stock = current_stock + $1 WHERE id = $2",
          [qty, prodId]
        );

        const pRows = (await sqlDb.select(
          "SELECT current_stock FROM products WHERE id = $1",
          [prodId]
        )) as any[];
        const balanceAfter = Number(pRows?.[0]?.current_stock || 0);

        await sqlDb.execute(
          `INSERT INTO inventory_ledger (product_id, change_qty, balance_after, transaction_type, reference_id, reference_type, performed_by, notes, created_at)
           VALUES ($1, $2, $3, 'DAMAGE_ADJUSTMENT', $4, 'BILL', 1, $5, datetime('now', 'localtime'))`,
          [prodId, qty, balanceAfter, billId, `Restocked from cancelled order #${orderId}`]
        );
      }

      // Revert shop outstanding balance if credit was issued
      if (unpaidDiff > 0) {
        await sqlDb.execute(
          "UPDATE retail_shops SET outstanding_balance = MAX(0, outstanding_balance - $1) WHERE id = $2",
          [unpaidDiff, shopId]
        );
      }

      // Mark the bill as CANCELLED (excludes from sales and profit)
      await sqlDb.execute(
        "UPDATE bills SET payment_status = 'CANCELLED' WHERE id = $1",
        [billId]
      );
    }
  } catch (err) {
    console.error("Error cancelling linked bills for order:", err);
  }
}

export async function updateOrderStatus(id: number, status: OrderStatus): Promise<void> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();

  if (isTauri && sqlDb) {
    if (status === "CANCELLED") {
      await cancelLinkedBillsForOrder(sqlDb, id);
    }
    await sqlDb.execute("UPDATE orders SET status = $1 WHERE id = $2", [status, id]);
    return;
  }

  // Memory fallback
  const o = memoryStore.orders.find((ord) => ord.id === id);
  if (o) o.status = status;

  if (status === "CANCELLED") {
    const linked = memoryStore.bills.filter(
      (b) => b.orderId === id && b.paymentStatus !== "CANCELLED"
    );
    for (const b of linked) {
      b.paymentStatus = "CANCELLED";
      const bItems = memoryStore.billItems.filter((bi) => bi.billId === b.id);
      for (const it of bItems) {
        const prod = memoryStore.products.find((p) => p.id === it.productId);
        if (prod) prod.currentStock += it.quantity;
      }
      const unpaid = b.netAmount - b.paidAmount;
      if (unpaid > 0) {
        const s = memoryStore.shops.find((shp) => shp.id === b.shopId);
        if (s) s.outstandingBalance = Math.max(0, s.outstandingBalance - unpaid);
      }
    }
  }
}

export async function deleteOrder(id: number): Promise<void> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();

  if (isTauri && sqlDb) {
    try {
      // 1. Cancel and restore any linked bills
      await cancelLinkedBillsForOrder(sqlDb, id);

      // 2. Delete linked bills & bill items so they are permanently removed from profit
      const linkedBills = await sqlDb.select<any[]>(
        "SELECT id FROM bills WHERE order_id = $1",
        [id]
      );
      for (const b of linkedBills) {
        await sqlDb.execute("DELETE FROM bill_items WHERE bill_id = $1", [b.id]);
        await sqlDb.execute("DELETE FROM bills WHERE id = $1", [b.id]);
      }

      // 3. Delete order line items
      await sqlDb.execute("DELETE FROM order_items WHERE order_id = $1", [id]);

      // 4. Delete order record
      await sqlDb.execute("DELETE FROM orders WHERE id = $1", [id]);
    } catch (err) {
      console.error("Failed to delete order in SQLite:", err);
      throw err;
    }
    return;
  }

  // Memory fallback
  const linked = memoryStore.bills.filter((b) => b.orderId === id);
  for (const b of linked) {
    const bItems = memoryStore.billItems.filter((bi) => bi.billId === b.id);
    for (const it of bItems) {
      const prod = memoryStore.products.find((p) => p.id === it.productId);
      if (prod) prod.currentStock += it.quantity;
    }
    const unpaid = b.netAmount - b.paidAmount;
    if (unpaid > 0) {
      const s = memoryStore.shops.find((shp) => shp.id === b.shopId);
      if (s) s.outstandingBalance = Math.max(0, s.outstandingBalance - unpaid);
    }
    memoryStore.billItems = memoryStore.billItems.filter((bi) => bi.billId !== b.id);
  }
  memoryStore.bills = memoryStore.bills.filter((b) => b.orderId !== id);

  memoryStore.orderItems = memoryStore.orderItems.filter((it) => it.orderId !== id);
  const idx = memoryStore.orders.findIndex((o) => o.id === id);
  if (idx !== -1) {
    memoryStore.orders.splice(idx, 1);
  }
}
