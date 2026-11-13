
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  // Thêm món; nếu món đã tồn tại thì cộng dồn số lượng.
  const addItem = useCallback((menuItem, quantity = 1) => {
    if (!menuItem) return;

    const menuItemId = menuItem.menu_item_id ?? menuItem.id;
    const amount = Number(quantity);

    if (!menuItemId || !Number.isInteger(amount) || amount <= 0) {
      return;
    }

    setItems((currentItems) => {
      const existing = currentItems.find(
        (item) => item.menu_item_id === menuItemId
      );

      if (existing) {
        return currentItems.map((item) =>
          item.menu_item_id === menuItemId
            ? { ...item, quantity: item.quantity + amount }
            : item
        );
      }

      return [
        ...currentItems,
        {
          menu_item_id: menuItemId,
          name: menuItem.name,
          price: Number(menuItem.price) || 0,
          quantity: amount,
          note: menuItem.note ?? "",
        },
      ];
    });
  }, []);

  // Xóa món khỏi giỏ.
  const removeItem = useCallback((menuItemId) => {
    setItems((currentItems) =>
      currentItems.filter(
        (item) => item.menu_item_id !== menuItemId
      )
    );
  }, []);

  // Cập nhật số lượng; số lượng <= 0 thì xóa món.
  const updateQuantity = useCallback((menuItemId, quantity) => {
    const amount = Number(quantity);

    if (!Number.isInteger(amount)) return;

    if (amount <= 0) {
      setItems((currentItems) =>
        currentItems.filter(
          (item) => item.menu_item_id !== menuItemId
        )
      );
      return;
    }

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.menu_item_id === menuItemId
          ? { ...item, quantity: amount }
          : item
      )
    );
  }, []);

  // Cập nhật ghi chú món.
  const updateNote = useCallback((menuItemId, note) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.menu_item_id === menuItemId
          ? { ...item, note: String(note ?? "") }
          : item
      )
    );
  }, []);

  // Xóa toàn bộ giỏ hàng sau khi đặt đơn thành công.
  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalPrice = useMemo(
    () =>
      items.reduce(
        (total, item) => total + item.price * item.quantity,
        0
      ),
    [items]
  );

  const totalCount = useMemo(
    () =>
      items.reduce((total, item) => total + item.quantity, 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      updateNote,
      clearCart,
      totalPrice,
      totalCount,
    }),
    [
      items,
      addItem,
      removeItem,
      updateQuantity,
      updateNote,
      clearCart,
      totalPrice,
      totalCount,
    ]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart phải được sử dụng bên trong CartProvider");
  }

  return context;
}
