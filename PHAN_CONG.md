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
