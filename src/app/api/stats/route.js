import { requireRole, ROLES } from "@/lib/supabase/server";

function getTodayVN() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

export async function GET(request) {
  try {
    // Doanh thu chỉ admin được xem. `supabase` bên dưới mang quyền người đăng nhập.
    const auth = await requireRole([ROLES.ADMIN]);
    if (auth.error) return auth.error;
    const { supabase } = auth;

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const date = dateParam ? dateParam.trim() : getTodayVN();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return Response.json(
        { error: "Tham số date phải có định dạng YYYY-MM-DD (ví dụ: 2026-11-20)" },
        { status: 400 }
      );
    }

    if (!supabase) {
      return Response.json(
        { error: "Chưa kết nối được với cơ sở dữ liệu Supabase." },
        { status: 500 }
      );
    }

    // Khoảng thời gian trọn vẹn 1 ngày theo giờ Việt Nam (+07:00)
    const startOfDay = `${date}T00:00:00+07:00`;
    const endOfDay = `${date}T23:59:59.999+07:00`;

    // 1. Lấy các đơn trong ngày có trạng thái 'served' hoặc 'paid'
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, total, status, created_at")
      .in("status", ["served", "paid"])
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay);

    if (ordersError) {
      return Response.json(
        { error: ordersError.message || "Lỗi truy vấn bảng orders." },
        { status: 500 }
      );
    }

    const validOrders = orders || [];
    const orderCount = validOrders.length;
    const totalRevenue = validOrders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    );

    if (orderCount === 0) {
      return Response.json({
        date,
        total_revenue: 0,
        order_count: 0,
        top_items: [],
      });
    }

    // 2. Lấy chi tiết các món thuộc những đơn hợp lệ ở trên
    const orderIds = validOrders.map((o) => o.id);

    const [orderItemsRes, menuItemsRes] = await Promise.all([
      supabase
        .from("order_items")
        .select("order_id, menu_item_id, quantity")
        .in("order_id", orderIds),
      supabase.from("menu_items").select("id, name"),
    ]);

    if (orderItemsRes.error) {
      return Response.json(
        { error: orderItemsRes.error.message || "Lỗi truy vấn bảng order_items." },
        { status: 500 }
      );
    }

    const menuNameMap = new Map(
      (menuItemsRes.data || []).map((m) => [String(m.id), m.name])
    );

    // 3. Gom nhóm và cộng dồn số lượng bán theo từng món
    const itemStatsMap = new Map();

    for (const row of orderItemsRes.data || []) {
      if (row.menu_item_id === undefined || row.menu_item_id === null) continue;

      const key = String(row.menu_item_id);
      const qty = Number(row.quantity || 0);

      if (!itemStatsMap.has(key)) {
        itemStatsMap.set(key, {
          menu_item_id: row.menu_item_id,
          name: menuNameMap.get(key) || `Món #${row.menu_item_id}`,
          quantity: 0,
        });
      }

      itemStatsMap.get(key).quantity += qty;
    }

    // 4. Sắp xếp giảm dần theo số lượng và lấy top 5 món bán nhiều nhất
    const topItems = Array.from(itemStatsMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return Response.json({
      date,
      total_revenue: totalRevenue,
      order_count: orderCount,
      top_items: topItems,
    });
  } catch (err) {
    return Response.json(
      { error: err.message || "Lỗi máy chủ khi thống kê doanh thu." },
      { status: 500 }
    );
  }
}