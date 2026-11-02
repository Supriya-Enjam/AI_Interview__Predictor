
from pathlib import Path

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(
    title="InterviewIQ ML Service",
    description="Experimental interview assessment prediction service",
    version="1.0.0",
)

MODEL_PATH = Path(__file__).parent / "model" / "interview_model.joblib"


class InterviewFeatures(BaseModel):
    completeness_score: float = Field(ge=0, le=100)
    structure_score: float = Field(ge=0, le=100)
    specificity_score: float = Field(ge=0, le=100)
    relevance_score: float = Field(ge=0, le=100)
    communication_score: float = Field(ge=0, le=100)


@app.get("/")
def root():
    return {
        "success": True,
        "message": "InterviewIQ ML Service is running",
    }


@app.get("/health")
def health():
    return {
        "success": True,
        "service": "InterviewIQ ML Service",
        "model_loaded": MODEL_PATH.exists(),
    }


@app.post("/predict")
def predict(features: InterviewFeatures):
    if not MODEL_PATH.exists():
        raise HTTPException(
            status_code=503,
            detail="ML model has not been trained yet.",
        )

    try:
        model = joblib.load(MODEL_PATH)

        values = np.array([[
            features.completeness_score,
            features.structure_score,
            features.specificity_score,
            features.relevance_score,
            features.communication_score,
        ]])

        prediction = float(model.predict(values)[0])
        prediction = max(0.0, min(100.0, prediction))

        return {
            "success": True,
            "predicted_score": round(prediction, 2),
            "prediction_type": "experimental_synthetic_data_model",
            "notice": (
                "Experimental estimate based on rubric-derived "
                "features and synthetic training data. "
                "Not a validated measure of interview performance."
            ),
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(error)}",
        )
