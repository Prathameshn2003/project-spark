import pandas as pd
import numpy as np
import pickle
import os

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestClassifier
from sklearn.neighbors import KNeighborsClassifier
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score

# ------------------------------
# Load Dataset
# ------------------------------
df = pd.read_csv("PCOS_data_Yes_No.csv")
df.columns = df.columns.str.strip()

print("✅ Dataset Loaded Successfully")
print("Dataset Shape:", df.shape)

# ------------------------------
# Features and Target
# ------------------------------
FEATURES = [
    'Age (yrs)',
    'Weight (Kg)',
    'BMI',
    'Cycle(R/I)',
    'Cycle length(days)',
    'Weight gain(Y/N)',
    'hair growth(Y/N)',
    'Skin darkening (Y/N)',
    'Hair loss(Y/N)',
    'Pimples(Y/N)',
    'Fast food (Y/N)',
    'Reg.Exercise(Y/N)',
    'Follicle No. (L)',
    'Follicle No. (R)',
    'Endometrium (mm)'
]

TARGET = "PCOS (Y/N)"

X = df[FEATURES].copy()
y = df[TARGET].copy()

# ------------------------------
# Handle Missing Values
# ------------------------------
for col in X.columns:
    if X[col].dtype == "object":
        X[col] = X[col].fillna("No")
    else:
        X[col] = X[col].fillna(X[col].median())

y = y.fillna("No")

# ------------------------------
# Encode Yes/No Columns
# ------------------------------
encoder = LabelEncoder()

for col in X.columns:
    if X[col].dtype == "object":
        X[col] = encoder.fit_transform(X[col])

y = encoder.fit_transform(y)

# ------------------------------
# Clip Values (Avoid Outliers)
# ------------------------------
X['Age (yrs)'] = X['Age (yrs)'].clip(15, 50)
X['BMI'] = X['BMI'].clip(15, 45)
X['Cycle length(days)'] = X['Cycle length(days)'].clip(15, 90)
X['Follicle No. (L)'] = X['Follicle No. (L)'].clip(0, 30)
X['Follicle No. (R)'] = X['Follicle No. (R)'].clip(0, 30)
X['Endometrium (mm)'] = X['Endometrium (mm)'].clip(1, 20)

# ------------------------------
# IMPUTER (Fix NaN properly)
# ------------------------------
imputer = SimpleImputer(strategy="median")
X_imputed = imputer.fit_transform(X)

# ------------------------------
# Scaling
# ------------------------------
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X_imputed)

# ------------------------------
# Train Test Split
# ------------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

# ------------------------------
# Random Forest Model
# ------------------------------
rf_model = RandomForestClassifier(
    n_estimators=500,
    max_depth=15,
    min_samples_split=4,
    random_state=42
)
rf_model.fit(X_train, y_train)

# ------------------------------
# XGBoost Model
# ------------------------------
xgb_model = XGBClassifier(
    n_estimators=400,
    learning_rate=0.03,
    max_depth=6,
    subsample=0.9,
    colsample_bytree=0.9,
    eval_metric="logloss"
)
xgb_model.fit(X_train, y_train)

# ------------------------------
# KNN Model
# ------------------------------
knn_model = KNeighborsClassifier(n_neighbors=7)
knn_model.fit(X_train, y_train)

# ------------------------------
# Accuracy Check
# ------------------------------
rf_acc = accuracy_score(y_test, rf_model.predict(X_test))
xgb_acc = accuracy_score(y_test, xgb_model.predict(X_test))
knn_acc = accuracy_score(y_test, knn_model.predict(X_test))

print("\n📌 Random Forest Accuracy:", rf_acc)
print("📌 XGBoost Accuracy:", xgb_acc)
print("📌 KNN Accuracy:", knn_acc)

# ------------------------------
# Save Models
# ------------------------------
os.makedirs("models", exist_ok=True)

pickle.dump(rf_model, open("models/rf_model.pkl", "wb"))
pickle.dump(xgb_model, open("models/xgb_model.pkl", "wb"))
pickle.dump(knn_model, open("models/knn_model.pkl", "wb"))
pickle.dump(scaler, open("models/scaler.pkl", "wb"))
pickle.dump(imputer, open("models/imputer.pkl", "wb"))

# Save train data for recommendation
pickle.dump(X_train, open("models/X_train.pkl", "wb"))
pickle.dump(y_train, open("models/y_train.pkl", "wb"))

print("\n✅ Models Saved Successfully in models/ folder")
