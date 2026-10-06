import { escapeHtml as e, money } from "./core.js";
let cameraStream,
  cameraTimer,
  cameraGeneration = 0;
export function stopScanner() {
  cameraGeneration++;
  clearTimeout(cameraTimer);
  cameraStream?.getTracks().forEach((t) => t.stop());
  cameraStream = null;
}
window.addEventListener("hashchange", stopScanner);
window.addEventListener("pagehide", stopScanner);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopScanner();
});
export function barcodeView({ api, toast }) {
  return {
    html: `<h1>Mã vạch & mã nội bộ</h1><p class="muted">Nhập mã hoặc dùng máy quét bàn phím rồi nhấn Enter. Ưu tiên hàng trên kệ, sau đó tìm trong kho.</p><section class="panel stack"><form id="scan-form" class="toolbar"><label>Mã cần tra<input name="code" maxlength="50" required autocomplete="off"></label><button>Tra cứu mã</button><button type="button" id="check-code" class="secondary">Kiểm tra trùng</button></form><div class="actions"><button id="start-camera" type="button" class="secondary">Quét bằng camera</button><button id="stop-camera" type="button" class="secondary">Dừng camera</button></div><video id="scan-video" playsinline muted hidden></video><p id="scan-status" role="status"></p><div id="scan-result"></div><form id="generate-form" class="toolbar"><label>Tiền tố mã nội bộ<input name="prefix" value="SP" maxlength="8"></label><button>Tạo mã nội bộ</button></form><p class="note">Mã tạo mới chưa được giữ chỗ. Sao chép vào form sản phẩm/mặt hàng; hệ thống vẫn kiểm tra ràng buộc khi lưu. Đây là mã nội bộ, không phải đăng ký mã EAN/GS1.</p></section>`,
    after() {
      const form = document.querySelector("#scan-form"),
        status = document.querySelector("#scan-status"),
        result = document.querySelector("#scan-result");
      async function scan() {
        result.innerHTML = "";
        status.textContent = "Đang tra cứu…";
        try {
          const r = await api(
            "/products/scan/" +
              encodeURIComponent(form.elements.code.value.trim()),
          );
          const data = r.data,
            p = data.product || data.inventory_item;
          result.innerHTML = `<h2>${e(p.product_name || p.item_name)}</h2><p>${data.type === "product" ? "Hàng trên kệ" : "Hàng trong kho"} · ${money(p.price)} · Tồn ${e(p.stock)}</p>${data.type === "product" && Number(p.stock) > 0 ? `<button data-action="pos-add" data-id="${p.product_id}">Thêm vào phiếu POS</button>` : '<p class="note">Hàng trong kho cần xuất lên kệ trước khi bán; không tự trừ tồn kho.</p>'}`;
          status.textContent = "Đã tìm thấy mã.";
        } catch (error) {
          status.textContent = error.message;
        }
      }
      form.onsubmit = async (event) => {
        event.preventDefault();
        await scan();
      };
      document.querySelector("#check-code").onclick = async () => {
        try {
          const r = await api(
            "/products/check-code/" +
              encodeURIComponent(form.elements.code.value.trim()),
          );
          status.textContent = r.data.exists
            ? "Mã đã tồn tại (kể cả hàng ngừng hoạt động)."
            : "Mã chưa tồn tại tại thời điểm kiểm tra.";
        } catch (error) {
          status.textContent = error.message;
        }
      };
      document.querySelector("#generate-form").onsubmit = async (event) => {
        event.preventDefault();
        const button = event.target.querySelector("button");
        button.disabled = true;
        try {
          const r = await api("/products/generate-code", {
            method: "POST",
            body: { prefix: event.target.elements.prefix.value },
          });
          form.elements.code.value = r.data.code;
          form.elements.code.focus();
          form.elements.code.select();
          status.textContent = "Đã tạo mã nội bộ: " + r.data.code;
        } catch (error) {
          status.textContent = error.message;
        } finally {
          button.disabled = false;
        }
      };
      document.querySelector("#stop-camera").onclick = () => {
        stopScanner();
        document.querySelector("#scan-video").hidden = true;
        status.textContent = "Đã dừng camera.";
      };
      document.querySelector("#start-camera").onclick = async () => {
        stopScanner();
        const generation = cameraGeneration,
          video = document.querySelector("#scan-video");
        if (
          !globalThis.isSecureContext ||
          !globalThis.BarcodeDetector ||
          !navigator.mediaDevices?.getUserMedia
        ) {
          status.textContent =
            "Trình duyệt chưa hỗ trợ quét camera ở kết nối này. Hãy nhập mã hoặc dùng máy quét bàn phím.";
          return;
        }
        try {
          const detector = new BarcodeDetector();
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
            audio: false,
          });
          if (generation !== cameraGeneration) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          cameraStream = stream;
          video.srcObject = stream;
          video.hidden = false;
          await video.play();
          status.textContent = "Đưa mã vạch vào khung camera.";
          async function tick() {
            if (generation !== cameraGeneration) return;
            try {
              const codes = await detector.detect(video);
              if (generation !== cameraGeneration) return;
              if (codes.length) {
                form.elements.code.value = codes[0].rawValue;
                stopScanner();
                video.hidden = true;
                await scan();
                return;
              }
              cameraTimer = setTimeout(tick, 250);
            } catch {
              stopScanner();
              status.textContent =
                "Không đọc được camera. Hãy nhập mã trực tiếp.";
            }
          }
          await tick();
        } catch (error) {
          stopScanner();
          video.hidden = true;
          status.textContent =
            "Không mở được camera hoặc bạn chưa cấp quyền. Vẫn có thể nhập mã.";
          toast(status.textContent);
        }
      };
    },
  };
}
export function scheduleView({ api, user, toast }) {
  const admin = user.role_name === "admin";
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const initial =
    parts.find((p) => p.type === "year").value +
    "-" +
    parts.find((p) => p.type === "month").value;
  return {
    html: `<h1>Lịch nhân viên</h1><p class="muted">Full-time mặc định được làm; part-time linh hoạt. Đánh dấu nghỉ/chặn theo ngày, không phải phân ca giờ.</p><section class="panel stack"><form id="schedule-filter" class="toolbar"><label>Tháng<input type="month" name="month" min="2000-01" max="2100-12" value="${initial}" required></label>${admin ? '<label>Nhân viên<select name="employee"><option value="">Chọn nhân viên</option></select></label>' : ""}<button>Xem lịch</button></form><p id="schedule-status" role="status"></p><div id="schedule-result"></div></section>`,
    after() {
      const form = document.querySelector("#schedule-filter"),
        status = document.querySelector("#schedule-status"),
        result = document.querySelector("#schedule-result");
      let version = 0;
      const params = () => {
        const [year, month] = form.elements.month.value.split("-");
        return new URLSearchParams({ year, month });
      };
      const names = {
        leave: "Nghỉ phép",
        sick: "Nghỉ ốm",
        blocked: "Chặn ngày làm",
        clear: "Theo mặc định",
        scheduled: "Được phép làm",
        flexible: "Linh hoạt",
      };
      async function load() {
        const request = ++version;
        result.innerHTML = "";
        status.textContent = "Đang tải lịch…";
        try {
          const employeeId = admin
            ? form.elements.employee.value
            : user.user_id;
          if (!employeeId) {
            status.textContent = "Chọn nhân viên để xem lịch.";
            return;
          }
          const { data } = await api(
            `/employee-schedules/employee/${employeeId}/month?${params()}`,
          );
          if (request !== version || !result.isConnected) return;
          status.textContent = `${data.employee.full_name} · ${data.summary.total_days} ngày · ${data.summary.blocked_days} ngày nghỉ/chặn · ${data.summary.worked_days} ngày có ca ghi nhận`;
          if (admin)
            form.elements.employee.selectedOptions[0].textContent = `${data.employee.full_name} · ${data.summary.blocked_days} ngày nghỉ/chặn`;
          result.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Ngày</th><th>Trạng thái lịch</th><th>Ghi chú</th><th>Ca thực tế</th>${admin ? "<th>Lưu</th>" : ""}</tr></thead><tbody>${data.days.map((d) => `<tr><td>${e(d.work_date)}</td><td>${admin ? `<select aria-label="Trạng thái ${d.work_date}" data-date="${d.work_date}">${["clear", "leave", "sick", "blocked"].map((s) => `<option value="${s}" ${(d.override_status || "clear") === s ? "selected" : ""}>${names[s]}</option>`).join("")}</select>` : e(names[d.override_status || d.default_status])}</td><td>${admin ? `<input aria-label="Ghi chú ${d.work_date}" data-note="${d.work_date}" maxlength="255" value="${e(d.note || "")}">` : e(d.note || "—")}</td><td>${d.shifts.length ? d.shifts.map((s) => `${e(s.start_time || "—")} – ${e(s.end_time || "chưa kết thúc")}`).join("<br>") : "—"}</td>${admin ? `<td><button type="button" data-save-day="${d.work_date}">Lưu ngày</button></td>` : ""}</tr>`).join("")}</tbody></table></div><p class="note">Đổi lịch không sửa/xóa ca đã ghi nhận. Việc kiểm tra lịch khi bắt đầu ca sẽ nối trong chức năng ca làm CN09; chưa coi là đã chặn thao tác mở ca.</p>`;
          result.querySelectorAll("[data-save-day]").forEach(
            (button) =>
              (button.onclick = async () => {
                button.disabled = true;
                const date = button.dataset.saveDay;
                try {
                  await api(`/employee-schedules/employee/${employeeId}/day`, {
                    method: "PUT",
                    body: {
                      work_date: date,
                      day_status: result.querySelector(`[data-date="${date}"]`)
                        .value,
                      note: result.querySelector(`[data-note="${date}"]`).value,
                    },
                  });
                  toast("Đã lưu lịch ngày " + date);
                  await load();
                } catch (error) {
                  status.textContent = error.message;
                  button.disabled = false;
                }
              }),
          );
        } catch (error) {
          if (request === version) status.textContent = error.message;
        }
      }
      async function employees() {
        if (!admin) return load();
        const request = ++version;
        result.innerHTML = "";
        try {
          const old = form.elements.employee.value;
          const { data } = await api(
            "/employee-schedules/overview/month?" + params(),
          );
          if (request !== version || !form.isConnected) return;
          form.elements.employee.innerHTML =
            '<option value="">Chọn nhân viên</option>' +
            data.employees
              .map(
                (p) =>
                  `<option value="${p.user_id}">${e(p.full_name)} · ${p.blocked_days} ngày nghỉ/chặn</option>`,
              )
              .join("");
          if (data.employees.some((p) => String(p.user_id) === old))
            form.elements.employee.value = old;
          status.textContent = data.employees.length
            ? "Chọn nhân viên và nhấn Xem lịch."
            : "Chưa có nhân viên đang hoạt động.";
        } catch (error) {
          status.textContent = error.message;
        }
      }
      form.onsubmit = (event) => {
        event.preventDefault();
        load();
      };
      form.elements.month.onchange = employees;
      if (admin) form.elements.employee.onchange = load;
      employees();
    },
  };
}
