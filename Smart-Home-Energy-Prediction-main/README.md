# Smart Home Energy Prediction

A complete, simple, and beginner-friendly web application designed to solve household electricity waste by predicting appliance energy consumption and providing intelligent energy-saving suggestions.

---

## 📌 Project Overview
- **Objective:** Predict household appliance energy consumption (in Watt-hours) using environmental sensor readings and provide actionable saving tips to curb power wastage.
- **Problem Statement:** Unmonitored household appliances consume significant electricity due to weather shifts, standby power, and excessive lighting. This project helps users forecast consumption and optimize usage.
- **Tech Stack:**
  - **Frontend:** HTML5, CSS3, Vanilla JavaScript (No React, No Bootstrap, 100% custom styling).
  - **Backend:** Python Flask (REST APIs).
  - **Database:** MongoDB Atlas with PyMongo (`smart_home_energy_db`).
  - **Machine Learning:** Scikit-learn (Single Model: **Linear Regression**), Pandas, NumPy.

---

## 📊 Dataset Specifications
- **Source:** UCI Machine Learning Repository — [Appliances Energy Prediction](https://archive.ics.uci.edu/dataset/374/appliances+energy+prediction) (Candanedo et al., 2017).
- **Records Used:** Exactly **3,000 real records** (clean real-world data).
- **Relevant Features (9 Columns):**
  1. `date`: Time stamp of sensor reading.
  2. `Appliances`: Target energy consumption of appliances in Watt-hours (Wh).
  3. `lights`: Energy consumption of light fixtures in the house (Wh).
  4. `T1`: Kitchen temperature in Celsius (°C).
  5. `RH_1`: Kitchen relative humidity (%).
  6. `T2`: Living room temperature in Celsius (°C).
  7. `RH_2`: Living room relative humidity (%).
  8. `T_out`: Outside weather temperature (°C).
  9. `RH_out`: Outside weather humidity (%).

---

## 🤖 Machine Learning Model & Actual Evaluation
The project uses **Linear Regression** (simple, explainable, and ideal for continuous regression).

### Train-Test Split (Chronological 80:20):
- **Training Set:** 2,400 records
- **Testing Set:** 600 records

### Actual Evaluation Metrics:
- **R² Score:** `0.3424` (Real evaluation, 34.24% variance explained by linear environmental interactions)
- **Mean Absolute Error (MAE):** `48.0031 Wh`

### Documented Consumption Thresholds:
Derived from the 33rd and 66th quantiles of the training set target:
- **Low Consumption:** &le; `40.0 Wh` (Green / Optimal)
- **Medium Consumption:** `40.0 Wh` to `60.0 Wh` (Yellow / Moderate)
- **High Consumption:** &gt; `60.0 Wh` (Red / High Load)

---

## 🗄️ MongoDB Architecture & CRUD Operations
Database Name: `smart_home_energy_db`

### Collections:
1. **`energy_readings`:** Contains the 3,000 baseline UCI sensor documents.
2. **`prediction_history`:** Stores user queries, inputs, predicted values, and timestamps.

### CRUD Implementation:
- **Create (C):** Saves every new prediction query with full input parameters and recommendation output.
- **Read (R):** Fetches summary statistics and recent predictions audit log.
- **Update (U):** Automatic dataset synchronization on server startup.
- **Delete (D):** Single prediction record removal and bulk history purge buttons on the frontend.

---

## 🚀 Setup & Execution Guide

### 1. Environment Setup
Make sure Python 3.10+ is installed.
```powershell
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure MongoDB in `.env`
Create or edit `.env` in the project root:
```env
MONGODB_URI=your_mongodb_atlas_connection_string
```

### 3. Run Machine Learning Pipeline (CLI Run)
```powershell
python main.py
```
*Outputs dataset stats, model training details, actual evaluation metrics, and writes sample prediction to MongoDB.*

### 4. Launch the Web Application
```powershell
python app.py
```
Open your browser and navigate to:
```
http://127.0.0.1:5000/
```

---

## 🌟 Key Frontend Features
1. **Dashboard KPI Cards:** Displays total dataset readings, real R² score, MAE, and prediction count.
2. **Interactive Prediction Form:** Sliders/inputs for lighting, temperatures, and humidity with a "Load Sample Values" button for easy demonstration.
3. **Consumption Classification:** Visual Low/Medium/High indicator badge.
4. **Actionable Recommendations:** Automated energy-saving tips based on predicted load and lighting status.
5. **MongoDB History Audit Table:** Live dynamic table with individual delete and clear-all actions.

---

## 🎓 College Viva / Presentation Talking Points
1. **Why Linear Regression?** It offers high interpretability, transparency, and establishes a clear baseline relationship between environmental factors and energy usage.
2. **Why MongoDB?** Flexible document schema (`BSON`) suited for IoT sensor time-series data and dynamic user logs.
3. **How are Recommendations Generated?** Rule-based logic tied to documented quantile thresholds and specific sensor triggers (e.g., high lighting load).
