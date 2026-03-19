import pandas as pd
import pickle
import os

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import accuracy_score

os.makedirs("models", exist_ok=True)

# -----------------------------
# LOAD DATASET
# -----------------------------
df = pd.read_csv("menopause_dataset.csv")

# Encode Yes/No → 0/1
yes_no_cols = [
    "Irregular_Periods", "Missed_Periods", "Hot_Flashes",
    "Night_Sweats", "Sleep_Problems",
    "Vaginal_Dryness", "Joint_Pain"
]

for col in yes_no_cols:
    df[col] = df[col].map({"Yes": 1, "No": 0})

# -----------------------------
# SAME RULE-BASED LABELING (UNCHANGED)
# -----------------------------
def assign_stage(row):
    if row["Years_Since_Last_Period"] >= 1:
        return "Post-Menopause"
    elif row["Age"] >= 40 and (
        row["Irregular_Periods"] == 1 or
        row["Missed_Periods"] == 1 or
        row["Hot_Flashes"] == 1
    ):
        return "Peri-Menopause"
    else:
        return "Pre-Menopause"

df["Menopause_Stage"] = df.apply(assign_stage, axis=1)

# -----------------------------
# FEATURES (ORDER IS FIXED)
# -----------------------------
features = [
    "Age",
    "Estrogen_Level",
    "FSH_Level",
    "Years_Since_Last_Period",
    "Irregular_Periods",
    "Missed_Periods",
    "Hot_Flashes",
    "Night_Sweats",
    "Sleep_Problems",
    "Vaginal_Dryness",
    "Joint_Pain"
]

X = df[features]
y = df["Menopause_Stage"]

# Encode labels
le = LabelEncoder()
y_encoded = le.fit_transform(y)

# Scaling (SAME scaler for both models)
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y_encoded,
    test_size=0.2,
    random_state=42,
    stratify=y_encoded
)

# -----------------------------
# RANDOM FOREST → PREDICTION
# -----------------------------
rf = RandomForestClassifier(n_estimators=300, random_state=42)
rf.fit(X_train, y_train)

# -----------------------------
# KNN → RECOMMENDATION ONLY
# -----------------------------
knn = KNeighborsClassifier(n_neighbors=5)
knn.fit(X_train, y_train)

print("RF Accuracy:", accuracy_score(y_test, rf.predict(X_test)))
print("KNN Accuracy (used only for recommendation):",
      accuracy_score(y_test, knn.predict(X_test)))

# Save models
pickle.dump(rf, open("models/rf_model.pkl", "wb"))
pickle.dump(knn, open("models/knn_model.pkl", "wb"))
pickle.dump(scaler, open("models/scaler.pkl", "wb"))
pickle.dump(le, open("models/label_encoder.pkl", "wb"))

print("✅ RF (prediction) + KNN (recommendation) models saved")
