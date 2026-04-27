# 🌾 CropSense AI — Crop Yield Prediction System

> An end-to-end ML-powered web application for predicting crop yields and providing precision agriculture recommendations for Indian farmers.

![Tech Stack](https://img.shields.io/badge/ML-Random%20Forest%20%2B%20XGBoost-22c55e?style=flat-square)
![Backend](https://img.shields.io/badge/Backend-Flask-black?style=flat-square&logo=flask)
![Frontend](https://img.shields.io/badge/Frontend-HTML%2FCSS%2FJS-0ea5e9?style=flat-square)

---

## 📸 Features

| Feature | Description |
|---------|-------------|
| 🔮 **Yield Prediction** | Random Forest regressor estimates crop yield in kg/ha |
| 🌿 **Crop Recommendation** | XGBoost classifier suggests top-3 best-fit crops |
| 🧪 **Fertilizer Plan** | NPK gap analysis with application tips |
| 💧 **Irrigation Strategy** | Method-specific irrigation plan based on rainfall & crop |
| 📊 **Insights Dashboard** | 5 Chart.js charts — crop/state/season/soil/rainfall analysis |

---

## 🧱 Tech Stack

```
Frontend  → HTML5 · CSS3 (glassmorphism, dark mode) · Vanilla JS · Chart.js 4
Backend   → Python 3.10+ · Flask 3 · Flask-CORS
ML        → scikit-learn (Random Forest) · XGBoost
Data      → pandas · numpy
Persist   → joblib (model serialization)
```

---

## 📂 Project Structure

```
crop_yield_prediction/
├── backend/
│   ├── app.py            ← Flask REST API
│   ├── model.py          ← ML training + inference + recommendation engine
│   ├── requirements.txt
│   ├── models/           ← Auto-generated (joblib files)
│   └── data/
│       ├── generate_data.py   ← Synthetic dataset generator
│       └── crop_data.csv      ← Auto-generated
│
└── frontend/
    ├── index.html        ← Single-page app (3 pages)
    ├── css/
    │   └── style.css     ← Complete design system
    └── js/
        └── app.js        ← API integration + Chart.js + UI logic
```

---

## 🚀 Quick Start

### 1. Install Python Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Generate Dataset (auto on first run, or manually)
```bash
cd backend/data
python generate_data.py
```

### 3. Train Models (auto on first run, or manually)
```bash
cd backend
python model.py
```

### 4. Start Flask API
```bash
cd backend
python app.py
```
API runs at → `http://127.0.0.1:5000`

### 5. Open Frontend
Open `frontend/index.html` in your browser (or serve with any static server).

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/options` | Dropdown options for UI |
| POST | `/api/predict` | Yield + crop + recommendations |
| GET | `/api/insights` | Dataset-level statistics |

### POST `/api/predict` — Payload Example
```json
{
  "State": "Punjab",
  "Season": "Rabi",
  "Soil_Type": "Alluvial",
  "Rainfall_mm": 650,
  "Temperature_C": 18,
  "Humidity_pct": 70,
  "pH": 7.2,
  "Area_ha": 5,
  "N_kg_ha": 80,
  "P_kg_ha": 40,
  "K_kg_ha": 40,
  "Fertilizer": "NPK",
  "Irrigation": "Drip"
}
```

### Response
```json
{
  "yield_kg_ha": 4312.5,
  "yield_tonnes_ha": 4.31,
  "best_crop": "Wheat",
  "top_crops": [
    {"crop": "Wheat", "confidence": 82.3},
    {"crop": "Barley", "confidence": 11.2},
    {"crop": "Mustard", "confidence": 6.5}
  ],
  "recommendations": {
    "fertilizer": { "N": {...}, "P": {...}, "K": {...}, "lime_tip": "..." },
    "irrigation": { "plan": "...", "water_requirement": "...", "method": "Drip" },
    "agronomy": { "season_tip": "...", "temperature": 18, "rainfall": 650 }
  }
}
```

---

## 🌱 Supported Crops

| Crop | Season | Water Need |
|------|--------|-----------|
| Rice | Kharif | High |
| Wheat | Rabi | Moderate |
| Maize | Kharif | Moderate |
| Cotton | Kharif | Moderate |
| Sugarcane | All | High |
| Soybean | Kharif | Moderate |
| Groundnut | Kharif | Low–Moderate |
| Mustard | Rabi | Low |
| Barley | Rabi | Low |
| Jowar | Kharif | Low |

---

## 📊 Dataset

Synthetically generated based on **Indian agriculture patterns**:
- **5,000 records** across 10 crops, 10 states, 3 seasons
- 15 features including weather, soil, NPK, irrigation
- Yield ranges calibrated to real-world ICAR/FAO data

---

## 🔬 ML Details

### Yield Regression — Random Forest
- Features: Rainfall, Temperature, Humidity, pH, Area, N, P, K + encoded categoricals
- 120 estimators, max_depth=12
- Metric: MAE in kg/ha

### Crop Classification — XGBoost
- Features: Environmental + soil parameters
- 150 estimators, learning_rate=0.1
- Output: Top-3 crops with probability confidence

---

## 👨‍💻 Author

Built as **Project 3** of the AI/ML Portfolio Series.

---

*Made with 🌾 for Indian Agriculture*
