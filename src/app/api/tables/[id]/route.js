import { supabase } from "@/lib/supabase/client";

export async function PATCH(request, { params }) {
  try {
    if (!supabase) {
      return Response.json({ error: "Chưa kết nối Supabase" }, { status: 500 });
    }
    const { id } = await params;
    const body = await request.json();
    const { data, error } = await supabase
      .from("tables")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
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