# Smart Home Energy Consumption Prediction System

## Project overview
This project stores the UCI Appliances Energy Prediction dataset in MongoDB and uses PyMongo to retrieve it for machine learning.

It trains:
- Random Forest Regressor to estimate appliance energy use (Wh).
- Random Forest Classifier to classify consumption as Low, Medium, or High.

The three categories are derived from the training-set target terciles. They are not original labels in the UCI dataset.

## Dataset
- Name: Appliances Energy Prediction
- Source: UCI Machine Learning Repository, dataset 374
- Records: 19,735
- Original target: `Appliances` (Wh)
- License: CC BY 4.0
- Official page: https://archive.ics.uci.edu/dataset/374/appliances+energy+prediction
- Dataset citation: Candanedo, L. (2017). Appliances Energy Prediction. UCI Machine Learning Repository. https://doi.org/10.24432/C5VC8G.

The CSV is downloaded automatically on first run. If automatic download fails, download `energydata_complete.csv` from the official UCI page and put it in the `data` folder.

## Setup (Windows PowerShell)
```powershell
python -m venv venv
.env\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create a `.env` file in the project root:
```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@YOUR-CLUSTER.mongodb.net/?retryWrites=true&w=majority
```

Use your own MongoDB Atlas URI. Never upload `.env` to GitHub.

Run:
```powershell
python main.py
```

## MongoDB
- Database: `smart_home_energy`
- Collection: `energy_readings`

The script imports records only when the collection is empty. If the collection already contains records, it skips importing to avoid duplicates.

## Metrics
Regression: R2 Score and Mean Absolute Error (MAE).
Classification: Accuracy, weighted Precision, weighted Recall, weighted F1-score, and Confusion Matrix.

The dataset is a regression dataset. Classification metrics are calculated on Low/Medium/High categories derived from the continuous `Appliances` target using cutoffs learned from the training data.

## Methodology note
The data is time ordered and the first 80% is used for training while the final 20% is used for testing. `date` is transformed into hour, weekday, month and weekend features. The target and random-noise columns `rv1` and `rv2` are excluded from model inputs.

## Attribution
Dataset: Candanedo, L. (2017), UCI Machine Learning Repository, DOI: 10.24432/C5VC8G. Licensed under CC BY 4.0.
