import { supabase } from "@/lib/supabase/client";

function fail(message, status = 400) {
  return Response.json({ error: message }, { status });
}

// GET /api/orders?status=pending,cooking&table_id=&date=2026-11-16
export async function GET(request) {
  if (!supabase) return fail("Chưa cấu hình Supabase.", 503);

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const tableId = searchParams.get("table_id");
  const date = searchParams.get("date");

  let query = supabase
    .from("orders")
    .select("*, order_items(menu_item_id, quantity, price, note, menu_items(name))")
    .order("created_at", { ascending: false });

  if (statusParam) {
    const statuses = statusParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (statuses.length === 1) {
      query = query.eq("status", statuses[0]);
    } else if (statuses.length > 1) {
      query = query.in("status", statuses);
    }
  }

  if (tableId) {
    query = query.eq("table_id", tableId);
  }

  if (date) {
    query = query
      .gte("created_at", `${date}T00:00:00+07:00`)
      .lte("created_at", `${date}T23:59:59.999+07:00`);
  }

  const { data, error } = await query;
  if (error) return fail(error.message, 500);

  const orders = (data || []).map(({ order_items, ...order }) => ({
    ...order,
    items: (order_items || []).map(({ menu_items, ...it }) => ({
      menu_item_id: it.menu_item_id,
      name: menu_items?.name || "",
      price: it.price,
      quantity: it.quantity,
      note: it.note ?? null,
    })),
  }));

  return Response.json(orders);
}

// POST /api/orders { table_id, items: [{ menu_item_id, quantity, note }] }
export async function POST(request) {
  if (!supabase) return fail("Chưa cấu hình Supabase.", 503);

  const body = await request.json().catch(() => null);
  const items = body?.items;
  if (!body?.table_id || !Array.isArray(items) || items.length === 0) {
    return fail("Thiếu table_id hoặc danh sách món.");
  }

  // Lấy giá thật và tên món từ database, không tin số tiền client gửi lên
  const ids = items.map((i) => i.menu_item_id);
  const { data: menu, error: menuErr } = await supabase
    .from("menu_items")
    .select("id, name, price, is_available")
    .in("id", ids);
  if (menuErr) return fail(menuErr.message, 500);

  const byId = new Map((menu || []).map((m) => [String(m.id), m]));
  const rows = [];
  let total = 0;

  for (const it of items) {
    const m = byId.get(String(it.menu_item_id));
    const qty = Number(it.quantity);
    if (!m || m.is_available === false) {
      return fail(`Món ${it.menu_item_id} không tồn tại hoặc đã hết.`);
    }
    if (!Number.isInteger(qty) || qty < 1) {
      return fail("Số lượng không hợp lệ.");
    }
    total += Number(m.price) * qty;
    rows.push({
      menu_item_id: m.id,
      name: m.name,
      quantity: qty,
      price: Number(m.price),
      note: it.note ?? null,
    });
  }

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({ table_id: body.table_id, status: "pending", total })
    .select()
    .single();
  if (orderErr) return fail(orderErr.message, 500);

  const { error: itemsErr } = await supabase
    .from("order_items")
    .insert(rows.map(({ name, ...r }) => ({ ...r, order_id: order.id })));
  if (itemsErr) return fail(itemsErr.message, 500);

  return Response.json({ ...order, items: rows }, { status: 201 });
}