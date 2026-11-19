import { supabase } from "@/lib/supabase/client";

/**
 * Bếp (Hữu - SCRUM-44): Lắng nghe đơn mới (INSERT) và đơn đổi trạng thái (UPDATE)
 */
export function listenOrders(onChange) {
  if (!supabase) return () => {};

  const handleEvent = (payload) => {
    if (typeof onChange === "function") {
      onChange(payload);
    }
  };

  const channel = supabase
    .channel(`orders-kitchen-${Date.now()}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "orders",
      },
      handleEvent
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "orders",
      },
      handleEvent
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Trang trạng thái của khách (Nghĩa - SCRUM-37): Lắng nghe UPDATE của đúng 1 đơn theo id
 */
export function listenOrder(orderId, onChange) {
  if (!supabase || !orderId) return () => {};

  const channel = supabase
    .channel(`order-status-${orderId}-${Date.now()}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "orders",
        filter: `id=eq.${orderId}`,
      },
      (payload) => {
        if (typeof onChange === "function") {
          onChange(payload);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}