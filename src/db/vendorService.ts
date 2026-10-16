import { isTauriEnvironment, memoryStore, getSqlDb } from "./client";
import { Vendor, NewVendor, VendorPayment } from "./schema";

export async function getVendors(): Promise<Vendor[]> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();

  if (isTauri && sqlDb) {
    try {
      const rows = await sqlDb.select<any[]>(
        `SELECT v.*, (v.total_purchases - v.total_paid) as payable_balance, u.full_name as creator_name
         FROM vendors v
         LEFT JOIN system_users u ON v.created_by = u.id
         WHERE v.is_active = 1
         ORDER BY v.name ASC`
      );
      return rows.map((r) => ({
        id: Number(r.id),
        name: String(r.name || ""),
        contactPerson: r.contact_person ? String(r.contact_person) : null,
        phone: r.phone ? String(r.phone) : null,
        email: r.email ? String(r.email) : null,
        address: r.address ? String(r.address) : null,
        city: r.city ? String(r.city) : null,
        notes: r.notes ? String(r.notes) : null,
        totalPurchases: Number(r.total_purchases ?? 0),
        totalPaid: Number(r.total_paid ?? 0),
        payable_balance: Number(r.payable_balance ?? (Number(r.total_purchases ?? 0) - Number(r.total_paid ?? 0))),
        isActive: Number(r.is_active ?? 1),
        createdBy: Number(r.created_by ?? 1),
        creator_name: r.creator_name ? String(r.creator_name) : "Admin",
        createdAt: String(r.created_at || ""),
        updatedAt: String(r.updated_at || ""),
      }));
    } catch (err) {
      console.error("Failed to query vendors:", err);
    }
  }

  return memoryStore.vendors
    .filter((v) => v.isActive === 1)
    .map((v) => ({ ...v, payable_balance: v.totalPurchases - v.totalPaid }));
}

export async function addVendor(vendor: Omit<NewVendor, "id" | "createdAt" | "updatedAt" | "totalPurchases" | "totalPaid">): Promise<number> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();
  const now = new Date().toISOString();

  if (isTauri && sqlDb) {
    const res = await sqlDb.execute(
      `INSERT INTO vendors (name, contact_person, phone, email, address, city, notes, total_purchases, total_paid, is_active, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0.0, 0.0, 1, 1, $8, $9)`,
      [
        vendor.name.trim(),
        vendor.contactPerson?.trim() || null,
        vendor.phone?.trim() || null,
        vendor.email?.trim() || null,
        vendor.address?.trim() || null,
        vendor.city?.trim() || null,
        vendor.notes?.trim() || null,
        now,
        now,
      ]
    );
    return Number(res.lastInsertId) || 1;
  }

  const newId = memoryStore.vendors.length > 0 ? Math.max(...memoryStore.vendors.map((v) => v.id)) + 1 : 1;
  const newV: Vendor = {
    id: newId,
    name: vendor.name.trim(),
    contactPerson: vendor.contactPerson?.trim() || null,
    phone: vendor.phone?.trim() || null,
    email: vendor.email?.trim() || null,
    address: vendor.address?.trim() || null,
    city: vendor.city?.trim() || null,
    notes: vendor.notes?.trim() || null,
    totalPurchases: 0,
    totalPaid: 0,
    payable_balance: 0,
    isActive: 1,
    createdBy: 1,
    createdAt: now,
    updatedAt: now,
  };
  memoryStore.vendors.push(newV);
  return newId;
}

export async function updateVendor(id: number, vendor: Partial<Vendor>): Promise<void> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();
  const now = new Date().toISOString();

  if (isTauri && sqlDb) {
    await sqlDb.execute(
      `UPDATE vendors SET
         name = COALESCE($1, name),
         contact_person = COALESCE($2, contact_person),
         phone = COALESCE($3, phone),
         email = COALESCE($4, email),
         address = COALESCE($5, address),
         city = COALESCE($6, city),
         notes = COALESCE($7, notes),
         updated_at = $8
       WHERE id = $9`,
      [
        vendor.name,
        vendor.contactPerson,
        vendor.phone,
        vendor.email,
        vendor.address,
        vendor.city,
        vendor.notes,
        now,
        id,
      ]
    );
    return;
  }

  const idx = memoryStore.vendors.findIndex((v) => v.id === id);
  if (idx !== -1) {
    memoryStore.vendors[idx] = { ...memoryStore.vendors[idx], ...vendor, updatedAt: now };
  }
}

export async function deleteVendor(id: number): Promise<void> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();

  if (isTauri && sqlDb) {
    try {
      await sqlDb.execute("UPDATE vendors SET is_active = 0 WHERE id = $1", [id]);
    } catch {
      await sqlDb.execute("DELETE FROM vendors WHERE id = $1", [id]);
    }
    return;
  }

  const v = memoryStore.vendors.find((ven) => ven.id === id);
  if (v) v.isActive = 0;
  const idx = memoryStore.vendors.findIndex((ven) => ven.id === id);
  if (idx !== -1) memoryStore.vendors.splice(idx, 1);
}

export async function recordVendorPayment(data: {
  vendorId: number;
  amount: number;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
}): Promise<void> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();
  const now = new Date().toISOString();
  const amt = Number(data.amount) || 0;

  if (isTauri && sqlDb) {
    // 1. Log payment
    await sqlDb.execute(
      `INSERT INTO vendor_payments (vendor_id, amount, payment_date, payment_method, reference, notes, created_by, created_at)
       VALUES ($1, $2, date('now', 'localtime'), $3, $4, $5, 1, $6)`,
      [data.vendorId, amt, data.paymentMethod || "CASH", data.reference || null, data.notes || null, now]
    );

    // 2. Update vendor total_paid
    await sqlDb.execute(
      `UPDATE vendors SET total_paid = total_paid + $1, updated_at = $2 WHERE id = $3`,
      [amt, now, data.vendorId]
    );
    return;
  }

  const v = memoryStore.vendors.find((ven) => ven.id === data.vendorId);
  if (v) {
    v.totalPaid += amt;
    v.payable_balance = v.totalPurchases - v.totalPaid;
  }
  memoryStore.vendorPayments.push({
    id: memoryStore.vendorPayments.length + 1,
    vendorId: data.vendorId,
    amount: amt,
    paymentDate: now.slice(0, 10),
    paymentMethod: data.paymentMethod || "CASH",
    reference: data.reference || null,
    notes: data.notes || null,
    createdBy: 1,
    createdAt: now,
  });
}

export async function getVendorPayments(vendorId?: number): Promise<VendorPayment[]> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();

  if (isTauri && sqlDb) {
    try {
      const query = vendorId
        ? `SELECT vp.*, v.name as vendor_name, u.full_name as creator_name
           FROM vendor_payments vp
           JOIN vendors v ON vp.vendor_id = v.id
           LEFT JOIN system_users u ON vp.created_by = u.id
           WHERE vp.vendor_id = $1
           ORDER BY vp.id DESC`
        : `SELECT vp.*, v.name as vendor_name, u.full_name as creator_name
           FROM vendor_payments vp
           JOIN vendors v ON vp.vendor_id = v.id
           LEFT JOIN system_users u ON vp.created_by = u.id
           ORDER BY vp.id DESC LIMIT 100`;

      const rows = await sqlDb.select<any[]>(query, vendorId ? [vendorId] : []);
      return rows.map((r) => ({
        id: Number(r.id),
        vendorId: Number(r.vendor_id),
        vendor_name: String(r.vendor_name),
        amount: Number(r.amount),
        paymentDate: String(r.payment_date),
        paymentMethod: String(r.payment_method),
        reference: r.reference ? String(r.reference) : null,
        notes: r.notes ? String(r.notes) : null,
        createdBy: Number(r.created_by),
        creator_name: r.creator_name ? String(r.creator_name) : "Admin",
        createdAt: String(r.created_at),
      }));
    } catch (err) {
      console.error("Failed to query vendor payments:", err);
    }
  }

  return memoryStore.vendorPayments.filter((p) => !vendorId || p.vendorId === vendorId);
}
