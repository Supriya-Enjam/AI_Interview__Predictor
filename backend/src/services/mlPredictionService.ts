const ML_SERVICE_URL =
  process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";

export interface MLPredictionFeatures {
  completeness_score: number;
  structure_score: number;
  specificity_score: number;
  relevance_score: number;
  communication_score: number;
}

export interface MLPredictionResult {
  success: boolean;
  predicted_score: number;
  prediction_type: string;
  notice: string;
}

export async function predictInterviewPerformance(
  features: MLPredictionFeatures
): Promise<MLPredictionResult> {
  const response = await fetch(`${ML_SERVICE_URL}/predict`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(features),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `ML service returned ${response.status}: ${errorText}`
    );
  }

  return (await response.json()) as MLPredictionResult;
}