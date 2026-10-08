/* global console, process */
const axios = require('axios');
const crypto = require('crypto');

const API_URL = 'http://localhost:3000/api/v1/pos/sales';
const TOKEN = process.env.TEST_TOKEN;
const PRODUCT_ID = Number(process.env.TEST_PRODUCT_ID);
if (!TOKEN || !Number.isInteger(PRODUCT_ID) || PRODUCT_ID <= 0) {
    console.error('TEST_TOKEN and TEST_PRODUCT_ID are required');
    process.exit(1);
}


async function runConcurrencyTest() {
    console.log("Bắt đầu gửi 50 request đồng thời...");
    const requests = [];

    for (let i = 0; i < 50; i++) {
        const uniqueKey = crypto.randomUUID();

        const payload = {
            items: [{ product_id: PRODUCT_ID, quantity: 1 }],
            customer_id: null,
            payment_method: "cash",
            note: `Test đồng thời luồng ${i}`
        };

        const config = {
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Idempotency-Key': uniqueKey,
                'Content-Type': 'application/json'
            },
            validateStatus: () => true
        };

        requests.push(axios.post(API_URL, payload, config));
    }

    const startTime = Date.now();
    const results = await Promise.all(requests);
    const endTime = Date.now();

    let successCount = 0;
    let conflictCount = 0;
    let errorCount = 0;

    results.forEach((res, index) => {
        if (res.status === 201 || res.status === 200) successCount++;
        else if (res.status === 409) conflictCount++;
        else {
            errorCount++;
            console.log(`[Req ${index}] Lỗi khác: ${res.status} - ${JSON.stringify(res.data)}`);
        }
    });

    console.log(`\n=== KẾT QUẢ TEST ĐỒNG THỜI ===`);
    console.log(`Thời gian chạy: ${endTime - startTime} ms`);
    console.log(`Thành công (201/200): ${successCount} đơn (Kỳ vọng: 10)`);
    console.log(`Hết hàng (409): ${conflictCount} đơn (Kỳ vọng: 40)`);
    console.log(`Lỗi khác: ${errorCount} đơn (Kỳ vọng: 0)`);
}

runConcurrencyTest();