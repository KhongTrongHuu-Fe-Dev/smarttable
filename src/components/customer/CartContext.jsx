
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [cartHydrated, setCartHydrated] = useState(false);

  // Khôi phục giỏ hàng sau khi tải lại trang.
  // Đọc localStorage sau khi render lần đầu (tránh lệch giao diện server/client).
  // Đặt state trong callback bất đồng bộ để không gọi setState trực tiếp trong effect.
  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const savedCart = localStorage.getItem("smarttable-cart");
        if (savedCart) {
          const parsedCart = JSON.parse(savedCart);
          if (Array.isArray(parsedCart)) {
            setItems(parsedCart);
          }
        }
      } catch (error) {
        console.error("Không thể khôi phục giỏ hàng:", error);
      } finally {
        setCartHydrated(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Chỉ lưu sau khi đã khôi phục dữ liệu ban đầu.
  useEffect(() => {
    if (!cartHydrated) return;

    try {
      localStorage.setItem("smarttable-cart", JSON.stringify(items));
    } catch (error) {
      console.error("Không thể lưu giỏ hàng:", error);
    }
  }, [items, cartHydrated]);

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
