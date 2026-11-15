"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/customer/CartContext";
import { formatPrice } from "@/lib/format";
import { mockMenu } from "@/data/mock";

// Lịch sử chat đúng dạng sẽ gửi lên POST /api/chat (docs/LIEN_KET.md 3.4):
// [{ role: "user", text }, { role: "ai", text }]
// `suggestions` chỉ dùng để hiện thẻ món, không gửi lên API.
const GREETING = {
  role: "ai",
  text: "Chào bạn! Mình là trợ lý SmartTable. Bạn đi mấy người, thích vị gì, ngân sách bao nhiêu? Mình gợi ý món cho nhé.",
};

// TODO (SCRUM-43): thay bằng fetch("/api/chat", { method: "POST", ... })
// Trả lời giả, cùng cấu trúc với API thật: { reply, suggestions: [{ id, reason }] }
function fakeAiReply() {
  return {
    reply: "Bạn thử Mỳ cay Hàn Quốc và Khoai tây chiên nhé, mình thấy hợp khẩu vị đó!",
    suggestions: [
      { id: "m2", reason: "Cay cấp 3, hợp người thích cay" },
      { id: "m3", reason: "Món ăn kèm, chia sẻ được" },
    ],
  };
}

function SuggestionCard({ menuItem, reason, onAdd }) {
  const [added, setAdded] = useState(false);

  function handleAdd() {
    onAdd(menuItem);
    setAdded(true);
  }

  return (
    <div className="rounded-xl bg-white p-3 ring-1 ring-gray-200">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-gray-900">{menuItem.name}</p>
        <span className="shrink-0 font-semibold text-orange-600">
          {formatPrice(menuItem.price)}
        </span>
      </div>
      {reason && <p className="mt-1 text-sm text-gray-600">{reason}</p>}
      <button
        type="button"
        onClick={handleAdd}
        className="mt-2 w-full rounded-xl bg-orange-500 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-600"
      >
        {added ? "Đã thêm · thêm nữa" : "Thêm vào giỏ"}
      </button>
    </div>
  );
}

export default function ChatPage() {
  const { addItem, totalCount } = useCart();
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);
  const timerRef = useRef(null);

  // Tự cuộn xuống tin mới nhất.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typing]);

  // Dọn timer khi rời trang.
  useEffect(() => () => clearTimeout(timerRef.current), []);

  function handleSend(event) {
    event.preventDefault();
    const text = input.trim();
    if (!text || typing) return;

    setMessages((current) => [...current, { role: "user", text }]);
    setInput("");
    setTyping(true);

    timerRef.current = setTimeout(() => {
      const { reply, suggestions } = fakeAiReply();
      setMessages((current) => [...current, { role: "ai", text: reply, suggestions }]);
      setTyping(false);
    }, 1200);
  }

  return (
    <div className="flex h-[calc(100dvh-9rem)] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto pb-2">
        {messages.map((message, index) => {
          const isUser = message.role === "user";
          return (
            <div key={index} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] space-y-2 ${isUser ? "items-end" : ""}`}>
                <div
                  className={`rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                    isUser
                      ? "rounded-br-sm bg-orange-500 text-white"
                      : "rounded-bl-sm bg-white text-gray-900 ring-1 ring-gray-200"
                  }`}
                >
                  {message.text}
                </div>

                {message.suggestions?.map((suggestion) => {
                  const menuItem = mockMenu.find((item) => item.id === suggestion.id);
                  if (!menuItem) return null; // id không có trong menu thì bỏ qua
                  return (
                    <SuggestionCard
                      key={suggestion.id}
                      menuItem={menuItem}
                      reason={suggestion.reason}
                      onAdd={addItem}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {typing && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-white px-4 py-2 text-sm text-gray-500 ring-1 ring-gray-200">
              Đang trả lời<span className="animate-pulse">...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* TODO: xóa nút thử này khi SCRUM-43 nối API thật */}
      <button
        type="button"
        onClick={() => addItem(mockMenu[0])}
        className="mb-2 self-start rounded-xl bg-gray-100 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200"
      >
        [Thử] Thêm {mockMenu[0].name} vào giỏ (đang có {totalCount})
      </button>

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Hỏi AI chọn món..."
          aria-label="Tin nhắn"
          className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-orange-500"
        />
        <button
          type="submit"
          disabled={!input.trim() || typing}
          className="rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          Gửi
        </button>
      </form>
    </div>
  );
}
