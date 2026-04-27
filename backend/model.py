"""
ML Models for Crop Yield Prediction
- Random Forest  → Yield regression
- XGBoost        → Best crop classification
"""
import os, joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, accuracy_score

# Try XGBoost; fall back gracefully
try:
    from xgboost import XGBClassifier
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False
    print("XGBoost not available – using Random Forest classifier instead.")

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "crop_data.csv")

os.makedirs(MODEL_DIR, exist_ok=True)

# ── Encoders ────────────────────────────────────────────────────────────────
CATEGORICAL_COLS  = ["State", "Season", "Soil_Type", "Fertilizer", "Irrigation"]
YIELD_FEATURES    = ["Rainfall_mm", "Temperature_C", "Humidity_pct", "pH",
                     "Area_ha", "N_kg_ha", "P_kg_ha", "K_kg_ha",
                     "State_enc", "Season_enc", "Soil_Type_enc",
                     "Fertilizer_enc", "Irrigation_enc"]
CROP_FEATURES     = ["Rainfall_mm", "Temperature_C", "Humidity_pct", "pH",
                     "N_kg_ha", "P_kg_ha", "K_kg_ha",
                     "State_enc", "Season_enc", "Soil_Type_enc"]

label_encoders: dict[str, LabelEncoder] = {}
scaler         = StandardScaler()
crop_encoder   = LabelEncoder()


# ── Training ─────────────────────────────────────────────────────────────────
def train(save: bool = True):
    df = pd.read_csv(DATA_PATH)

    # Encode categoricals
    for col in CATEGORICAL_COLS:
        le = LabelEncoder()
        df[f"{col}_enc"] = le.fit_transform(df[col].astype(str))
        label_encoders[col] = le

    # ── Yield Regression (Random Forest) ─────────────────────────────────
    X_y = df[YIELD_FEATURES]
    y_y = df["Yield_kg_ha"]
    Xtr, Xte, ytr, yte = train_test_split(X_y, y_y, test_size=0.2, random_state=42)
    rf_yield = RandomForestRegressor(n_estimators=120, max_depth=12,
                                     random_state=42, n_jobs=-1)
    rf_yield.fit(Xtr, ytr)
    mae = mean_absolute_error(yte, rf_yield.predict(Xte))
    print(f"Yield RF MAE: {mae:.1f} kg/ha")

    # ── Crop Classification (XGBoost / RF) ──────────────────────────────
    X_c = df[CROP_FEATURES]
    y_c = crop_encoder.fit_transform(df["Crop"])
    Xtr2, Xte2, ytr2, yte2 = train_test_split(X_c, y_c, test_size=0.2, random_state=42)

    if XGBOOST_AVAILABLE:
        crop_model = XGBClassifier(n_estimators=150, max_depth=6,
                                   learning_rate=0.1, use_label_encoder=False,
                                   eval_metric="mlogloss", random_state=42,
                                   n_jobs=-1)
    else:
        crop_model = RandomForestClassifier(n_estimators=150, random_state=42, n_jobs=-1)

    crop_model.fit(Xtr2, ytr2)
    acc = accuracy_score(yte2, crop_model.predict(Xte2))
    print(f"Crop model accuracy: {acc*100:.1f}%")

    if save:
        joblib.dump(rf_yield,      os.path.join(MODEL_DIR, "yield_rf.pkl"))
        joblib.dump(crop_model,    os.path.join(MODEL_DIR, "crop_model.pkl"))
        joblib.dump(label_encoders,os.path.join(MODEL_DIR, "label_encoders.pkl"))
        joblib.dump(crop_encoder,  os.path.join(MODEL_DIR, "crop_encoder.pkl"))
        print("Models saved.")

    return rf_yield, crop_model


# ── Loading ──────────────────────────────────────────────────────────────────
def _load():
    global label_encoders, crop_encoder
    rf_yield   = joblib.load(os.path.join(MODEL_DIR, "yield_rf.pkl"))
    crop_model = joblib.load(os.path.join(MODEL_DIR, "crop_model.pkl"))
    label_encoders = joblib.load(os.path.join(MODEL_DIR, "label_encoders.pkl"))
    crop_encoder   = joblib.load(os.path.join(MODEL_DIR, "crop_encoder.pkl"))
    return rf_yield, crop_model


def get_models():
    try:
        return _load()
    except FileNotFoundError:
        print("Models not found – training now …")
        return train()


# ── Inference ────────────────────────────────────────────────────────────────
def encode_input(data: dict) -> pd.Series:
    """Encode a single input dict into model features."""
    row = {}
    # Raw numerics
    for k in ["Rainfall_mm", "Temperature_C", "Humidity_pct", "pH",
              "Area_ha", "N_kg_ha", "P_kg_ha", "K_kg_ha"]:
        row[k] = float(data.get(k, 0))

    # Categoricals – handle unseen with fallback to mode (index 0)
    for col in CATEGORICAL_COLS:
        le = label_encoders[col]
        val = str(data.get(col, le.classes_[0]))
        if val in le.classes_:
            row[f"{col}_enc"] = int(le.transform([val])[0])
        else:
            row[f"{col}_enc"] = 0
    return row


def predict(data: dict) -> dict:
    rf_yield, crop_model = get_models()

    row = encode_input(data)

    # Yield prediction
    X_y = pd.DataFrame([[row[f] for f in YIELD_FEATURES]], columns=YIELD_FEATURES)
    yield_pred = float(rf_yield.predict(X_y)[0])

    # Crop recommendation (top-3)
    X_c = pd.DataFrame([[row[f] for f in CROP_FEATURES]], columns=CROP_FEATURES)
    probs = crop_model.predict_proba(X_c)[0]
    top3_idx   = np.argsort(probs)[::-1][:3]
    top3_crops = [
        {"crop": crop_encoder.classes_[i], "confidence": round(float(probs[i]) * 100, 1)}
        for i in top3_idx
    ]

    best_crop = top3_crops[0]["crop"]

    # ── Fertilizer Recommendation ─────────────────────────────────────────
    recommendations = build_recommendations(data, best_crop, yield_pred)

    return {
        "yield_kg_ha":      round(yield_pred, 1),
        "yield_tonnes_ha":  round(yield_pred / 1000, 2),
        "best_crop":        best_crop,
        "top_crops":        top3_crops,
        "recommendations":  recommendations,
    }


# ── Recommendation Engine ────────────────────────────────────────────────────
CROP_WATER_NEEDS = {
    "Rice": "High (1200–2000 mm/season)",  "Wheat": "Moderate (450–650 mm/season)",
    "Maize": "Moderate (500–800 mm/season)", "Cotton": "Moderate (700–1200 mm/season)",
    "Sugarcane": "High (1500–2500 mm/season)", "Soybean": "Moderate (600–1000 mm/season)",
    "Groundnut": "Low–Moderate (500–700 mm/season)", "Mustard": "Low (200–400 mm/season)",
    "Barley": "Low (250–450 mm/season)", "Jowar": "Low (300–500 mm/season)",
}

CROP_FERT_BASE = {
    "Rice":      (120, 60, 60), "Wheat":     (100, 50, 40),
    "Maize":     (120, 60, 40), "Cotton":    (100, 50, 50),
    "Sugarcane": (250,100, 80), "Soybean":   ( 30, 60, 40),
    "Groundnut": ( 25, 50, 75), "Mustard":   ( 80, 40, 40),
    "Barley":    ( 60, 30, 30), "Jowar":     ( 80, 40, 40),
}

def build_recommendations(data: dict, best_crop: str, yield_kg: float) -> dict:
    rainfall   = float(data.get("Rainfall_mm", 800))
    temp       = float(data.get("Temperature_C", 25))
    ph         = float(data.get("pH", 7.0))
    n_in       = float(data.get("N_kg_ha", 60))
    p_in       = float(data.get("P_kg_ha", 40))
    k_in       = float(data.get("K_kg_ha", 40))
    irrigation = str(data.get("Irrigation", "Rain-fed"))

    base_n, base_p, base_k = CROP_FERT_BASE.get(best_crop, (80, 40, 40))

    # Adjust for pH
    if ph < 6.0:
        lime_tip = "Apply lime (2–3 t/ha) to raise soil pH before sowing."
    elif ph > 7.8:
        lime_tip = "Apply gypsum or sulfur to lower soil pH for better nutrient uptake."
    else:
        lime_tip = "Soil pH is optimal – no pH amendment needed."

    # Fertilizer deficit
    def fert_tip(nutrient, applied, required):
        deficit = required - applied
        if deficit > 10:
            return f"Apply additional {deficit:.0f} kg/ha of {nutrient}."
        elif deficit < -10:
            return f"Reduce {nutrient} by {-deficit:.0f} kg/ha to avoid toxicity."
        return f"{nutrient} level is adequate."

    # Irrigation plan
    water_need = CROP_WATER_NEEDS.get(best_crop, "Moderate")
    if rainfall < 500 and irrigation == "Rain-fed":
        irr_plan = "⚠️ Insufficient rainfall. Switch to drip or sprinkler irrigation immediately."
    elif irrigation == "Drip":
        irr_plan = f"Drip irrigation is optimal for {best_crop}. Schedule 2–3 irrigations/week."
    elif irrigation == "Flood":
        irr_plan = f"Flood irrigation is suitable for {best_crop} but conserve water with scheduled intervals."
    else:
        irr_plan = f"Monitor soil moisture. Irrigate when soil moisture drops below 50% field capacity."

    # Sowing window tip
    if temp < 15:
        season_tip = "Temperature is low – consider waiting for warmer conditions or use protected cultivation."
    elif temp > 38:
        season_tip = "High temperature stress likely – use heat-tolerant varieties and mulching."
    else:
        season_tip = f"Temperature is ideal for {best_crop} cultivation."

    return {
        "fertilizer": {
            "N": {"applied": n_in, "recommended": base_n, "tip": fert_tip("Nitrogen (N)", n_in, base_n)},
            "P": {"applied": p_in, "recommended": base_p, "tip": fert_tip("Phosphorus (P)", p_in, base_p)},
            "K": {"applied": k_in, "recommended": base_k, "tip": fert_tip("Potassium (K)", k_in, base_k)},
            "lime_tip": lime_tip,
        },
        "irrigation": {
            "plan": irr_plan,
            "water_requirement": water_need,
            "method": irrigation,
        },
        "agronomy": {
            "season_tip":   season_tip,
            "temperature":  temp,
            "rainfall":     rainfall,
        },
    }


if __name__ == "__main__":
    train()
