import { supabase } from "@/lib/supabase/client";

export async function GET() {
  try {
    if (!supabase) {
      return Response.json({ error: "Chưa kết nối Supabase" }, { status: 500 });
    }
    const { data, error } = await supabase
      .from("tables")
      .select("*")
      .order("number", { ascending: true });

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!supabase) {
      return Response.json({ error: "Chưa kết nối Supabase" }, { status: 500 });
    }
    const body = await request.json();
    const { data, error } = await supabase
      .from("tables")
      .insert([body])
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data, { status: 201 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}