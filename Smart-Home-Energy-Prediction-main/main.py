import os
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from pymongo import MongoClient
from sklearn.ensemble import ExtraTreesRegressor, ExtraTreesClassifier
from sklearn.metrics import (
    r2_score, mean_absolute_error, accuracy_score,
    precision_score, recall_score, f1_score, confusion_matrix
)

BASE = Path(__file__).resolve().parent
CSV = BASE / "data" / "energydata_complete.csv"
URL = "https://raw.githubusercontent.com/LuisM78/Appliances-energy-prediction-data/master/energydata_complete.csv"
DB_NAME = "smart_home_energy"
COLLECTION = "energy_readings"


def get_data():
    if not CSV.exists():
        CSV.parent.mkdir(exist_ok=True)
        print("Downloading dataset...")
        try:
            pd.read_csv(URL).to_csv(CSV, index=False)
        except Exception as error:
            print("Download failed. Put energydata_complete.csv in the data folder.")
            print(error)
            sys.exit(1)
    return pd.read_csv(CSV)


def get_collection():
    load_dotenv(BASE / ".env", override=True)
    uri = os.getenv("MONGODB_URI")
    if not uri:
        print("MONGODB_URI missing in .env")
        sys.exit(1)
    try:
        client = MongoClient(uri, serverSelectionTimeoutMS=10000)
        client.admin.command("ping")
        print("MongoDB connection successful.")
        return client, client[DB_NAME][COLLECTION]
    except Exception as error:
        print("MongoDB connection failed:", error)
        sys.exit(1)


def save_data(collection, df):
    if collection.count_documents({}) == 0:
        records = df.copy()
        records["date"] = pd.to_datetime(records["date"]).dt.strftime("%Y-%m-%d %H:%M:%S")
        records = records.replace({np.nan: None}).to_dict("records")
        for i in range(0, len(records), 1000):
            collection.insert_many(records[i:i + 1000])
        print("Inserted", len(records), "records into MongoDB.")
    else:
        print("MongoDB already contains", collection.count_documents({}), "records.")


def main():
    print("=" * 55)
    print("SMART HOME ENERGY CONSUMPTION PREDICTION")
    print("=" * 55)

    df = get_data()
    print("Dataset records:", len(df))
    print("Missing values:", int(df.isnull().sum().sum()))

    client, collection = get_collection()
    try:
        save_data(collection, df)
        df = pd.DataFrame(list(collection.find({}, {"_id": 0})))
        df["date"] = pd.to_datetime(df["date"])
        df = df.sort_values("date").reset_index(drop=True)

        df["hour"] = df["date"].dt.hour
        df["weekday"] = df["date"].dt.day_of_week
        df["month"] = df["date"].dt.month
        df["weekend"] = (df["weekday"] >= 5).astype(int)
        df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
        df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)
        df["lag_1"] = df["Appliances"].shift(1)
        df["lag_3"] = df["Appliances"].shift(3)
        df["lag_6"] = df["Appliances"].shift(6)
        df["rolling_mean"] = df["Appliances"].shift(1).rolling(3).mean()
        df = df.dropna().reset_index(drop=True)

        features = [c for c in df.columns if c not in
                    ["date", "Appliances", "rv1", "rv2"]]
        X = df[features].astype(float)
        y = df["Appliances"].astype(float)

        split = int(len(df) * 0.8)
        X_train, X_test = X.iloc[:split], X.iloc[split:]
        y_train, y_test = y.iloc[:split], y.iloc[split:]

        reg = ExtraTreesRegressor(
            n_estimators=150, min_samples_leaf=2,
            random_state=42, n_jobs=-1
        )
        reg.fit(X_train, y_train)
        reg_pred = reg.predict(X_test)

        low, high = y_train.quantile([1 / 3, 2 / 3])

        def categories(values):
            return np.where(values <= low, "Low",
                            np.where(values <= high, "Medium", "High"))

        y_train_class = categories(y_train.to_numpy())
        y_test_class = categories(y_test.to_numpy())

        clf = ExtraTreesClassifier(
            n_estimators=150, min_samples_leaf=2,
            class_weight="balanced", random_state=42, n_jobs=-1
        )
        clf.fit(X_train, y_train_class)
        class_pred = clf.predict(X_test)

        print("\nREGRESSION RESULTS")
        print("R2 Score:", round(r2_score(y_test, reg_pred), 4))
        print("MAE (Wh):", round(mean_absolute_error(y_test, reg_pred), 4))

        print("\nCLASSIFICATION RESULTS")
        print("Accuracy:", round(accuracy_score(y_test_class, class_pred), 4))
        print("Precision:", round(precision_score(y_test_class, class_pred, average="weighted", zero_division=0), 4))
        print("Recall:", round(recall_score(y_test_class, class_pred, average="weighted", zero_division=0), 4))
        print("F1 Score:", round(f1_score(y_test_class, class_pred, average="weighted", zero_division=0), 4))
        print("Confusion Matrix (Low, Medium, High):")
        print(confusion_matrix(y_test_class, class_pred, labels=["Low", "Medium", "High"]))

        sample = X.iloc[[-1]]
        print("\nSAMPLE PREDICTION")
        print("Predicted energy consumption:", round(float(reg.predict(sample)[0]), 2), "Wh")
        print("Predicted category:", clf.predict(sample)[0])

        print("\nCategory boundaries (Wh)")
        print("Low: up to", round(float(low), 2))
        print("Medium: up to", round(float(high), 2))
        print("High: above", round(float(high), 2))
        print("\nPROJECT EXECUTED SUCCESSFULLY.")
        print("Database:", DB_NAME)
        print("Collection:", COLLECTION)
        print("Records:", collection.count_documents({}))
    finally:
        client.close()


if __name__ == "__main__":
    main()
