import { mockMenu, mockCategories } from "@/data/mock";
import { supabase } from "@/lib/supabase/client";
import { askGemini } from "@/lib/ai/gemini";

async function getMenuContext() {
  let categories = mockCategories;
  let items = mockMenu;

  if (supabase) {
    const [catsRes, itemsRes] = await Promise.all([
      supabase.from("categories").select("*").order("id"),
      supabase.from("menu_items").select("*").order("id"),
    ]);

    if (!catsRes.error && !itemsRes.error) {
      categories = catsRes.data || [];
      items = itemsRes.data || [];
    }
  }

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  if (!items.length) {
    return "Hiện tại thực đơn chưa có món nào.";
  }

  return items
    .map((item) => {
      const catName = categoryMap.get(item.category_id) || "Khác";
      const price = item.price ? `${Number(item.price).toLocaleString("vi-VN")}đ` : "Liên hệ";
      const desc = item.description ? ` - Mô tả: ${item.description}` : "";
      const status = item.is_available === false ? " (Tạm hết)" : "";
      return `- [${catName}] ${item.name} (${price})${desc}${status}`;
    })
    .join("\n");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { table_id, message, history = [] } = body || {};

    if (!message || !String(message).trim()) {
      return Response.json(
        { error: "Vui lòng nhập nội dung tin nhắn (message)." },
        { status: 400 }
      );
    }

    const menuText = await getMenuContext();

    const systemPrompt = `Bạn là trợ lý ảo tư vấn gọi món thân thiện, ngắn gọn của nhà hàng SmartTable (đang hỗ trợ khách tại bàn ${table_id || "không xác định"}).

QUY TẮC BẮT BUỘC:
1. CHỈ được giới thiệu, tư vấn và nhắc đến các món ăn/đồ uống có thật trong DANH SÁCH THỰC ĐƠN bên dưới. Tuyệt đối KHÔNG tự bịa ra món ngoài thực đơn.
2. Khi khách hỏi về đặc điểm món (ví dụ: món cay, món nước, món chay, giá tiền...), hãy dựa đúng vào tên món, danh mục và mô tả trong thực đơn để trả lời chính xác tên món có thật.
3. Nếu khách hỏi món không có trong thực đơn, hãy lịch sự báo quán không có món đó và gợi ý 1-2 món phù hợp có sẵn trong thực đơn.
4. Trả lời bằng tiếng Việt tự nhiên, súc tích, dễ đọc.

DANH SÁCH THỰC ĐƠN HIỆN TẠI:
${menuText}`;

    const reply = await askGemini({
      systemPrompt,
      message,
      history,
    });

    return Response.json({
      reply,
      suggestions: [],
    });
  } catch (err) {
    return Response.json(
      { error: err.message || "Lỗi xử lý chatbot." },
      { status: 500 }
    );
  }
}