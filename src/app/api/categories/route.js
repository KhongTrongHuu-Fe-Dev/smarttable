import { requireRole, ROLES } from "@/lib/supabase/server";
import { supabase } from "@/lib/supabase/client";

export async function GET() {
  try {
    if (!supabase) {
      return Response.json({ error: "Chưa kết nối Supabase" }, { status: 500 });
    }
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("id", { ascending: true });

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
    const body = await request.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 80) {
      return Response.json(
        { error: "Tên danh mục phải có từ 1 đến 80 ký tự." },
        { status: 400 }
      );
    }
    const { data, error } = await supabase
      .from("categories")
      .insert([{ name }])
      .select()
      .single();

    if (error) return Response.json(
      { error: error.code === "23505" ? "Tên danh mục đã tồn tại. Vui lòng nhập tên khác." : error.message },
      { status: error.code === "23505" ? 409 : 400 }
    );
    return Response.json(data, { status: 201 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
