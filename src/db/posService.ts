import { isTauriEnvironment, memoryStore, getSqlDb } from "./client";
import { Bill, BillItem, PaymentStatus } from "./schema";

export async function getBills(): Promise<Bill[]> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();

  if (isTauri && sqlDb) {
    try {
      const rows = await sqlDb.select<any[]>(
        `SELECT b.*, rs.shop_name, rs.phone as shop_phone, rs.address as shop_address, ob.name as booker_name, u.full_name as creator_name
         FROM bills b
         JOIN retail_shops rs ON b.shop_id = rs.id
         LEFT JOIN order_bookers ob ON b.order_booker_id = ob.id
         LEFT JOIN system_users u ON b.created_by = u.id
         ORDER BY b.id DESC LIMIT 200`
      );
      return rows.map((r) => ({
        id: Number(r.id),
        billNumber: String(r.bill_number),
        orderId: r.order_id ? Number(r.order_id) : null,
        shopId: Number(r.shop_id),
        shop_name: String(r.shop_name),
        shop_phone: r.shop_phone ? String(r.shop_phone) : null,
        shop_address: r.shop_address ? String(r.shop_address) : null,
        orderBookerId: r.order_booker_id ? Number(r.order_booker_id) : null,
        booker_name: r.booker_name ? String(r.booker_name) : null,
        billDate: String(r.bill_date),
        subtotal: Number(r.subtotal),
        discountAmount: Number(r.discount_amount),
        netAmount: Number(r.net_amount),
        paidAmount: Number(r.paid_amount),
        paymentStatus: r.payment_status as PaymentStatus,
        createdBy: Number(r.created_by),
        creator_name: r.creator_name ? String(r.creator_name) : "Admin",
        createdAt: String(r.created_at),
      }));
    } catch (err) {
      console.error("Failed to query bills:", err);
    }
  }

  return memoryStore.bills;
}

export async function getBillById(id: number): Promise<Bill | null> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();

  if (isTauri && sqlDb) {
    try {
      const rows = await sqlDb.select<any[]>(
        `SELECT b.*, rs.shop_name, rs.phone as shop_phone, rs.address as shop_address, ob.name as booker_name, u.full_name as creator_name
         FROM bills b
         JOIN retail_shops rs ON b.shop_id = rs.id
         LEFT JOIN order_bookers ob ON b.order_booker_id = ob.id
         LEFT JOIN system_users u ON b.created_by = u.id
         WHERE b.id = $1`,
        [id]
      );
      if (!rows || rows.length === 0) return null;
      const r = rows[0];

      const itemRows = await sqlDb.select<any[]>(
        `SELECT bi.*, p.name as product_name, p.sku
         FROM bill_items bi
         JOIN products p ON bi.product_id = p.id
         WHERE bi.bill_id = $1`,
        [id]
      );

      const items: BillItem[] = itemRows.map((it) => ({
        id: Number(it.id),
        billId: Number(it.bill_id),
        productId: Number(it.product_id),
        product_name: String(it.product_name),
        sku: String(it.sku),
        quantity: Number(it.quantity),
        unitSellingPrice: Number(it.unit_selling_price),
        unitPurchasePrice: Number(it.unit_purchase_price),
        lineTotal: Number(it.line_total),
        lineProfit: Number(it.line_profit),
      }));

      return {
        id: Number(r.id),
        billNumber: String(r.bill_number),
        orderId: r.order_id ? Number(r.order_id) : null,
        shopId: Number(r.shop_id),
        shop_name: String(r.shop_name),
        shop_phone: r.shop_phone ? String(r.shop_phone) : null,
        shop_address: r.shop_address ? String(r.shop_address) : null,
        orderBookerId: r.order_booker_id ? Number(r.order_booker_id) : null,
        booker_name: r.booker_name ? String(r.booker_name) : null,
        billDate: String(r.bill_date),
        subtotal: Number(r.subtotal),
        discountAmount: Number(r.discount_amount),
        netAmount: Number(r.net_amount),
        paidAmount: Number(r.paid_amount),
        paymentStatus: r.payment_status as PaymentStatus,
        createdBy: Number(r.created_by),
        creator_name: r.creator_name ? String(r.creator_name) : "Admin",
        createdAt: String(r.created_at),
        items,
      };
    } catch (err) {
      console.error("Failed to query bill by id:", err);
    }
  }

  const b = memoryStore.bills.find((bill) => bill.id === id);
  if (!b) return null;
  const items = memoryStore.billItems.filter((it) => it.billId === id);
  return { ...b, items };
}

export async function createBill(
  billData: {
    shopId: number;
    orderId?: number | null;
    orderBookerId?: number | null;
    subtotal: number;
    discountAmount: number;
    netAmount: number;
    paidAmount: number;
    paymentStatus: PaymentStatus;
    deductStock?: boolean;
  },
  items: Array<{ productId: number; quantity: number; unitSellingPrice: number }>
): Promise<number> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();
  const now = new Date().toISOString();
  const billNumber = `INV-${Date.now().toString().slice(-6)}`;
  const unpaidDifference = billData.netAmount - billData.paidAmount;

  if (isTauri && sqlDb) {
    const res = await sqlDb.execute(
      `INSERT INTO bills (bill_number, order_id, shop_id, order_booker_id, bill_date, subtotal, discount_amount, net_amount, paid_amount, payment_status, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1, $11)`,
      [
        billNumber,
        billData.orderId || null,
        billData.shopId,
        billData.orderBookerId || null,
        now,
        billData.subtotal,
        billData.discountAmount,
        billData.netAmount,
        billData.paidAmount,
        billData.paymentStatus,
        now,
      ]
    );

    const newBillId = Number(res.lastInsertId) || 1;

    for (const it of items) {
      // Query purchase price for profit snapshot
      const pRows = await sqlDb.select<any[]>(
        "SELECT purchase_price, current_stock FROM products WHERE id = $1",
        [it.productId]
      );
      const purchasePrice = Number(pRows?.[0]?.purchase_price || 0);
      const currentStock = Number(pRows?.[0]?.current_stock || 0);
      const lineTotal = it.quantity * it.unitSellingPrice;
      const lineProfit = (it.unitSellingPrice - purchasePrice) * it.quantity;

      // 1. Insert bill_items
      await sqlDb.execute(
        `INSERT INTO bill_items (bill_id, product_id, quantity, unit_purchase_price, unit_selling_price, line_total, line_profit)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [newBillId, it.productId, it.quantity, purchasePrice, it.unitSellingPrice, lineTotal, lineProfit]
      );

      // 2. Deduct inventory stock if direct POS sale
      if (billData.deductStock !== false) {
        const newBalance = currentStock - it.quantity;
        await sqlDb.execute(
          `UPDATE products SET current_stock = $1 WHERE id = $2`,
          [newBalance, it.productId]
        );
        await sqlDb.execute(
          `INSERT INTO inventory_ledger (product_id, change_qty, balance_after, transaction_type, reference_id, reference_type, performed_by, notes, created_at)
           VALUES ($1, -$2, $3, 'SALE_BILL', $4, 'BILL', 1, $5, $6)`,
          [it.productId, it.quantity, newBalance, newBillId, `Sale Invoice ${billNumber}`, now]
        );
      }
    }

    // 3. Update shop balance if credit
    if (unpaidDifference > 0) {
      await sqlDb.execute(
        `UPDATE retail_shops SET outstanding_balance = outstanding_balance + $1 WHERE id = $2`,
        [unpaidDifference, billData.shopId]
      );
    }

    // 4. Mark order as billed if linked
    if (billData.orderId) {
      await sqlDb.execute(
        "UPDATE orders SET status = 'BILLED' WHERE id = $1",
        [billData.orderId]
      );
    }

    return newBillId;
  }

  const newId = memoryStore.bills.length > 0 ? Math.max(...memoryStore.bills.map((b) => b.id)) + 1 : 1;
  const shop = memoryStore.shops.find((s) => s.id === billData.shopId);
  if (shop && unpaidDifference > 0) {
    shop.outstandingBalance += unpaidDifference;
  }

  const newBill: Bill = {
    id: newId,
    billNumber,
    orderId: billData.orderId || null,
    shopId: billData.shopId,
    shop_name: shop?.shopName || "Wholesale Shop",
    shop_phone: shop?.phone || null,
    shop_address: shop?.address || null,
    orderBookerId: billData.orderBookerId || null,
    booker_name: null,
    billDate: now,
    subtotal: billData.subtotal,
    discountAmount: billData.discountAmount,
    netAmount: billData.netAmount,
    paidAmount: billData.paidAmount,
    paymentStatus: billData.paymentStatus,
    createdBy: 1,
    creator_name: "Business Owner",
    createdAt: now,
  };
  memoryStore.bills.unshift(newBill);

  for (const it of items) {
    const prod = memoryStore.products.find((p) => p.id === it.productId);
    const cost = prod?.purchasePrice || 0;
    if (prod && billData.deductStock !== false) {
      prod.currentStock -= it.quantity;
    }
    memoryStore.billItems.push({
      id: memoryStore.billItems.length + 1,
      billId: newId,
      productId: it.productId,
      product_name: prod?.name || "Product",
      sku: prod?.sku || "SKU",
      quantity: it.quantity,
      unitSellingPrice: it.unitSellingPrice,
      unitPurchasePrice: cost,
      lineTotal: it.quantity * it.unitSellingPrice,
      lineProfit: (it.unitSellingPrice - cost) * it.quantity,
    });
  }

  return newId;
}
