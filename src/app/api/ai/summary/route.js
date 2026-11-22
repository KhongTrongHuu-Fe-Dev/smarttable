import { askGemini } from "@/lib/ai/gemini";

function getTodayVN() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

function extractSummaryText(rawText) {
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
      if (typeof parsed?.summary === "string" && parsed.summary.trim()) {
        return parsed.summary.trim();
      }
    }
  } catch {
    // Giữ nguyên chuỗi văn bản nếu model không bọc trong JSON
  }

  return cleaned;
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const date = body?.date ? String(body.date).trim() : getTodayVN();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return Response.json(
        { error: "Tham số date phải có định dạng YYYY-MM-DD (ví dụ: 2026-11-20)" },
        { status: 400 }
      );
    }

    // 1. Lấy số liệu thực tế từ API thống kê (SCRUM-34) và chuyển tiếp phiên đăng nhập
    const origin = new URL(request.url).origin;
    const forwardHeaders = {};
    const cookieHeader = request.headers.get("cookie");
    const authHeader = request.headers.get("authorization");
    if (cookieHeader) forwardHeaders.cookie = cookieHeader;
    if (authHeader) forwardHeaders.authorization = authHeader;

    const statsRes = await fetch(
      `${origin}/api/stats?date=${encodeURIComponent(date)}`,
      {
        cache: "no-store",
        headers: forwardHeaders,
      }
    );

    const statsData = await statsRes.json().catch(() => null);

    if (!statsRes.ok || !statsData) {
      return Response.json(
        {
          error:
            statsData?.error ||
            "Không lấy được số liệu thống kê doanh thu (SCRUM-34).",
        },
        { status: statsRes.status || 500 }
      );
    }

    const totalRevenue = Number(statsData.total_revenue || 0);
    const orderCount = Number(statsData.order_count || 0);
    const topItems = Array.isArray(statsData.top_items) ? statsData.top_items : [];

    const topItemsText =
      topItems.length > 0
        ? topItems
            .map(
              (item, idx) =>
                `${idx + 1}. ${item.name} (đã bán ${item.quantity} phần)`
            )
            .join("; ")
        : "Chưa có món nào được bán trong ngày";

    // 2. Gửi số liệu cho Gemini viết 3–4 câu nhận xét cho chủ quán
    const systemPrompt = `Bạn là trợ lý phân tích kinh doanh thông minh dành cho chủ nhà hàng SmartTable.

NHIỆM VỤ & QUY TẮC BẮT BUỘC:
1. Dựa CHÍNH XÁC vào số liệu thống kê thực tế được cung cấp (tuyệt đối không tự bịa thêm con số hay tên món không có trong dữ liệu), hãy viết một đoạn nhận xét ngắn gọn đúng 3–4 câu bằng tiếng Việt tự nhiên, chuyên nghiệp gửi cho chủ quán.
2. Nội dung đoạn nhận xét phải bao quát đủ 3 ý:
   - Tổng kết tình hình doanh thu và số lượng đơn hàng trong ngày.
   - Điểm qua các món bán chạy nổi bật (hoặc ghi nhận tình hình nếu chưa có đơn).
   - Đưa ra 1 gợi ý vận hành/kinh doanh thực tế cho ngày hôm sau (ví dụ: chuẩn bị thêm nguyên liệu cho món bán chạy, tạo combo hoặc đẩy mạnh khuyến mãi giờ thấp điểm).
3. BẮT BUỘC trả về DUY NHẤT một đối tượng JSON hợp lệ theo cấu trúc:
{
  "summary": "Hôm nay quán bán được..."
}`;

    const message = `Hãy tóm tắt và nhận xét tình hình kinh doanh ngày ${date} dựa trên số liệu thực tế sau:
- Ngày thống kê: ${date}
- Tổng doanh thu: ${totalRevenue.toLocaleString("vi-VN")} đồng
- Tổng số đơn hoàn thành (served/paid): ${orderCount} đơn
- Top món bán chạy nhất: ${topItemsText}`;

    const rawAiText = await askGemini({
      systemPrompt,
      message,
      history: [],
    });

    const summary = extractSummaryText(rawAiText);

    if (!summary) {
      return Response.json(
        { error: "AI không trả về nội dung tóm tắt hợp lệ." },
        { status: 500 }
      );
    }

    // 3. Trả về đúng định dạng { "summary": "..." }
    return Response.json({ summary });
  } catch (err) {
    // 4. Lỗi 429 xử lý giống /api/chat
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
      { error: err.message || "Lỗi máy chủ khi tạo tóm tắt doanh thu." },
      { status: 500 }
    );
  }
}