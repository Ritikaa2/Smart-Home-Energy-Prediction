# Project Report
## Smart Home Energy Consumption Prediction System

### 1. Introduction
This project demonstrates how a NoSQL database and machine learning can be combined to analyse household appliance energy consumption. Sensor readings such as indoor temperature, humidity and outdoor weather conditions are stored in MongoDB and retrieved through PyMongo.

### 2. Project Objectives
- Store the energy dataset in MongoDB.
- Retrieve records using PyMongo.
- Preprocess time and sensor attributes.
- Train a regression model to estimate appliance energy use.
- Derive Low, Medium and High consumption categories and train a classifier.
- Evaluate both models using the required metrics.

### 3. Dataset Description
Dataset: Appliances Energy Prediction, UCI Machine Learning Repository, dataset 374.
The processed and humanized dataset contains 300 observations and 28 features (condensed from 19,735 raw 10-minute sensor readings to a clean 3-hour interval time-series). It records appliance energy usage and environmental conditions with human-readable rounded decimals. The target `Appliances` represents energy use in watt-hours (Wh). The original dataset is a regression dataset and does not contain a native Low/Medium/High class label.

Official source: https://archive.ics.uci.edu/dataset/374/appliances+energy+prediction
Citation: Candanedo, L. (2017). Appliances Energy Prediction. UCI Machine Learning Repository. DOI: 10.24432/C5VC8G. License: CC BY 4.0.

### 4. MongoDB and PyMongo Implementation
Database: `smart_home_energy`
Collection: `energy_readings`
The Python program connects to MongoDB Atlas using a connection string stored in `.env`. It inserts the dataset when the collection is empty and retrieves documents for analysis.

### 5. Data Preprocessing
- Convert the date field to datetime.
- Extract hour, weekday, month and weekend features.
- Exclude the target, raw date and random-noise columns from predictors.
- Preserve chronological order and use the first 80% for training and the final 20% for testing.

### 6. Machine Learning Models
**Regression:** Random Forest Regressor predicts appliance energy consumption in Wh.

**Classification:** Random Forest Classifier predicts Low, Medium or High energy consumption. The category boundaries are calculated from the training target's one-third and two-third quantiles. These are derived labels, not original dataset labels.

### 7. Evaluation Results
Actual execution output from `python main.py` using 300 clean humanized records:

- R2 Score: 0.3415
- MAE: 34.9508 Wh
- Accuracy: 0.5085 (50.85%)
- Weighted Precision: 0.6248
- Weighted Recall: 0.5085
- Weighted F1-score: 0.5252
- Confusion Matrix (Low, Medium, High):
  ```
  [[ 1  0  0]
   [10 13 13]
   [ 0  6 16]]
  ```
- Sample Prediction:
  - Predicted energy consumption: 44.38 Wh
  - Predicted category: Low
- Category boundaries (Wh):
  - Low: up to 46.0 Wh
  - Medium: up to 101.0 Wh
  - High: above 101.0 Wh

### 8. Conclusion
The project demonstrates an end-to-end workflow using MongoDB, PyMongo and machine learning. The regression model estimates appliance energy consumption, while the derived classification task groups consumption into three levels. Final conclusions should be written after running the program and reviewing the actual evaluation results.
