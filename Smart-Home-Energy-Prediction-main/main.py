import os
import sys
from pathlib import Path
from datetime import datetime

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from pymongo import MongoClient
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score, mean_absolute_error

BASE = Path(__file__).resolve().parent
CSV = BASE / "data" / "energydata_complete.csv"
DB_NAME = "smart_home_energy_db"
READINGS_COLLECTION = "energy_readings"
HISTORY_COLLECTION = "prediction_history"

FEATURE_COLUMNS = [
    "lights_wh",
    "kitchen_temp_c",
    "kitchen_humidity",
    "living_room_temp_c",
    "living_room_humidity",
    "outside_temp_c",
    "outside_humidity"
]


def get_data():
    if not CSV.exists():
        print(f"Dataset missing at {CSV}. Please make sure energydata_complete.csv exists.")
        sys.exit(1)
    return pd.read_csv(CSV)


def get_db():
    load_dotenv(BASE / ".env", override=True)
    uri = os.getenv("MONGODB_URI") or os.getenv("MONGO_URI")
    if not uri:
        print("MONGODB_URI missing in .env")
        sys.exit(1)
    try:
        client = MongoClient(uri, serverSelectionTimeoutMS=10000)
        client.admin.command("ping")
        print("MongoDB connection successful.")
        return client, client[DB_NAME]
    except Exception as error:
        print("MongoDB connection failed:", error)
        sys.exit(1)


def seed_database(db, df):
    col = db[READINGS_COLLECTION]
    if col.count_documents({}) == 0:
        records = []
        for _, row in df.iterrows():
            records.append({
                "timestamp": str(row["date"]),
                "appliances_wh": int(row["Appliances"]),
                "lights_wh": int(row["lights"]),
                "kitchen_temp_c": float(row["T1"]),
                "kitchen_humidity": float(row["RH_1"]),
                "living_room_temp_c": float(row["T2"]),
                "living_room_humidity": float(row["RH_2"]),
                "outside_temp_c": float(row["T_out"]),
                "outside_humidity": float(row["RH_out"])
            })
        col.insert_many(records)
        print(f"Inserted {len(records)} records into MongoDB collection '{READINGS_COLLECTION}'.")
    else:
        print(f"MongoDB collection '{READINGS_COLLECTION}' already contains {col.count_documents({})} records.")


def main():
    print("=" * 60)
    print("SMART HOME ENERGY PREDICTION (COLLEGE EVALUATION RUN)")
    print("=" * 60)

    df_csv = get_data()
    print("Total CSV records:", len(df_csv))
    print("Columns (9 relevant):", list(df_csv.columns))

    client, db = get_db()
    try:
        seed_database(db, df_csv)

        # Retrieve records from MongoDB
        records = list(db[READINGS_COLLECTION].find({}, {"_id": 0}))
        df = pd.DataFrame(records)

        X = df[FEATURE_COLUMNS]
        y = df["appliances_wh"]

        # 80-20 Train-Test Split (Chronological Order)
        split = int(len(df) * 0.8)
        X_train, X_test = X.iloc[:split], X.iloc[split:]
        y_train, y_test = y.iloc[:split], y.iloc[split:]

        # Single ML Model: Linear Regression
        model = LinearRegression()
        model.fit(X_train, y_train)

        predictions = model.predict(X_test)
        r2 = round(r2_score(y_test, predictions), 4)
        mae = round(mean_absolute_error(y_test, predictions), 4)

        # Documented threshold quantiles
        low_threshold = float(round(y_train.quantile(0.33), 1))
        high_threshold = float(round(y_train.quantile(0.66), 1))

        print("\n--- MODEL PERFORMANCE (ACTUAL EVALUATION) ---")
        print("Model: Linear Regression")
        print("Training Set Size:", len(X_train))
        print("Testing Set Size:", len(X_test))
        print("R² Score:", r2)
        print("Mean Absolute Error (MAE):", mae, "Wh")
        print("\n--- CONSUMPTION THRESHOLDS ---")
        print(f"Low Consumption: <= {low_threshold} Wh")
        print(f"Medium Consumption: {low_threshold} to {high_threshold} Wh")
        print(f"High Consumption: > {high_threshold} Wh")

        # Test single sample prediction & CRUD insert
        sample = X.iloc[[-1]]
        sample_pred = max(0.0, round(float(model.predict(sample)[0]), 2))
        status = "Low" if sample_pred <= low_threshold else ("Medium" if sample_pred <= high_threshold else "High")

        history_doc = {
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "inputs": sample.iloc[0].to_dict(),
            "predicted_energy_wh": sample_pred,
            "consumption_status": status,
            "recommendations": ["Shift high load appliances to off-peak hours if High."]
        }
        db[HISTORY_COLLECTION].insert_one(history_doc)
        print("\n--- SAMPLE PREDICTION & MONGODB INSERT ---")
        print("Sample Inputs:", sample.iloc[0].to_dict())
        print(f"Predicted Energy: {sample_pred} Wh ({status})")
        print("Successfully stored prediction record in MongoDB 'prediction_history'.")
        print("Total prediction history count:", db[HISTORY_COLLECTION].count_documents({}))

        print("\n" + "=" * 60)
        print("PROJECT READY. Run 'python app.py' to launch the web dashboard.")
        print("=" * 60)

    finally:
        client.close()


if __name__ == "__main__":
    main()
