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
The official dataset contains 19,735 observations and 28 features. It records appliance energy usage and environmental conditions at 10-minute intervals over approximately 4.5 months. The target `Appliances` represents energy use in watt-hours (Wh). The original dataset is a regression dataset and does not contain a native Low/Medium/High class label.

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
Run `python main.py` and paste the actual results below. Do not enter estimated or fabricated values.

- R2 Score: [Paste actual output]
- MAE: [Paste actual output]
- Accuracy: [Paste actual output]
- Weighted Precision: [Paste actual output]
- Weighted Recall: [Paste actual output]
- Weighted F1-score: [Paste actual output]
- Confusion Matrix: [Paste actual output]

### 8. Conclusion
The project demonstrates an end-to-end workflow using MongoDB, PyMongo and machine learning. The regression model estimates appliance energy consumption, while the derived classification task groups consumption into three levels. Final conclusions should be written after running the program and reviewing the actual evaluation results.
