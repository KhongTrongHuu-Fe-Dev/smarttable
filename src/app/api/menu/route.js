// TODO: GET lay menu tu Supabase (tam thoi tra ve du lieu gia)
import { mockMenu, mockCategories } from "@/data/mock";

export async function GET() {
  return Response.json({ categories: mockCategories, items: mockMenu });
}
