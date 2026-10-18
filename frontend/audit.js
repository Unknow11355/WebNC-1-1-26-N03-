// Hàm lấy dữ liệu thật từ Backend API
async function fetchAuditLogs(filter = 'ALL') {
    try {

        // Tạo URL có chứa tham số lọc (nếu có)
        // Lưu ý: Đổi '/api/v1/audit' thành đúng đường dẫn nhóm bạn quy định trong index.js nếu khác
        let url = '/api/v1/audit';
        if (filter !== 'ALL') {
            url += `?action=${filter}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error('Không có quyền truy cập hoặc lỗi server');
        }

        const result = await response.json();
        renderLogs(result.data); // Gọi hàm vẽ bảng với dữ liệu thật

    } catch (error) {
        console.error('Lỗi khi tải nhật ký:', error);
        document.getElementById('logTableBody').innerHTML = `
            <tr><td colspan="4" style="text-align:center; color:red;">
                Lỗi tải dữ liệu. Vui lòng kiểm tra đăng nhập hoặc đường dẫn API.
            </td></tr>
        `;
    }
}

// Hàm vẽ dữ liệu ra bảng HTML
function renderLogs(logsData) {
    const tbody = document.getElementById('logTableBody');

    if (!logsData || logsData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Không có dữ liệu nhật ký.</td></tr>';
        return;
    }

    tbody.innerHTML = logsData.map(log => {
        // Xử lý màu sắc badge theo trạng thái (outcome hoặc action)
        let statusClass = 'bg-success';
        if (log.outcome === 'FAILURE' || log.action === 'UNAUTHORIZED_ACCESS') statusClass = 'bg-danger';
        else if (log.action === 'DATA_DELETED') statusClass = 'bg-warning';

        // Xử lý định dạng thời gian
        const timeString = new Date(log.created_at).toLocaleString('vi-VN');

        // Trích xuất metadata hoặc entity để làm chi tiết
        const details = log.metadata ? JSON.stringify(log.metadata) :
                        (log.entity_type ? `${log.entity_type} (ID: ${log.entity_id})` : 'N/A');

        return `
            <tr>
                <td>${timeString}</td>
                <td><span class="badge ${statusClass}">${log.action}</span></td>
                <td>${log.actor_name || log.actor_id || 'Hệ thống'}</td>
                <td>${details}</td>
            </tr>
        `;
    }).join('');
}

// Bắt sự kiện khi trang tải xong và khi chọn bộ lọc
document.addEventListener('DOMContentLoaded', () => {
    // 1. Tải dữ liệu thật ngay khi mở trang
    fetchAuditLogs();

    // 2. Bắt sự kiện lọc an toàn (CSP Compliant)
    const filterSelect = document.getElementById('actionFilter');
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
            fetchAuditLogs(e.target.value);
        });
    }
});
