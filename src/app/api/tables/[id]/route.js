import { requireRole, ROLES } from "@/lib/supabase/server";

export async function PATCH(request, { params }) {
  try {
    // Chỉ admin được ghi dữ liệu. `supabase` bên dưới mang quyền người đăng nhập (RLS).
    const auth = await requireRole([ROLES.ADMIN]);
    if (auth.error) return auth.error;
    const { supabase } = auth;
    if (!supabase) {
      return Response.json({ error: "Chưa kết nối Supabase" }, { status: 500 });
    }
    const { id } = await params;
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
      .update({ number })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      const duplicate = /duplicate|unique/i.test(error.message);
      return Response.json(
        { error: duplicate ? `Bàn số ${number} đã tồn tại.` : error.message },
        { status: 400 }
      );
    }
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    // Chỉ admin được ghi dữ liệu. `supabase` bên dưới mang quyền người đăng nhập (RLS).
    const auth = await requireRole([ROLES.ADMIN]);
    if (auth.error) return auth.error;
    const { supabase } = auth;
    if (!supabase) {
      return Response.json({ error: "Chưa kết nối Supabase" }, { status: 500 });
    }
    const { id } = await params;
    const { error } = await supabase.from("tables").delete().eq("id", id);

    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ message: "Đã xóa bàn" });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
