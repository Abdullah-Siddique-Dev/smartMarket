import { isTauriEnvironment, memoryStore, getSqlDb } from "./client";
import { RetailShop, NewRetailShop, ShopPayment } from "./schema";

export async function getShops(): Promise<RetailShop[]> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();

  if (isTauri && sqlDb) {
    try {
      let rows: any[];
      try {
        rows = await sqlDb.select<any[]>(
          "SELECT * FROM retail_shops WHERE is_active = 1 OR is_active IS NULL ORDER BY shop_name ASC"
        );
      } catch {
        rows = await sqlDb.select<any[]>(
          "SELECT * FROM retail_shops ORDER BY shop_name ASC"
        );
      }
      return rows.map((r) => ({
        id: Number(r.id),
        shopName: String(r.shop_name || ""),
        ownerName: r.owner_name ? String(r.owner_name) : null,
        phone: r.phone ? String(r.phone) : null,
        address: r.address ? String(r.address) : null,
        outstandingBalance: Number(r.outstanding_balance ?? 0),
        creditLimit: Number(r.credit_limit ?? 0),
        isActive: r.is_active !== undefined ? Number(r.is_active) : 1,
        createdAt: String(r.created_at || ""),
      }));
    } catch (err) {
      console.error("Failed to query shops:", err);
    }
  }

  return memoryStore.shops.filter((s) => s.isActive !== 0);
}

export async function addShop(shop: Omit<NewRetailShop, "id" | "createdAt" | "outstandingBalance">): Promise<number> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();
  const now = new Date().toISOString();

  if (isTauri && sqlDb) {
    const res = await sqlDb.execute(
      `INSERT INTO retail_shops (shop_name, owner_name, phone, address, outstanding_balance, credit_limit, created_at)
       VALUES ($1, $2, $3, $4, 0.0, $5, $6)`,
      [
        shop.shopName.trim(),
        shop.ownerName?.trim() || null,
        shop.phone?.trim() || null,
        shop.address?.trim() || null,
        Number(shop.creditLimit) || 0,
        now,
      ]
    );
    return Number(res.lastInsertId) || 1;
  }

  const newId = memoryStore.shops.length > 0 ? Math.max(...memoryStore.shops.map((s) => s.id)) + 1 : 1;
  const newShop: RetailShop = {
    id: newId,
    shopName: shop.shopName.trim(),
    ownerName: shop.ownerName?.trim() || null,
    phone: shop.phone?.trim() || null,
    address: shop.address?.trim() || null,
    outstandingBalance: 0,
    creditLimit: Number(shop.creditLimit) || 0,
    isActive: 1,
    createdAt: now,
  };
  memoryStore.shops.push(newShop);
  return newId;
}

export async function deleteShop(id: number): Promise<void> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();

  if (isTauri && sqlDb) {
    try {
      await sqlDb.execute("UPDATE retail_shops SET is_active = 0 WHERE id = $1", [id]);
    } catch {
      await sqlDb.execute("DELETE FROM retail_shops WHERE id = $1", [id]);
    }
    return;
  }

  const idx = memoryStore.shops.findIndex((s) => s.id === id);
  if (idx !== -1) {
    memoryStore.shops[idx].isActive = 0;
    memoryStore.shops.splice(idx, 1);
  }
}

export async function updateShop(id: number, shop: Partial<RetailShop>): Promise<void> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();

  if (isTauri && sqlDb) {
    await sqlDb.execute(
      `UPDATE retail_shops SET
         shop_name = COALESCE($1, shop_name),
         owner_name = COALESCE($2, owner_name),
         phone = COALESCE($3, phone),
         address = COALESCE($4, address),
         credit_limit = COALESCE($5, credit_limit)
       WHERE id = $6`,
      [
        shop.shopName,
        shop.ownerName,
        shop.phone,
        shop.address,
        shop.creditLimit,
        id,
      ]
    );
    return;
  }

  const idx = memoryStore.shops.findIndex((s) => s.id === id);
  if (idx !== -1) {
    memoryStore.shops[idx] = { ...memoryStore.shops[idx], ...shop };
  }
}

export async function recordShopPayment(data: {
  shopId: number;
  amount: number;
  paymentMethod?: string;
  notes?: string;
}): Promise<void> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();
  const now = new Date().toISOString();
  const amt = Number(data.amount) || 0;

  if (isTauri && sqlDb) {
    // 1. Log payment
    await sqlDb.execute(
      `INSERT INTO shop_payments (shop_id, amount, payment_date, payment_method, notes, received_by, created_at)
       VALUES ($1, $2, $3, $4, $5, 1, $6)`,
      [data.shopId, amt, now, data.paymentMethod || "CASH", data.notes || "", now]
    );

    // 2. Reduce shop outstanding balance
    await sqlDb.execute(
      `UPDATE retail_shops SET outstanding_balance = outstanding_balance - $1 WHERE id = $2`,
      [amt, data.shopId]
    );
    return;
  }

  const shop = memoryStore.shops.find((s) => s.id === data.shopId);
  if (shop) {
    shop.outstandingBalance -= amt;
  }
  memoryStore.shopPayments.push({
    id: memoryStore.shopPayments.length + 1,
    shopId: data.shopId,
    amount: amt,
    paymentDate: now,
    paymentMethod: data.paymentMethod || "CASH",
    notes: data.notes || "",
    receivedBy: 1,
    createdAt: now,
  });
}

export async function getShopPayments(shopId?: number): Promise<ShopPayment[]> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();

  if (isTauri && sqlDb) {
    try {
      const query = shopId
        ? `SELECT sp.*, rs.shop_name FROM shop_payments sp JOIN retail_shops rs ON sp.shop_id = rs.id WHERE sp.shop_id = $1 ORDER BY sp.id DESC`
        : `SELECT sp.*, rs.shop_name FROM shop_payments sp JOIN retail_shops rs ON sp.shop_id = rs.id ORDER BY sp.id DESC LIMIT 100`;
      const rows = await sqlDb.select<any[]>(query, shopId ? [shopId] : []);
      return rows.map((r) => ({
        id: Number(r.id),
        shopId: Number(r.shop_id),
        shop_name: String(r.shop_name),
        amount: Number(r.amount),
        paymentDate: String(r.payment_date),
        paymentMethod: String(r.payment_method),
        notes: r.notes ? String(r.notes) : null,
        receivedBy: Number(r.received_by),
        createdAt: String(r.created_at),
      }));
    } catch (err) {
      console.error("Failed to query shop payments:", err);
    }
  }

  return memoryStore.shopPayments.filter((p) => !shopId || p.shopId === shopId);
}

export async function getShopLedger(shopId: number) {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();

  if (isTauri && sqlDb) {
    try {
      // 1. Get bills (debit)
      const bills = await sqlDb.select<any[]>(
        `SELECT id, bill_number as ref, bill_date as date, net_amount as debit, paid_amount as credit, (net_amount - paid_amount) as balance, 'INVOICE' as type, payment_status as status
         FROM bills WHERE shop_id = $1`,
        [shopId]
      );
      // 2. Get payments (credit)
      const payments = await sqlDb.select<any[]>(
        `SELECT id, ('PMT-' || id) as ref, payment_date as date, 0 as debit, amount as credit, (-amount) as balance, 'PAYMENT' as type, payment_method as status
         FROM shop_payments WHERE shop_id = $1`,
        [shopId]
      );

      const all = [...bills, ...payments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      let running = 0;
      return all.map((entry) => {
        running += Number(entry.debit) - Number(entry.credit);
        return {
          ...entry,
          runningBalance: running,
        };
      });
    } catch (err) {
      console.error("Failed to query shop ledger:", err);
    }
  }

  return [];
}
