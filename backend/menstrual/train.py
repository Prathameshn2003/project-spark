import pandas as pd
import numpy as np
import os
import pickle

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.utils.class_weight import compute_class_weight
from sklearn.metrics import classification_report, accuracy_score
from sklearn.neighbors import KNeighborsClassifier

from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping

# -------------------------
# Load Dataset
# -------------------------
df = pd.read_csv("Menstrual_Cycle(3).csv")

# -------------------------
# Encode Categorical
# -------------------------
df["Stress_Level"] = df["Stress_Level"].map({"Low":0,"Medium":1,"High":2})
df["PCOS"] = df["PCOS"].map({"No":0,"Yes":1})
df["Thyroid"] = df["Thyroid"].map({"No":0,"Yes":1})
df["Flow_Type"] = df["Flow_Type"].map({"Light":0,"Medium":1,"Heavy":2})
df["Pimples"] = df["Pimples"].map({"No":0,"Yes":1})
df["Cramps_Severity"] = df["Cramps_Severity"].map({"Low":0,"Medium":1,"High":2})

# -------------------------
# Feature Engineering
# -------------------------
df["Cycle_Mean"] = df[[
    "Previous_Cycle_Length_1",
    "Previous_Cycle_Length_2",
    "Previous_Cycle_Length_3"
]].mean(axis=1)

df["Cycle_Variation"] = df[[
    "Previous_Cycle_Length_1",
    "Previous_Cycle_Length_2",
    "Previous_Cycle_Length_3"
]].max(axis=1) - df[[
    "Previous_Cycle_Length_1",
    "Previous_Cycle_Length_2",
    "Previous_Cycle_Length_3"
]].min(axis=1)

# -------------------------
# Create Target (Medical Logic)
# -------------------------
def create_target(row):
    score = 0
    
    if row["PCOS"] == 1: score += 3
    if row["Thyroid"] == 1: score += 2
    if row["BMI"] < 18.5 or row["BMI"] > 30: score += 2
    if row["Period_Duration"] < 3 or row["Period_Duration"] > 7: score += 1
    if row["Stress_Level"] == 2: score += 1
    if row["Sleep_Hours"] < 6: score += 1
    if row["Cycle_Variation"] > 7: score += 3
    if row["Cycle_Mean"] < 24 or row["Cycle_Mean"] > 35: score += 2
    
    return 1 if score >= 4 else 0

df["Regularity_Label"] = df.apply(create_target, axis=1)

# -------------------------
# Features
# -------------------------
features = [
    "Age","BMI","Period_Duration",
    "Stress_Level","Sleep_Hours",
    "PCOS","Thyroid","Flow_Type",
    "Cramps_Severity","Pimples",
    "Previous_Cycle_Length_1",
    "Previous_Cycle_Length_2",
    "Previous_Cycle_Length_3",
    "Cycle_Mean","Cycle_Variation"
]

X = df[features].values
y = df["Regularity_Label"].values

# -------------------------
# Scaling
# -------------------------
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# -------------------------
# Train Test Split
# -------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2, random_state=42, stratify=y
)

# -------------------------
# LSTM Model
# -------------------------
X_train_lstm = X_train.reshape((X_train.shape[0],1,X_train.shape[1]))
X_test_lstm = X_test.reshape((X_test.shape[0],1,X_test.shape[1]))

model = Sequential([
    LSTM(128, return_sequences=True, input_shape=(1,X_train.shape[1])),
    Dropout(0.4),
    LSTM(64),
    Dense(32, activation="relu"),
    Dense(1, activation="sigmoid")
])

model.compile(
    optimizer="adam",
    loss="binary_crossentropy",
    metrics=["accuracy"]
)

early = EarlyStopping(monitor="val_accuracy", patience=15, restore_best_weights=True)

model.fit(
    X_train_lstm, y_train,
    epochs=120,
    batch_size=16,
    validation_data=(X_test_lstm, y_test),
    callbacks=[early],
    verbose=1
)

loss, acc = model.evaluate(X_test_lstm, y_test)
print("LSTM Accuracy:", round(acc*100,2), "%")

# -------------------------
# KNN for Severity
# -------------------------
knn = KNeighborsClassifier(n_neighbors=5)
knn.fit(X_train, y_train)

print("KNN Accuracy:", round(
    accuracy_score(y_test, knn.predict(X_test))*100,2), "%")

# -------------------------
# Save
# -------------------------
os.makedirs("models", exist_ok=True)

model.save("models/lstm_model.h5")
pickle.dump(scaler, open("models/scaler.pkl","wb"))
pickle.dump(knn, open("models/knn_model.pkl","wb"))

print("Training Completed Successfully")