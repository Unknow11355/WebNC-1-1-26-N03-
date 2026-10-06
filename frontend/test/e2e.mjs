// Opt-in real browser + real API + disposable database. Never touches the app database.
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { readFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
const root = fileURLToPath(new URL("../../", import.meta.url));
const require = createRequire(
  new URL("../../backend/package.json", import.meta.url),
);
const mysql = require("mysql2/promise"),
  bcrypt = require("bcryptjs");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const db = "linh_ui_test_" + randomBytes(8).toString("hex");
const connection = await mysql.createConnection({
  host: process.env.TEST_DB_HOST || "127.0.0.1",
  port: Number(process.env.TEST_DB_PORT || 3306),
  user: process.env.TEST_DB_USER || "root",
  password: process.env.TEST_DB_PASSWORD || "",
  multipleStatements: true,
});
const children = [];
let browser,
  created = false;
const output = await mkdtemp(join(tmpdir(), "linh-ui-"));
const results = [];
async function sqlFile(name) {
  const text = (
    await readFile(join(root, "database", name), "utf8")
  ).replaceAll("mini_supermarket", db);
  let delimiter = ";",
    statement = "";
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^DELIMITER\s+(.+)$/i);
    if (match) {
      delimiter = match[1];
      continue;
    }
    statement += line + "\n";
    if (statement.trimEnd().endsWith(delimiter)) {
      const sql = statement.trimEnd().slice(0, -delimiter.length);
      if (sql.trim()) await connection.query(sql);
      statement = "";
    }
  }
  if (statement.trim()) await connection.query(statement);
}
function launch(file, cwd, env) {
  const child = spawn(process.execPath, [file], {
    cwd,
    env: { ...process.env, ...env },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stderr.on("data", (data) => process.stderr.write(data));
  children.push(child);
  return child;
}
async function ready(url) {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw Error("Server not ready " + url);
}
async function login(page, role) {
  await page.goto("http://127.0.0.1:5177/#login");
  await page.getByLabel("Email", { exact: true }).fill(role + "@ui.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("UiTest123!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.waitForURL("**/#shop");
  await page.getByRole("heading", { name: "Sản phẩm mỗi ngày" }).waitFor();
}
async function nav(page, name) {
  await page.locator("#nav").getByRole("link", { name, exact: true }).click();
}
try {
  await connection.query(
    `CREATE DATABASE ${db} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  created = true;
  for (const f of [
    "01_schema.sql",
    "03_buoi4_auth_schema.sql",
    "05_buoi5_migration.sql",
    "10_buoi6_migration.sql",
  ])
    await sqlFile(f);
  await connection.query(
    "INSERT INTO roles(role_name) VALUES ('admin'),('employee'),('customer')",
  );
  const hash = await bcrypt.hash("UiTest123!", 10);
  for (const [i, r] of ["admin", "employee", "customer"].entries())
    await connection.execute(
      "INSERT INTO users(full_name,email,password_hash,role_id,status) VALUES (?,?,?,?,?)",
      [r, r + "@ui.test", hash, i + 1, "active"],
    );
  await connection.query(
    "INSERT INTO categories(category_name) VALUES ('Thực phẩm'),('Đồ uống')",
  );
  for (let i = 1; i <= 23; i++)
    await connection.execute(
      "INSERT INTO products(product_name,barcode,price,unit,stock,category_id,status) VALUES (?,?,?,?,?,?,'active')",
      [
        i === 1
          ? "Táo đỏ tươi"
          : i === 2
            ? "Sữa tươi nguyên chất"
            : "Sản phẩm kiểm thử " + i,
        "UI-" + i,
        20000 + i * 1000,
        "hộp",
        30,
        (i % 2) + 1,
      ],
    );
  await connection.query(
    "INSERT INTO inventory_items(item_name,barcode,price,import_price,unit,stock,category_id,status) VALUES ('Táo đỏ tươi','UI-1',21000,10000,'hộp',40,2,'available')",
  );
  launch("src/server.js", join(root, "backend"), {
    PORT: "3017",
    DB_HOST: process.env.TEST_DB_HOST || "127.0.0.1",
    DB_PORT: process.env.TEST_DB_PORT || "3306",
    DB_USER: process.env.TEST_DB_USER || "root",
    DB_PASSWORD: process.env.TEST_DB_PASSWORD || "",
    DB_NAME: db,
    JWT_SECRET: randomBytes(32).toString("hex"),
  });
  launch("server.mjs", join(root, "frontend"), {
    PORT: "5177",
    API_ORIGIN: "http://127.0.0.1:3017",
  });
  await ready("http://127.0.0.1:3017/api/v1/health");
  await ready("http://127.0.0.1:5177");
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    }),
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("http://127.0.0.1:5177");
  await page.getByRole("heading", { name: "Táo đỏ tươi" }).waitFor();
  assert.equal(await page.locator(".product").count(), 20);
  await page.getByRole("button", { name: "Sau", exact: true }).click();
  await page.getByText("Trang 2 / 2 · 23 mục").waitFor();
  assert.equal(await page.locator(".product").count(), 3);
  results.push("Public products + server pagination 20/3");
  await page.getByLabel("Tìm tên hoặc mã vạch").fill("Táo");
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await page.getByText("Trang 1 / 1 · 1 mục").waitFor();
  results.push("Search by product name");
  await page.screenshot({ path: join(output, "desktop.png"), fullPage: true });
  await login(page, "customer");
  await nav(page, "Tài khoản");
  await page
    .getByLabel("Họ và tên", { exact: true })
    .fill("Khách cập nhật hồ sơ");
  await page.getByLabel("Số điện thoại", { exact: true }).fill("0901234567");
  await page
    .getByLabel("Địa chỉ", { exact: true })
    .fill("Địa chỉ mới kiểm thử");
  await page.getByRole("button", { name: "Lưu hồ sơ", exact: true }).click();
  await page
    .getByRole("heading", { name: "Khách cập nhật hồ sơ", exact: true })
    .waitFor();
  await page.reload();
  await page
    .getByRole("heading", { name: "Khách cập nhật hồ sơ", exact: true })
    .waitFor();
  const profileChecks = await page.evaluate(async () => {
    const headers = {
      "Content-Type": "application/json",
      Authorization: "Bearer " + sessionStorage.getItem("token"),
    };
    const forbidden = await fetch("/api/v1/auth/me", {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        user_id: 1,
        role_name: "admin",
        full_name: "Hack",
      }),
    });
    const anonymous = await fetch("/api/v1/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: "Hack" }),
    });
    return [forbidden.status, anonymous.status];
  });
  assert.deepEqual(profileChecks, [400, 401]);
  const [profileRows] = await connection.query(
    "SELECT user_id,full_name,role_id FROM users ORDER BY user_id",
  );
  assert.equal(profileRows[0].full_name, "admin");
  assert.equal(profileRows[2].role_id, 3);
  assert.equal(profileRows[2].full_name, "Khách cập nhật hồ sơ");
  results.push(
    "Profile UI persists after reload; identity/role injection 400; anonymous 401; other user unchanged",
  );
  await nav(page, "Sản phẩm");
  await page
    .locator(".product")
    .first()
    .getByRole("button", { name: "Thêm giỏ" })
    .click();
  await page.getByText("Đã thêm sản phẩm vào giỏ", { exact: true }).waitFor();
  await nav(page, "Giỏ hàng");
  await page.getByLabel("Cách nhận").selectOption("delivery");
  await page.getByLabel("Địa chỉ giao hàng").fill("Địa chỉ kiểm thử");
  await page.getByRole("button", { name: "Đặt hàng · Tiền mặt" }).click();
  await page.waitForURL("**/#orders");
  await page.getByRole("button", { name: "Xem đơn" }).first().waitFor();
  results.push("Customer login, cart, delivery checkout, order list");
  const employee = await browser.newPage();
  employee.on("dialog", (d) => d.accept());
  employee.on("pageerror", (e) => errors.push(e.message));
  await login(employee, "employee");
  await nav(employee, "Quản lý đơn hàng");
  await employee.getByRole("button", { name: "Xem đơn" }).first().click();
  await employee
    .getByRole("button", { name: "Xác nhận đơn", exact: true })
    .click();
  await employee
    .locator("dialog")
    .getByText("Đang giao", { exact: true })
    .waitFor();
  await employee
    .getByRole("button", { name: "Xác nhận đã thu tiền", exact: true })
    .click();
  await employee
    .locator("dialog")
    .getByText("Đã thanh toán", { exact: true })
    .waitFor();
  await page.reload();
  await page.getByRole("button", { name: "Xem đơn" }).first().click();
  await page.getByRole("button", { name: "Đã nhận hàng", exact: true }).click();
  await page
    .locator("dialog")
    .getByText("Hoàn thành", { exact: true })
    .waitFor();
  results.push("Employee confirm/pay-cash and customer receive");
  await employee.getByRole("button", { name: "Đóng", exact: true }).click();
  await nav(employee, "Quản lý kho");
  await employee.getByRole("button", { name: "Nhập", exact: true }).click();
  await employee.getByLabel("Số lượng", { exact: true }).fill("5");
  await employee.getByLabel("Giá nhập", { exact: true }).fill("10000");
  await employee.getByLabel("Lý do", { exact: true }).fill("Kiểm thử UI");
  await employee
    .locator("dialog")
    .getByRole("button", { name: "Lưu", exact: true })
    .click();
  await employee.getByText("Đã cập nhật kho", { exact: true }).waitFor();
  assert.equal(
    Number(
      (
        await connection.query("SELECT stock FROM inventory_items LIMIT 1")
      )[0][0].stock,
    ),
    45,
  );
  results.push("Inventory import via UI confirmed in SQL");
  await employee.getByRole("button", { name: "Lên kệ", exact: true }).click();
  await employee.getByLabel("Số lượng", { exact: true }).fill("3");
  await employee.getByLabel("Lý do", { exact: true }).fill("Đưa lên kệ");
  await employee
    .locator("dialog")
    .getByRole("button", { name: "Lưu", exact: true })
    .click();
  await employee.locator("dialog").waitFor({ state: "hidden" });
  await employee.getByRole("button", { name: "Kiểm kê", exact: true }).click();
  await employee
    .getByLabel("Tồn thực tế sau kiểm kê", { exact: true })
    .fill("40");
  await employee.getByLabel("Lý do", { exact: true }).fill("Kiểm kê thực tế");
  await employee
    .locator("dialog")
    .getByRole("button", { name: "Lưu", exact: true })
    .click();
  await employee.locator("dialog").waitFor({ state: "hidden" });
  assert.equal(
    Number(
      (
        await connection.query("SELECT stock FROM inventory_items LIMIT 1")
      )[0][0].stock,
    ),
    40,
  );
  results.push("Inventory export to shelf and adjustment through UI");
  await nav(employee, "Bán tại quầy");
  await employee
    .locator(".product")
    .first()
    .getByRole("button", { name: "Chọn", exact: true })
    .click();
  await employee
    .getByRole("button", { name: "Đã thu tiền · Hoàn tất" })
    .click();
  await employee
    .locator("dialog")
    .getByText("Đã thanh toán", { exact: true })
    .waitFor();
  assert.equal(
    Number(
      (
        await connection.query(
          "SELECT COUNT(*) n FROM orders WHERE order_type='offline' AND payment_status='paid'",
        )
      )[0][0].n,
    ),
    1,
  );
  results.push("POS cash via UI confirmed in SQL");
  const admin = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  admin.on("pageerror", (e) => errors.push(e.message));
  await login(admin, "admin");
  for (const name of [
    "Quản lý sản phẩm",
    "Danh mục",
    "Nhân viên & khách hàng",
    "Voucher",
    "Lịch sử kho",
    "Tài khoản",
  ]) {
    await nav(admin, name);
    await admin.locator("#main h1").waitFor();
    assert.equal(await admin.locator(".error").count(), 0);
    results.push("Admin screen " + name);
  }
  await nav(admin, "Danh mục");
  await admin.getByRole("button", { name: "Thêm mới", exact: true }).click();
  await admin.getByLabel("Tên danh mục").fill("Danh mục UI");
  await admin
    .locator("dialog")
    .getByRole("button", { name: "Lưu", exact: true })
    .click();
  await admin.getByRole("cell", { name: "Danh mục UI", exact: true }).waitFor();
  results.push("Category create through API");
  const categoryRow = admin.getByRole("row").filter({ hasText: "Danh mục UI" });
  await categoryRow.getByRole("button", { name: "Sửa", exact: true }).click();
  await admin.getByLabel("Tên danh mục").fill("Danh mục đã sửa UI");
  await admin
    .locator("dialog")
    .getByRole("button", { name: "Lưu", exact: true })
    .click();
  await admin
    .getByRole("cell", { name: "Danh mục đã sửa UI", exact: true })
    .waitFor();
  admin.on("dialog", (d) => d.accept());
  await admin
    .getByRole("row")
    .filter({ hasText: "Danh mục đã sửa UI" })
    .getByRole("button", { name: "Xóa", exact: true })
    .click();
  await admin
    .getByRole("cell", { name: "Danh mục đã sửa UI", exact: true })
    .waitFor({ state: "hidden" });
  results.push("Category edit/delete through UI");
  await nav(admin, "Voucher");
  await admin.getByRole("button", { name: "Thêm mới", exact: true }).click();
  await admin.getByLabel("Mã voucher", { exact: true }).fill("UITEST");
  await admin.getByLabel("Giá trị giảm", { exact: true }).fill("1000");
  await admin
    .locator("dialog")
    .getByRole("button", { name: "Lưu", exact: true })
    .click();
  await admin.getByRole("cell", { name: "UITEST", exact: true }).waitFor();
  results.push("Voucher create through API");
  await nav(admin, "Quản lý sản phẩm");
  await admin
    .getByRole("button", { name: "Thêm sản phẩm", exact: true })
    .click();
  await admin
    .getByLabel("Tên sản phẩm", { exact: true })
    .fill("Sản phẩm mới UI");
  await admin.getByLabel("Mã vạch", { exact: true }).fill("UI-NEW");
  await admin.locator('dialog select[name="category_id"]').selectOption("1");
  await admin.getByLabel("Đơn vị", { exact: true }).fill("hộp");
  await admin.getByLabel("Giá bán", { exact: true }).fill("10000");
  await admin
    .locator("dialog")
    .getByRole("button", { name: "Lưu", exact: true })
    .click();
  await admin.locator("dialog").waitFor({ state: "hidden" });
  await admin
    .getByRole("button", { name: "Thêm sản phẩm", exact: true })
    .waitFor();
  await admin.getByLabel("Tìm tên hoặc mã vạch").fill("UI-NEW");
  await admin.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await admin
    .getByRole("cell", { name: "Sản phẩm mới UI", exact: true })
    .waitFor();
  results.push("Product create and search through API");
  await nav(admin, "Nhân viên & khách hàng");
  await admin.getByRole("button", { name: "Thêm mới", exact: true }).click();
  await admin.getByLabel("Họ tên", { exact: true }).fill("Người dùng UI");
  await admin.getByLabel("Email", { exact: true }).fill("new@ui.test");
  await admin.getByLabel("Mật khẩu", { exact: true }).fill("UiTest123!");
  await admin
    .locator("dialog")
    .getByRole("button", { name: "Lưu", exact: true })
    .click();
  await admin
    .getByRole("cell", { name: "Người dùng UI", exact: true })
    .waitFor();
  results.push("User create through API");
  // POS retry preserves the exact idempotency key after the server committed but response was lost.
  await employee.getByRole("button", { name: "Đóng", exact: true }).click();
  await employee
    .locator(".product")
    .first()
    .getByRole("button", { name: "Chọn", exact: true })
    .click();
  const keys = [];
  await employee.route("**/api/v1/pos/sales", async (route) => {
    keys.push(route.request().headers()["idempotency-key"]);
    const response = await route.fetch();
    if (keys.length === 1) await route.abort("failed");
    else await route.fulfill({ response });
  });
  await employee
    .getByRole("button", { name: "Đã thu tiền · Hoàn tất" })
    .click();
  await employee
    .getByRole("button", { name: "Thử lại yêu cầu thanh toán" })
    .waitFor();
  await employee.reload();
  await employee
    .getByRole("button", { name: "Thử lại yêu cầu thanh toán" })
    .click();
  await employee
    .locator("dialog")
    .getByText("Đã thanh toán", { exact: true })
    .waitFor();
  assert.equal(keys.length, 2);
  assert.equal(keys[0], keys[1]);
  assert.equal(
    Number(
      (
        await connection.query(
          "SELECT COUNT(*) n FROM orders WHERE order_type='offline'",
        )
      )[0][0].n,
    ),
    2,
  );
  results.push(
    "POS lost-response + reload + retry: same key, one additional order",
  );
  await admin.setViewportSize({ width: 390, height: 844 });
  await nav(admin, "Sản phẩm");
  await admin.locator(".product").first().waitFor();
  assert.ok(
    await admin.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await admin.screenshot({ path: join(output, "mobile.png"), fullPage: true });
  results.push("390px mobile without document overflow");
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({ results, errors, screenshots: output }, null, 2),
  );
} finally {
  await browser?.close();
  for (const child of children) child.kill();
  // Only the fresh randomized database created by this process is eligible for removal.
  if (created && /^linh_ui_test_[a-f0-9]{16}$/.test(db))
    await connection.query(`DROP DATABASE ${db}`);
  await connection.end();
}
