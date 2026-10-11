import { isTauriEnvironment, memoryStore, getSqlDb } from "./client";
import { OrderBooker, NewOrderBooker, BookerReconciliation } from "./schema";

export async function getBookers(): Promise<OrderBooker[]> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();

  if (isTauri && sqlDb) {
    try {
      const rows = await sqlDb.select<any[]>(
        "SELECT * FROM order_bookers WHERE is_active = 1 ORDER BY name ASC"
      );
      return rows.map((r) => ({
        id: Number(r.id),
        name: String(r.name || ""),
        phone: String(r.phone || ""),
        territory: r.territory ? String(r.territory) : null,
        commissionRate: Number(r.commission_rate ?? 0),
        isActive: Number(r.is_active ?? 1),
        createdAt: String(r.created_at || ""),
      }));
    } catch (err) {
      console.error("Failed to query order bookers:", err);
    }
  }

  return memoryStore.bookers.filter((b) => b.isActive === 1);
}

export async function addBooker(booker: Omit<NewOrderBooker, "id" | "createdAt" | "isActive">): Promise<number> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();
  const now = new Date().toISOString();

  if (isTauri && sqlDb) {
    const res = await sqlDb.execute(
      `INSERT INTO order_bookers (name, phone, territory, commission_rate, is_active, created_at)
       VALUES ($1, $2, $3, $4, 1, $5)`,
      [
        booker.name.trim(),
        booker.phone.trim(),
        booker.territory?.trim() || null,
        Number(booker.commissionRate) || 0,
        now,
      ]
    );
    return Number(res.lastInsertId) || 1;
  }

  const newId = memoryStore.bookers.length > 0 ? Math.max(...memoryStore.bookers.map((b) => b.id)) + 1 : 1;
  const newB: OrderBooker = {
    id: newId,
    name: booker.name.trim(),
    phone: booker.phone.trim(),
    territory: booker.territory?.trim() || null,
    commissionRate: Number(booker.commissionRate) || 0,
    isActive: 1,
    createdAt: now,
  };
  memoryStore.bookers.push(newB);
  return newId;
}

export async function updateBooker(id: number, booker: Partial<OrderBooker>): Promise<void> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();

  if (isTauri && sqlDb) {
    await sqlDb.execute(
      `UPDATE order_bookers SET
         name = COALESCE($1, name),
         phone = COALESCE($2, phone),
         territory = COALESCE($3, territory),
         commission_rate = COALESCE($4, commission_rate),
         is_active = COALESCE($5, is_active)
       WHERE id = $6`,
      [
        booker.name,
        booker.phone,
        booker.territory,
        booker.commissionRate,
        booker.isActive,
        id,
      ]
    );
    return;
  }

  const idx = memoryStore.bookers.findIndex((b) => b.id === id);
  if (idx !== -1) {
    memoryStore.bookers[idx] = { ...memoryStore.bookers[idx], ...booker };
  }
}

export async function reconcileBooker(data: {
  orderBookerId: number;
  ordersCountTotal: number;
  ordersCountCollected: number;
  ordersCountPending: number;
  totalCashSubmitted: number;
  totalCreditIssued: number;
  shortageAmount: number;
}): Promise<void> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();
  const now = new Date().toISOString();

  if (isTauri && sqlDb) {
    await sqlDb.execute(
      `INSERT INTO booker_reconciliations (reconciliation_date, order_booker_id, orders_count_total, orders_count_collected, orders_count_pending, total_cash_submitted, total_credit_issued, shortage_amount, verified_by, created_at)
       VALUES (date('now', 'localtime'), $1, $2, $3, $4, $5, $6, $7, 1, $8)`,
      [
        data.orderBookerId,
        data.ordersCountTotal,
        data.ordersCountCollected,
        data.ordersCountPending,
        data.totalCashSubmitted,
        data.totalCreditIssued,
        data.shortageAmount,
        now,
      ]
    );
    return;
  }

  memoryStore.bookerReconciliations.push({
    id: memoryStore.bookerReconciliations.length + 1,
    reconciliationDate: now.slice(0, 10),
    orderBookerId: data.orderBookerId,
    ordersCountTotal: data.ordersCountTotal,
    ordersCountCollected: data.ordersCountCollected,
    ordersCountPending: data.ordersCountPending,
    totalCashSubmitted: data.totalCashSubmitted,
    totalCreditIssued: data.totalCreditIssued,
    shortageAmount: data.shortageAmount,
    verifiedBy: 1,
    createdAt: now,
  });
}

export async function getBookerReconciliations(bookerId?: number): Promise<BookerReconciliation[]> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();

  if (isTauri && sqlDb) {
    try {
      const query = bookerId
        ? "SELECT * FROM booker_reconciliations WHERE order_booker_id = $1 ORDER BY id DESC"
        : "SELECT * FROM booker_reconciliations ORDER BY id DESC LIMIT 50";
      const rows = await sqlDb.select<any[]>(query, bookerId ? [bookerId] : []);
      return rows.map((r) => ({
        id: Number(r.id),
        reconciliationDate: String(r.reconciliation_date),
        orderBookerId: Number(r.order_booker_id),
        ordersCountTotal: Number(r.orders_count_total),
        ordersCountCollected: Number(r.orders_count_collected),
        ordersCountPending: Number(r.orders_count_pending),
        totalCashSubmitted: Number(r.total_cash_submitted),
        totalCreditIssued: Number(r.total_credit_issued),
        shortageAmount: Number(r.shortage_amount),
        verifiedBy: Number(r.verified_by),
        createdAt: String(r.created_at),
      }));
    } catch (err) {
      console.error("Failed to query reconciliations:", err);
    }
  }

  return memoryStore.bookerReconciliations.filter((r) => !bookerId || r.orderBookerId === bookerId);
}
