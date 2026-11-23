"use client";

import { useEffect, useRef, useState } from "react";

// Trang tổng quan dùng key theo ngày/lần làm mới để hủy kết quả cũ.
export default function AISummary({ date, today }) {
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const requestRef = useRef(null);

  useEffect(() => () => {
    requestRef.current?.abort();
    requestRef.current = null;
  }, []);

  async function generateSummary() {
    if (!date || requestRef.current) return;

    const controller = new AbortController();
    requestRef.current = controller;
    setIsGenerating(true);
    setSummary("");
    setError("");

    try {
      const response = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => null);
      if (controller.signal.aborted) return;

      const apiError = typeof data?.error === "string" ? data.error.trim() : "";
      if (!response.ok || data?.error) {
        setError(apiError || "Không thể tạo tóm tắt. Vui lòng thử lại.");
        return;
      }
      if (typeof data?.summary !== "string" || !data.summary.trim()) {
        setError("AI chưa trả về nội dung tóm tắt hợp lệ. Vui lòng thử lại.");
        return;
      }
      setSummary(data.summary.trim());
    } catch {
      if (!controller.signal.aborted) {
        setError("Không thể kết nối để tạo tóm tắt. Vui lòng thử lại.");
      }
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        if (!controller.signal.aborted) setIsGenerating(false);
      }
    }
  }

  const displayDate = date ? date.split("-").reverse().join("/") : "";

  return (
    <section aria-labelledby="ai-summary-heading" className="rounded-2xl border border-orange-200 bg-orange-50/50 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="ai-summary-heading" className="text-lg font-bold text-slate-900">Tóm tắt bằng AI</h2>
          <p className="mt-1 text-sm text-slate-500">
            {date ? `Xem nhận xét nhanh về hoạt động ngày ${displayDate}.` : "Chọn ngày để tạo tóm tắt hoạt động."}
          </p>
        </div>
        <button
          type="button"
          onClick={generateSummary}
          disabled={!date || isGenerating}
          aria-busy={isGenerating}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGenerating && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
          {isGenerating ? "Đang tạo..." : date === today ? "AI tóm tắt hôm nay" : "AI tóm tắt ngày này"}
        </button>
      </div>
      <div role="status" aria-live="polite" aria-atomic="true">
        {isGenerating && <p className="mt-4 text-sm text-orange-700">Đang tạo tóm tắt...</p>}
        {summary && <p className="mt-4 whitespace-pre-wrap break-words rounded-xl border border-orange-100 bg-white p-4 text-sm leading-relaxed text-slate-700">{summary}</p>}
      </div>
      {error && <p role="alert" className="mt-4 break-words rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    </section>
  );
}
