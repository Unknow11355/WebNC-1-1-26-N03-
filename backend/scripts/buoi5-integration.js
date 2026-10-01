import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import mysql from 'mysql2/promise';
import { createTransactionManager } from '../src/config/transaction.js';
import { createInventoryRepository } from '../src/repositories/inventory.repository.js';
import { createProductRepository } from '../src/repositories/product.repository.js';
import { createOrderRepository } from '../src/repositories/order.repository.js';
import { createVoucherRepository } from '../src/repositories/voucher.repository.js';
import { createInventoryService } from '../src/services/inventory.service.js';
import { createOrderService } from '../src/services/order.service.js';
import { createProductService } from '../src/services/product.service.js';

// Explicit opt-in command: npm run test:buoi5:db
// Never use/reset the application's DB: create a unique DB and drop only that DB.
test('Buoi 5 real database regression', async (t) => {
  const database = `linh_b5_test_${randomBytes(8).toString('hex')}`;
  const config = {
    host: process.env.TEST_DB_HOST ?? '127.0.0.1',
    port: Number(process.env.TEST_DB_PORT ?? 3306),
    user: process.env.TEST_DB_USER ?? 'root',
    password: process.env.TEST_DB_PASSWORD ?? '',
  };
  const admin = await mysql.createConnection({ ...config, multipleStatements: true });
  let pool;
  let created = false;
  try {
    await admin.query(
      `CREATE DATABASE ${database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    created = true;
    const schema = await readFile(new URL('../../database/01_schema.sql', import.meta.url), 'utf8');
    await admin.query(schema.replaceAll('mini_supermarket', database));
    pool = mysql.createPool({ ...config, database, connectionLimit: 4 });
    await pool.query("INSERT INTO roles(role_name) VALUES ('customer'),('employee')");
    await pool.query(
      "INSERT INTO users(full_name,email,password,role_id) VALUES ('Customer','a@test.local','test',1),('Employee','e@test.local','test',2),('Other','b@test.local','test',1)",
    );
    await pool.query("INSERT INTO categories(category_name) VALUES ('Test')");
    await pool.query(
      "INSERT INTO inventory_items(barcode,item_name,category_id,price,import_price,unit,stock,status) VALUES ('B5-TEST','Test',1,20000,10000,'sp',10,'available')",
    );
    await pool.query('INSERT INTO carts(user_id) VALUES (1)');
    const transactionManager = createTransactionManager(pool);
    const repository = createInventoryRepository(pool);
    const productRepository = createProductRepository(pool);
    const orderRepository = createOrderRepository(pool);
    const voucherRepository = createVoucherRepository(pool);
    const inventory = createInventoryService({ repository, productRepository, transactionManager });
    const orders = createOrderService({ orderRepository, voucherRepository, transactionManager });
    const employee = { userId: 2, role: 'employee' };
    const customer = { userId: 1, role: 'customer' };
    const scalar = async (sql) => Number((await pool.query(sql))[0][0].value);
    const addCart = () =>
      pool.query('INSERT INTO cart_items(cart_id,product_id,quantity) VALUES (1,1,2)');

    await t.test('import updates stock, latest import price and log', async () => {
      const item = await inventory.importStock(employee, {
        inventory_item_id: 1,
        quantity: 5,
        import_price: 12000,
        note: 'Test import',
      });
      assert.equal(item.stock, 15);
      assert.equal(Number(item.import_price), 12000);
      assert.equal(await scalar('SELECT COUNT(*) AS value FROM inventory_logs'), 1);
    });
    await t.test('invalid adjustment values cannot zero stock', async () => {
      for (const value of [null, '', ' ', false, true, [], {}, -1, 1.5]) {
        await assert.rejects(
          inventory.adjust(employee, {
            inventory_item_id: 1,
            actual_quantity: value,
            note: 'test',
          }),
          (e) => e.status === 400,
        );
      }
      assert.equal(
        await scalar('SELECT stock AS value FROM inventory_items WHERE inventory_item_id=1'),
        15,
      );
    });
    await t.test('export creates shelf product and transfers stock atomically', async () => {
      await inventory.exportToShelf(employee, { inventory_item_id: 1, quantity: 5, note: 'Shelf' });
      assert.equal(
        await scalar('SELECT stock AS value FROM inventory_items WHERE inventory_item_id=1'),
        10,
      );
      assert.equal(await scalar('SELECT stock AS value FROM products WHERE product_id=1'), 5);
    });
    await t.test('insufficient warehouse stock is rejected', async () => {
      await assert.rejects(
        inventory.exportToShelf(employee, { inventory_item_id: 1, quantity: 11, note: 'Shelf' }),
        (e) => e.status === 409,
      );
    });
    await t.test('real FK error rolls back import stock and price', async () => {
      await assert.rejects(
        inventory.importStock(
          { userId: 999999, role: 'employee' },
          { inventory_item_id: 1, quantity: 5, import_price: 13000, note: 'Force FK' },
        ),
      );
      const item = await repository.findById(1);
      assert.equal(item.stock, 10);
      assert.equal(Number(item.import_price), 12000);
    });
    let order;
    await t.test(
      'checkout writes order items/payment, reduces shelf stock and clears cart',
      async () => {
        await addCart();
        order = await orders.checkout(customer, {
          delivery_method: 'delivery',
          shipping_address: 'Test address',
        });
        assert.equal(order.status, 'pending');
        assert.equal(order.items[0].product_id, 1);
        assert.equal(Number(order.final_amount), 40000);
        assert.equal(await scalar('SELECT stock AS value FROM products WHERE product_id=1'), 3);
        assert.equal(await scalar('SELECT COUNT(*) AS value FROM cart_items'), 0);
        assert.equal(await scalar('SELECT COUNT(*) AS value FROM payments'), 1);
      },
    );
    await t.test('owner check and delivery state transitions', async () => {
      await assert.rejects(
        orders.receive({ userId: 3, role: 'customer' }, order.order_id),
        (e) => e.status === 403,
      );
      assert.equal((await orders.confirm(employee, order.order_id)).status, 'shipping');
      assert.equal((await orders.receive(customer, order.order_id)).status, 'completed');
      assert.equal((await orders.payCash(employee, order.order_id)).payment_status, 'paid');
    });
    await t.test('failure after payment insert rolls back every checkout write', async () => {
      await addCart();
      const broken = createOrderService({
        voucherRepository,
        transactionManager,
        orderRepository: {
          ...orderRepository,
          async clearCart(cartId, connection) {
            await orderRepository.clearCart(cartId, connection);
            throw new Error('INJECTED_TEST_FAILURE');
          },
        },
      });
      await assert.rejects(broken.checkout(customer, {}), /INJECTED_TEST_FAILURE/);
      assert.equal(await scalar('SELECT COUNT(*) AS value FROM orders'), 1);
      assert.equal(await scalar('SELECT COUNT(*) AS value FROM order_items'), 1);
      assert.equal(await scalar('SELECT COUNT(*) AS value FROM payments'), 1);
      assert.equal(await scalar('SELECT stock AS value FROM products WHERE product_id=1'), 3);
      assert.equal(await scalar('SELECT COUNT(*) AS value FROM cart_items'), 1);
    });
    await t.test('reject restores stock only once', async () => {
      const pending = await orders.checkout(customer, {});
      await orders.reject(employee, pending.order_id, { reason: 'Test rejection' });
      await assert.rejects(
        orders.reject(employee, pending.order_id, { reason: 'Again' }),
        (e) => e.status === 409,
      );
      assert.equal(await scalar('SELECT stock AS value FROM products WHERE product_id=1'), 3);
    });
    await t.test('empty cart checkout rejected', async () => {
      await assert.rejects(orders.checkout(customer, {}), (e) => e.status === 400);
    });
    await t.test('product CRUD creates zero shelf stock; client cannot invent stock', async () => {
      const service = createProductService(productRepository);
      const product = await service.create({
        product_name: 'CRUD product',
        barcode: 'CRUD-TEST',
        price: 10000,
        unit: 'sp',
        category_id: 1,
        stock: 999,
      });
      assert.equal(product.stock, 0);
      assert.equal((await service.update(product.product_id, { price: 12000 })).price, '12000.00');
      await service.softDelete(product.product_id);
      await assert.rejects(service.getById(product.product_id), (e) => e.status === 404);
    });
    await t.test('voucher use and rejection restore counter exactly once', async () => {
      await pool.query(
        "INSERT INTO vouchers(code,discount_type,discount_value,min_order_amount,usage_limit,used_count,status) VALUES ('LINHTEST','percent',10,0,1,0,'active')",
      );
      await addCart();
      const pending = await orders.checkout(customer, { voucher_code: 'LINHTEST' });
      assert.equal(Number(pending.final_amount), 36000);
      assert.equal(
        await scalar("SELECT used_count AS value FROM vouchers WHERE code='LINHTEST'"),
        1,
      );
      await orders.reject(employee, pending.order_id, { reason: 'Restore voucher' });
      await assert.rejects(
        orders.reject(employee, pending.order_id, { reason: 'Again' }),
        (e) => e.status === 409,
      );
      assert.equal(
        await scalar("SELECT used_count AS value FROM vouchers WHERE code='LINHTEST'"),
        0,
      );
    });
  } finally {
    if (pool) await pool.end();
    if (created && /^linh_b5_test_[a-f0-9]{16}$/.test(database))
      await admin.query(`DROP DATABASE ${database}`);
    await admin.end();
  }
});
