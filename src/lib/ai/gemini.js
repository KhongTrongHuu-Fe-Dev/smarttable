import https from "node:https";

function httpsJsonRequest(urlString, { method = "GET", body = null, timeoutMs = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const payloadStr = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      family: 4,
      headers: {
        "Content-Type": "application/json",
        ...(payloadStr ? { "Content-Length": Buffer.byteLength(payloadStr) } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let rawData = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        rawData += chunk;
      });
      res.on("end", () => {
        try {
          const parsed = rawData ? JSON.parse(rawData) : {};
          resolve({
            status: res.statusCode || 500,
            ok: res.statusCode >= 200 && res.statusCode < 300,
            data: parsed,
          });
        } catch {
          reject(new Error(`Phản hồi không hợp lệ từ Google (${res.statusCode})`));
        }
      });
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Model phản hồi quá ${timeoutMs / 1000}s`));
    });

    req.on("error", (err) => {
      reject(new Error(`${err.message}${err.code ? ` (${err.code})` : ""}`));
    });

    if (payloadStr) {
      req.write(payloadStr);
    }
    req.end();
  });
}

export async function askGemini({ systemPrompt, message, history = [] }) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Thiếu cấu hình GEMINI_API_KEY trong file .env.local");
  }

  const formattedHistory = Array.isArray(history)
    ? history
        .filter((item) => item && item.text)
        .map((item) => ({
          role: item.role === "user" ? "user" : "model",
          parts: [{ text: String(item.text) }],
        }))
    : [];

  const contents = [
    ...formattedHistory,
    {
      role: "user",
      parts: [{ text: String(message) }],
    },
  ];

  const payload = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    contents,
    generationConfig: {
      temperature: 0.3,
      responseMimeType: "application/json",
    },
  };

  async function callModel(modelName) {
    const cleanName = modelName.replace(/^models\//, "");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanName}:generateContent?key=${apiKey}`;
    return httpsJsonRequest(url, { method: "POST", body: payload, timeoutMs: 15000 });
  }

  const modelQueue = [
    "gemini-3.8-flash",
    "gemini-3.8-flash-lite",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
  ];

  try {
    const listRes = await httpsJsonRequest(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { method: "GET", timeoutMs: 8000 }
    );

    if (listRes.ok) {
      for (const m of listRes.data.models || []) {
        const clean = m.name?.replace(/^models\//, "");
        if (
          clean &&
          clean.toLowerCase().includes("flash") &&
          m.supportedGenerationMethods?.includes("generateContent") &&
          !modelQueue.includes(clean)
        ) {
          modelQueue.push(clean);
        }
      }
    }
  } catch {
    // Dùng danh sách mặc định nếu lấy danh sách model chậm
  }

  let lastError = null;
  let isRateLimited = false;

  for (const model of modelQueue) {
    try {
      const { status, ok, data } = await callModel(model);

      if (ok) {
        const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (replyText) return replyText.trim();
      }

      lastError = data?.error?.message || `Lỗi Gemini API (${status})`;

      if (status === 429 || lastError.toLowerCase().includes("quota")) {
        isRateLimited = true;
      }

      if (status === 401 || status === 403 || lastError.includes("API key not valid")) {
        throw new Error(lastError);
      }
    } catch (err) {
      lastError = err.message;
      if (
        lastError.includes("API key not valid") ||
        lastError.includes("PERMISSION_DENIED")
      ) {
        throw err;
      }
    }
  }

  if (isRateLimited) {
    const quotaError = new Error("AI đang bận, bạn thử lại sau ít phút nhé");
    quotaError.status = 429;
    throw quotaError;
  }

  throw new Error(lastError || "Không thể kết nối tới các model Gemini.");
}