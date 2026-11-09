// NGUOI PHU TRACH: Huu (ca nhom dung chung - muon sua cau truc thi bao Huu)
// Day cung la cau truc du lieu chuan cua database.

export const ORDER_STATUS = {
  PENDING: "pending",  // khach vua dat
  COOKING: "cooking",  // bep dang lam
  DONE: "done",        // bep lam xong
  SERVED: "served",    // da mang ra ban
  PAID: "paid",        // da thanh toan
};

export const mockCategories = [
  { id: "c1", name: "Mon chinh" },
  { id: "c2", name: "Mon an vat" },
  { id: "c3", name: "Do uong" },
];

export const mockMenu = [
  {
    id: "m1",
    name: "Com chien hai san",
    price: 85000,                // VND
    description: "Com chien voi tom, muc, trung",
    image_url: null,
    category_id: "c1",
    spicy_level: 0,              // 0 = khong cay, 3 = rat cay
    is_available: true,
  },
  {
    id: "m2",
    name: "My cay Han Quoc",
    price: 75000,
    description: "My cay cap do tuy chon, kem bo va kim chi",
    image_url: null,
    category_id: "c1",
    spicy_level: 3,
    is_available: true,
  },
  {
    id: "m3",
    name: "Khoai tay chien",
    price: 40000,
    description: "Khoai chien gion, sot pho mai",
    image_url: null,
    category_id: "c2",
    spicy_level: 0,
    is_available: true,
  },
  {
    id: "m4",
    name: "Tra dao cam sa",
    price: 35000,
    description: "Tra dao tuoi mat",
    image_url: null,
    category_id: "c3",
    spicy_level: 0,
    is_available: true,
  },
];

export const mockTables = [
  { id: "t1", number: 1 },
  { id: "t2", number: 2 },
  { id: "t3", number: 3 },
];

export const mockOrders = [
  {
    id: "o1",
    table_id: "t1",
    status: ORDER_STATUS.COOKING,
    total: 160000,
    created_at: "2026-11-06T19:30:00+07:00",
    items: [
      { menu_item_id: "m1", quantity: 1, note: "it hanh" },
      { menu_item_id: "m2", quantity: 1, note: null },
    ],
  },
];
