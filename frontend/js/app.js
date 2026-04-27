/**
 * app.js — Crop Yield Prediction System
 * Handles: API calls, UI rendering, Chart.js visualisations
 */

const API_BASE = "http://127.0.0.1:8765/api";

// ── State ──────────────────────────────────────────────────────
const state = {
  options: null,
  lastResult: null,
  charts: {},
  insightsLoaded: false,
};

// ── DOM Helpers ────────────────────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// ── Navigation ─────────────────────────────────────────────────
function initNav() {
  $$(".nav-item").forEach(item => {
    item.addEventListener("click", () => {
      const target = item.dataset.page;
      $$(".nav-item").forEach(n => n.classList.remove("active"));
      $$(".page").forEach(p => p.classList.remove("active"));
      item.classList.add("active");
      $(`#page-${target}`).classList.add("active");

      if (target === "dashboard" && !state.insightsLoaded) {
        loadInsights();
      }
    });
  });
}

// ── Clock ──────────────────────────────────────────────────────
function startClock() {
  const el = $("#nav-time");
  const tick = () => {
    el.textContent = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
  };
  tick();
  setInterval(tick, 1000);
}

// ── API: Load Dropdown Options ─────────────────────────────────
async function loadOptions() {
  try {
    const res = await fetch(`${API_BASE}/options`);
    state.options = await res.json();
    populateSelects();
    updateStatusPill(true);
  } catch {
    updateStatusPill(false);
    showToast("⚠️ Backend offline – using demo mode", "error");
    state.options = getDemoOptions();
    populateSelects();
  }
}

function getDemoOptions() {
  return {
    states: ["Punjab","Haryana","Uttar Pradesh","Maharashtra","Tamil Nadu",
             "Andhra Pradesh","Karnataka","West Bengal","Madhya Pradesh","Rajasthan"],
    seasons: ["Kharif","Rabi","Zaid"],
    soil_types: ["Alluvial","Black","Red","Laterite","Sandy","Loamy","Clay"],
    fertilizers: ["Urea","DAP","NPK","Potash","Organic","Compost"],
    irrigations: ["Drip","Sprinkler","Flood","Rain-fed"],
    crops: ["Rice","Wheat","Maize","Cotton","Sugarcane","Soybean","Groundnut","Mustard","Barley","Jowar"],
  };
}

function updateStatusPill(online) {
  const pill = $("#api-status");
  const dot = pill.querySelector(".dot");
  if (online) {
    pill.style.color = "var(--green-400)";
    dot.style.background = "var(--green-400)";
    pill.querySelector(".status-text").textContent = "API Online";
  } else {
    pill.style.color = "#f87171";
    dot.style.background = "#f87171";
    pill.querySelector(".status-text").textContent = "Demo Mode";
  }
}

function populateSelects() {
  const { states, seasons, soil_types, fertilizers, irrigations } = state.options;
  const fill = (id, arr) => {
    const el = $(`#${id}`);
    if (!el) return;
    arr.forEach(v => {
      const o = document.createElement("option");
      o.value = v; o.textContent = v;
      el.appendChild(o);
    });
  };
  fill("f-state", states);
  fill("f-season", seasons);
  fill("f-soil", soil_types);
  fill("f-fertilizer", fertilizers);
  fill("f-irrigation", irrigations);
}

// ── Sliders ────────────────────────────────────────────────────
function initSliders() {
  $$(".slider-control").forEach(slider => {
    const valEl = $(`#${slider.id}-val`);
    if (!valEl) return;
    slider.addEventListener("input", () => {
      valEl.textContent = formatSliderVal(slider.id, slider.value);
    });
    valEl.textContent = formatSliderVal(slider.id, slider.value);
  });
}

function formatSliderVal(id, val) {
  const v = parseFloat(val);
  if (id === "f-rainfall") return `${v} mm`;
  if (id === "f-temp")     return `${v}°C`;
  if (id === "f-humidity") return `${v}%`;
  if (id === "f-ph")       return v.toFixed(1);
  if (id === "f-area")     return `${v} ha`;
  if (id.includes("f-n") || id.includes("f-p") || id.includes("f-k"))
    return `${v} kg/ha`;
  return val;
}

// ── Prediction Form ────────────────────────────────────────────
function initForm() {
  const form = $("#predict-form");
  form.addEventListener("submit", async e => {
    e.preventDefault();
    await runPrediction();
  });
}

async function runPrediction() {
  const btn = $("#btn-predict");
  btn.disabled = true;
  btn.innerHTML = `<div class="spinner"></div> Predicting…`;

  const payload = {
    State:         $("#f-state").value,
    Season:        $("#f-season").value,
    Soil_Type:     $("#f-soil").value,
    Fertilizer:    $("#f-fertilizer").value,
    Irrigation:    $("#f-irrigation").value,
    Rainfall_mm:   parseFloat($("#f-rainfall").value),
    Temperature_C: parseFloat($("#f-temp").value),
    Humidity_pct:  parseFloat($("#f-humidity").value),
    pH:            parseFloat($("#f-ph").value),
    Area_ha:       parseFloat($("#f-area").value),
    N_kg_ha:       parseFloat($("#f-n").value),
    P_kg_ha:       parseFloat($("#f-p").value),
    K_kg_ha:       parseFloat($("#f-k").value),
  };

  try {
    const res = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    state.lastResult = data;
    renderResults(data);
    showToast("✅ Prediction complete!", "success");
  } catch (err) {
    console.error(err);
    showToast("❌ Prediction failed – check backend", "error");
    // Demo fallback
    const demo = buildDemoResult(payload);
    state.lastResult = demo;
    renderResults(demo);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `🌾 Predict Yield &amp; Crop`;
  }
}

// Demo result when backend offline
function buildDemoResult(p) {
  const crops = ["Rice","Wheat","Maize","Soybean","Groundnut"];
  const best = p.Rainfall_mm > 800 ? "Rice" : p.Temperature_C < 20 ? "Wheat" : "Maize";
  return {
    yield_kg_ha: Math.round(2000 + Math.random() * 2000),
    yield_tonnes_ha: +(2 + Math.random() * 2).toFixed(2),
    best_crop: best,
    top_crops: crops.slice(0,3).map((c,i) => ({
      crop: c, confidence: +(70 - i*20 + Math.random()*5).toFixed(1)
    })),
    recommendations: {
      fertilizer: {
        N: { applied: p.N_kg_ha, recommended: 100, tip: "Apply additional Nitrogen (N)." },
        P: { applied: p.P_kg_ha, recommended: 50,  tip: "Phosphorus level is adequate." },
        K: { applied: p.K_kg_ha, recommended: 50,  tip: "Potassium level is adequate." },
        lime_tip: "Soil pH is optimal – no pH amendment needed.",
      },
      irrigation: {
        plan: "Monitor soil moisture and irrigate when needed.",
        water_requirement: "Moderate (500–800 mm/season)",
        method: p.Irrigation,
      },
      agronomy: {
        season_tip: "Temperature is ideal for cultivation.",
        temperature: p.Temperature_C,
        rainfall: p.Rainfall_mm,
      },
    },
  };
}

// ── Render Results ─────────────────────────────────────────────
function renderResults(d) {
  const sec = $("#results-section");
  sec.classList.add("visible");
  sec.scrollIntoView({ behavior: "smooth", block: "start" });

  // Yield hero
  $("#yield-value").textContent = d.yield_kg_ha.toLocaleString("en-IN");
  $("#yield-tonnes").textContent = `≈ ${d.yield_tonnes_ha} tonnes / hectare`;

  // Top crops
  const container = $("#crop-cards");
  container.innerHTML = "";
  d.top_crops.forEach((item, idx) => {
    const card = document.createElement("div");
    card.className = `crop-card${idx === 0 ? " top" : ""}`;
    card.innerHTML = `
      <div class="rank">${idx === 0 ? "🥇 Best Match" : idx === 1 ? "🥈 2nd Choice" : "🥉 3rd Choice"}</div>
      <div class="crop-name">${getCropEmoji(item.crop)} ${item.crop}</div>
      <div class="confidence">${item.confidence}% confidence</div>
      <div class="confidence-bar">
        <div class="confidence-fill" style="width:0%" data-target="${item.confidence}"></div>
      </div>`;
    container.appendChild(card);
  });
  // Animate bars
  setTimeout(() => {
    $$(".confidence-fill").forEach(el => {
      el.style.width = el.dataset.target + "%";
    });
  }, 50);

  // Fertilizer
  renderFertilizer(d.recommendations.fertilizer);

  // Irrigation
  renderIrrigation(d.recommendations.irrigation, d.recommendations.agronomy);
}

function getCropEmoji(crop) {
  const map = { Rice:"🌾", Wheat:"🌾", Maize:"🌽", Cotton:"🪴", Sugarcane:"🎋",
                Soybean:"🫘", Groundnut:"🥜", Mustard:"🌼", Barley:"🌿", Jowar:"🌱" };
  return map[crop] || "🌿";
}

function renderFertilizer(fert) {
  const wrap = $("#fert-recs");
  wrap.innerHTML = "";

  ["N","P","K"].forEach(n => {
    const f = fert[n];
    const pct = Math.min(100, (f.applied / (f.recommended * 1.5)) * 100);
    const color = f.applied < f.recommended * 0.8 ? "#f59e0b"
                : f.applied > f.recommended * 1.2 ? "#f87171"
                : "#22c55e";
    const label = { N: "Nitrogen (N)", P: "Phosphorus (P)", K: "Potassium (K)" }[n];
    wrap.innerHTML += `
      <div class="fert-bar-wrap">
        <div class="fert-labels">
          <span>${label}</span>
          <span>${f.applied} / <strong>${f.recommended}</strong> kg/ha</span>
        </div>
        <div class="fert-bar-bg">
          <div class="fert-bar-fill" style="width:0%; background:${color}"
               data-target="${pct}%"></div>
        </div>
        <div class="fert-tip">${f.tip}</div>
      </div>`;
  });
  wrap.innerHTML += `<div class="tip-text" style="margin-top:10px">🪨 ${fert.lime_tip}</div>`;

  setTimeout(() => {
    $$(".fert-bar-fill").forEach(el => { el.style.width = el.dataset.target; });
  }, 50);
}

function renderIrrigation(irr, agro) {
  const wrap = $("#irr-recs");
  wrap.innerHTML = `
    <div class="irr-badge">💧 ${irr.method}</div>
    <div class="tip-text">${irr.plan}</div>
    <div style="margin-top:12px; font-size:12px; color:var(--text-muted)">
      Water requirement: ${irr.water_requirement}
    </div>
    <div class="tip-text" style="margin-top:10px">🌡️ ${agro.season_tip}</div>
    <div style="margin-top:8px; font-size:12px; color:var(--text-muted)">
      Rainfall: <strong style="color:var(--sky-400)">${agro.rainfall} mm</strong> · 
      Temp: <strong style="color:var(--amber-400)">${agro.temperature}°C</strong>
    </div>`;
}

// ══════════════════════════════════════════════════════════════
// DASHBOARD / INSIGHTS
// ══════════════════════════════════════════════════════════════
async function loadInsights() {
  try {
    const res = await fetch(`${API_BASE}/insights`);
    const data = await res.json();
    renderDashboard(data);
    state.insightsLoaded = true;
  } catch {
    renderDashboard(buildDemoInsights());
    state.insightsLoaded = true;
  }
}

function buildDemoInsights() {
  const crops = ["Rice","Wheat","Maize","Cotton","Sugarcane","Soybean","Groundnut","Mustard","Barley","Jowar"];
  const by_crop = crops.map(c => ({
    Crop: c,
    avg_yield: 1000 + Math.random() * 8000,
    min_yield: 500 + Math.random() * 500,
    max_yield: 9000 + Math.random() * 3000,
    samples: Math.round(400 + Math.random() * 100),
  }));
  const states = ["Punjab","Haryana","UP","Maharashtra","Tamil Nadu","AP","Karnataka","WB","MP","Rajasthan"];
  const by_state = states.map(s => ({ State: s, avg_yield: 1500 + Math.random() * 4000 }));
  const by_season = [
    { Season: "Kharif", avg_yield: 3200 },
    { Season: "Rabi",   avg_yield: 3800 },
    { Season: "Zaid",   avg_yield: 2100 },
  ];
  const by_soil = ["Alluvial","Black","Red","Laterite","Sandy","Loamy","Clay"]
    .map(s => ({ Soil_Type: s, avg_yield: 1800 + Math.random() * 3000 }));
  const rainfall_yield = [
    {rainfall_range:"<400",avg_yield:1200},{rainfall_range:"400-800",avg_yield:2800},
    {rainfall_range:"800-1200",avg_yield:4100},{rainfall_range:"1200-1600",avg_yield:5200},
    {rainfall_range:"1600-2000",avg_yield:4700},{rainfall_range:">2000",avg_yield:3900},
  ];
  return { by_crop, by_state, by_season, by_soil, rainfall_yield, total_samples: 5000 };
}

function renderDashboard(data) {
  // Summary stats
  if (data.total_samples) {
    $("#dash-total").textContent = data.total_samples.toLocaleString();
  }
  if (data.by_crop) {
    const avgYield = data.by_crop.reduce((s, c) => s + c.avg_yield, 0) / data.by_crop.length;
    $("#dash-avg-yield").textContent = Math.round(avgYield).toLocaleString();
    const topCrop = data.by_crop.reduce((a, b) => a.avg_yield > b.avg_yield ? a : b);
    $("#dash-top-crop").textContent = topCrop.Crop;
  }

  destroyCharts();
  renderCropYieldChart(data.by_crop);
  renderStateChart(data.by_state);
  renderSeasonChart(data.by_season);
  renderSoilChart(data.by_soil);
  renderRainfallChart(data.rainfall_yield);
}

function destroyCharts() {
  Object.values(state.charts).forEach(c => c && c.destroy());
  state.charts = {};
}

const CHART_DEFAULTS = {
  color: "#fff",
  plugins: { legend: { labels: { color: "#9ca3af", font: { family: "Inter", size: 11 } } } },
  scales: {
    x: { ticks: { color: "#9ca3af", font: { family: "Inter", size: 11 } }, grid: { color: "rgba(255,255,255,0.05)" } },
    y: { ticks: { color: "#9ca3af", font: { family: "Inter", size: 11 } }, grid: { color: "rgba(255,255,255,0.05)" } },
  },
};

function greenGradient(ctx, area) {
  const g = ctx.createLinearGradient(0, area.bottom, 0, area.top);
  g.addColorStop(0, "rgba(34,197,94,0.05)");
  g.addColorStop(1, "rgba(34,197,94,0.45)");
  return g;
}

function renderCropYieldChart(data) {
  const ctx = $("#chart-crop").getContext("2d");
  const labels = data.map(d => d.Crop);
  const values = data.map(d => Math.round(d.avg_yield));
  state.charts.crop = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Avg Yield (kg/ha)",
        data: values,
        backgroundColor(ctx2) { return greenGradient(ctx2.chart.ctx, ctx2.chart.chartArea || {top:0,bottom:200}); },
        borderColor: "rgba(34,197,94,0.6)",
        borderWidth: 1,
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      ...CHART_DEFAULTS,
      plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } },
    },
  });
}

function renderStateChart(data) {
  const ctx = $("#chart-state").getContext("2d");
  const sorted = [...data].sort((a,b) => b.avg_yield - a.avg_yield);
  state.charts.state = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sorted.map(d => d.State),
      datasets: [{
        label: "Avg Yield (kg/ha)",
        data: sorted.map(d => Math.round(d.avg_yield)),
        backgroundColor: "rgba(16,185,129,0.4)",
        borderColor: "rgba(16,185,129,0.8)",
        borderWidth: 1,
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      indexAxis: "y",
      ...CHART_DEFAULTS,
      plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } },
    },
  });
}

function renderSeasonChart(data) {
  const ctx = $("#chart-season").getContext("2d");
  state.charts.season = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: data.map(d => d.Season),
      datasets: [{
        data: data.map(d => Math.round(d.avg_yield)),
        backgroundColor: ["rgba(34,197,94,0.7)","rgba(16,185,129,0.7)","rgba(245,158,11,0.7)"],
        borderColor: ["#22c55e","#10b981","#f59e0b"],
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: "#9ca3af", font: { family:"Inter", size:11 } } },
      },
      cutout: "68%",
    },
  });
}

function renderSoilChart(data) {
  const ctx = $("#chart-soil").getContext("2d");
  state.charts.soil = new Chart(ctx, {
    type: "radar",
    data: {
      labels: data.map(d => d.Soil_Type),
      datasets: [{
        label: "Avg Yield (kg/ha)",
        data: data.map(d => Math.round(d.avg_yield)),
        backgroundColor: "rgba(34,197,94,0.15)",
        borderColor: "rgba(34,197,94,0.8)",
        pointBackgroundColor: "#22c55e",
        pointBorderColor: "#fff",
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } },
      scales: {
        r: {
          ticks: { color: "#9ca3af", font: { size: 10 }, backdropColor: "transparent" },
          grid: { color: "rgba(255,255,255,0.06)" },
          pointLabels: { color: "#d1fae5", font: { family: "Inter", size: 11 } },
        },
      },
    },
  });
}

function renderRainfallChart(data) {
  const ctx = $("#chart-rainfall").getContext("2d");
  state.charts.rainfall = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.map(d => d.rainfall_range),
      datasets: [{
        label: "Avg Yield (kg/ha)",
        data: data.map(d => Math.round(d.avg_yield)),
        borderColor: "#38bdf8",
        backgroundColor: "rgba(56,189,248,0.1)",
        fill: true,
        tension: 0.45,
        pointRadius: 5,
        pointBackgroundColor: "#38bdf8",
        pointBorderColor: "#fff",
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      ...CHART_DEFAULTS,
      scales: {
        x: { ...CHART_DEFAULTS.scales.x, title: { display: true, text: "Rainfall (mm)", color: "#9ca3af" } },
        y: { ...CHART_DEFAULTS.scales.y, title: { display: true, text: "Yield (kg/ha)", color: "#9ca3af" } },
      },
      plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } },
    },
  });
}

// ── Toast ──────────────────────────────────────────────────────
function showToast(msg, type = "success") {
  const container = $("#toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ── Init ───────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  initNav();
  startClock();
  initSliders();
  initForm();
  await loadOptions();
});
