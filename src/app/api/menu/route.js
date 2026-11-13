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
