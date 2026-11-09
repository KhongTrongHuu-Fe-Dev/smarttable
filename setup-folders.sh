#!/bin/bash
# =====================================================
# SmartTable - Tao khung thu muc chia viec cho 5 nguoi
# Ban JavaScript + React (Next.js)
# Chay trong thu muc goc cua project Next.js:
#   bash setup-folders.sh
# =====================================================
set -e

if [ ! -f package.json ] || [ ! -d src/app ]; then
  echo "Loi: hay chay script nay trong thu muc goc cua project (noi co package.json va src/app)."
  exit 1
fi

if [ -f tsconfig.json ]; then
  echo "Canh bao: project nay dang dung TypeScript (co tsconfig.json)."
  echo "Hay tao lai bang: npx create-next-app@latest smarttable --js --src-dir --app --tailwind --eslint"
  exit 1
fi

mk() { mkdir -p "$(dirname "$1")"; cat > "$1"; }

# ---------- Ham tao trang placeholder ----------
page() {
  mk "$1" <<EOF
// NGUOI PHU TRACH: $2
// TODO: $3
export default function Page() {
  return <div className="p-6">TODO ($2): $3</div>;
}
EOF
}

# ================= B - Frontend khach =================
page "src/app/table/[id]/page.jsx"        "B" "Trang menu: loc danh muc, tim kiem, xem chi tiet mon"
page "src/app/table/[id]/cart/page.jsx"   "B" "Gio hang: them/bot mon, ghi chu, gui order"
page "src/app/table/[id]/status/page.jsx" "B" "Theo doi trang thai don cua khach"

# ================= C - Admin =================
page "src/app/admin/page.jsx"         "C" "Trang tong quan + thong ke doanh thu"
page "src/app/admin/menu/page.jsx"    "C" "CRUD mon an (them, sua, xoa, upload anh)"
page "src/app/admin/tables/page.jsx"  "C" "Quan ly ban"
page "src/app/admin/orders/page.jsx"  "C" "Danh sach don hang"

# ================= D - Bep + Chat AI + Dang nhap + QR =================
page "src/app/kitchen/page.jsx"         "D" "Man hinh bep realtime: Dang lam -> Xong -> Da mang ra"
page "src/app/table/[id]/chat/page.jsx" "D" "Giao dien chat AI, the mon goi y co nut Them vao gio"
page "src/app/login/page.jsx"           "D" "Dang nhap cho admin va bep"
page "src/app/admin/qr/page.jsx"        "D" "Tao va in ma QR cho tung ban"

# ================= Huu - API + Database + AI =================
mk src/app/api/menu/route.js <<'EOF'
// NGUOI PHU TRACH: Huu
// TODO: GET lay menu tu Supabase (tam thoi tra ve du lieu gia)
import { mockMenu, mockCategories } from "@/data/mock";

export async function GET() {
  return Response.json({ categories: mockCategories, items: mockMenu });
}
EOF

mk src/app/api/orders/route.js <<'EOF'
// NGUOI PHU TRACH: Huu
// TODO: POST tao order moi, PATCH cap nhat trang thai
export async function POST(request) {
  const body = await request.json();
  return Response.json({ todo: "Huu: luu order vao database", received: body });
}
EOF

mk src/app/api/chat/route.js <<'EOF'
// NGUOI PHU TRACH: Huu
// TODO: nhan tin nhan khach -> lay menu -> goi Gemini -> tra ve JSON { goi_y: [{ id, ly_do }] }
export async function POST() {
  return Response.json({ todo: "Huu: chatbot AI" });
}
EOF

mk src/lib/supabase/client.js <<'EOF'
// NGUOI PHU TRACH: Huu
// TODO: tao Supabase client (cai thu vien: npm install @supabase/supabase-js)
export {};
EOF

mk src/lib/ai/gemini.js <<'EOF'
// NGUOI PHU TRACH: Huu
// TODO: ham goi Gemini API, xu ly loi 429 (het quota)
export {};
EOF

# ================= Du lieu gia (ca nhom dung chung) =================
# B va C dung file nay de code giao dien truoc, khong can doi API cua Huu.
mk src/data/mock.js <<'EOF'
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
EOF

# ================= Component dung chung =================
for d in customer admin kitchen chat ui; do
  mkdir -p "src/components/$d"
  touch "src/components/$d/.gitkeep"
done

# ================= E - Tai lieu =================
mk docs/README.md <<'EOF'
# Tai lieu do an (NGUOI PHU TRACH: E)

- [ ] use-case.md   - Use case + dac ta
- [ ] erd.png       - So do database
- [ ] test-cases.md - Test case
- [ ] bao-cao/      - Bao cao cac chuong
EOF

# ================= File moi truong mau =================
mk .env.example <<'EOF'
# Copy file nay thanh .env.local roi dien key that. KHONG day .env.local len GitHub.
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
EOF

# create-next-app mac dinh chan moi file .env*, mo lai rieng .env.example
if ! grep -q '^!.env.example' .gitignore 2>/dev/null; then
  printf '\n!.env.example\n' >> .gitignore
fi

# ================= Bang phan cong =================
mk PHAN_CONG.md <<'EOF'
# Phan cong thu muc

| Nguoi | Duoc sua | Viec |
| --- | --- | --- |
| Huu | src/app/api, src/lib, src/data | Database, API, AI |
| B | src/app/table, src/components/customer | Trang khach, gio hang, chat AI |
| C | src/app/admin (tru admin/qr), src/components/admin | Admin: mon, ban, don, doanh thu |
| D | src/app/kitchen, src/app/table/[id]/chat, src/app/login, src/app/admin/qr, src/components/kitchen, src/components/chat | Bep realtime, chat AI, dang nhap, QR |
| E | docs/ | UI/UX, bao cao, use case, test, slide |

Quy tac:
- Chi sua thu muc cua minh. Can sua src/data hay src/components/ui thi bao Huu truoc.
- Chua co API thi import du lieu gia: import { mockMenu } from "@/data/mock";
- Moi nguoi code tren nhanh rieng, khong push thang len main.
- Ten nhanh va commit phai co ma task Jira de Jira tu cap nhat:
    git checkout -b ST-8-trang-menu
    git commit -m "ST-8 lam trang menu"
- Pull request ghi ma task o tieu de, VD: "ST-8 Trang menu".
EOF

echo "Xong! Da tao khung thu muc cho ca nhom. Mo PHAN_CONG.md de xem ai lam gi."
