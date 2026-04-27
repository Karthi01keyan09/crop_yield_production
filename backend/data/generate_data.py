"""
Generate synthetic crop yield dataset based on Indian agriculture patterns.
Run this script once to create crop_data.csv
"""
import pandas as pd
import numpy as np

np.random.seed(42)
N = 5000

CROPS = [
    "Rice", "Wheat", "Maize", "Cotton", "Sugarcane",
    "Soybean", "Groundnut", "Mustard", "Barley", "Jowar"
]

SOIL_TYPES = ["Alluvial", "Black", "Red", "Laterite", "Sandy", "Loamy", "Clay"]

STATES = [
    "Punjab", "Haryana", "Uttar Pradesh", "Maharashtra", "Tamil Nadu",
    "Andhra Pradesh", "Karnataka", "West Bengal", "Madhya Pradesh", "Rajasthan"
]

SEASONS = ["Kharif", "Rabi", "Zaid"]

FERTILIZERS = ["Urea", "DAP", "NPK", "Potash", "Organic", "Compost"]

# Crop-specific parameter ranges (rainfall mm, temp C, yield kg/ha)
CROP_PARAMS = {
    "Rice":      {"rainfall": (900, 2000),  "temp": (22, 35), "yield": (1800, 5000)},
    "Wheat":     {"rainfall": (250, 750),   "temp": (10, 24), "yield": (2000, 5500)},
    "Maize":     {"rainfall": (500, 1200),  "temp": (18, 32), "yield": (1500, 6000)},
    "Cotton":    {"rainfall": (500, 1200),  "temp": (22, 38), "yield": (300, 900)},
    "Sugarcane": {"rainfall": (1000, 2500), "temp": (24, 38), "yield": (50000, 120000)},
    "Soybean":   {"rainfall": (600, 1200),  "temp": (20, 30), "yield": (800, 2500)},
    "Groundnut": {"rainfall": (400, 900),   "temp": (22, 36), "yield": (800, 2500)},
    "Mustard":   {"rainfall": (200, 600),   "temp": (10, 24), "yield": (700, 2000)},
    "Barley":    {"rainfall": (200, 700),   "temp": (8, 22),  "yield": (1500, 4000)},
    "Jowar":     {"rainfall": (300, 900),   "temp": (22, 35), "yield": (800, 2500)},
}

rows = []
for _ in range(N):
    crop = np.random.choice(CROPS)
    params = CROP_PARAMS[crop]

    rainfall   = np.random.uniform(*params["rainfall"])
    temp       = np.random.uniform(*params["temp"])
    soil       = np.random.choice(SOIL_TYPES)
    state      = np.random.choice(STATES)
    season     = np.random.choice(SEASONS)
    humidity   = np.random.uniform(40, 95)
    ph         = np.random.uniform(5.5, 8.5)
    area_ha    = np.random.uniform(0.5, 20)
    fertilizer = np.random.choice(FERTILIZERS)
    irrigation = np.random.choice(["Drip", "Sprinkler", "Flood", "Rain-fed"])
    n_kg       = np.random.uniform(20, 150)
    p_kg       = np.random.uniform(10, 80)
    k_kg       = np.random.uniform(10, 80)

    # Yield influenced by conditions
    base_yield = np.random.uniform(*params["yield"])
    if 600 <= rainfall <= 1400:
        base_yield *= 1.05
    if ph >= 6.0 and ph <= 7.5:
        base_yield *= 1.05
    if fertilizer in ["NPK", "DAP"]:
        base_yield *= 1.08
    if irrigation == "Drip":
        base_yield *= 1.10
    noise = np.random.normal(0, base_yield * 0.05)
    yield_kg = max(0, base_yield + noise)

    rows.append({
        "State": state,
        "Season": season,
        "Soil_Type": soil,
        "Crop": crop,
        "Rainfall_mm": round(rainfall, 1),
        "Temperature_C": round(temp, 1),
        "Humidity_pct": round(humidity, 1),
        "pH": round(ph, 2),
        "Area_ha": round(area_ha, 2),
        "N_kg_ha": round(n_kg, 1),
        "P_kg_ha": round(p_kg, 1),
        "K_kg_ha": round(k_kg, 1),
        "Fertilizer": fertilizer,
        "Irrigation": irrigation,
        "Yield_kg_ha": round(yield_kg, 1),
    })

df = pd.DataFrame(rows)
df.to_csv("crop_data.csv", index=False)
print(f"Generated {len(df)} rows -> crop_data.csv")
print(df.describe())
