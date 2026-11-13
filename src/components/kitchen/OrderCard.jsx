"use client";

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

/**
 * Thẻ một đơn trong màn hình bếp.
 * order.items: [{ menu_item_id, quantity, note, name? }]
 * menuById: Map id món -> món (để lấy tên khi đơn chưa có name)
 */
export default function OrderCard({
  order,
  tableNumber,
  menuById,
  actionLabel,
  onAction,
}) {
  return (
    <article className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <header className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Bàn {tableNumber}</h3>
        <time className="text-sm text-gray-500" dateTime={order.created_at}>
          {formatTime(order.created_at)}
        </time>
      </header>

      <ul className="mt-3 space-y-2">
        {order.items.map((item, index) => (
          <li key={`${item.menu_item_id}-${index}`} className="text-sm">
            <div className="flex justify-between gap-2 text-gray-900">
              <span>
                {item.name ||
                  menuById.get(item.menu_item_id)?.name ||
                  item.menu_item_id}
              </span>
              <span className="font-semibold">× {item.quantity}</span>
            </div>
            {item.note && (
              <p className="mt-0.5 rounded-lg bg-orange-50 px-2 py-1 text-xs text-orange-700">
                Ghi chú: {item.note}
              </p>
            )}
          </li>
        ))}
      </ul>

      {actionLabel && (
        <button
          type="button"
          onClick={() => onAction(order.id)}
          className="mt-4 w-full rounded-xl bg-orange-500 px-4 py-2 font-semibold text-white hover:bg-orange-600"
        >
          {actionLabel}
        </button>
      )}
    </article>
  );
}
