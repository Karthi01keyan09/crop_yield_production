"""
Flask API — Crop Yield Prediction System
Routes:
  GET  /api/health          → health check
  POST /api/predict         → yield + crop + recommendations
  GET  /api/options         → dropdown options for UI
  GET  /api/insights        → dataset-level statistics for dashboard
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import os, sys, traceback

# Make sure the backend dir is on the path
sys.path.insert(0, os.path.dirname(__file__))

from model import predict, get_models, DATA_PATH, CROP_WATER_NEEDS

import pandas as pd
import numpy as np

app = Flask(__name__)
CORS(app)   # Allow all origins (dev mode)

# ── Warm-up ───────────────────────────────────────────────────────────────────
print("Loading / training ML models...")
try:
    get_models()
    print("[OK] Models ready.")
except Exception as e:
    print(f"[WARN] Model load error: {e}")


# ── Routes ────────────────────────────────────────────────────────────────────
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "message": "Crop Yield Prediction API is running 🌾"})


@app.route("/api/options", methods=["GET"])
def options():
    return jsonify({
        "states": [
            "Punjab", "Haryana", "Uttar Pradesh", "Maharashtra", "Tamil Nadu",
            "Andhra Pradesh", "Karnataka", "West Bengal", "Madhya Pradesh", "Rajasthan"
        ],
        "seasons": ["Kharif", "Rabi", "Zaid"],
        "soil_types": ["Alluvial", "Black", "Red", "Laterite", "Sandy", "Loamy", "Clay"],
        "fertilizers": ["Urea", "DAP", "NPK", "Potash", "Organic", "Compost"],
        "irrigations": ["Drip", "Sprinkler", "Flood", "Rain-fed"],
        "crops": list(CROP_WATER_NEEDS.keys()),
    })


@app.route("/api/predict", methods=["POST"])
def predict_route():
    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({"error": "No JSON body received"}), 400

        result = predict(data)
        return jsonify(result)

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/insights", methods=["GET"])
def insights():
    """Return aggregated statistics from the training dataset."""
    try:
        df = pd.read_csv(DATA_PATH)

        # Avg yield by crop
        by_crop = (
            df.groupby("Crop")["Yield_kg_ha"]
            .agg(["mean", "min", "max", "count"])
            .reset_index()
            .rename(columns={"mean": "avg_yield", "min": "min_yield",
                              "max": "max_yield", "count": "samples"})
            .round(1)
        )

        # Avg yield by state
        by_state = (
            df.groupby("State")["Yield_kg_ha"]
            .mean()
            .reset_index()
            .rename(columns={"Yield_kg_ha": "avg_yield"})
            .round(1)
        )

        # Avg yield by season
        by_season = (
            df.groupby("Season")["Yield_kg_ha"]
            .mean()
            .reset_index()
            .rename(columns={"Yield_kg_ha": "avg_yield"})
            .round(1)
        )

        # Yield vs rainfall bins
        df["Rainfall_bin"] = pd.cut(
            df["Rainfall_mm"],
            bins=[0, 400, 800, 1200, 1600, 2000, 3000],
            labels=["<400", "400-800", "800-1200", "1200-1600", "1600-2000", ">2000"]
        )
        rainfall_yield = (
            df.groupby("Rainfall_bin", observed=True)["Yield_kg_ha"]
            .mean()
            .reset_index()
            .rename(columns={"Rainfall_bin": "rainfall_range", "Yield_kg_ha": "avg_yield"})
            .round(1)
        )

        # Soil-wise
        by_soil = (
            df.groupby("Soil_Type")["Yield_kg_ha"]
            .mean()
            .reset_index()
            .rename(columns={"Yield_kg_ha": "avg_yield"})
            .round(1)
        )

        return jsonify({
            "by_crop":     by_crop.to_dict("records"),
            "by_state":    by_state.to_dict("records"),
            "by_season":   by_season.to_dict("records"),
            "by_soil":     by_soil.to_dict("records"),
            "rainfall_yield": rainfall_yield.to_dict("records"),
            "total_samples":  int(len(df)),
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8765))
    app.run(debug=True, port=port)
