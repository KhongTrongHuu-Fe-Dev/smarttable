import { supabase } from "@/lib/supabase/client";
import { ORDER_STATUS } from "@/data/mock";

const VALID_STATUS = Object.values(ORDER_STATUS);

function fail(message, status = 400) {
  return Response.json({ message }, { status });
}

// GET /api/orders?table_id=1  (khong co table_id -> tat ca don, dung cho bep/admin)
export async function GET(request) {
  if (!supabase) return fail("Chua cau hinh Supabase.", 503);

  const tableId = new URL(request.url).searchParams.get("table_id");
  let query = supabase
    .from("orders")
    .select("*, order_items(menu_item_id, quantity, price, note, menu_items(name))")
    .order("created_at", { ascending: false });
  if (tableId) query = query.eq("table_id", tableId);

  const { data, error } = await query;
  if (error) return fail(error.message, 500);

  const orders = data.map(({ order_items, ...order }) => ({
    ...order,
    items: order_items.map(({ menu_items, ...it }) => ({
      ...it,
      name: menu_items?.name,
    })),
  }));
  return Response.json({ orders });
}

// POST { table_id, items: [{ menu_item_id, quantity, note }] }
export async function POST(request) {
  if (!supabase) return fail("Chua cau hinh Supabase.", 503);

  const body = await request.json().catch(() => null);
  const items = body?.items;
  if (!body?.table_id || !Array.isArray(items) || items.length === 0) {
    return fail("Thieu table_id hoac danh sach mon.");
  }

  // Lay gia that tu database, khong tin gia client gui len
  const ids = items.map((i) => i.menu_item_id);
  const { data: menu, error: menuErr } = await supabase
    .from("menu_items")
    .select("id, price, is_available")
    .in("id", ids);
  if (menuErr) return fail(menuErr.message, 500);

  const byId = new Map(menu.map((m) => [String(m.id), m]));
  const rows = [];
  let total = 0;
  for (const it of items) {
    const m = byId.get(String(it.menu_item_id));
    const qty = Number(it.quantity);
    if (!m || !m.is_available) return fail(`Mon ${it.menu_item_id} khong ton tai hoac da het.`);
    if (!Number.isInteger(qty) || qty < 1) return fail("So luong khong hop le.");
    total += m.price * qty;
    rows.push({ menu_item_id: m.id, quantity: qty, price: m.price, note: it.note || null });
  }

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({ table_id: body.table_id, status: ORDER_STATUS.PENDING, total })
    .select()
    .single();
  if (orderErr) return fail(orderErr.message, 500);

  const { error: itemsErr } = await supabase
    .from("order_items")
    .insert(rows.map((r) => ({ ...r, order_id: order.id })));
  if (itemsErr) return fail(itemsErr.message, 500);

  return Response.json({ ...order, items: rows }, { status: 201 });
}

// PATCH { id, status }
export async function PATCH(request) {
  if (!supabase) return fail("Chua cau hinh Supabase.", 503);

  const { id, status } = (await request.json().catch(() => ({}))) ?? {};
  if (!id || !VALID_STATUS.includes(status)) return fail("id hoac status khong hop le.");

  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) return fail(error.message, 500);
  return Response.json(data);
}
