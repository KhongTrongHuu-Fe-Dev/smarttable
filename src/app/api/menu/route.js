import { mockMenu, mockCategories } from "@/data/mock";
import { supabase } from "@/lib/supabase/client";

export async function GET() {
  if (supabase) {
    const [cats, items] = await Promise.all([
      supabase.from("categories").select("*").order("id"),
      supabase.from("menu_items").select("*").order("id"),
    ]);
    if (!cats.error && !items.error) {
      return Response.json({ categories: cats.data, items: items.data });
    }
  }
  // Chua co Supabase hoac loi -> du lieu gia
  return Response.json({ categories: mockCategories, items: mockMenu });
}
export async function POST(request) {
  try {
    if (!supabase) {
      return Response.json({ error: "Chưa kết nối Supabase" }, { status: 500 });
    }
    const body = await request.json();
    const { data, error } = await supabase
      .from("menu_items")
      .insert([body])
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data, { status: 201 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
