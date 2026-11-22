import { askGemini } from "@/lib/ai/gemini";

function extractDescriptionText(rawText) {
  const cleaned = String(rawText || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      if (typeof parsed?.description === "string" && parsed.description.trim()) {
        return parsed.description.trim();
      }
    }
  } catch {
    // Giữ nguyên chuỗi văn bản nếu model không bọc trong JSON
  }

  return cleaned.replace(/^["']|["']$/g, "").trim();
}

function enforceUnder150Chars(text) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (normalized.length < 150) return normalized;

  const sliced = normalized.slice(0, 149);
  const lastPeriod = sliced.lastIndexOf(".");
  if (lastPeriod >= 60) {
    return sliced.slice(0, lastPeriod + 1).trim();
  }

  const lastSpace = sliced.lastIndexOf(" ");
  if (lastSpace > 0) {
    return sliced.slice(0, lastSpace).trim();
  }

  return sliced;
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const dishName = body?.name ? String(body.name).trim() : "";

    if (!dishName) {
      return Response.json(
        { error: "Vui lòng nhập tên món ăn (name)." },
        { status: 400 }
      );
    }

    const systemPrompt = `Bạn là chuyên gia viết nội dung thực đơn (menu copywriter) cho nhà hàng SmartTable.

NHIỆM VỤ & QUY TẮC BẮT BUỘC:
1. Dựa vào tên món ăn được cung cấp, hãy viết 1–2 câu mô tả tiếng Việt thật hấp dẫn, gợi vị giác, tự nhiên và chuyên nghiệp để hiển thị trên thực đơn.
2. Độ dài phần mô tả BẮT BUỘC dưới 150 ký tự (tính cả dấu cách và dấu câu, lý tưởng khoảng 80–130 ký tự).
3. Không dùng ký tự đặc biệt rườm rà, không hashtag, không emoji.
4. BẮT BUỘC trả về DUY NHẤT một đối tượng JSON hợp lệ theo đúng cấu trúc:
{
  "description": "Câu mô tả món ăn..."
}`;

    const message = `Hãy viết mô tả thực đơn hấp dẫn, ngắn gọn dưới 150 ký tự cho món: "${dishName}"`;

    const rawAiText = await askGemini({
      systemPrompt,
      message,
      history: [],
    });

    const extracted = extractDescriptionText(rawAiText);
    const description = enforceUnder150Chars(extracted);

    if (!description) {
      return Response.json(
        { error: "AI không tạo được mô tả hợp lệ." },
        { status: 500 }
      );
    }

    return Response.json({ description });
  } catch (err) {
    const errMsg = String(err?.message || "");
    if (
      err?.status === 429 ||
      errMsg.includes("429") ||
      errMsg.toLowerCase().includes("quota") ||
      errMsg.toLowerCase().includes("resource_exhausted")
    ) {
      return Response.json(
        { error: "AI đang bận, bạn thử lại sau ít phút nhé" },
        { status: 429 }
      );
    }

    return Response.json(
      { error: err.message || "Lỗi máy chủ khi tạo mô tả món ăn." },
      { status: 500 }
    );
  }
}