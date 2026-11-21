import { mockMenu, mockCategories } from "@/data/mock";
import { supabase } from "@/lib/supabase/client";
import { askGemini } from "@/lib/ai/gemini";

const MAX_MESSAGES_PER_HOUR = 20;
const ONE_HOUR_MS = 60 * 60 * 1000;

// Giới hạn mỗi bàn tối đa 20 tin/giờ
const rateLimitStore = globalThis.__smarttableChatRateLimit || new Map();
globalThis.__smarttableChatRateLimit = rateLimitStore;

function checkTableRateLimit(tableId) {
  const key = String(tableId || "unknown").trim();
  const now = Date.now();
  const timestamps = rateLimitStore.get(key) || [];

  const recentTimestamps = timestamps.filter((t) => now - t < ONE_HOUR_MS);

  if (recentTimestamps.length >= MAX_MESSAGES_PER_HOUR) {
    rateLimitStore.set(key, recentTimestamps);
    return false;
  }

  recentTimestamps.push(now);
  rateLimitStore.set(key, recentTimestamps);
  return true;
}

async function getMenuData() {
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
  const validMenuMap = new Map();
  const availableLines = [];

  for (const item of items) {
    // Loại bỏ món đã hết (is_available === false)
    if (item.is_available === false) continue;

    const idKey = String(item.id).trim();
    validMenuMap.set(idKey, item);

    const catName = categoryMap.get(item.category_id) || "Khác";
    const price = item.price ? `${Number(item.price).toLocaleString("vi-VN")}đ` : "0đ";
    const desc = item.description ? ` | Mô tả: ${item.description}` : "";
    availableLines.push(`- ID: "${idKey}" | Tên: ${item.name} | Danh mục: ${catName} | Giá: ${price}${desc}`);
  }

  const menuText = availableLines.length
    ? availableLines.join("\n")
    : "Hiện tại thực đơn không có món nào khả dụng.";

  return { menuText, validMenuMap };
}

function parseAiResponse(rawText) {
  const cleaned = String(rawText || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  }

  return JSON.parse(cleaned);
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

    if (!checkTableRateLimit(table_id)) {
      return Response.json(
        { error: "Bàn đã đạt giới hạn 20 tin nhắn/giờ. Vui lòng thử lại sau nhé!" },
        { status: 429 }
      );
    }

    const { menuText, validMenuMap } = await getMenuData();

    const systemPrompt = `Bạn là trợ lý AI phục vụ ảo chuyên nghiệp, thân thiện của nhà hàng SmartTable (hỗ trợ bàn ${table_id || "không xác định"}).

NHIỆM VỤ & QUY TẮC BẮT BUỘC:
1. BẮT BUỘC trả về DUY NHẤT một đối tượng JSON hợp lệ (không kèm markdown \`\`\`, không giải thích ngoài JSON) theo đúng cấu trúc:
{
  "reply": "Câu trả lời tư vấn thân thiện, súc tích bằng tiếng Việt",
  "suggestions": [
    { "id": "id_mon_trong_danh_sach", "reason": "Lý do ngắn gọn vì sao món này hợp với khách" }
  ]
}
2. CHỈ được gợi ý các món có trong DANH SÁCH THỰC ĐƠN CÒN MÓN bên dưới, sử dụng CHÍNH XÁC giá trị trường "ID" của món đó. Tuyệt đối KHÔNG tự bịa ID hoặc tên món ngoài danh sách.
3. Nếu khách đưa ra yêu cầu về số lượng người, khẩu vị (ví dụ: cay, không cay) và ngân sách (ví dụ: dưới 300k), hãy chọn các món phù hợp sao cho TỔNG GIÁ TIỀN các món được gợi ý nằm trong ngân sách khách yêu cầu.
4. Nếu khách chỉ chào hỏi chung chung hoặc quán không có món khách tìm, để mảng "suggestions": [] và giải thích lịch sự trong "reply".

DANH SÁCH THỰC ĐƠN CÒN MÓN:
${menuText}`;

    const rawAiText = await askGemini({
      systemPrompt,
      message,
      history,
    });

    let parsed;
    try {
      parsed = parseAiResponse(rawAiText);
    } catch {
      parsed = { reply: rawAiText, suggestions: [] };
    }

    const reply =
      typeof parsed?.reply === "string" && parsed.reply.trim()
        ? parsed.reply.trim()
        : "Mình đã tìm được một số gợi ý phù hợp cho bàn mình nhé!";

    // Kiểm tra lại từng id có trong menu_items (và còn bán) không, loại bỏ id AI bịa hoặc trùng
    const verifiedSuggestions = [];
    const seenIds = new Set();

    if (Array.isArray(parsed?.suggestions)) {
      for (const item of parsed.suggestions) {
        if (!item || item.id === undefined || item.id === null) continue;

        const idKey = String(item.id).trim();
        const realMenuItem = validMenuMap.get(idKey);

        if (!realMenuItem || seenIds.has(idKey)) continue;

        seenIds.add(idKey);
        verifiedSuggestions.push({
          id: realMenuItem.id,
          reason: String(item.reason || "Món ngon phù hợp với yêu cầu của bạn").trim(),
        });
      }
    }

    return Response.json({
      reply,
      suggestions: verifiedSuggestions,
    });
  } catch (err) {
    if (
      err?.status === 429 ||
      String(err?.message || "").includes("429") ||
      String(err?.message || "").toLowerCase().includes("quota")
    ) {
      return Response.json(
        { error: "AI đang bận, bạn thử lại sau ít phút nhé" },
        { status: 429 }
      );
    }

    return Response.json(
      { error: err.message || "Lỗi xử lý chatbot." },
      { status: 500 }
    );
  }
}