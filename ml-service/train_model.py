
from pathlib import Path
import json

import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

BASE_DIR = Path(__file__).parent
MODEL_DIR = BASE_DIR / "model"
MODEL_PATH = MODEL_DIR / "interview_model.joblib"
METRICS_PATH = MODEL_DIR / "model_metrics.json"

FEATURE_NAMES = [
    "completeness_score",
    "structure_score",
    "specificity_score",
    "relevance_score",
    "communication_score",
]


def generate_sample_dataset(samples=1200):
    rng = np.random.default_rng(42)

    X = rng.uniform(20, 100, size=(samples, 5))

    weights = np.array([0.20, 0.15, 0.15, 0.25, 0.25])
    noise = rng.normal(0, 3, size=samples)

    y = np.clip(X @ weights + noise, 0, 100)

    return X, y


def train():
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    X, y = generate_sample_dataset()

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
    )

    model = Pipeline([
        ("scaler", StandardScaler()),
        (
            "regressor",
            RandomForestRegressor(
                n_estimators=200,
                max_depth=12,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1,
            ),
        ),
    ])

    model.fit(X_train, y_train)

    predictions = model.predict(X_test)

    mae = mean_absolute_error(y_test, predictions)
    rmse = np.sqrt(mean_squared_error(y_test, predictions))
    r2 = r2_score(y_test, predictions)

    joblib.dump(model, MODEL_PATH)

    metrics = {
        "model_name": "Random Forest Regressor",
        "model_type": "experimental_synthetic_data_model",
        "features": FEATURE_NAMES,
        "training_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "total_samples": int(len(X)),
        "mae": round(float(mae), 2),
        "rmse": round(float(rmse), 2),
        "r2_score": round(float(r2), 4),
        "training_data": "synthetic",
        "trained_at": __import__("datetime").datetime.now(
            __import__("datetime").timezone.utc
        ).isoformat(),
        "notice": (
            "These metrics are calculated using synthetic training data. "
            "They do not establish real-world model accuracy."
        ),
    }

    with open(METRICS_PATH, "w", encoding="utf-8") as metrics_file:
        json.dump(metrics, metrics_file, indent=4)

    print("\nInterviewIQ ML training completed.")
    print("-----------------------------------")
    print(f"Features:         {FEATURE_NAMES}")
    print(f"Training samples: {len(X_train)}")
    print(f"Testing samples:  {len(X_test)}")
    print(f"MAE:              {mae:.2f}")
    print(f"RMSE:             {rmse:.2f}")
    print(f"R2 score:         {r2:.4f}")
    print(f"Saved model:      {MODEL_PATH}")
    print(f"Saved metrics:    {METRICS_PATH}")
    print("\nWARNING: Synthetic training data only.")
    print("Metrics do not establish real-world accuracy.")


if __name__ == "__main__":
    train()
