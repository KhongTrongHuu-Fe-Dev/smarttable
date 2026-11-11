# Tài liệu liên kết - SmartTable

> Tài liệu này là **"luật chơi chung"** để code của 5 người ghép được với nhau.
> Ai muốn đổi tên trường, đổi API, đổi cấu trúc dữ liệu: **báo cả nhóm + sửa file này trước**, rồi mới sửa code.

---

## 1. Luồng chạy của cả hệ thống

```
Khách quét QR ở bàn
   │
   ▼
/table/[id]  (Nghĩa)  ──GET /api/menu──►  Huy  ──►  Supabase
   │  chọn món, bỏ vào GIỎ HÀNG CHUNG (Nghĩa làm, Hữu dùng)
   │
   ├── /table/[id]/chat  (Hữu)  ──POST /api/chat──►  Huy  ──►  Gemini
   │        AI gợi ý món → bấm "Thêm vào giỏ" → bỏ vào GIỎ HÀNG CHUNG
   │
   ▼
/table/[id]/cart  (Nghĩa)  ──POST /api/orders──►  Huy  ──►  bảng orders
                                                              │
                         ┌────────── Supabase Realtime ───────┘
                         ▼
/kitchen  (Hữu)  nhận đơn mới ngay  ──PATCH /api/orders/:id──►  đổi trạng thái
                         │
                         ▼
/table/[id]/status  (Nghĩa)  khách thấy trạng thái đơn đổi theo
/admin/...  (Phúc)  quản lý món, bàn, đơn, xem doanh thu
```

**Ai chờ ai:**

| Phần | Phụ thuộc vào | Trong lúc chờ thì làm gì |
| --- | --- | --- |
| Trang khách (Nghĩa) | API menu, orders (Huy) | Dùng dữ liệu giả `src/data/mock.js` |
| Admin (Phúc) | API menu, categories, tables, orders, stats (Huy) | Dùng dữ liệu giả |
| Bếp + Chat (Hữu) | API orders, chat (Huy) + Giỏ hàng chung (Nghĩa) | Dùng dữ liệu giả + giỏ hàng giả |
| Báo cáo (Đạt) | Không | Viết song song |

---

## 2. Dữ liệu chuẩn (database)

Tên bảng và tên trường **phải giống y hệt** dưới đây, kể cả chữ hoa chữ thường. File `src/data/mock.js` đang dùng đúng cấu trúc này.

### `categories` - danh mục
| Trường | Kiểu | Ví dụ |
| --- | --- | --- |
| `id` | text/uuid | `"c1"` |
| `name` | text | `"Món chính"` |

### `menu_items` - món ăn
| Trường | Kiểu | Ví dụ |
| --- | --- | --- |
| `id` | text/uuid | `"m1"` |
| `name` | text | `"Cơm chiên hải sản"` |
| `price` | số nguyên (VND) | `85000` |
| `description` | text | `"Cơm chiên với tôm, mực"` |
| `image_url` | text hoặc `null` | `null` |
| `category_id` | id của categories | `"c1"` |
| `spicy_level` | 0, 1, 2, 3 | `0` = không cay |
| `is_available` | true/false | `true` |

### `tables` - bàn
| Trường | Kiểu | Ví dụ |
| --- | --- | --- |
| `id` | text/uuid | `"t1"` |
| `number` | số | `1` (số in trên mã QR) |

### `orders` - đơn hàng
| Trường | Kiểu | Ví dụ |
| --- | --- | --- |
| `id` | text/uuid | `"o1"` |
| `table_id` | id của tables | `"t1"` |
| `status` | xem bảng trạng thái | `"pending"` |
| `total` | số nguyên (VND) | `160000` |
| `created_at` | thời gian | `"2026-11-06T19:30:00+07:00"` |

### `order_items` - món trong đơn
| Trường | Kiểu | Ví dụ |
| --- | --- | --- |
| `id` | text/uuid | |
| `order_id` | id của orders | `"o1"` |
| `menu_item_id` | id của menu_items | `"m1"` |
| `quantity` | số | `2` |
| `price` | số (giá lúc đặt) | `85000` |
| `note` | text hoặc `null` | `"ít hành"` |

### Trạng thái đơn - chỉ dùng đúng 5 giá trị này
| Giá trị | Nghĩa | Ai đổi |
| --- | --- | --- |
| `pending` | Khách vừa đặt | Tự động khi tạo đơn |
| `cooking` | Bếp đang làm | Bếp |
| `done` | Bếp làm xong | Bếp |
| `served` | Đã mang ra bàn | Bếp |
| `paid` | Đã thanh toán | Admin |

Trong code luôn dùng hằng số, **không gõ chữ trực tiếp**:
```js
import { ORDER_STATUS } from "@/data/mock";
order.status === ORDER_STATUS.COOKING   // đúng
order.status === "Cooking"              // SAI
```

---

## 3. Hợp đồng API (Huy làm, mọi người gọi)

**Quy ước chung:**
- Mọi API trả về **JSON**
- Thành công: mã `200` (hoặc `201` khi tạo mới)
- Lỗi: mã `400` / `404` / `500`, body luôn có dạng:
```json
{ "error": "Mô tả lỗi bằng tiếng Việt" }
```
- Frontend luôn kiểm tra lỗi:
```js
const res = await fetch("/api/menu");
const data = await res.json();
if (!res.ok) { alert(data.error); return; }
```

### 3.1 Menu
**`GET /api/menu`** - lấy toàn bộ menu (khách + admin dùng)
```json
{
  "categories": [ { "id": "c1", "name": "Món chính" } ],
  "items": [
    { "id": "m1", "name": "Cơm chiên hải sản", "price": 85000, "description": "...",
      "image_url": null, "category_id": "c1", "spicy_level": 0, "is_available": true }
  ]
}
```

**`POST /api/menu`** - thêm món (admin). Gửi lên: 1 món, không có `id`. Trả về: món vừa tạo, có `id`.

**`PATCH /api/menu/[id]`** - sửa món (admin). Gửi lên: chỉ những trường cần đổi, ví dụ `{ "price": 90000 }`. Trả về: món sau khi sửa.

**`DELETE /api/menu/[id]`** - xoá món (admin). Trả về: `{ "ok": true }`

### 3.2 Danh mục và bàn (admin)
Giống hệt kiểu của menu:
- `GET /api/categories`, `POST /api/categories`, `PATCH /api/categories/[id]`, `DELETE /api/categories/[id]`
- `GET /api/tables`, `POST /api/tables`, `PATCH /api/tables/[id]`, `DELETE /api/tables/[id]`

### 3.3 Đơn hàng
**`POST /api/orders`** - khách gửi đơn (Nghĩa gọi)
Gửi lên:
```json
{
  "table_id": "t1",
  "items": [
    { "menu_item_id": "m1", "quantity": 2, "note": "ít hành" },
    { "menu_item_id": "m4", "quantity": 1, "note": null }
  ]
}
```
Trả về (`201`): đơn vừa tạo, **có kèm danh sách món**:
```json
{
  "id": "o1", "table_id": "t1", "status": "pending", "total": 205000,
  "created_at": "2026-11-12T19:30:00+07:00",
  "items": [
    { "menu_item_id": "m1", "name": "Cơm chiên hải sản", "price": 85000, "quantity": 2, "note": "ít hành" },
    { "menu_item_id": "m4", "name": "Trà đào cam sả", "price": 35000, "quantity": 1, "note": null }
  ]
}
```
> Huy tự tính `total` ở server, **không tin số tiền frontend gửi lên**.

**`GET /api/orders`** - danh sách đơn (bếp + admin dùng). Lọc thêm bằng tham số:
- `/api/orders?status=pending,cooking` → bếp lấy đơn chưa xong
- `/api/orders?table_id=t1` → đơn của 1 bàn
- `/api/orders?date=2026-11-12` → đơn trong 1 ngày

Trả về: **mảng** các đơn, mỗi đơn có `items` như trên, đơn mới nhất xếp trước.

**`GET /api/orders/[id]`** - 1 đơn (trang trạng thái của khách). Trả về: 1 đơn có `items`.

**`PATCH /api/orders/[id]`** - đổi trạng thái (bếp + admin)
Gửi lên: `{ "status": "cooking" }` · Trả về: đơn sau khi đổi.

### 3.4 Chat AI
**`POST /api/chat`** - khách hỏi AI (Hữu gọi)
Gửi lên:
```json
{
  "table_id": "t1",
  "message": "2 người, thích cay, dưới 300k ăn gì?",
  "history": [
    { "role": "user", "text": "Chào bạn" },
    { "role": "ai", "text": "Chào bạn, mình có thể giúp gì?" }
  ]
}
```
Trả về:
```json
{
  "reply": "Bạn thử Mỳ cay Hàn Quốc và Khoai tây chiên nhé, tổng 115k.",
  "suggestions": [
    { "id": "m2", "reason": "Cay cấp 3, hợp người thích cay" },
    { "id": "m3", "reason": "Món ăn kèm, chia sẻ được" }
  ]
}
```
- `suggestions[].id` **luôn là id có thật** trong `menu_items` (Huy phải kiểm tra lại trước khi trả về, loại bỏ id AI bịa)
- Hữu lấy `id` → tìm món trong menu → hiện thẻ món + nút "Thêm vào giỏ"
- Hết quota Gemini (lỗi 429): trả mã `429` với `{ "error": "AI đang bận, bạn thử lại sau ít phút nhé" }`

### 3.5 Thống kê và AI cho admin (Sprint 3)
**`GET /api/stats?date=2026-11-20`** (Phúc gọi)
```json
{
  "date": "2026-11-20",
  "total_revenue": 4250000,
  "order_count": 37,
  "top_items": [ { "menu_item_id": "m2", "name": "Mỳ cay Hàn Quốc", "quantity": 21 } ]
}
```
**`POST /api/ai/summary`** - gửi `{ "date": "2026-11-20" }` → trả `{ "summary": "Hôm nay..." }`
**`POST /api/ai/describe`** - gửi `{ "name": "Gà nướng mật ong" }` → trả `{ "description": "..." }`

---

## 4. Code dùng chung

### 4.1 Giỏ hàng chung - `src/components/customer/CartContext.jsx` (Nghĩa làm)
Trang menu, trang giỏ hàng (Nghĩa) và trang chat (Hữu) **cùng dùng 1 giỏ hàng**. Nghĩa làm file này **đầu tiên** và giữ đúng các hàm sau:

```js
const {
  items,          // [{ menu_item_id, name, price, quantity, note }]
  addItem,        // addItem(menuItem, quantity = 1) - món đã có thì cộng dồn số lượng
  removeItem,     // removeItem(menu_item_id)
  updateQuantity, // updateQuantity(menu_item_id, quantity)
  updateNote,     // updateNote(menu_item_id, note)
  clearCart,      // clearCart() - gọi sau khi gửi đơn thành công
  totalPrice,     // tổng tiền (số)
  totalCount,     // tổng số món (số)
} = useCart();
```
- Bọc `<CartProvider>` ở `src/app/table/[id]/layout.jsx` → mọi trang trong `/table/[id]/...` đều dùng được
- Hữu dùng trong trang chat: `addItem(monAiGoiY)`
- Muốn đổi tên hàm phải báo Hữu

### 4.2 Hàm định dạng tiền - `src/lib/format.js` (Huy làm)
```js
export const formatPrice = (n) => n.toLocaleString("vi-VN") + "đ";   // 85000 → "85.000đ"
```
Ai hiện giá tiền cũng dùng hàm này, không tự viết.

### 4.3 Dữ liệu giả - `src/data/mock.js`
- Cấu trúc **giống hệt** API trả về → lúc nối API thật chỉ cần đổi chỗ lấy dữ liệu:
```js
// Lúc đầu:
import { mockMenu } from "@/data/mock";
// Khi có API:
const res = await fetch("/api/menu"); const { items } = await res.json();
```
- Cần thêm dữ liệu giả thì thêm vào file này, **không tự tạo file mock riêng**

---

## 5. Đường dẫn các trang

| Đường dẫn | Trang | Người làm |
| --- | --- | --- |
| `/table/[id]` | Menu (id = id của bàn, mã QR dẫn tới đây) | Nghĩa |
| `/table/[id]/cart` | Giỏ hàng | Nghĩa |
| `/table/[id]/status?order=o1` | Trạng thái đơn | Nghĩa |
| `/table/[id]/chat` | Chat AI | Hữu |
| `/kitchen` | Màn hình bếp | Hữu |
| `/login` | Đăng nhập admin/bếp | Hữu |
| `/admin` | Tổng quan + thống kê | Phúc |
| `/admin/menu` | Quản lý món | Phúc |
| `/admin/tables` | Quản lý bàn | Phúc |
| `/admin/orders` | Quản lý đơn | Phúc |
| `/admin/qr` | Tạo mã QR | Hữu |

Đi giữa các trang dùng `<Link href="/table/t1/cart">` của Next.js, **không dùng thẻ `<a>`**.

---

## 6. Realtime (Sprint 3)
- Huy bật Realtime cho bảng `orders` trên Supabase
- **Bếp (Hữu)** lắng nghe đơn mới (`INSERT`) và đơn đổi trạng thái (`UPDATE`) → cập nhật màn hình ngay
- **Trang trạng thái (Nghĩa)** lắng nghe `UPDATE` của đúng 1 đơn (lọc theo `id`)
- Huy viết sẵn hàm dùng chung trong `src/lib/supabase/realtime.js`, Hữu và Nghĩa chỉ việc gọi

---

## 7. Đăng nhập và phân quyền
| Vai trò | Vào được | Cách vào |
| --- | --- | --- |
| Khách | `/table/...` | Quét QR, **không cần đăng nhập** |
| Bếp | `/kitchen` | Đăng nhập tài khoản bếp |
| Admin | `/admin/...` và `/kitchen` | Đăng nhập tài khoản admin |

Huy tạo sẵn 2 tài khoản test trên Supabase và gửi nhóm: `admin@smarttable.test`, `bep@smarttable.test`.

---

## 8. Giao diện chung (Đạt quyết, mọi người theo)
- Dùng **Tailwind CSS** (đã cài sẵn), không viết file CSS riêng
- Màu chính: `orange-500` (nút chính), `gray-900` (chữ), `gray-100` (nền thẻ)
- Bo góc: `rounded-xl` · Khoảng cách trong thẻ: `p-4`
- Trang khách thiết kế cho **điện thoại trước** (rộng 375px), trang admin và bếp cho máy tính
- Thành phần dùng chung (nút, ô nhập, thẻ món...) để trong `src/components/ui/`

---

## 9. Biến môi trường
- Huy tạo project Supabase, rồi gửi riêng cho từng người (qua Zalo, **không đăng lên GitHub**) nội dung file `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
GEMINI_API_KEY=...
```
- Mỗi người tạo file `.env.local` ở thư mục gốc project, dán vào, rồi chạy lại `npm run dev`

---

## 10. Quy trình ghép code
1. Mỗi task 1 nhánh, tên có mã Jira: `git checkout -b SCRUM-10-trang-menu`
2. Commit có mã Jira: `git commit -m "SCRUM-10 lam trang menu"`
3. Trước khi push: lấy code mới của nhóm về và chạy thử `npm run dev` không lỗi
```bash
git checkout main && git pull
git checkout SCRUM-10-trang-menu && git merge main
```
4. Push → tạo **Pull Request** → Hữu duyệt → gộp vào `main`
5. Gộp xong kéo task trên Jira sang **Done**

**Một task chỉ được tính là Done khi:** code đã gộp vào `main`, chạy `npm run dev` không lỗi, và đúng tên trường / API trong tài liệu này.
