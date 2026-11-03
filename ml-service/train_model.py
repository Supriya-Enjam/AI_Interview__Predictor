
from pathlib import Path
from datetime import datetime, timezone
import json

import joblib
import numpy as np

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)
from sklearn.model_selection import (
    train_test_split,
    KFold,
    cross_validate,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


# =========================================================
# PATH CONFIGURATION
# =========================================================

BASE_DIR = Path(__file__).parent
MODEL_DIR = BASE_DIR / "model"

MODEL_PATH = MODEL_DIR / "interview_model.joblib"
METRICS_PATH = MODEL_DIR / "model_metrics.json"


# =========================================================
# FEATURE CONFIGURATION
# =========================================================

FEATURE_NAMES = [
    "completeness_score",
    "structure_score",
    "specificity_score",
    "relevance_score",
    "communication_score",
]


# =========================================================
# SYNTHETIC DATASET GENERATION
# =========================================================

def generate_sample_dataset(samples=1200):
    """
    Generate experimental synthetic interview assessment data.

    IMPORTANT:
    This dataset is synthetic and does not represent
    real candidate interview outcomes.
    """

    rng = np.random.default_rng(42)

    X = rng.uniform(20, 100, size=(samples, 5))

    weights = np.array([
        0.20,
        0.15,
        0.15,
        0.25,
        0.25,
    ])

    noise = rng.normal(0, 3, size=samples)

    y = np.clip(X @ weights + noise, 0, 100)

    return X, y


# =========================================================
# MODEL TRAINING
# =========================================================

def train():

    print("\nStarting InterviewIQ ML training...")
    print("-----------------------------------")

    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    # Generate dataset
    X, y = generate_sample_dataset()

    print(f"Total samples: {len(X)}")

    # Split dataset into training and testing sets
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
    )

    print(f"Training samples: {len(X_train)}")
    print(f"Testing samples: {len(X_test)}")

    # Create ML pipeline
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

    # Train model
    print("\nTraining Random Forest Regressor...")

    model.fit(X_train, y_train)

    # Test model
    predictions = model.predict(X_test)

    # Calculate test metrics
    mae = mean_absolute_error(
        y_test,
        predictions,
    )

    rmse = np.sqrt(
        mean_squared_error(
            y_test,
            predictions,
        )
    )

    r2 = r2_score(
        y_test,
        predictions,
    )

    # =====================================================
    # 5-FOLD CROSS VALIDATION
    # =====================================================

    print("\nRunning 5-fold cross-validation...")

    cv = KFold(
        n_splits=5,
        shuffle=True,
        random_state=42,
    )

    cv_results = cross_validate(
        model,
        X_train,
        y_train,
        cv=cv,
        scoring={
            "mae": "neg_mean_absolute_error",
            "r2": "r2",
        },
        n_jobs=-1,
    )

    cv_mae = -cv_results["test_mae"]
    cv_r2 = cv_results["test_r2"]

    mean_cv_mae = float(np.mean(cv_mae))
    std_cv_mae = float(np.std(cv_mae))
    mean_cv_r2 = float(np.mean(cv_r2))

    # =====================================================
    # SAVE TRAINED MODEL
    # =====================================================

    joblib.dump(model, MODEL_PATH)

    # =====================================================
    # SAVE MODEL METRICS
    # =====================================================

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

        "cross_validation": {
            "folds": 5,
            "mean_mae": round(mean_cv_mae, 2),
            "std_mae": round(std_cv_mae, 2),
            "mean_r2": round(mean_cv_r2, 4),
        },

        "training_data": "synthetic",

        "trained_at": datetime.now(
            timezone.utc
        ).isoformat(),

        "notice": (
            "Metrics are calculated using synthetic training data. "
            "Cross-validation and test scores do not establish "
            "real-world interview prediction accuracy."
        ),
    }

    with open(
        METRICS_PATH,
        "w",
        encoding="utf-8",
    ) as metrics_file:

        json.dump(
            metrics,
            metrics_file,
            indent=4,
        )

    # =====================================================
    # TRAINING REPORT
    # =====================================================

    print("\nInterviewIQ ML training completed.")
    print("-----------------------------------")

    print(f"Model:             Random Forest Regressor")
    print(f"Features:          {FEATURE_NAMES}")
    print(f"Training samples:  {len(X_train)}")
    print(f"Testing samples:   {len(X_test)}")

    print("\nTest Evaluation:")
    print(f"MAE:               {mae:.2f}")
    print(f"RMSE:              {rmse:.2f}")
    print(f"R2 Score:          {r2:.4f}")

    print("\nCross-validation:")
    print(f"Folds:             5")
    print(f"Mean MAE:          {mean_cv_mae:.2f}")
    print(f"MAE Std Dev:       {std_cv_mae:.2f}")
    print(f"Mean R2:           {mean_cv_r2:.4f}")

    print("\nSaved model:")
    print(MODEL_PATH)

    print("\nSaved metrics:")
    print(METRICS_PATH)

    print("\nWARNING:")
    print("Training uses synthetic data only.")
    print("Metrics do not establish real-world accuracy.")


# =========================================================
# APPLICATION ENTRY POINT
# =========================================================

if __name__ == "__main__":
    train()
