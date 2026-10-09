import {
  escapeHtml as e,
  money,
  safeImage,
  orderActions,
  cartTotal,
  labels,
} from "./core.js";
import { barcodeView, scheduleView, stopScanner } from "./staff-tools.js";
import { shiftsView } from "./shifts.js";
const $ = (s) => document.querySelector(s);
const state = {
  token: sessionStorage.getItem("token") || "",
  user: null,
  categories: [],
  page: 1,
  q: "",
  category: "",
  rows: [],
  pos: [],
  posRequest: null,
};
let renderVersion = 0,
  noticeTimer;
const role = () => state.user?.role_name || "guest";
const staff = () => ["admin", "employee"].includes(role());
const isAdmin = () => role() === "admin";
const route = () => location.hash.slice(1) || "shop";
const label = (v) => labels[v] || v || "—";
const badge = (v) => `<span class="badge">${e(label(v))}</span>`;
const btn = (action, text, id = "", cls = "secondary") =>
  `<button type="button" class="${cls}" data-action="${action}" data-id="${e(id)}">${text}</button>`;
const title = (name, description, action = "") =>
  `<div class="heading"><div><p class="eyebrow">SIÊU THỊ MINI</p><h1>${name}</h1><div class="muted">${description}</div></div>${action}</div>`;
function toast(message) {
  clearTimeout(noticeTimer);
  $("#notice").textContent = message;
  noticeTimer = setTimeout(() => ($("#notice").textContent = ""), 6000);
}
function resetSession() {
  state.token = "";
  state.user = null;
  state.pos = [];
  state.posRequest = null;
  sessionStorage.removeItem("token");
}
function restorePos() {
  try {
    const saved = JSON.parse(sessionStorage.getItem("posRequest") || "null");
    if (saved && saved.userId === state.user?.user_id) {
      state.posRequest = saved;
      state.pos = saved.displayItems || [];
    }
  } catch {
    toast(
      "Không đọc được phiếu POS đang chờ. Kiểm tra lịch sử trước khi tạo phiếu mới.",
    );
  }
}
async function api(path, { method = "GET", body, headers = {} } = {}) {
  let response;
  try {
    response = await fetch("/api/v1" + path, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(state.token ? { Authorization: "Bearer " + state.token } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(
      "Mất kết nối. Chưa xác định thao tác đã được lưu hay chưa. Kiểm tra lịch sử trước khi gửi lại.",
    );
  }
  const data =
    response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && state.token) {
      resetSession();
      $("#dialog").close();
      location.hash = "login";
    }
    const error = new Error(
      data.error?.message || `Yêu cầu thất bại (${response.status})`,
    );
    error.status = response.status;
    error.code = data.error?.code;
    throw error;
  }
  return data;
}
function shell() {
  const links = [["shop", "Sản phẩm"]];
  if (role() === "customer")
    links.push(["cart", "Giỏ hàng"], ["orders", "Đơn hàng của tôi"]);
  if (staff())
    links.push(
      ["pos", "Bán tại quầy"],
      ["orders", "Quản lý đơn hàng"],
      ["inventory", "Quản lý kho"],
      ["logs", "Lịch sử kho"],
      ["barcode", "Mã vạch"],
      ["schedule", "Lịch nhân viên"],
      ["shifts", "Ca làm"],
    );
  if (isAdmin())
    links.push(
      ["products", "Quản lý sản phẩm"],
      ["categories", "Danh mục"],
      ["users", "Nhân viên & khách hàng"],
      ["vouchers", "Voucher"],
    );
  if (state.user) links.push(["profile", "Tài khoản"]);
  else links.push(["login", "Đăng nhập"], ["register", "Đăng ký"]);
  $("#nav").innerHTML = links
    .map(
      ([key, text]) =>
        `<a href="#${key}" ${route() === key ? 'class="active" aria-current="page"' : ""}>${text}</a>`,
    )
    .join("");
  $("#identity").innerHTML = state.user
    ? `<span class="username">${e(state.user.full_name)} · ${e(label(role()))}</span>${btn("logout", "Đăng xuất")}`
    : `<a class="button" href="#login">Đăng nhập</a>`;
  return links.map((l) => l[0]);
}
function table(headers, rows) {
  return rows.length
    ? `<div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>${rows.map((c) => `<tr>${c.map((v) => `<td>${v}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`
    : '<div class="empty">Chưa có dữ liệu trong danh sách này.</div>';
}
function pager(meta) {
  if (!meta) return "";
  return `<div class="pager"><button data-action="page" data-id="${state.page - 1}" ${state.page <= 1 ? "disabled" : ""} class="secondary">Trước</button><span>Trang ${meta.page} / ${Math.max(1, meta.totalPages)} · ${meta.total} mục</span><button data-action="page" data-id="${state.page + 1}" ${state.page >= meta.totalPages ? "disabled" : ""} class="secondary">Sau</button></div>`;
}
function image(p) {
  const skuImages = [
    "chuoi.png",
    "dautay.jpg",
    "tao.png",
    "dua.jpg",
    "duahau.jpg",
    "xotthaixatac.jpg",
    "XotBBQ.png",
    "muoiotchanh.png",
    "xotkimquat.jpg",
    "sottrungmuoi.png",
    "trathtruetea.jpg",
    "tradaohatchia.jpg",
    "C2.jpg",
    "trahoanhai.png",
    "trachanhmatong.jpg",
  ];
  const sku = String(p.barcode || "").match(/^prod(\d{3})$/i);
  const name = String(p.product_name || p.item_name || "").toLowerCase();
  const fallback = sku
    ? skuImages[Number(sku[1]) - 1]
    : name.includes("táo")
      ? "tao.png"
      : name.includes("sữa tươi")
        ? "suatuoi.jpg"
        : null;
  const url = safeImage(
    p.image_url || "/assets/images/" + (fallback || "default_product.png"),
  );
  return `<div class="product-image">${url ? `<img src="${e(url)}" alt="${e(p.product_name || p.item_name)}" loading="lazy">` : '<span aria-label="Chưa có ảnh sản phẩm">▧</span>'}</div>`;
}
function field(
  name,
  text,
  type = "text",
  value = "",
  options = null,
  required = true,
) {
  return `<label>${text}${options ? `<select name="${name}" ${required ? "required" : ""}>${options.map(([v, t]) => `<option value="${e(v)}" ${String(v) === String(value) ? "selected" : ""}>${e(t)}</option>`).join("")}</select>` : `<input name="${name}" type="${type}" value="${e(value)}" ${required ? "required" : ""} ${type === "number" ? 'step="any" min="0"' : ""} ${type === "password" ? 'minlength="8" maxlength="72" autocomplete="new-password"' : ""}>`}</label>`;
}
function form(content, submit = "Lưu") {
  return `<form class="stack"><div class="form-grid">${content}</div><p class="form-error" role="alert"></p><button type="submit">${submit}</button></form>`;
}
function wireForm(root, callback) {
  const f = root.querySelector("form");
  f.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = f.querySelector("[type=submit]");
    if (button.disabled) return;
    button.disabled = true;
    f.querySelector(".form-error").textContent = "";
    try {
      await callback(Object.fromEntries(new FormData(f)));
    } catch (error) {
      f.querySelector(".form-error").textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
}
function modal(name, html, callback) {
  $("#dialog-title").textContent = name;
  $("#dialog-content").innerHTML = html;
  if (callback) wireForm($("#dialog-content"), callback);
  if (!$("#dialog").open) $("#dialog").showModal();
}
function categoryOptions() {
  return [
    ["", "Chọn danh mục"],
    ...state.categories.map((c) => [c.category_id, c.category_name]),
  ];
}
async function render() {
  stopScanner();
  const version = ++renderVersion;
  const current = route();
  const allowed = shell();
  document.title =
    ($("#nav .active")?.textContent || "Siêu thị mini") + " · Siêu thị mini";
  if (!allowed.includes(current)) {
    location.hash = state.user ? "shop" : "login";
    return;
  }
  $("#main").innerHTML =
    '<div class="empty" role="status">Đang tải dữ liệu…</div>';
  try {
    let html = "",
      after = () => {};
    if (current === "shifts") {
      const view = shiftsView({ api, user: state.user, toast });
      html = view.html;
      after = view.after;
    } else if (current === "barcode" || current === "schedule") {
      const view =
        current === "barcode"
          ? barcodeView({ api, toast })
          : scheduleView({ api, user: state.user, toast });
      html = view.html;
      after = view.after;
    } else if (current === "login" || current === "register") {
      const register = current === "register";
      html = `<div class="auth panel">${title(register ? "Tạo tài khoản" : "Chào mừng trở lại", "Đăng nhập để tiếp tục mua sắm và quản lý siêu thị.")}${form((register ? field("full_name", "Họ và tên") : "") + field("email", "Email", "email") + field("password", "Mật khẩu", "password") + (register ? field("phone", "Số điện thoại", "tel", "", null, false) + field("address", "Địa chỉ", "text", "", null, false) : ""), register ? "Đăng ký" : "Đăng nhập")}<p class="muted">${register ? 'Đã có tài khoản? <a href="#login">Đăng nhập</a>' : 'Chưa có tài khoản? <a href="#register">Đăng ký</a>'}</p><p class="note">Khôi phục mật khẩu chưa được backend hiện tại hỗ trợ.</p></div>`;
      after = () =>
        wireForm($("#main"), async (data) => {
          const result = await api("/auth/" + current, {
            method: "POST",
            body: data,
          });
          if (register) {
            toast("Đăng ký thành công. Hãy đăng nhập.");
            location.hash = "login";
          } else {
            state.token = result.data.access_token;
            sessionStorage.setItem("token", state.token);
            state.user = (await api("/auth/me")).data;
            restorePos();
            location.hash = "shop";
          }
        });
    } else if (["shop", "products", "pos"].includes(current)) {
      const params = new URLSearchParams({ page: state.page, limit: 20 });
      if (state.q) params.set("q", state.q);
      if (state.category) params.set("category_id", state.category);
      const [result, categories] = await Promise.all([
        api("/products?" + params),
        api("/categories"),
      ]);
      if (version !== renderVersion) return;
      state.rows = result.data;
      state.categories = categories.data;
      const toolbar = `<form id="search" class="toolbar">${field("q", "Tìm tên hoặc mã vạch", "search", state.q, null, false)}${field("category_id", "Danh mục", "text", state.category, [["", "Tất cả"], ...state.categories.map((c) => [c.category_id, c.category_name])], false)}<button>Tìm kiếm</button></form>`;
      const cards = `<div class="grid">${result.data.map((p) => `<article class="card product">${image(p)}<span class="muted">${e(p.unit)} · Còn ${e(p.stock)}</span><h3>${e(p.product_name)}</h3><div class="price">${money(p.price)}</div><div class="actions">${btn("detail", "Chi tiết", p.product_id)}${Number(p.stock) > 0 ? btn(staff() ? "pos-add" : "cart-add", current === "pos" ? "Chọn" : staff() ? "Bán tại quầy" : "Thêm giỏ", p.product_id, "") : '<span class="badge">Hết hàng</span>'}</div></article>`).join("")}</div>`;
      html = title(
        current === "products"
          ? "Quản lý sản phẩm"
          : current === "pos"
            ? "Bán tại quầy"
            : "Sản phẩm mỗi ngày",
        current === "pos"
          ? "Thanh toán tiền mặt · Giá và tồn kho được xác nhận tại máy chủ."
          : "Sản phẩm trên kệ · Giá và số lượng cập nhật từ hệ thống.",
        current === "products" ? btn("create", "Thêm sản phẩm", "", "") : "",
      );
      if (current === "shop")
        html +=
          '<section class="hero"><span class="eyebrow">TƯƠI NGON • TIỆN LỢI • MỖI NGÀY</span><h2>Mua sắm đơn giản,<br>trọn vẹn từng bữa ăn.</h2><p>Chọn sản phẩm yêu thích, đặt hàng online và nhận tại cửa hàng hoặc giao tận nơi.</p></section>';
      html += toolbar;
      if (current === "products")
        html += table(
          ["Sản phẩm", "Mã vạch", "Giá bán", "Tồn kệ", "Thao tác"],
          result.data.map((p) => [
            e(p.product_name),
            e(p.barcode),
            money(p.price),
            e(p.stock),
            `<div class="actions">${btn("edit", "Sửa", p.product_id)}${btn("delete", "Ngừng bán", p.product_id, "danger")}</div>`,
          ]),
        );
      else
        html +=
          current === "pos"
            ? `<div class="split"><section>${cards || "<p>Không có sản phẩm.</p>"}</section><section class="panel"><h2>Phiếu bán hàng</h2>${posPanel()}</section></div>`
            : result.data.length
              ? cards
              : '<div class="empty">Không tìm thấy sản phẩm phù hợp.</div>';
      html += pager(result.meta);
      after = () =>
        $("#search").addEventListener("submit", (event) => {
          event.preventDefault();
          const d = new FormData(event.currentTarget);
          state.q = d.get("q");
          state.category = d.get("category_id");
          state.page = 1;
          render();
        });
    } else if (current === "cart") {
      const cart = (await api("/carts")).data;
      state.cart = cart;
      html = title(
        "Giỏ hàng của bạn",
        "Kiểm tra sản phẩm và chọn cách nhận hàng.",
      );
      if (!cart.items.length)
        html +=
          '<div class="empty">Giỏ hàng đang trống. <a href="#shop">Tiếp tục mua sắm</a></div>';
      else {
        html += `<div class="split"><section class="panel">${cart.items.map((i) => `<div class="item-row"><div><strong>${e(i.product_name)}</strong><p class="muted">${money(i.price)} / ${e(i.unit)}</p></div><label>Số lượng<input class="quantity" type="number" min="1" step="1" value="${e(i.quantity)}" id="qty-${i.cart_item_id}"></label><div class="actions">${btn("cart-update", "Lưu", i.cart_item_id)}${btn("cart-remove", "Bỏ", i.cart_item_id, "danger")}</div></div>`).join("")}<div class="total">Tạm tính: ${money(cartTotal(cart.items))}</div></section><section class="panel"><h2>Thông tin nhận hàng</h2>${form(
          field("delivery_method", "Cách nhận", "text", "pickup", [
            ["pickup", "Nhận tại cửa hàng"],
            ["delivery", "Giao tận nơi"],
          ]) +
            field(
              "shipping_address",
              "Địa chỉ giao hàng",
              "text",
              state.user.address || "",
              null,
              false,
            ) +
            field("voucher_code", "Mã voucher", "text", "", null, false) +
            field("note", "Ghi chú", "text", "", null, false),
          "Đặt hàng · Tiền mặt",
        )}${btn("voucher-check", "Kiểm tra voucher")}<p class="note">Giá sau voucher do máy chủ xác nhận. Đặt hàng chưa đồng nghĩa đã thanh toán. Nếu mất kết nối, kiểm tra Đơn hàng trước khi đặt lại.</p></section></div>`;
        after = () =>
          wireForm($("#main"), async (d) => {
            if (d.delivery_method === "delivery" && !d.shipping_address.trim())
              throw new Error("Vui lòng nhập địa chỉ giao hàng.");
            const r = await api("/orders/checkout", {
              method: "POST",
              body: { ...d, payment_method: "cash" },
            });
            toast("Đã tạo đơn #" + r.data.order_id);
            location.hash = "orders";
          });
      }
    } else if (current === "orders") {
      const r = await api(
        `/orders${role() === "customer" ? "/mine" : ""}?page=${state.page}&limit=20`,
      );
      state.rows = r.data;
      html =
        title(
          role() === "customer" ? "Đơn hàng của tôi" : "Quản lý đơn hàng",
          "Theo dõi trạng thái xử lý và thanh toán riêng biệt.",
        ) +
        table(
          [
            "Mã đơn",
            "Ngày tạo",
            "Loại",
            "Tổng thanh toán",
            "Xử lý",
            "Thanh toán",
            "",
          ],
          r.data.map((o) => [
            "#" + e(o.order_id),
            e(new Date(o.created_at).toLocaleString("vi-VN")),
            e(label(o.order_type)),
            money(o.final_amount),
            badge(o.status),
            badge(o.payment_status),
            btn("order-detail", "Xem đơn", o.order_id),
          ]),
        ) +
        pager(r.meta);
    } else if (current === "profile") {
      const u = (await api("/auth/me")).data;
      html =
        title("Tài khoản", "Thông tin tài khoản hiện tại.") +
        `<section class="panel stack"><h2>${e(u.full_name)}</h2><p>Email đăng nhập: ${e(u.email)}</p><div>${badge(u.role_name)} ${badge(u.status)}</div>${form(field("full_name", "Họ và tên", "text", u.full_name) + field("phone", "Số điện thoại", "tel", u.phone || "", null, false) + field("address", "Địa chỉ", "text", u.address || "", null, false), "Lưu hồ sơ")}<p class="muted">Điện thoại: 8–15 chữ số, có thể bắt đầu bằng +. Để trống điện thoại/địa chỉ để xóa thông tin đó.</p><p class="note">Email và vai trò không thay đổi tại đây. Chức năng đổi mật khẩu chưa được triển khai.</p></section>`;
      after = () =>
        wireForm($("#main"), async (data) => {
          const result = await api("/auth/me", { method: "PATCH", body: data });
          state.user = result.data;
          toast("Đã cập nhật hồ sơ");
          await render();
        });
    } else {
      const config = resources[current];
      const [r, categories] = await Promise.all([
        api(config.path + (config.paged ? `?page=${state.page}&limit=20` : "")),
        api("/categories"),
      ]);
      state.rows = r.data;
      state.categories = categories.data;
      html =
        title(
          config.title,
          config.description,
          config.editable && isAdmin() ? btn("create", "Thêm mới", "", "") : "",
        ) +
        table(
          config.columns
            .map((c) => c[1])
            .concat(current === "logs" ? [] : ["Thao tác"]),
          r.data.map((row) =>
            config.columns
              .map(([key, , format]) =>
                format === "money"
                  ? money(row[key])
                  : format === "status"
                    ? badge(row[key])
                    : e(row[key] ?? "—"),
              )
              .concat(
                current === "logs" ? [] : [resourceActions(current, row)],
              ),
          ),
        ) +
        pager(r.meta);
    }
    if (version !== renderVersion) return;
    $("#main").innerHTML = html;
    after();
  } catch (error) {
    if (version === renderVersion)
      $("#main").innerHTML =
        `<div class="error"><h2>Chưa tải được nội dung</h2><p>${e(error.message)}</p>${btn("retry", "Thử lại")}</div>`;
  }
}
const resources = {
  categories: {
    path: "/categories",
    id: "category_id",
    title: "Danh mục sản phẩm",
    description: "Phân nhóm sản phẩm của siêu thị.",
    editable: true,
    columns: [
      ["category_id", "Mã"],
      ["category_name", "Tên danh mục"],
    ],
  },
  users: {
    path: "/users",
    id: "user_id",
    title: "Nhân viên & khách hàng",
    description: "Quản lý tài khoản và vai trò trong hệ thống.",
    editable: true,
    paged: true,
    columns: [
      ["full_name", "Họ tên"],
      ["email", "Email"],
      ["role_name", "Vai trò", "status"],
      ["status", "Trạng thái", "status"],
    ],
  },
  vouchers: {
    path: "/vouchers",
    id: "voucher_id",
    title: "Quản lý voucher",
    description: "Ưu đãi cho đơn online. POS hiện chưa áp dụng voucher.",
    editable: true,
    columns: [
      ["code", "Mã"],
      ["discount_type", "Kiểu giảm"],
      ["discount_value", "Giá trị"],
      ["used_count", "Đã dùng"],
      ["status", "Trạng thái", "status"],
    ],
  },
  inventory: {
    path: "/inventory/items",
    id: "inventory_item_id",
    title: "Quản lý kho",
    description: "Tồn kho tách biệt tồn trên kệ. Xuất kho để đưa hàng lên kệ.",
    editable: true,
    paged: true,
    columns: [
      ["item_name", "Mặt hàng"],
      ["barcode", "Mã vạch"],
      ["stock", "Tồn kho"],
      ["import_price", "Giá nhập", "money"],
      ["price", "Giá bán", "money"],
      ["status", "Trạng thái", "status"],
    ],
  },
  logs: {
    path: "/inventory/logs",
    title: "Lịch sử xuất nhập kho",
    description: "Nhật ký nghiệp vụ kho, không phải nhật ký bảo mật hệ thống.",
    paged: true,
    columns: [
      ["created_at", "Thời gian"],
      ["inventory_item_id", "Mặt hàng"],
      ["action", "Thao tác"],
      ["quantity", "Chênh lệch"],
      ["note", "Lý do"],
    ],
  },
};
function resourceActions(type, row) {
  const c = resources[type],
    id = row[c.id];
  return `<div class="actions">${type === "inventory" ? btn("import", "Nhập", id) + btn("export", "Lên kệ", id) + btn("adjust", "Kiểm kê", id) : ""}${isAdmin() ? btn("edit", "Sửa", id) + btn("delete", type === "categories" ? "Xóa" : "Ngừng hoạt động", id, "danger") : ""}</div>`;
}
async function editResource(id) {
  const current = route(),
    c =
      current === "products"
        ? { path: "/products", id: "product_id" }
        : resources[current];
  let row = id ? (await api(c.path + "/" + id)).data : {};
  let fields = "";
  if (current === "categories")
    fields = field("category_name", "Tên danh mục", "text", row.category_name);
  if (["products", "inventory"].includes(current))
    fields =
      field(
        current === "products" ? "product_name" : "item_name",
        "Tên sản phẩm",
        "text",
        row.product_name || row.item_name,
      ) +
      field("barcode", "Mã vạch", "text", row.barcode) +
      field(
        "category_id",
        "Danh mục",
        "text",
        row.category_id,
        categoryOptions(),
      ) +
      field("unit", "Đơn vị", "text", row.unit) +
      field("price", "Giá bán", "number", row.price) +
      (current === "inventory"
        ? field(
            "import_price",
            "Giá nhập",
            "number",
            row.import_price || "",
            null,
            false,
          )
        : field("min_stock", "Ngưỡng tồn thấp", "number", row.min_stock ?? 10) +
          field(
            "description",
            "Mô tả",
            "text",
            row.description || "",
            null,
            false,
          )) +
      field(
        "image_url",
        "Đường dẫn ảnh (chưa có upload)",
        "text",
        row.image_url || "",
        null,
        false,
      );
  if (current === "users")
    fields =
      field("full_name", "Họ tên", "text", row.full_name) +
      (!id ? field("email", "Email", "email") : "") +
      field(
        "password",
        id ? "Mật khẩu mới (để trống nếu giữ nguyên)" : "Mật khẩu",
        "password",
        "",
        null,
        !id,
      ) +
      field("phone", "Điện thoại", "tel", row.phone || "", null, false) +
      field("address", "Địa chỉ", "text", row.address || "", null, false) +
      field("role_name", "Vai trò", "text", row.role_name || "customer", [
        ["customer", "Khách hàng"],
        ["employee", "Nhân viên"],
        ["admin", "Quản trị viên"],
      ]) +
      field("status", "Trạng thái", "text", row.status || "active", [
        ["active", "Hoạt động"],
        ["locked", "Khóa"],
        ["inactive", "Ngừng hoạt động"],
      ]);
  if (current === "inventory")
    fields += field("status", "Trạng thái", "text", row.status || "available", [
      ["available", "Sẵn sàng"],
      ["active", "Hoạt động"],
      ["inactive", "Ngừng hoạt động"],
    ]);
  if (current === "vouchers")
    fields =
      (!id
        ? field("code", "Mã voucher")
        : `<p>Mã: <strong>${e(row.code)}</strong> (không đổi)</p>`) +
      field(
        "description",
        "Mô tả",
        "text",
        row.description || "",
        null,
        false,
      ) +
      field(
        "discount_type",
        "Kiểu giảm",
        "text",
        row.discount_type || "fixed",
        [
          ["fixed", "Số tiền"],
          ["percent", "Phần trăm"],
        ],
      ) +
      field("discount_value", "Giá trị giảm", "number", row.discount_value) +
      field(
        "min_order_amount",
        "Đơn tối thiểu",
        "number",
        row.min_order_amount ?? 0,
      ) +
      field(
        "max_discount",
        "Giảm tối đa (không bắt buộc)",
        "number",
        row.max_discount ?? "",
        null,
        false,
      ) +
      field(
        "usage_limit",
        "Giới hạn lượt (không bắt buộc)",
        "number",
        row.usage_limit ?? "",
        null,
        false,
      ) +
      field(
        "expiry_date",
        "Hết hạn (không bắt buộc)",
        "date",
        row.expiry_date?.slice(0, 10) || "",
        null,
        false,
      ) +
      field("status", "Trạng thái", "text", row.status || "active", [
        ["active", "Hoạt động"],
        ["inactive", "Ngừng hoạt động"],
      ]);
  modal(id ? "Chỉnh sửa thông tin" : "Thêm mới", form(fields), async (d) => {
    if (current === "users" && !d.password) delete d.password;
    for (const k of [
      "import_price",
      "max_discount",
      "usage_limit",
      "expiry_date",
    ])
      if (d[k] === "") delete d[k];
    await api(c.path + (id ? "/" + id : ""), {
      method: id ? "PATCH" : "POST",
      body: d,
    });
    $("#dialog").close();
    toast("Đã lưu thông tin");
    await render();
  });
}
function posPanel() {
  const pending = state.posRequest;
  return `${state.pos.map((i) => `<div class="item-row"><div>${e(i.product_name)}<p class="muted">${i.quantity} × ${money(i.price)}</p></div>${btn("pos-minus", "−", i.product_id)}${btn("pos-add", "+", i.product_id)}</div>`).join("") || '<p class="muted">Chọn sản phẩm để lập phiếu bán.</p>'}<div class="total">Tạm tính ${money(cartTotal(state.pos))}</div><p class="note">Chỉ xác nhận sau khi đã thu tiền. Chưa áp dụng voucher/điểm. Tổng tiền chính thức lấy từ máy chủ.</p>${pending ? '<p class="note">Có yêu cầu chưa xác định kết quả. Giữ nguyên phiếu và thử lại cùng mã yêu cầu; không tạo phiếu mới.</p>' : ""}${state.pos.length || pending ? btn("pos-pay", pending ? "Thử lại yêu cầu thanh toán" : "Đã thu tiền · Hoàn tất", "", "") : ""}`;
}
async function showOrder(id) {
  const o = (await api("/orders/" + id)).data;
  modal(
    "Đơn hàng #" + id,
    `<div class="actions">${badge(o.status)}${badge(o.payment_status)}</div><p>${e(label(o.delivery_method))} · ${e(o.shipping_address || "Tại cửa hàng")}</p>${o.rejection_reason ? `<p class="note">Lý do từ chối: ${e(o.rejection_reason)}</p>` : ""}${table(
      ["Sản phẩm", "Số lượng", "Đơn giá"],
      o.items.map((i) => [
        e(i.product_name || "#" + i.product_id),
        e(i.quantity),
        money(i.price),
      ]),
    )}<p>Giảm giá: ${money(o.discount_amount)}</p><div class="total">Thanh toán: ${money(o.final_amount)}</div><div class="actions">${orderActions(
      o,
      role(),
    )
      .map((a) =>
        btn(
          "order-" + a,
          {
            confirm: "Xác nhận đơn",
            reject: "Từ chối",
            receive: "Đã nhận hàng",
            "pay-cash": "Xác nhận đã thu tiền",
          }[a],
          id,
          a === "reject" ? "danger" : "",
        ),
      )
      .join("")}</div>`,
  );
}
async function action(name, id) {
  if (name === "retry") return render();
  if (name === "page") {
    state.page = Number(id);
    return render();
  }
  if (name === "logout") {
    await api("/auth/logout", { method: "POST" });
    resetSession();
    location.hash = "shop";
    return render();
  }
  if (name === "detail") {
    const p = (await api("/products/" + id)).data;
    modal(
      p.product_name,
      `${image(p)}<div class="total">${money(p.price)} / ${e(p.unit)}</div><p>${e(p.description || "Chưa có mô tả.")}</p><p>Mã vạch: ${e(p.barcode)} · Tồn kệ: ${e(p.stock)}</p>${Number(p.stock) > 0 ? btn("cart-add", "Thêm vào giỏ", id, "") : ""}`,
    );
    return;
  }
  if (name === "cart-add") {
    if (role() !== "customer") {
      if (!state.user) {
        $("#dialog").close();
        location.hash = "login";
      } else toast("Tài khoản nhân viên dùng mục Bán tại quầy.");
      return;
    }
    let cart = (await api("/carts")).data;
    if (!cart.cart_id) {
      try {
        cart = (await api("/carts", { method: "POST", body: {} })).data;
      } catch (err) {
        if (err.code !== "CART_ALREADY_EXISTS") throw err;
        cart = (await api("/carts")).data;
      }
    }
    await api(`/carts/${cart.cart_id}/items`, {
      method: "POST",
      body: { product_id: Number(id), quantity: 1 },
    });
    toast("Đã thêm sản phẩm vào giỏ");
    return;
  }
  if (name === "cart-update" || name === "cart-remove") {
    await api(`/carts/${state.cart.cart_id}/items/${id}`, {
      method: name === "cart-remove" ? "DELETE" : "PATCH",
      body:
        name === "cart-update"
          ? { quantity: Number($("#qty-" + id).value) }
          : undefined,
    });
    return render();
  }
  if (name === "voucher-check") {
    const code = $('#main input[name="voucher_code"]').value.trim();
    if (!code) throw new Error("Nhập mã voucher trước khi kiểm tra.");
    const r = await api("/vouchers/validate", {
      method: "POST",
      body: { voucher_code: code, order_amount: cartTotal(state.cart.items) },
    });
    toast(
      "Voucher hợp lệ · Giảm dự kiến " +
        money(r.data.discount_amount) +
        ". Máy chủ kiểm tra lại khi đặt đơn.",
    );
    return;
  }
  if (name === "create" || name === "edit") return editResource(id);
  if (name === "delete") {
    if (
      !confirm(
        "Xác nhận " +
          (route() === "categories"
            ? "xóa danh mục"
            : "ngừng hoạt động mục này") +
          "?",
      )
    )
      return;
    const c =
      route() === "products" ? { path: "/products" } : resources[route()];
    await api(c.path + "/" + id, { method: "DELETE" });
    toast("Đã cập nhật");
    return render();
  }
  if (["import", "export", "adjust"].includes(name)) {
    const fields =
      field(
        name === "adjust" ? "actual_quantity" : "quantity",
        name === "adjust" ? "Tồn thực tế sau kiểm kê" : "Số lượng",
        "number",
      ) +
      (name === "import" ? field("import_price", "Giá nhập", "number") : "") +
      field("note", "Lý do");
    modal(
      {
        import: "Nhập kho",
        export: "Đưa hàng lên kệ",
        adjust: "Điều chỉnh tồn",
      }[name] +
        " #" +
        id,
      form(fields),
      async (d) => {
        await api(
          "/inventory/" +
            { import: "imports", export: "exports", adjust: "adjustments" }[
              name
            ],
          { method: "POST", body: { ...d, inventory_item_id: Number(id) } },
        );
        $("#dialog").close();
        toast("Đã cập nhật kho");
        render();
      },
    );
    return;
  }
  if (name === "order-detail") return showOrder(id);
  if (name.startsWith("order-")) {
    const op = name.slice(6);
    let body = {};
    if (op === "reject") {
      modal(
        "Từ chối đơn #" + id,
        form(field("reason", "Lý do từ chối"), "Xác nhận từ chối"),
        async (d) => {
          await api(`/orders/${id}/reject`, { method: "POST", body: d });
          $("#dialog").close();
          toast("Đã từ chối đơn");
          render();
        },
      );
      return;
    }
    if (
      !confirm(
        op === "pay-cash"
          ? "Bạn xác nhận đã thực nhận đủ tiền mặt?"
          : "Xác nhận thực hiện thao tác với đơn này?",
      )
    )
      return;
    await api(`/orders/${id}/${op}`, { method: "POST", body });
    await showOrder(id);
    await render();
    return;
  }
  if (name === "pos-add" || name === "pos-minus") {
    if (state.posRequest)
      throw new Error(
        "Phiếu đang chờ đối soát. Thử lại yêu cầu cũ trước khi chỉnh sửa.",
      );
    const old = state.pos.find((i) => String(i.product_id) === id);
    if (name === "pos-minus") {
      if (old) {
        old.quantity--;
        state.pos = state.pos.filter((i) => i.quantity > 0);
      }
    } else {
      const p = (await api("/products/" + id)).data;
      if ((old?.quantity || 0) + 1 > Number(p.stock))
        throw new Error("Số lượng vượt tồn kệ");
      if (old) old.quantity++;
      else state.pos.push({ ...p, quantity: 1 });
    }
    if (route() !== "pos") {
      $("#dialog").close();
      location.hash = "pos";
      return;
    }
    return render();
  }
  if (name === "pos-pay") {
    if (!state.posRequest) {
      const outstanding = JSON.parse(
        sessionStorage.getItem("posRequest") || "null",
      );
      if (outstanding)
        throw new Error(
          "Còn phiếu POS chưa đối soát trong tab này. Đăng nhập lại tài khoản đã lập phiếu để xử lý trước.",
        );
      if (!confirm("Xác nhận đã thu tiền mặt cho phiếu bán này?")) return;
      state.posRequest = {
        key: crypto.randomUUID(),
        userId: state.user.user_id,
        displayItems: state.pos.map((i) => ({ ...i })),
        body: {
          items: state.pos.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
          })),
          payment_method: "cash",
          customer_id: null,
        },
      };
      sessionStorage.setItem("posRequest", JSON.stringify(state.posRequest));
    }
    const req = state.posRequest;
    let r;
    try {
      r = await api("/pos/sales", {
        method: "POST",
        body: req.body,
        headers: { "Idempotency-Key": req.key },
      });
    } catch (error) {
      // These errors are raised before commit; unknown/network/5xx outcomes keep the same key.
      if (
        [
          "INSUFFICIENT_STOCK",
          "VALIDATION_ERROR",
          "NOT_FOUND",
          "BUSINESS_RULE_VIOLATION",
        ].includes(error.code)
      ) {
        state.posRequest = null;
        sessionStorage.removeItem("posRequest");
      }
      await render();
      throw error;
    }
    state.posRequest = null;
    state.pos = [];
    sessionStorage.removeItem("posRequest");
    toast("Thanh toán thành công");
    await render();
    await showOrder(r.data.order_id);
  }
}
document.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button || button.disabled) return;
  button.disabled = true;
  try {
    await action(button.dataset.action, button.dataset.id);
  } catch (error) {
    toast(error.message);
  } finally {
    button.disabled = false;
  }
});
$("#close-dialog").onclick = () => $("#dialog").close();
window.addEventListener("hashchange", () => {
  state.page = 1;
  state.q = "";
  state.category = "";
  $("#dialog").close();
  render();
});
document.addEventListener(
  "error",
  (event) => {
    if (event.target.tagName === "IMG") {
      const holder = event.target.parentElement;
      holder.textContent = "▧";
      holder.setAttribute("aria-label", "Ảnh sản phẩm không tải được");
    }
  },
  true,
);
async function start() {
  if (state.token) {
    try {
      state.user = (await api("/auth/me")).data;
      restorePos();
    } catch (error) {
      if (error.status === 401) resetSession();
      else toast(error.message);
    }
  }
  await render();
}
start();
