const $ = (selector) => document.querySelector(selector);
const state = {
  chart: null,
  headers: ["Ngày thanh toán", "Số đơn đã thanh toán", "Doanh thu", "Giảm giá"],
  rows: [],
  reportName: "Bao_Cao_Doanh_Thu",
};

function localDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMoney(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatNumber(value) {
  return new Intl.NumberFormat("vi-VN").format(Number(value) || 0);
}

function setMessage(message, kind = "info") {
  const region = $("#reportMessage");
  region.textContent = message;
  region.dataset.kind = kind;
  region.hidden = !message;
}

function setLoading(loading) {
  $("#btn-load").disabled = loading;
  $("#btn-export").disabled = loading || state.rows.length === 0;
  $("#btn-load").textContent = loading ? "Đang tải…" : "Xem báo cáo";
}

function renderSummary(summary) {
  $("#orderCount").textContent = formatNumber(summary.order_count);
  $("#revenue").textContent = formatMoney(summary.revenue);
  $("#discount").textContent = formatMoney(summary.discount_amount);
}

function renderTable(rows) {
  const body = $("#tableBody");
  body.replaceChildren();
  if (!rows.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = state.headers.length;
    cell.textContent = "Không có đơn đã thanh toán trong khoảng thời gian này.";
    row.append(cell);
    body.append(row);
    return;
  }

  for (const rowData of rows) {
    const row = document.createElement("tr");
    for (const value of rowData) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    }
    body.append(row);
  }
}

function eachDate(from, to) {
  const dates = [];
  const current = new Date(`${from}T00:00:00Z`);
  const last = new Date(`${to}T00:00:00Z`);
  while (current <= last) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

function drawChart(labels, values) {
  if (state.chart) state.chart.destroy();
  if (typeof Chart !== "function") {
    setMessage(
      "Không tải được thư viện biểu đồ. Bảng số liệu và CSV vẫn dùng được.",
      "warning",
    );
    return;
  }
  state.chart = new Chart($("#myReportChart"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Doanh thu (VND)",
          data: values,
          borderColor: "#176b87",
          backgroundColor: "rgba(23, 107, 135, 0.14)",
          fill: true,
          tension: 0.25,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: { label: (context) => formatMoney(context.parsed.y) },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (value) => formatMoney(value) },
        },
      },
    },
  });
}

async function loadRevenue() {
  const from = $("#fromDate").value;
  const to = $("#toDate").value;
  if (!from || !to) {
    setMessage("Vui lòng chọn ngày bắt đầu và ngày kết thúc.", "error");
    return;
  }
  if (from > to) {
    setMessage("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.", "error");
    return;
  }
  if (
    (new Date(`${to}T00:00:00+07:00`) - new Date(`${from}T00:00:00+07:00`)) /
      86_400_000 >=
    366
  ) {
    setMessage("Khoảng thời gian tối đa là 366 ngày.", "error");
    return;
  }

  const token = sessionStorage.getItem("token");
  if (!token) {
    setMessage(
      "Phiên đăng nhập không còn. Vui lòng đăng nhập bằng tài khoản quản trị rồi mở lại báo cáo.",
      "error",
    );
    return;
  }

  setMessage("");
  state.rows = [];
  setLoading(true);
  try {
    const query = new URLSearchParams({ from, to });
    const response = await fetch(`/api/v1/reports/revenue?${query}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) {
        sessionStorage.removeItem("token");
        setMessage("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.", "error");
      } else if (response.status === 403) {
        setMessage(
          "Chỉ tài khoản quản trị mới được xem báo cáo doanh thu.",
          "error",
        );
      } else {
        setMessage(
          payload.error?.message ||
            `Không tải được báo cáo (${response.status}).`,
          "error",
        );
      }
      return;
    }

    const { summary = {}, series = [] } = payload.data || {};
    const daily = new Map(
      series.map((item) => [String(item.report_date).slice(0, 10), item]),
    );
    const dates = eachDate(from, to);
    const rowsByDate = dates.map((date) => {
      const item = daily.get(date) || {};
      return [
        date,
        formatNumber(item.order_count),
        formatMoney(item.revenue),
        formatMoney(item.discount_amount),
      ];
    });
    state.rows = rowsByDate;
    renderSummary(summary);
    renderTable(rowsByDate);
    $("#reportTitle").textContent = `Báo cáo doanh thu (${from} đến ${to})`;
    drawChart(
      dates,
      dates.map((date) => Number(daily.get(date)?.revenue) || 0),
    );
    $("#btn-export").disabled = false;

    const missingPaidAt =
      Number(payload.data?.data_quality?.paid_without_paid_at) || 0;
    if (missingPaidAt > 0) {
      setMessage(
        `Cảnh báo chất lượng dữ liệu: có ${formatNumber(missingPaidAt)} đơn đã thanh toán nhưng thiếu thời điểm paid_at; các đơn này không được tự gán vào ngày báo cáo.`,
        "warning",
      );
    }
  } catch {
    setMessage(
      "Không kết nối được máy chủ báo cáo. Vui lòng thử lại sau.",
      "error",
    );
  } finally {
    setLoading(false);
  }
}

function csvCell(value) {
  let text = String(value ?? "");
  if (/^[\t\r ]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function exportCsv() {
  if (!state.rows.length) return;
  const content =
    "\uFEFF" +
    [state.headers, ...state.rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${state.reportName}_${localDate(new Date())}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded", () => {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);
  $("#fromDate").value = localDate(sevenDaysAgo);
  $("#toDate").value = localDate(today);
  $("#btn-load").addEventListener("click", loadRevenue);
  $("#btn-export").addEventListener("click", exportCsv);
  $("#btn-export").disabled = true;
  loadRevenue();
});
