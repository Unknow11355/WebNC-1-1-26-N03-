import { escapeHtml as e } from "./core.js";
export function shiftsView({ api, user, toast }) {
  const admin = user.role_name === "admin";
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const month =
    parts.find((p) => p.type === "year").value +
    "-" +
    parts.find((p) => p.type === "month").value;
  return {
    html: `<h1>Ca làm</h1><section class="panel stack"><form id="shift-filter" class="toolbar">${admin ? '<label>Nhân viên<select name="employee" required><option value="">Chọn nhân viên</option></select></label>' : ""}<label>Tháng bắt đầu ca<input type="month" name="month" min="2000-01" max="2100-12" value="${month}" required></label><button>Tải lại</button></form><p id="shift-status" role="status"></p><div id="shift-current"></div><div id="shift-history"></div><div class="toolbar"><button id="shift-prev" type="button">Trang trước</button><span id="shift-page"></span><button id="shift-next" type="button">Trang sau</button></div><p class="note">Giờ Việt Nam. Ca đang mở được hiển thị kể cả bắt đầu tháng trước. POS tự gắn ca đang mở, vẫn cho bán khi chưa có ca. Ca cũ chưa có ngày kết thúc không được tự suy đoán.</p></section>`,
    async after() {
      const form = document.querySelector("#shift-filter"),
        status = document.querySelector("#shift-status"),
        current = document.querySelector("#shift-current"),
        history = document.querySelector("#shift-history");
      const prev = document.querySelector("#shift-prev"),
        next = document.querySelector("#shift-next"),
        pageText = document.querySelector("#shift-page");
      let page = 1,
        version = 0,
        busy = false;
      const id = () => (admin ? form.elements.employee.value : user.user_id);
      const params = () => {
        const [year, month] = form.elements.month.value.split("-");
        return new URLSearchParams({ year, month, page, limit: 20 });
      };
      async function load() {
        const request = ++version,
          employee = id();
        current.innerHTML = "";
        history.innerHTML = "";
        prev.disabled = next.disabled = true;
        if (!employee) {
          status.textContent = "Chọn nhân viên để xem ca.";
          return;
        }
        status.textContent = "Đang tải…";
        try {
          const [a, b] = await Promise.all([
            api(`/work-shifts/employee/${employee}/current`),
            api(`/work-shifts/employee/${employee}?${params()}`),
          ]);
          if (request !== version || !form.isConnected) return;
          status.textContent = "";
          current.innerHTML = a.data
            ? `<p>Ca #${e(a.data.shift_id)} đang mở từ ${e(a.data.shift_date)} ${e(a.data.start_time)}</p><button id="shift-action" type="button">Kết thúc ca</button>`
            : '<p>Chưa có ca đang mở.</p><button id="shift-action" type="button">Bắt đầu ca</button>';
          current.querySelector("button").onclick = async () => {
            if (busy) return;
            busy = true;
            current.querySelector("button").disabled = true;
            try {
              await api(
                `/work-shifts/employee/${employee}/${a.data ? "end" : "start"}`,
                {
                  method: "POST",
                  body: a.data ? { shift_id: a.data.shift_id } : {},
                },
              );
              toast(a.data ? "Đã kết thúc ca" : "Đã bắt đầu ca");
            } catch (error) {
              toast(error.message);
            } finally {
              busy = false;
              await load();
            }
          };
          history.innerHTML = b.data.items.length
            ? `<div class="table-wrap"><table><thead><tr><th>Mã ca</th><th>Bắt đầu</th><th>Kết thúc</th><th>Trạng thái</th></tr></thead><tbody>${b.data.items.map((s) => `<tr><td>${e(s.shift_id)}</td><td>${e(s.shift_date)} ${e(s.start_time)}</td><td>${e(s.ended_at || (s.end_time ? s.end_time + " (dữ liệu cũ, chưa rõ ngày)" : "—"))}</td><td>${e(["active", "working", "open"].includes(s.status) ? "Đang làm" : s.status === "completed" ? "Đã kết thúc" : s.status)}</td></tr>`).join("")}</tbody></table></div>`
            : "<p>Chưa có ca trong tháng này.</p>";
          pageText.textContent = `Trang ${page} · ${b.data.total} ca`;
          prev.disabled = page <= 1;
          next.disabled = page * 20 >= b.data.total;
        } catch (error) {
          if (request === version) status.textContent = error.message;
        }
      }
      form.onsubmit = (event) => {
        event.preventDefault();
        page = 1;
        load();
      };
      form.elements.month.onchange = () => {
        page = 1;
        load();
      };
      prev.onclick = () => {
        page--;
        load();
      };
      next.onclick = () => {
        page++;
        load();
      };
      if (admin) {
        form.elements.employee.onchange = () => {
          page = 1;
          load();
        };
        try {
          const { data } = await api(
            "/employee-schedules/overview/month?" + params(),
          );
          if (!form.isConnected) return;
          form.elements.employee.innerHTML += data.employees
            .map(
              (p) => `<option value="${p.user_id}">${e(p.full_name)}</option>`,
            )
            .join("");
        } catch (error) {
          status.textContent = error.message;
          return;
        }
      }
      await load();
    },
  };
}
