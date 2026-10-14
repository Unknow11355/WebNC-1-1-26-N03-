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
            ['2026-10-06', 15, 1500000, 'Bình thường'],
            ['2026-10-07', 20, 2000000, "=CMD|' /C calc'!A0"] // <-- Dữ liệu mô phỏng mã độc
        ];
        currentReportName = 'Bao_Cao_Doanh_Thu';
    }
    // Giả lập dữ liệu cho các báo cáo khác
    else {
        document.getElementById('reportTitle').innerText = `Báo cáo (${from} đến ${to})`;
        currentHeaders = ['Cột 1', 'Cột 2'];
        currentReportData = [['Dữ liệu 1', 'Dữ liệu 2']];
        currentReportName = 'Bao_Cao_Khac';
    }
    renderTable();
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