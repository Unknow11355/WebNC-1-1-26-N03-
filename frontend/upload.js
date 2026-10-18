document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const previewImage = document.getElementById('previewImage');
    const btnUpload = document.getElementById('btnUpload');

    // 1. Hiển thị ảnh xem trước khi người dùng chọn file
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    previewImage.src = event.target.result;
                    previewImage.style.display = 'block';
                }
                reader.readAsDataURL(file);
            } else {
                previewImage.style.display = 'none';
                previewImage.src = '';
            }
        });
    }

    // 2. Gửi file lên API khi bấm nút
    if (btnUpload) {
        btnUpload.addEventListener('click', async () => {
            if (!fileInput.files || fileInput.files.length === 0) {
                alert("Vui lòng chọn một file ảnh trước khi tải lên!");
                return;
            }

            const file = fileInput.files[0];

            // Dùng FormData để đóng gói file gửi đi
            const formData = new FormData();
            formData.append('file', file); // Chữ 'file' này phải khớp với uploadMiddleware.single('file') ở Backend

            try {
                // Đổi giao diện nút bấm thành Đang tải...
                btnUpload.innerText = "Đang tải...";
                btnUpload.disabled = true;


                // GỌI API (Lưu ý: Bạn kiểm tra lại index.js xem prefix là '/api/v1/upload' hay gì khác để khớp nhé)
               // Sửa đoạn gọi fetch thành thế này:
                // Trong file frontend/upload.js của bạn:
                // Sửa từ '/api/v1/upload/product-image' thành '/api/v1/uploads/product-image' (thêm chữ s):
                const response = await fetch('/api/v1/uploads/product-image', {
                    method: 'POST',
                    credentials: 'same-origin',
                    body: formData
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    alert("Tải ảnh thành công!\nURL ảnh: " + result.data.image_url);
                    // Reset input sau khi tải thành công
                    fileInput.value = '';
                    previewImage.style.display = 'none';
                } else {
                    alert("Lỗi từ server: " + (result.message || "File không hợp lệ hoặc bị từ chối"));
                }
            } catch (error) {
                console.error("Lỗi quá trình tải ảnh:", error);
                alert("Không thể kết nối đến máy chủ. Vui lòng thử lại!");
            } finally {
                // Khôi phục nút bấm
                btnUpload.innerText = "Tải Ảnh Lên";
                btnUpload.disabled = false;
            }
        });
    }
});
