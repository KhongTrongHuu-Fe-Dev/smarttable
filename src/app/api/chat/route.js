import { mockMenu, mockCategories } from "@/data/mock";
import { supabase } from "@/lib/supabase/client";
import { askGemini } from "@/lib/ai/gemini";

const MAX_SUGGESTIONS = 3;

// Lấy menu từ Supabase (lỗi hoặc chưa cấu hình thì dùng dữ liệu giả).
async function loadMenu() {
  if (supabase) {
    const [catsRes, itemsRes] = await Promise.all([
      supabase.from("categories").select("*").order("id"),
      supabase.from("menu_items").select("*").order("id"),
    ]);
    if (!catsRes.error && !itemsRes.error) {
      return { categories: catsRes.data || [], items: itemsRes.data || [] };
    }
  }
  return { categories: mockCategories, items: mockMenu };
}

// Danh sách món gửi cho AI, mỗi món có id để AI trả lại đúng id.
function buildMenuText(categories, items) {
  if (!items.length) return "Hiện tại thực đơn chưa có món nào.";
  const categoryName = new Map(categories.map((c) => [String(c.id), c.name]));

  return items
    .map((item) => {
      const cat = categoryName.get(String(item.category_id)) || "Khác";
      const price = `${Number(item.price || 0).toLocaleString("vi-VN")}đ`;
      const desc = item.description ? ` - ${item.description}` : "";
      const spicy = item.spicy_level > 0 ? ` - cay cấp ${item.spicy_level}` : "";
      const sold = item.is_available === false ? " (TẠM HẾT, không được gợi ý)" : "";
      return `- id=${item.id} | [${cat}] ${item.name} | ${price}${spicy}${desc}${sold}`;
    })
    .join("\n");
}

function buildSystemPrompt(tableId, menuText) {
  return `Bạn là trợ lý ảo tư vấn gọi món thân thiện, ngắn gọn của nhà hàng SmartTable (đang hỗ trợ khách tại bàn ${tableId || "không xác định"}).

QUY TẮC BẮT BUỘC:
1. CHỈ được nhắc đến và gợi ý các món có trong DANH SÁCH THỰC ĐƠN bên dưới. Tuyệt đối KHÔNG bịa món ngoài thực đơn.
2. Không gợi ý món đang "TẠM HẾT".
3. Nếu khách hỏi món không có, hãy báo quán không có món đó và gợi ý 1-2 món phù hợp có sẵn.
4. Trả lời tiếng Việt tự nhiên, súc tích, tính tổng tiền nếu khách hỏi theo ngân sách.
5. Nếu khách chỉ chào hỏi hoặc chưa đủ thông tin, hãy hỏi lại và để suggestions rỗng.

ĐỊNH DẠNG TRẢ LỜI: chỉ trả về JSON đúng dạng sau, không thêm chữ nào khác:
{"reply": "câu trả lời cho khách", "suggestions": [{"id": <id số của món>, "reason": "lý do ngắn gọn"}]}
Tối đa ${MAX_SUGGESTIONS} món trong suggestions, "id" phải là id có trong danh sách.

DANH SÁCH THỰC ĐƠN HIỆN TẠI:
${menuText}`;
}

// Đọc JSON từ câu trả lời của AI (bỏ qua nếu AI bọc thêm ```json).
function parseAiJson(text) {
  const cleaned = String(text).replace(/```(?:json)?/gi, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

// Chỉ giữ id có thật trong menu, còn bán, không trùng; loại id AI bịa.
function validateSuggestions(raw, items) {
  if (!Array.isArray(raw)) return [];
  const byId = new Map(items.map((item) => [String(item.id), item]));
  const seen = new Set();
  const result = [];

  for (const s of raw) {
    const key = String(s?.id);
    const item = byId.get(key);
    if (!item || item.is_available === false || seen.has(key)) continue;
    seen.add(key);
    result.push({ id: item.id, reason: String(s.reason || "").slice(0, 200) });
    if (result.length >= MAX_SUGGESTIONS) break;
  }
  return result;
}

// POST /api/chat { table_id, message, history: [{ role: "user"|"ai", text }] }
// -> { reply, suggestions: [{ id, reason }] }   (docs/LIEN_KET.md mục 3.4)
export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const { table_id, message, history = [] } = body || {};

    if (!message || !String(message).trim()) {
      return Response.json({ error: "Vui lòng nhập nội dung tin nhắn." }, { status: 400 });
    }

    const { categories, items } = await loadMenu();
    const systemPrompt = buildSystemPrompt(table_id, buildMenuText(categories, items));

    const answer = await askGemini({
      systemPrompt,
      message: String(message).trim().slice(0, 500),
      history: Array.isArray(history) ? history.slice(-10) : [],
      json: true,
    });

    const parsed = parseAiJson(answer);
    if (!parsed || typeof parsed.reply !== "string") {
      // AI không trả đúng JSON: vẫn trả câu trả lời, không có thẻ món.
      return Response.json({ reply: String(answer).trim(), suggestions: [] });
    }

    return Response.json({
      reply: parsed.reply.trim(),
      suggestions: validateSuggestions(parsed.suggestions, items),
    });
  } catch (err) {
    if (err?.status === 429) {
      return Response.json(
        { error: "AI đang bận, bạn thử lại sau ít phút nhé" },
        { status: 429 }
      );
    }
    return Response.json({ error: "Không thể xử lý yêu cầu của chatbot." }, { status: 500 });
  }
}
