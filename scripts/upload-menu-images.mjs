// Tải hàng loạt ảnh món lên Supabase Storage (bucket menu-images) và gán image_url.
//
// Cách dùng (chạy ở thư mục gốc project):
//   1. Bỏ ảnh vào thư mục  anh-mon/  (tên file theo món, xem "Cách đặt tên" bên dưới).
//   2. Đặt tài khoản admin vào biến môi trường (không ghi vào file, không đưa lên GitHub):
//        PowerShell:  $env:ADMIN_EMAIL="admin@smarttable.test"; $env:ADMIN_PASSWORD="..."
//   3. Chạy thử, chưa ghi gì:   node scripts/upload-menu-images.mjs --dry-run
//      Chạy thật:               node scripts/upload-menu-images.mjs
//
// Tùy chọn:
//   --dir=duong-dan   thư mục ảnh (mặc định anh-mon)
//   --force           ghi đè cả món đã có ảnh (mặc định bỏ qua món đã có ảnh)
//   --dry-run         chỉ in kết quả ghép tên, không tải lên
//
// Cách đặt tên file (không phân biệt hoa thường, bỏ dấu tiếng Việt cũng được):
//   - theo tên món:  bun-bo-hue.jpg, "Bún bò Huế.png"
//   - hoặc theo id:  8.jpg, 8-bun-bo-hue.jpg
// Chỉ nhận .jpg .jpeg .png .webp .gif, tối đa 5MB mỗi ảnh.

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { extname, join, basename } from "node:path";

const BUCKET = "menu-images";
const MAX_BYTES = 5 * 1024 * 1024;
const MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : fallback;
};
const DRY = flag("dry-run");
const FORCE = flag("force");
const DIR = option("dir", "anh-mon");

// Đọc .env.local (không cần cài thêm thư viện).
function loadEnv() {
  const env = { ...process.env };
  if (existsSync(".env.local")) {
    for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && env[m[1]] === undefined) env[m[1]] = m[2].replace(/^"|"$/g, "");
    }
  }
  return env;
}

// "Bún bò Huế" -> "bun-bo-hue"
function slugify(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function die(message) {
  console.error(`\n✘ ${message}`);
  process.exit(1);
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) die("Thiếu NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY trong .env.local");
if (!existsSync(DIR)) die(`Không thấy thư mục ảnh "${DIR}". Tạo thư mục và bỏ ảnh vào đó.`);

// Danh sách ảnh trong thư mục
const files = readdirSync(DIR)
  .filter((f) => statSync(join(DIR, f)).isFile() && MIME[extname(f).toLowerCase()])
  .sort();
if (files.length === 0) die(`Thư mục "${DIR}" chưa có ảnh (.jpg .png .webp .gif).`);

const supabase = createClient(url, key, { auth: { persistSession: false } });

// Chạy thật cần đăng nhập admin (RLS chỉ cho admin tải ảnh và sửa món).
if (!DRY) {
  const email = env.ADMIN_EMAIL;
  const password = env.ADMIN_PASSWORD;
  if (!email || !password) die("Chưa có ADMIN_EMAIL / ADMIN_PASSWORD (xem hướng dẫn ở đầu file).");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) die(`Đăng nhập thất bại: ${error.message}`);
  if (data.user?.app_metadata?.role !== "admin") die("Tài khoản này không phải admin.");
}

const { data: items, error: itemsError } = await supabase
  .from("menu_items")
  .select("id, name, image_url")
  .order("id");
if (itemsError) die(`Không đọc được danh sách món: ${itemsError.message}`);

// Ghép từng ảnh với một món
const bySlug = new Map(items.map((i) => [slugify(i.name), i]));
const byId = new Map(items.map((i) => [String(i.id), i]));

function findItem(file) {
  const stem = basename(file, extname(file));
  const slug = slugify(stem);
  if (bySlug.has(slug)) return bySlug.get(slug);
  const idMatch = stem.match(/^(\d+)(?:[-_\s].*)?$/);
  if (idMatch && byId.has(idMatch[1])) return byId.get(idMatch[1]);
  return null;
}

const plan = [];
const unmatched = [];
const used = new Set();
for (const file of files) {
  const item = findItem(file);
  if (!item) unmatched.push(file);
  else if (used.has(item.id)) unmatched.push(`${file} (trùng món "${item.name}", đã có ảnh khác)`);
  else {
    used.add(item.id);
    plan.push({ file, item });
  }
}
const withoutImage = items.filter((i) => !used.has(i.id) && !i.image_url);

console.log(`\nThư mục: ${DIR}  |  ${files.length} ảnh  |  ${items.length} món  |  ${DRY ? "CHẠY THỬ" : "CHẠY THẬT"}\n`);

let done = 0;
let skipped = 0;
let failed = 0;
for (const { file, item } of plan) {
  const label = `#${item.id} ${item.name}`.padEnd(34);
  if (item.image_url && !FORCE) {
    console.log(`  ↷ ${label} đã có ảnh, bỏ qua (dùng --force để ghi đè)  [${file}]`);
    skipped++;
    continue;
  }
  const path = join(DIR, file);
  const size = statSync(path).size;
  if (size === 0 || size > MAX_BYTES) {
    console.log(`  ✘ ${label} ${file}: ${size === 0 ? "file rỗng" : "lớn hơn 5MB"}`);
    failed++;
    continue;
  }
  if (DRY) {
    console.log(`  ✔ ${label} ← ${file} (${(size / 1024).toFixed(0)} KB)`);
    done++;
    continue;
  }

  const ext = extname(file).toLowerCase();
  const objectName = `${randomUUID()}${ext}`;
  const upload = await supabase.storage
    .from(BUCKET)
    .upload(objectName, readFileSync(path), { contentType: MIME[ext], upsert: false });
  if (upload.error) {
    console.log(`  ✘ ${label} tải lên lỗi: ${upload.error.message}`);
    failed++;
    continue;
  }
  const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(objectName).data.publicUrl;
  const update = await supabase.from("menu_items").update({ image_url: publicUrl }).eq("id", item.id).select("id");
  if (update.error || !update.data?.length) {
    console.log(`  ✘ ${label} đã tải ảnh nhưng không gán được vào món: ${update.error?.message ?? "không có quyền"}`);
    failed++;
    continue;
  }
  console.log(`  ✔ ${label} ← ${file}`);
  done++;
}

console.log(`\nKết quả: ${done} ${DRY ? "ảnh sẽ được gán" : "món đã có ảnh mới"}, ${skipped} bỏ qua, ${failed} lỗi.`);
if (unmatched.length) {
  console.log(`\nẢnh không ghép được với món nào (${unmatched.length}) - kiểm tra lại tên file:`);
  unmatched.forEach((f) => console.log(`  - ${f}`));
}
if (withoutImage.length) {
  console.log(`\nMón vẫn chưa có ảnh (${withoutImage.length}):`);
  withoutImage.forEach((i) => console.log(`  - #${i.id} ${i.name}   → tên file gợi ý: ${slugify(i.name)}.jpg`));
}
if (!DRY && failed > 0) process.exit(1);
