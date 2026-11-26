import { requireRole, ROLES } from "@/lib/supabase/server";
import { supabase } from "@/lib/supabase/client";

export async function GET() {
  try {
    if (!supabase) {
      return Response.json({ error: "Chưa kết nối Supabase" }, { status: 500 });
    }
    const { data, error } = await supabase
      .from("tables")
      .select("id, number")
      .order("number", { ascending: true });

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    // Chỉ admin được ghi dữ liệu. `supabase` bên dưới mang quyền người đăng nhập (RLS).
    const auth = await requireRole([ROLES.ADMIN]);
    if (auth.error) return auth.error;
    const { supabase } = auth;
    if (!supabase) {
      return Response.json({ error: "Chưa kết nối Supabase" }, { status: 500 });
    }
    const body = await request.json();
    const number = Number(body?.number);
    if (!Number.isSafeInteger(number) || number <= 0) {
      return Response.json(
        { error: "Số bàn phải là số nguyên dương." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("tables")
      .insert([{ number }])
      .select()
      .single();

    if (error) {
      const duplicate = /duplicate|unique/i.test(error.message);
      return Response.json(
        { error: duplicate ? `Bàn số ${number} đã tồn tại.` : error.message },
        { status: 400 }
      );
    }
    return Response.json(data, { status: 201 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
