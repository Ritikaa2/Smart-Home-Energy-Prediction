/**
 * Smart Home Energy Prediction - Custom Client Logic
 * Handles real-time tab navigation, real database metric polling,
 * interactive prediction form, live history table, pagination, search,
 * and pure HTML5 Canvas charts that DYNAMICALLY RE-RENDER ON EVERY PREDICTION.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Navigation tabs
  const navItems = document.querySelectorAll(".sidebar-nav .nav-item");
  const viewPanels = document.querySelectorAll(".view-panel");

  // Tab switching logic
  function switchTab(tabId) {
    navItems.forEach(item => {
      if (item.getAttribute("data-tab") === tabId) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    viewPanels.forEach(panel => {
      if (panel.id === `view-${tabId}`) {
        panel.classList.add("active");
      } else {
        panel.classList.remove("active");
      }
    });

    if (tabId === "dashboard") {
      fetchDashboardStats();
    } else if (tabId === "history") {
      fetchHistory();
    } else if (tabId === "performance") {
      fetchPerformance();
    }
  }

  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const tab = item.getAttribute("data-tab");
      switchTab(tab);
    });
  });

  // Action buttons inside Result view
  const btnPredictAgain = document.getElementById("btn-predict-again");
  if (btnPredictAgain) {
    btnPredictAgain.addEventListener("click", () => switchTab("predict"));
  }

  const btnViewHistory = document.getElementById("btn-view-history");
  if (btnViewHistory) {
    btnViewHistory.addEventListener("click", () => switchTab("history"));
  }

  // ================= 1. DASHBOARD LOGIC & REAL CANVAS CHART =================
  async function fetchDashboardStats() {
    try {
      const res = await fetch("/api/dashboard");
      const data = await res.json();
      if (data.status === "success") {
        document.getElementById("dash-total-readings").textContent = data.total_readings.toLocaleString();
        document.getElementById("dash-avg-consumption").textContent = `${data.avg_consumption} Wh`;
        document.getElementById("dash-latest-pred").textContent = `${data.latest_prediction} Wh`;
        
        const catElem = document.getElementById("dash-latest-cat");
        catElem.textContent = data.latest_category;

        // Dynamic insight text
        const insightElem = document.getElementById("dash-insight-text");
        if (insightElem && data.insight_text) {
          insightElem.innerHTML = data.insight_text;
        }

        // Draw Real Line Chart from MongoDB real values (dynamically updates when predicted!)
        drawRecentEnergyChart(data.trend.labels, data.trend.values);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    }
  }

  function drawRecentEnergyChart(labels, values) {
    const canvas = document.getElementById("trendChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    if (!values || values.length === 0) return;

    // Canvas padding
    const padLeft = 45;
    const padRight = 25;
    const padTop = 26;
    const padBottom = 35;

    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;

    // Real dynamic scale based on actual values
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const yMin = Math.floor(Math.max(0, minVal - 20) / 10) * 10;
    const yMax = Math.ceil((maxVal + 25) / 10) * 10;

    // Grid lines & Y-axis ticks
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#64748b";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "right";

    const numTicks = 5;
    const tickStep = (yMax - yMin) / numTicks;

    for (let i = 0; i <= numTicks; i++) {
      const val = Math.round(yMin + i * tickStep);
      const yPos = padTop + chartH - ((val - yMin) / (yMax - yMin)) * chartH;
      ctx.beginPath();
      ctx.moveTo(padLeft, yPos);
      ctx.lineTo(width - padRight, yPos);
      ctx.stroke();
      ctx.fillText(val, padLeft - 8, yPos + 4);
    }

    // Y Axis Label
    ctx.save();
    ctx.translate(14, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.font = "11px sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.fillText("Energy (Wh)", 0, 0);
    ctx.restore();

    // X Axis Labels & Points
    const stepX = chartW / Math.max(1, (labels.length - 1));
    const points = [];

    labels.forEach((lbl, idx) => {
      const x = padLeft + idx * stepX;
      const val = values[idx];
      const y = padTop + chartH - ((val - yMin) / (yMax - yMin)) * chartH;
      points.push({ x, y, val });

      ctx.textAlign = "center";
      ctx.fillStyle = "#64748b";
      ctx.fillText(lbl, x, height - 12);
    });

    // Draw Smooth Line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = "#16a34a"; // Green line from UI screenshot
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Draw Dots and Values
    points.forEach((pt, idx) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
      // Highlight the newest prediction dot in bold emerald
      ctx.fillStyle = idx === points.length - 1 ? "#059669" : "#16a34a";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();

      // Value label on top of point
      ctx.font = idx === points.length - 1 ? "bold 11px sans-serif" : "10px sans-serif";
      ctx.fillStyle = idx === points.length - 1 ? "#047857" : "#15803d";
      ctx.textAlign = "center";
      ctx.fillText(`${pt.val}`, pt.x, pt.y - 8);
    });
  }

  // ================= 2. PREDICTION FORM SUBMIT (REAL INFERENCE & DYNAMIC UPDATE) =================
  const form = document.getElementById("prediction-form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const payload = {
        lights_wh: parseFloat(document.getElementById("inp-lights").value),
        kitchen_temp_c: parseFloat(document.getElementById("inp-t1").value),
        kitchen_humidity: parseFloat(document.getElementById("inp-rh1").value),
        living_room_temp_c: parseFloat(document.getElementById("inp-t2").value),
        living_room_humidity: parseFloat(document.getElementById("inp-rh2").value),
        outside_temp_c: parseFloat(document.getElementById("inp-tout").value),
        outside_humidity: parseFloat(document.getElementById("inp-rhout").value)
      };

      try {
        const response = await fetch("/api/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const res = await response.json();

        if (res.status === "success") {
          // Fill Result Screen
          document.getElementById("res-energy-val").textContent = res.predicted_energy_wh;
          const catElem = document.getElementById("res-cat-val");
          catElem.textContent = res.consumption_status;
          catElem.className = `result-category-label text-cat-${res.consumption_status.toLowerCase()}`;

          const listElem = document.getElementById("res-rec-list");
          listElem.innerHTML = "";
          (res.recommendations || []).forEach(tip => {
            const li = document.createElement("li");
            li.textContent = tip;
            listElem.appendChild(li);
          });

          // Refresh live dashboard metrics & graphs in background
          fetchDashboardStats();

          // Switch directly to Prediction Result View (matching UI screen 3)
          switchTab("result");
        }
      } catch (err) {
        alert("Prediction failed: " + err);
      }
    });
  }

  // ================= 3. PREDICTION HISTORY TABLE & PAGINATION =================
  let allHistory = [];
  let currentPage = 1;
  const itemsPerPage = 5;

  async function fetchHistory() {
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      if (data.status === "success") {
        allHistory = data.history || [];
        currentPage = 1;
        renderHistoryPage();
      }
    } catch (err) {
      console.error("History fetch error:", err);
    }
  }

  function renderHistoryPage(filterText = "") {
    let filtered = allHistory;
    if (filterText) {
      const q = filterText.toLowerCase();
      filtered = allHistory.filter(item => 
        (item.timestamp && item.timestamp.toLowerCase().includes(q)) ||
        (item.consumption_status && item.consumption_status.toLowerCase().includes(q))
      );
    }

    const totalRecords = filtered.length;
    const totalPages = Math.ceil(totalRecords / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const pageItems = filtered.slice(startIndex, startIndex + itemsPerPage);

    const tbody = document.getElementById("history-table-body");
    tbody.innerHTML = "";

    if (pageItems.length === 0) {
      tbody.innerHTML = `<tr><td colspan="12" style="text-align: center; color: #64748b; padding: 24px;">No prediction records found in MongoDB.</td></tr>`;
    } else {
      pageItems.forEach((item, idx) => {
        const inp = item.inputs || {};
        const rowNum = startIndex + idx + 1;
        const tr = document.createElement("tr");

        tr.innerHTML = `
          <td>${rowNum}</td>
          <td>${item.timestamp}</td>
          <td>${inp.lights_wh !== undefined ? Number(inp.lights_wh).toFixed(1) : "20.0"}</td>
          <td>${inp.kitchen_temp_c !== undefined ? Number(inp.kitchen_temp_c).toFixed(1) : "21.5"}</td>
          <td>${inp.kitchen_humidity !== undefined ? Number(inp.kitchen_humidity).toFixed(1) : "40.0"}</td>
          <td>${inp.living_room_temp_c !== undefined ? Number(inp.living_room_temp_c).toFixed(1) : "20.0"}</td>
          <td>${inp.living_room_humidity !== undefined ? Number(inp.living_room_humidity).toFixed(1) : "38.0"}</td>
          <td>${inp.outside_temp_c !== undefined ? Number(inp.outside_temp_c).toFixed(1) : "8.5"}</td>
          <td>${inp.outside_humidity !== undefined ? Number(inp.outside_humidity).toFixed(1) : "85.0"}</td>
          <td><strong>${item.predicted_energy_wh}</strong></td>
          <td><span class="cat-pill ${item.consumption_status}">${item.consumption_status}</span></td>
          <td>
            <div class="action-btns">
              <button class="btn-icon-sq btn-blue-edit" title="Load into form" data-inputs='${JSON.stringify(inp)}'>✏️</button>
              <button class="btn-icon-sq btn-red-del" title="Delete record" data-id="${item.id}">🗑️</button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    // Attach row button events
    document.querySelectorAll(".btn-blue-edit").forEach(btn => {
      btn.addEventListener("click", () => {
        const inp = JSON.parse(btn.getAttribute("data-inputs"));
        if (inp) {
          if (inp.lights_wh !== undefined) document.getElementById("inp-lights").value = inp.lights_wh;
          if (inp.kitchen_temp_c !== undefined) document.getElementById("inp-t1").value = inp.kitchen_temp_c;
          if (inp.kitchen_humidity !== undefined) document.getElementById("inp-rh1").value = inp.kitchen_humidity;
          if (inp.living_room_temp_c !== undefined) document.getElementById("inp-t2").value = inp.living_room_temp_c;
          if (inp.living_room_humidity !== undefined) document.getElementById("inp-rh2").value = inp.living_room_humidity;
          if (inp.outside_temp_c !== undefined) document.getElementById("inp-tout").value = inp.outside_temp_c;
          if (inp.outside_humidity !== undefined) document.getElementById("inp-rhout").value = inp.outside_humidity;
          switchTab("predict");
        }
      });
    });

    document.querySelectorAll(".btn-red-del").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        if (confirm("Delete this record from MongoDB?")) {
          await fetch(`/api/history/${id}`, { method: "DELETE" });
          fetchHistory();
          fetchDashboardStats();
        }
      });
    });

    // Pagination info & controls
    const endCount = Math.min(startIndex + itemsPerPage, totalRecords);
    document.getElementById("pagination-info").textContent = 
      totalRecords > 0 ? `Showing ${startIndex + 1} to ${endCount} of ${totalRecords} records` : `Showing 0 of 0 records`;

    const controls = document.getElementById("pagination-controls");
    controls.innerHTML = "";

    // Prev Button
    const prevBtn = document.createElement("button");
    prevBtn.className = "page-btn";
    prevBtn.innerHTML = "&lsaquo;";
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderHistoryPage(filterText);
      }
    });
    controls.appendChild(prevBtn);

    // Numbered Buttons
    for (let p = 1; p <= totalPages; p++) {
      const pageBtn = document.createElement("button");
      pageBtn.className = `page-btn ${p === currentPage ? "active" : ""}`;
      pageBtn.textContent = p;
      pageBtn.addEventListener("click", () => {
        currentPage = p;
        renderHistoryPage(filterText);
      });
      controls.appendChild(pageBtn);
    }

    // Next Button
    const nextBtn = document.createElement("button");
    nextBtn.className = "page-btn";
    nextBtn.innerHTML = "&rsaquo;";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderHistoryPage(filterText);
      }
    });
    controls.appendChild(nextBtn);
  }

  // Search input event
  const searchInput = document.getElementById("history-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentPage = 1;
      renderHistoryPage(e.target.value);
    });
  }

  // ================= 4. MODEL PERFORMANCE & DYNAMIC ACTUAL VS PREDICTED SCATTER CHART =================
  async function fetchPerformance() {
    try {
      const res = await fetch("/api/model-performance");
      const data = await res.json();
      if (data.status === "success") {
        document.getElementById("perf-r2-val").textContent = data.r2_score;
        document.getElementById("perf-mae-val").textContent = `${data.mae} Wh`;
        document.getElementById("spec-train-size").textContent = data.training_data;
        document.getElementById("spec-test-size").textContent = data.testing_data;
        document.getElementById("spec-r2").textContent = data.r2_score;
        document.getElementById("spec-mae").textContent = `${data.mae} Wh`;

        drawActualVsPredChart(data.chart_points);
      }
    } catch (err) {
      console.error("Performance fetch error:", err);
    }
  }

  function drawActualVsPredChart(points) {
    const canvas = document.getElementById("actualVsPredChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const padLeft = 45;
    const padRight = 20;
    const padTop = 20;
    const padBottom = 35;

    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;

    // Dynamically calculate limits so high predictions fit perfectly
    let maxVal = 160;
    (points || []).forEach(p => {
      if (p.actual > maxVal) maxVal = Math.ceil(p.actual / 20) * 20;
      if (p.predicted > maxVal) maxVal = Math.ceil(p.predicted / 20) * 20;
    });
    const minVal = 0;

    // Grid Lines & Ticks
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#64748b";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "right";

    const numSteps = 7;
    const stepSize = Math.round((maxVal - minVal) / numSteps / 10) * 10 || 20;

    for (let val = minVal; val <= maxVal; val += stepSize) {
      const pos = padTop + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
      ctx.beginPath();
      ctx.moveTo(padLeft, pos);
      ctx.lineTo(width - padRight, pos);
      ctx.stroke();
      ctx.fillText(val, padLeft - 6, pos + 4);

      // X axis tick
      const xPos = padLeft + ((val - minVal) / (maxVal - minVal)) * chartW;
      ctx.fillText(val, xPos, height - 12);
    }

    // Axis Labels
    ctx.save();
    ctx.translate(14, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("Predicted Energy (Wh)", 0, 0);
    ctx.restore();

    ctx.textAlign = "center";
    ctx.fillText("Actual Energy (Wh)", padLeft + chartW / 2, height - 2);

    // Diagonal ideal line (Red) matching screenshot
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop + chartH);
    ctx.lineTo(padLeft + chartW, padTop);
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Real Scatter Points (Blue Dots with border; New live predictions highlighted in Gold/Amber)
    (points || []).forEach(pt => {
      const x = padLeft + ((pt.actual - minVal) / (maxVal - minVal)) * chartW;
      const y = padTop + chartH - ((pt.predicted - minVal) / (maxVal - minVal)) * chartH;

      ctx.beginPath();
      if (pt.is_new) {
        // Highlighting newly predicted point from the user
        ctx.arc(x, y, 6.5, 0, Math.PI * 2);
        ctx.fillStyle = "#f59e0b"; // Gold / Amber
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#b45309";
        ctx.stroke();

        ctx.font = "bold 9px sans-serif";
        ctx.fillStyle = "#b45309";
        ctx.textAlign = "center";
        ctx.fillText("NEW", x, y - 9);
      } else {
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#3b82f6"; // Blue
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#1d4ed8";
        ctx.stroke();
      }
    });
  }

  // Load Initial Dashboard
  switchTab("dashboard");
});
