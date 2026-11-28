"use client";

import { useEffect, useState } from "react";

// URL /table/[id] dùng id trong database, còn khách phải thấy SỐ BÀN (cột number).
// Trả về "…" khi đang tải và "?" khi không tìm thấy, không bao giờ hiện id thay cho số bàn.
let tablesRequest = null; // dùng chung 1 lần tải cho các thành phần trên cùng trang

function loadTables() {
  if (!tablesRequest) {
    tablesRequest = fetch("/api/tables", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Không tải được danh sách bàn.");
        return res.json();
      })
      .finally(() => {
        // Lần sau tải lại để thấy số bàn admin vừa đổi.
        setTimeout(() => {
          tablesRequest = null;
        }, 5000);
      });
  }
  return tablesRequest;
}

export function useTableNumber(tableId) {
  const [result, setResult] = useState({ id: null, number: "…" });

  useEffect(() => {
    let cancelled = false;
    loadTables()
      .then((tables) => {
        const table = tables.find((t) => String(t.id) === String(tableId));
        if (!cancelled) setResult({ id: tableId, number: table?.number ?? "?" });
      })
      .catch(() => {
        if (!cancelled) setResult({ id: tableId, number: "?" });
      });
    return () => {
      cancelled = true;
    };
  }, [tableId]);

  return result.id === tableId ? result.number : "…";
}
