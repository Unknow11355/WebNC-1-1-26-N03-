export const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const money = (value) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    Number(value) || 0,
  );
export function safeImage(value) {
  if (!value) return "";
  try {
    const u = new URL(value, location.origin);
    return ["http:", "https:"].includes(u.protocol) ? u.href : "";
  } catch {
    return "";
  }
}
export function orderActions(order, role) {
  const actions = [];
  if (["admin", "employee"].includes(role)) {
    if (order.status === "pending") actions.push("confirm");
    if (order.status === "pending" && order.payment_status !== "paid")
      actions.push("reject");
    if (order.status !== "rejected" && order.payment_status !== "paid")
      actions.push("pay-cash");
  }
  if (
    role === "customer" &&
    order.status === "shipping" &&
    order.delivery_method === "delivery"
  )
    actions.push("receive");
  return actions;
}
export function cartTotal(items) {
  return items.reduce(
    (sum, i) => sum + Number(i.price) * Number(i.quantity),
    0,
  );
}
export const labels = {
  pending: "Chờ xử lý",
  shipping: "Đang giao",
  completed: "Hoàn thành",
  rejected: "Từ chối",
  paid: "Đã thanh toán",
  active: "Hoạt động",
  inactive: "Ngừng hoạt động",
  locked: "Đã khóa",
  available: "Sẵn sàng",
  admin: "Quản trị viên",
  employee: "Nhân viên",
  customer: "Khách hàng",
  cash: "Tiền mặt",
  pickup: "Nhận tại cửa hàng",
  delivery: "Giao tận nơi",
  online: "Online",
  offline: "Tại quầy",
};
