"""
Unified FastAPI Backend — NaariCare ML API v3.0
Handles: PCOS + Menopause + Menstrual Cycle predictions
With full recommendation logic from all 3 original app.py files

Folder structure expected:
  app.py
  pcos_models/
      rf_model.pkl
      xgb_model.pkl
      knn_model.pkl
      scaler.pkl
      imputer.pkl
  menopause_models/
      rf_model.pkl
      knn_model.pkl
      scaler.pkl
      label_encoder.pkl
  menstrual_models/
      lstm_model.h5
      knn_model.pkl
      scaler.pkl

Run:
  python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import numpy as np
import pickle
import os
from datetime import datetime, timedelta

app = FastAPI(title="NaariCare ML API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═════════════════════════════════════════════
# LOAD ALL MODELS
# ═════════════════════════════════════════════

# ── PCOS Models ───────────────────────────────
PCOS_DIR = "pcos_models"
try:
    pcos_rf      = pickle.load(open(os.path.join(PCOS_DIR, "rf_model.pkl"),  "rb"))
    pcos_xgb     = pickle.load(open(os.path.join(PCOS_DIR, "xgb_model.pkl"), "rb"))
    pcos_knn     = pickle.load(open(os.path.join(PCOS_DIR, "knn_model.pkl"), "rb"))
    pcos_scaler  = pickle.load(open(os.path.join(PCOS_DIR, "scaler.pkl"),    "rb"))
    pcos_imputer = pickle.load(open(os.path.join(PCOS_DIR, "imputer.pkl"),   "rb"))
    PCOS_LOADED  = True
    print("✅ PCOS models loaded")
except Exception as e:
    PCOS_LOADED = False
    print(f"⚠️  PCOS models not loaded: {e}")

# ── Menopause Models ──────────────────────────
MENO_DIR = "menopause_models"
try:
    meno_rf      = pickle.load(open(os.path.join(MENO_DIR, "rf_model.pkl"),      "rb"))
    meno_knn     = pickle.load(open(os.path.join(MENO_DIR, "knn_model.pkl"),     "rb"))
    meno_scaler  = pickle.load(open(os.path.join(MENO_DIR, "scaler.pkl"),        "rb"))
    meno_encoder = pickle.load(open(os.path.join(MENO_DIR, "label_encoder.pkl"), "rb"))
    MENO_LOADED  = True
    print("✅ Menopause models loaded")
except Exception as e:
    MENO_LOADED = False
    print(f"⚠️  Menopause models not loaded: {e}")

# ── Menstrual Models ──────────────────────────
MENS_DIR    = "menstrual_models"
LSTM_LOADED = False
MENS_LOADED = False
try:
    mens_knn    = pickle.load(open(os.path.join(MENS_DIR, "knn_model.pkl"), "rb"))
    mens_scaler = pickle.load(open(os.path.join(MENS_DIR, "scaler.pkl"),    "rb"))
    MENS_LOADED = True
    try:
        from tensorflow.keras.models import load_model
        mens_lstm   = load_model(os.path.join(MENS_DIR, "lstm_model.h5"))
        LSTM_LOADED = True
        print("✅ Menstrual LSTM loaded")
    except Exception as e:
        print(f"⚠️  LSTM not loaded: {e}")
    print("✅ Menstrual KNN + scaler loaded")
except Exception as e:
    print(f"⚠️  Menstrual models not loaded: {e}")


# ═════════════════════════════════════════════
# HEALTH CHECK
# ═════════════════════════════════════════════
@app.get("/health")
def health():
    return {
        "status":           "ok",
        "pcos_loaded":      PCOS_LOADED,
        "menopause_loaded": MENO_LOADED,
        "menstrual_loaded": MENS_LOADED,
        "lstm_loaded":      LSTM_LOADED,
    }


# ═════════════════════════════════════════════════════════════════
# PCOS — RECOMMENDATION LOGIC (from original pcos/app.py)
# ═════════════════════════════════════════════════════════════════
def classify_pcos_severity(risk: int) -> str:
    if 30 <= risk < 50:
        return "low"
    elif 50 <= risk < 70:
        return "medium"
    else:
        return "high"


def pcos_recommendation(severity: str) -> dict:
    """
    Full recommendation logic from original PCOS app.py
    severity: "none" | "low" | "medium" | "high"
    """
    if severity == "none":
        return {
            "diet": [
                "Maintain balanced diet with whole grains",
                "Include fresh fruits and vegetables",
                "Stay hydrated with 2-3 liters water daily",
                "Include lean protein sources",
                "Limit caffeine and packaged food",
            ],
            "exercise": [
                "Continue regular physical activity",
                "30 minutes of moderate exercise daily",
                "Mix of cardio and strength training",
            ],
            "lifestyle": [
                "Maintain healthy sleep schedule",
                "Regular health check-ups annually",
                "Stress management practices",
            ],
            "needsDoctor": False,
        }

    elif severity == "low":
        return {
            "diet": [
                "Low glycemic index foods (millets, oats, brown rice)",
                "Fresh vegetables (spinach, broccoli, carrot, cucumber)",
                "Fruits in moderation (apple, berries, guava)",
                "Lean protein sources (dal, paneer, eggs, fish)",
                "Healthy fats (nuts, seeds, olive oil)",
                "Drink 2–3 liters of water daily",
                "Limit caffeine and packaged food",
            ],
            "exercise": [
                "Brisk walking – 30 minutes daily",
                "Yoga (Surya Namaskar, Anulom Vilom)",
                "Light stretching exercises",
                "Basic home workouts",
                "Minimum 5 days per week",
            ],
            "lifestyle": [
                "Sleep 7–8 hours daily",
                "Maintain regular sleep and wake time",
                "Reduce stress through meditation",
                "Avoid late-night meals",
                "Maintain a regular daily routine",
            ],
            "needsDoctor": False,
        }

    elif severity == "medium":
        return {
            "diet": [
                "Strict low-glycemic-index diet",
                "High-fiber foods (vegetables, salads, sprouts)",
                "Protein in every meal (eggs, pulses, fish)",
                "Small and frequent meals",
                "Anti-inflammatory foods (turmeric, berries, nuts)",
                "Completely avoid sugar, fast food, bakery items",
                "Reduce salt and oily food intake",
            ],
            "exercise": [
                "Cardio workouts (walking/jogging) – 30–40 minutes",
                "Strength training – 3 to 4 days per week",
                "Yoga for hormone balance",
                "Beginner-level HIIT exercises",
                "Pelvic floor strengthening exercises",
            ],
            "lifestyle": [
                "Fixed sleep and wake-up time",
                "Weight monitoring every week",
                "Reduce screen time",
                "Stress management is mandatory",
                "Track menstrual cycle regularly",
            ],
            "needsDoctor": True,
        }

    else:  # high
        return {
            "diet": [
                "Very strict low-glycemic-index diet",
                "High-fiber vegetables in every meal",
                "Lean protein with each meal",
                "Anti-inflammatory foods only",
                "Complete elimination of sugar, maida, fried food",
                "Avoid alcohol, soft drinks, and packaged foods",
                "Calorie-controlled meals under medical guidance",
            ],
            "exercise": [
                "HIIT workouts (doctor-approved)",
                "Resistance training for insulin sensitivity",
                "Cardio exercises – 45 to 60 minutes daily",
                "Daily yoga for hormonal balance",
                "Consistency is critical",
            ],
            "lifestyle": [
                "Strict daily routine",
                "Mental health care and counseling if needed",
                "Avoid crash dieting",
                "Track menstrual cycle and symptoms monthly",
                "Long-term lifestyle discipline required",
            ],
            "needsDoctor": True,
        }


# ═════════════════════════════════════════════════════════════════
# PCOS ENDPOINT
# ═════════════════════════════════════════════════════════════════
class PCOSRequest(BaseModel):
    age:             float
    weight:          float
    bmi:             float
    cycleRegular:    bool
    cycleLength:     float
    weightGain:      bool
    hairGrowth:      bool
    skinDarkening:   bool
    hairLoss:        bool
    pimples:         bool
    fastFood:        bool
    regularExercise: bool
    follicleLeft:    float
    follicleRight:   float
    endometrium:     float
    lh:              Optional[float] = 0
    fsh:             Optional[float] = 0
    testosterone:    Optional[float] = 0
    insulin:         Optional[float] = 0


@app.post("/pcos/predict")
def predict_pcos(r: PCOSRequest):
    if not PCOS_LOADED:
        return {"error": "PCOS models not loaded", "fallback": True}

    cycle_val = 1 if r.cycleRegular else 0

    input_data = np.array([[
        r.age, r.weight, r.bmi, cycle_val, r.cycleLength,
        int(r.weightGain), int(r.hairGrowth), int(r.skinDarkening),
        int(r.hairLoss), int(r.pimples), int(r.fastFood),
        int(r.regularExercise), r.follicleLeft, r.follicleRight, r.endometrium
    ]], dtype=np.float32)

    imputed  = pcos_imputer.transform(input_data)
    scaled   = pcos_scaler.transform(imputed)

    # ── ML Models (RF + XGB + KNN majority vote) ──────────────
    rf_pred  = int(pcos_rf.predict(scaled)[0])
    xgb_pred = int(pcos_xgb.predict(scaled)[0])
    knn_pred = int(pcos_knn.predict(scaled)[0])
    final_pred = 1 if (rf_pred + xgb_pred + knn_pred) >= 2 else 0

    # ── Medical Score Override (same as original app.py) ──────
    cycle_score      = 1 if cycle_val == 0 else 0
    hormonal_score   = int(r.hairGrowth) + int(r.skinDarkening) + int(r.hairLoss) + int(r.pimples)
    ultrasound_score = 1 if (r.follicleLeft + r.follicleRight) >= 10 else 0
    metabolic_score  = 1 if r.bmi >= 25 else 0
    total_score      = 2 * cycle_score + 2 * ultrasound_score + hormonal_score + metabolic_score

    if total_score >= 4:
        final_pred = 1

    has_pcos = bool(final_pred == 1)

    # ── Risk % and Severity ───────────────────────────────────
    if has_pcos:
        risk_pct = int((total_score / 9) * 100)
        risk_pct = max(30, min(100, risk_pct))
        severity = classify_pcos_severity(risk_pct)
    else:
        risk_pct = min(29, int((total_score / 9) * 100))
        severity = "none"

    rec = pcos_recommendation(severity)

    return {
        "fallback": False,
        "prediction": {
            "hasPCOS":        has_pcos,
            "riskPercentage": risk_pct,
            "severity":       severity,
            "breakdown": {
                "cycleScore":      cycle_score * 2,
                "hormonalScore":   hormonal_score,
                "ultrasoundScore": ultrasound_score * 2,
                "metabolicScore":  metabolic_score,
            },
            "recommendations": rec,
            "models_used": {
                "rf":  "PCOS" if rf_pred == 1 else "No PCOS",
                "xgb": "PCOS" if xgb_pred == 1 else "No PCOS",
                "knn": "PCOS" if knn_pred == 1 else "No PCOS",
            },
        }
    }


# ═════════════════════════════════════════════════════════════════
# MENOPAUSE — RECOMMENDATION LOGIC (from original menopause/app.py)
# ═════════════════════════════════════════════════════════════════
def menopause_recommendation(stage: str) -> dict:
    """
    Full recommendation logic from original Menopause app.py
    stage: "Pre-Menopause" | "Peri-Menopause" | "Post-Menopause"
    """
    if stage == "Pre-Menopause":
        return {
            "diet": [
                "Balanced diet rich in fruits and vegetables",
                "Calcium-rich foods (milk, curd, ragi)",
                "Adequate protein intake (dal, eggs, nuts)",
                "Limit processed and sugary foods",
                "Stay hydrated with 2–3 liters of water daily",
            ],
            "exercise": [
                "Brisk walking – 30 minutes daily",
                "Yoga and stretching exercises",
                "Light strength training 2–3 times per week",
                "Stress management techniques",
            ],
            "lifestyle": [
                "Regular health check-ups",
                "Stress management",
                "Quality sleep habits 7–8 hours daily",
                "Maintain a regular daily routine",
            ],
            "needsDoctor": False,
        }

    elif stage == "Peri-Menopause":
        return {
            "diet": [
                "Low-GI foods: oats, brown rice, whole wheat roti",
                "High-fiber foods (oats, whole grains, salads, sprouts, flax seeds)",
                "Phytoestrogen sources (soy, flax seeds)",
                "Protein sources: eggs, pulses, soy, paneer",
                "Iron and calcium-rich foods (milk, curd, ragi)",
                "Vitamin-D foods or supplements (doctor advice)",
                "Reduce caffeine, spicy foods and bakery items",
                "Stay well hydrated",
            ],
            "exercise": [
                "Brisk walking or cycling – 30 to 40 minutes daily",
                "Yoga: Anulom-Vilom, Bhramari, Surya Namaskar",
                "Moderate strength training – 2 to 3 days per week",
                "Breathing and relaxation exercises",
                "Light cardio (cycling, skipping)",
            ],
            "lifestyle": [
                "Fixed sleep and wake-up time",
                "Daily meditation or breathing exercises",
                "Stress management is very important",
                "Maintain healthy body weight",
                "Track symptoms monthly",
            ],
            "needsDoctor": True,
        }

    else:  # Post-Menopause
        return {
            "diet": [
                "High-calcium foods: milk, cheese, curd, sesame seeds",
                "Vitamin-D rich foods or supplements (sunlight exposure)",
                "High-protein diet: lentils, eggs, fish, tofu",
                "Anti-inflammatory foods: turmeric, berries, green tea, green vegetables",
                "Plenty of fruits and vegetables",
                "Avoid: Fried food, excess salt, sugary and processed foods",
            ],
            "exercise": [
                "Weight-bearing exercises: walking, stair climbing",
                "Light strength training (resistance bands, dumbbells)",
                "Balance exercises to prevent falls",
                "Stretching and flexibility exercises",
                "Low-impact cardio (swimming, cycling)",
            ],
            "lifestyle": [
                "Regular medical check-ups",
                "Bone density test (doctor advice)",
                "Avoid smoking and alcohol",
                "Maintain a stress-free routine",
                "Sleep 7–8 hours at fixed times",
            ],
            "needsDoctor": True,
        }


# ═════════════════════════════════════════════════════════════════
# MENOPAUSE ENDPOINT
# ═════════════════════════════════════════════════════════════════
class MenopauseRequest(BaseModel):
    age:                  float
    estrogenLevel:        float
    fshLevel:             float
    yearsSinceLastPeriod: float
    irregularPeriods:     bool
    missedPeriods:        bool
    hotFlashes:           bool
    nightSweats:          bool
    sleepProblems:        bool
    vaginalDryness:       bool
    jointPain:            bool


@app.post("/menopause/predict")
def predict_menopause(r: MenopauseRequest):
    if not MENO_LOADED:
        return {"error": "Menopause models not loaded", "fallback": True}

    features = np.array([[
        r.age, r.estrogenLevel, r.fshLevel, r.yearsSinceLastPeriod,
        int(r.irregularPeriods), int(r.missedPeriods), int(r.hotFlashes),
        int(r.nightSweats), int(r.sleepProblems), int(r.vaginalDryness), int(r.jointPain),
    ]], dtype=np.float32)

    scaled      = meno_scaler.transform(features)
    rf_pred_enc = int(meno_rf.predict(scaled)[0])
    stage       = meno_encoder.inverse_transform([rf_pred_enc])[0]

    # ── Normal health override (from original menopause/app.py) ──
    if (r.age < 40 and
        not r.irregularPeriods and
        not r.missedPeriods and
        not r.hotFlashes):
        stage = "Pre-Menopause"

    # ── Risk Scoring ──────────────────────────────────────────────
    age_s = 4 if r.age >= 55 else 3 if r.age >= 50 else 2 if r.age >= 45 else 1 if r.age >= 40 else 0

    hor_s = 0
    if r.fshLevel >= 40:         hor_s += 2
    elif r.fshLevel >= 25:       hor_s += 1
    if r.estrogenLevel <= 30:    hor_s += 2
    elif r.estrogenLevel <= 50:  hor_s += 1

    sym_s = sum([
        int(r.irregularPeriods), int(r.missedPeriods), int(r.hotFlashes),
        int(r.nightSweats), int(r.sleepProblems), int(r.vaginalDryness), int(r.jointPain)
    ])

    per_s = (
        4 if r.yearsSinceLastPeriod >= 2 else
        3 if r.yearsSinceLastPeriod >= 1 else
        2 if r.yearsSinceLastPeriod >= 0.5 else
        1 if r.yearsSinceLastPeriod > 0 else 0
    )

    risk_pct = min(100, max(0, round(((age_s + hor_s + sym_s + per_s) / 19) * 100)))

    # Pre-Menopause with normal health = 0% risk shown
    if stage == "Pre-Menopause" and r.age < 40:
        risk_pct = 0

    rec = menopause_recommendation(stage)

    return {
        "fallback": False,
        "prediction": {
            "stage":                stage,
            "riskPercentage":       risk_pct,
            "hasMenopauseSymptoms": stage != "Pre-Menopause",
            "breakdown": {
                "ageScore":     age_s,
                "hormoneScore": hor_s,
                "symptomScore": sym_s,
                "periodScore":  per_s,
            },
            "recommendations": rec,
        }
    }


# ═════════════════════════════════════════════════════════════════
# MENSTRUAL — RECOMMENDATION LOGIC (from original menstrual/app.py)
# ═════════════════════════════════════════════════════════════════
def menstrual_recommendation(result: str, severity: str) -> dict:
    """
    Full recommendation logic from original Menstrual app.py
    result:   "Regular" | "Irregular"
    severity: "Moderate" | "High"
    """
    if result == "Regular":
        return {
            "diet": [
                "Maintain balanced iron-rich diet",
                "Stay hydrated (2L+ water daily)",
                "Include leafy greens and fruits",
                "Adequate protein and calcium intake",
            ],
            "exercise": [
                "Continue regular activity",
                "30 min daily movement",
                "Mix cardio with strength training",
            ],
            "lifestyle": [
                "Maintain 7-8 hours sleep",
                "Keep stress managed",
                "Track your cycle monthly",
            ],
            "needsDoctor": False,
        }

    elif severity == "Moderate":
        return {
            "diet": [
                "Iron-rich foods (spinach, lentils, dates)",
                "Lean protein in every meal",
                "Reduce refined sugar & processed food",
                "Anti-inflammatory foods (turmeric, berries)",
                "Stay hydrated – 2–3 liters water daily",
            ],
            "exercise": [
                "30 min daily walking or yoga",
                "Light strength training 3x/week",
                "Gentle movement during period",
                "Avoid over-exercising",
            ],
            "lifestyle": [
                "Sleep 7–8 hours at fixed times",
                "Stress reduction (meditation, yoga)",
                "Track symptoms & cycle monthly",
                "Avoid caffeine & alcohol excess",
            ],
            "needsDoctor": True,
        }

    else:  # High severity
        return {
            "diet": [
                "Iron-rich foods (spinach, dates, jaggery)",
                "High protein diet (eggs, dal, fish, paneer)",
                "Anti-inflammatory foods only (turmeric, berries, nuts)",
                "Complete elimination of sugar and fried food",
                "Small and frequent meals",
                "Avoid alcohol, soft drinks, and packaged foods",
            ],
            "exercise": [
                "Gentle yoga daily (hormone balancing poses)",
                "30–45 minutes walking",
                "Light stretching during period",
                "Avoid HIIT until doctor clearance",
            ],
            "lifestyle": [
                "Sleep 7–8 hours at fixed times — mandatory",
                "Stress management is critical (meditation, therapy)",
                "Track symptoms & cycle monthly",
                "Consult gynecologist immediately",
                "Avoid crash dieting",
            ],
            "needsDoctor": True,
        }


# ═════════════════════════════════════════════════════════════════
# MENSTRUAL ENDPOINT
# ═════════════════════════════════════════════════════════════════
class MenstrualRequest(BaseModel):
    age:             float
    bmi:             float
    sleep:           float
    stress:          str
    pcos:            str
    thyroid:         str
    period_duration: float
    flow:            str
    cramps:          str
    pimples:         str
    prev1:           float
    prev2:           float
    prev3:           float
    last_period:     str


@app.post("/menstrual/predict")
def predict_menstrual(r: MenstrualRequest):
    if not MENS_LOADED:
        return {"error": "Menstrual models not loaded", "fallback": True}

    STRESS_MAP = {"Low": 0, "Medium": 1, "High": 2}
    FLOW_MAP   = {"Light": 0, "Medium": 1, "Heavy": 2}
    CRAMPS_MAP = {"Low": 0, "Medium": 1, "High": 2}
    BOOL_MAP   = {"No": 0, "Yes": 1}

    prev   = [r.prev1, r.prev2, r.prev3]
    mean_c = sum(prev) / 3
    var_c  = max(prev) - min(prev)

    features = np.array([[
        r.age, r.bmi, r.period_duration,
        STRESS_MAP.get(r.stress, 1), r.sleep,
        BOOL_MAP.get(r.pcos, 0), BOOL_MAP.get(r.thyroid, 0),
        FLOW_MAP.get(r.flow, 1), CRAMPS_MAP.get(r.cramps, 1),
        BOOL_MAP.get(r.pimples, 0),
        r.prev1, r.prev2, r.prev3, mean_c, var_c
    ]], dtype=np.float32)

    scaled   = mens_scaler.transform(features)
    knn_pred = int(mens_knn.predict(scaled)[0])

    # ── LSTM Primary Prediction ───────────────────────────────
    if LSTM_LOADED:
        X_lstm    = scaled.reshape(1, 1, scaled.shape[1])
        lstm_raw  = float(mens_lstm.predict(X_lstm, verbose=0)[0][0])
        lstm_pred = 1 if lstm_raw >= 0.5 else 0
    else:
        lstm_raw  = float(mens_knn.predict_proba(scaled)[0][1])
        lstm_pred = knn_pred

    ml_result = "Irregular" if lstm_pred == 1 else "Regular"

    # ── Medical Score (same as original menstrual/app.py) ─────
    score = 0
    if r.pcos    == "Yes":             score += 3
    if r.thyroid == "Yes":             score += 2
    if r.bmi < 18.5 or r.bmi > 30:    score += 2
    if r.period_duration > 10:         score += 3
    elif r.period_duration > 7:        score += 2
    elif r.period_duration < 3:        score += 2
    if var_c  > 7:                     score += 2
    if mean_c < 24 or mean_c > 35:    score += 2
    if r.sleep < 6:                    score += 1

    cycle_status = "Irregular" if score >= 3 else ml_result
    severity     = "High" if score >= 6 else "Moderate"

    # ── Next Period Date ──────────────────────────────────────
    pred_cycle = int(r.prev1 * 0.4 + r.prev2 * 0.3 + r.prev3 * 0.3)
    next_dt    = datetime.strptime(r.last_period, "%Y-%m-%d") + timedelta(days=pred_cycle)

    rec = menstrual_recommendation(cycle_status, severity)

    return {
        "cycle_status":     cycle_status,
        "ml_result":        ml_result,
        "severity":         severity,
        "medical_score":    score,
        "lstm_probability": round(lstm_raw, 4),
        "knn_label":        "Irregular" if knn_pred == 1 else "Regular",
        "predicted_cycle":  pred_cycle,
        "next_period_date": next_dt.strftime("%d %B %Y"),
        "mean_cycle":       round(mean_c, 1),
        "cycle_variation":  int(var_c),
        "recommendations":  rec,
    }