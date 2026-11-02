
import json
from pathlib import Path

import joblib
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


BASE_DIR = Path(__file__).resolve().parent.parent
DATASET_PATH = BASE_DIR / "data" / "interview_training_cleaned.csv"
MODEL_DIR = BASE_DIR / "ml" / "models"

MODEL_PATH = MODEL_DIR / "interview_score_model.joblib"
METRICS_PATH = MODEL_DIR / "training_metrics.json"

MINIMUM_RECORDS = 30

TEXT_FEATURES = ["question", "answer"]
CATEGORY_FEATURES = ["targetRole", "category", "difficulty"]
TARGET = "overallScore"


def main():
    if not DATASET_PATH.exists():
        raise FileNotFoundError(
            f"Cleaned dataset not found: {DATASET_PATH}"
        )

    data = pd.read_csv(DATASET_PATH)

    if len(data) < MINIMUM_RECORDS:
        print("Not enough labelled records to train the model.")
        print(f"Available records: {len(data)}")
        print(f"Minimum required: {MINIMUM_RECORDS}")
        print(
            "Add more human-reviewed examples to "
            "interview_training_template.csv and rerun preprocessing."
        )
        return

    required_columns = TEXT_FEATURES + CATEGORY_FEATURES + [TARGET]
    missing = [column for column in required_columns if column not in data]

    if missing:
        raise ValueError(f"Missing columns: {missing}")

    data = data.dropna(subset=[TARGET]).copy()

    for column in TEXT_FEATURES + CATEGORY_FEATURES:
        data[column] = data[column].fillna("").astype(str)

    data[TARGET] = pd.to_numeric(data[TARGET], errors="coerce")
    data = data.dropna(subset=[TARGET])

    if len(data) < MINIMUM_RECORDS:
        print("Not enough valid records remain after cleaning.")
        return

    X = data[TEXT_FEATURES + CATEGORY_FEATURES]
    y = data[TARGET]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
    )

    text_pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            max_features=5000,
            ngram_range=(1, 2),
            stop_words="english",
        )),
    ])

    category_pipeline = Pipeline([
        ("imputer", SimpleImputer(
            strategy="constant",
            fill_value="unknown",
        )),
        ("onehot", OneHotEncoder(handle_unknown="ignore")),
    ])

    preprocessor = ColumnTransformer([
        ("text", text_pipeline, "answer"),
        ("question", text_pipeline, "question"),
        ("categories", category_pipeline, CATEGORY_FEATURES),
    ])

    model = Pipeline([
        ("preprocessor", preprocessor),
        ("regressor", Ridge(alpha=1.0)),
    ])

    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    predictions = predictions.clip(0, 20)

    mae = mean_absolute_error(y_test, predictions)
    rmse = mean_squared_error(y_test, predictions) ** 0.5

    metrics = {
        "model": "TF-IDF + Ridge Regression",
        "datasetRecords": len(data),
        "trainingRecords": len(X_train),
        "testingRecords": len(X_test),
        "mae": round(float(mae), 3),
        "rmse": round(float(rmse), 3),
        "r2": (
            round(float(r2_score(y_test, predictions)), 3)
            if len(y_test) >= 2
            else None
        ),
        "scoreRange": [0, 20],
        "warning": (
            "Exploratory metrics only. Validate on a larger, "
            "independent human-reviewed dataset before production use."
        ),
    }

    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    joblib.dump(model, MODEL_PATH)

    with METRICS_PATH.open("w", encoding="utf-8") as file:
        json.dump(metrics, file, indent=4)

    print("\nModel training completed.")
    print(f"Training records: {len(X_train)}")
    print(f"Testing records: {len(X_test)}")
    print(f"MAE: {metrics['mae']}")
    print(f"RMSE: {metrics['rmse']}")
    print(f"R2: {metrics['r2']}")
    print(f"Saved model: {MODEL_PATH}")
    print(f"Saved metrics: {METRICS_PATH}")


if __name__ == "__main__":
    main()
