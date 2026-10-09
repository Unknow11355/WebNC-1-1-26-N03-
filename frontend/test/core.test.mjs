import test from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, safeImage, orderActions, cartTotal } from "../core.js";
globalThis.location = { origin: "http://localhost" };
test("escape HTML from API and form values", () =>
  assert.equal(
    escapeHtml('<img onerror="x">'),
    "&lt;img onerror=&quot;x&quot;&gt;",
  ));
test("only HTTP images; blank does not request home page", () => {
  assert.equal(safeImage("javascript:alert(1)"), "");
  assert.equal(safeImage(""), "");
  assert.equal(safeImage("/a.png"), "http://localhost/a.png");
});
test("pending orders have staff transitions, not customer transitions", () => {
  assert.deepEqual(
    orderActions({ status: "pending", payment_status: "pending" }, "employee"),
    ["confirm", "reject", "pay-cash"],
  );
  assert.deepEqual(orderActions({ status: "pending" }, "customer"), []);
});
test("paid orders cannot reject or charge again", () =>
  assert.deepEqual(
    orderActions({ status: "pending", payment_status: "paid" }, "admin"),
    ["confirm"],
  ));
test("customer receipt is only shipping delivery", () => {
  assert.deepEqual(
    orderActions(
      { status: "shipping", delivery_method: "delivery" },
      "customer",
    ),
    ["receive"],
  );
  assert.deepEqual(
    orderActions(
      { status: "completed", delivery_method: "pickup" },
      "customer",
    ),
    [],
  );
});
test("cart total handles DB decimal strings", () =>
  assert.equal(
    cartTotal([
      { price: "30000.00", quantity: 2 },
      { price: 40000, quantity: 1 },
    ]),
    100000,
  ));
