import { supabase } from "@/lib/supabase/client";
import { ORDER_STATUS } from "@/data/mock";

const VALID_STATUS = Object.values(ORDER_STATUS);

function fail(message, status = 400) {
  return Response.json({ error: message }, { status });
}

// GET /api/orders/[id] (Khách xem 1 đơn)
export async function GET(request, { params }) {
  if (!supabase) return fail("Chưa cấu hình Supabase.", 503);

  const { id } = await params;

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(menu_item_id, quantity, price, note, menu_items(name))")
    .eq("id", id)
    .single();

  if (error || !data) {
    return fail("Không tìm thấy đơn hàng.", 404);
  }

  const { order_items, ...order } = data;
  const formattedOrder = {
    ...order,
    items: (order_items || []).map(({ menu_items, ...it }) => ({
      menu_item_id: it.menu_item_id,
      name: menu_items?.name || "",
      price: it.price,
      quantity: it.quantity,
      note: it.note ?? null,
    })),
  };

  return Response.json(formattedOrder);
}

// PATCH /api/orders/[id] { status } (Đổi trạng thái đơn)
export async function PATCH(request, { params }) {
  if (!supabase) return fail("Chưa cấu hình Supabase.", 503);

  const { id } = await params;
  const { status } = (await request.json().catch(() => ({}))) ?? {};

  if (!status || !VALID_STATUS.includes(status)) {
    return fail("Trạng thái đơn hàng không hợp lệ.", 400);
  }

  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    return fail(error?.message || "Không tìm thấy đơn hàng.", 404);
  }

  return Response.json(data);
}