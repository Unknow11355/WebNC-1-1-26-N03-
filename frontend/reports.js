// ==========================================
// PHẦN 1: KHỞI TẠO VÀ VẼ BIỂU ĐỒ (Nhiệm vụ V5)
// ==========================================
let currentChart = null;

function drawChart(chartType, chartLabels, chartData, datasetLabel, bgColor) {
    const ctx = document.getElementById('myReportChart').getContext('2d');

    // Xóa biểu đồ cũ nếu có
    if (currentChart) {
        currentChart.destroy();
    }

    currentChart = new Chart(ctx, {
        type: chartType,
        data: {
            labels: chartLabels,
            datasets: [{
                label: datasetLabel,
                data: chartData,
                backgroundColor: bgColor,
                borderColor: '#333',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// ==========================================
// PHẦN 2: DỮ LIỆU BÁO CÁO VÀ KẾT XUẤT BẢNG
// ==========================================
let currentReportData = [];
let currentHeaders = [];
let currentReportName = 'Bao_Cao';

function loadReport(type) {
    const from = document.getElementById('fromDate').value || '2026-10-01';
    const to = document.getElementById('toDate').value || '2026-10-07';

    if (type === 'revenue') {
        document.getElementById('reportTitle').innerText = `Báo cáo Doanh Thu (${from} đến ${to})`;
        currentHeaders = ['Ngày', 'Số lượng đơn', 'Doanh thu', 'Ghi chú'];
        currentReportData = [
            ['2026-10-01', 10, 1000000, 'Bình thường'],
            ['2026-10-02', 12, 1200000, 'Bình thường'],
            ['2026-10-06', 15, 1500000, 'Bình thường'],
            ['2026-10-07', 20, 2000000, "=CMD|' /C calc'!A0"] // Dữ liệu mô phỏng mã độc
        ];
        currentReportName = 'Bao_Cao_Doanh_Thu';

        // Vẽ biểu đồ Đường
        const labels = currentReportData.map(row => row[0]); // Lấy mảng Ngày
        const data = currentReportData.map(row => row[2]);   // Lấy mảng Doanh thu
        drawChart('line', labels, data, 'Doanh thu (VNĐ)', 'rgba(54, 162, 235, 0.5)');
    }
    else if (type === 'products') {
        document.getElementById('reportTitle').innerText = `Báo cáo Sản Phẩm (${from} đến ${to})`;
        currentHeaders = ['Tên Sản Phẩm', 'Số Lượng Bán', 'Tồn Kho'];
        currentReportData = [
            ['Táo New Zealand', 45, 100],
            ['Sữa Vinamilk', 120, 50],
            ['Bánh mì', 80, 20],
            ['Nước suối', 200, 300]
        ];
        currentReportName = 'Bao_Cao_San_Pham';

        // Vẽ biểu đồ Tròn
        const labels = currentReportData.map(row => row[0]);
        const data = currentReportData.map(row => row[1]); // Lấy mảng Số lượng bán
        const colors = ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0'];
        drawChart('doughnut', labels, data, 'Số lượng bán', colors);
    }
    else if (type === 'employees') {
        document.getElementById('reportTitle').innerText = `Báo cáo Nhân Viên (${from} đến ${to})`;
        currentHeaders = ['Tên Nhân Viên', 'Số Đơn Hàng', 'Đánh giá'];
        currentReportData = [
            ['Nguyễn Văn A', 35, 'Tốt'],
            ['Trần Thị B', 42, 'Xuất sắc'],
            ['Lê Văn C', 28, 'Khá']
        ];
        currentReportName = 'Bao_Cao_Nhan_Vien';

        // Vẽ biểu đồ Cột
        const labels = currentReportData.map(row => row[0]);
        const data = currentReportData.map(row => row[1]); // Lấy mảng Số đơn hàng
        drawChart('bar', labels, data, 'Số đơn hàng đã xử lý', 'rgba(75, 192, 192, 0.6)');
    }

    renderTable(); // Gọi hàm cập nhật bảng
}

function renderTable() {
    const thead = document.getElementById('tableHead');
    const tbody = document.getElementById('tableBody');
    thead.innerHTML = `<tr>${currentHeaders.map(h => `<th>${h}</th>`).join('')}</tr>`;
    tbody.innerHTML = currentReportData.map(row =>
        `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
    ).join('');
}

// HÀM QUAN TRỌNG: XUẤT CSV CHỐNG FORMULA INJECTION (Ca test B7-07)
function handleExport() {
    if (currentReportData.length === 0) {
        alert("Không có dữ liệu!");
        return;
    }

    const sanitizeCell = (cell) => {
        if (cell == null) return '';
        let str = String(cell);

        // BẢO MẬT: Thêm dấu nháy đơn trước các ký tự nguy hiểm (=, +, -, @)
        if (/^[=+\-@]/.test(str)) {
            str = "'" + str;
        }

        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            str = `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const BOM = "\uFEFF"; // Hỗ trợ Tiếng Việt
    const headerRow = currentHeaders.map(sanitizeCell).join(',');
    const rows = currentReportData.map(row => row.map(sanitizeCell).join(','));
    const csvContent = BOM + headerRow + '\n' + rows.join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${currentReportName}_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}