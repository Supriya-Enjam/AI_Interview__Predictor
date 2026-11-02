
import json
from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parent.parent
DATASET_PATH = BASE_DIR / "data" / "interview_training_cleaned.csv"
REPORT_PATH = BASE_DIR / "data" / "dataset_quality_report.json"

MINIMUM_RECORDS = 30

SCORE_COLUMNS = [
    "completenessScore",
    "structureScore",
    "specificityScore",
    "relevanceScore",
    "communicationScore",
    "overallScore",
]

REQUIRED_COLUMNS = [
    "question",
    "answer",
    "targetRole",
    "category",
    "difficulty",
    *SCORE_COLUMNS,
]


def main():
    if not DATASET_PATH.exists():
        raise FileNotFoundError(
            f"Cleaned dataset not found: {DATASET_PATH}"
        )

    data = pd.read_csv(DATASET_PATH)

    missing_columns = [
        column for column in REQUIRED_COLUMNS
        if column not in data.columns
    ]

    if missing_columns:
        raise ValueError(f"Missing columns: {missing_columns}")

    total_records = len(data)

    missing_values = {
        column: int(data[column].isna().sum())
        for column in REQUIRED_COLUMNS
    }

    duplicate_answers = int(
        data.duplicated(subset=["question", "answer"]).sum()
    )

    role_distribution = (
        data["targetRole"].fillna("Unknown")
        .value_counts()
        .to_dict()
    )

    category_distribution = (
        data["category"].fillna("Unknown")
        .value_counts()
        .to_dict()
    )

    difficulty_distribution = (
        data["difficulty"].fillna("Unknown")
        .value_counts()
        .to_dict()
    )

    score_statistics = {}

    for column in SCORE_COLUMNS:
        values = pd.to_numeric(data[column], errors="coerce")

        score_statistics[column] = {
            "minimum": (
                float(values.min()) if values.notna().any() else None
            ),
            "maximum": (
                float(values.max()) if values.notna().any() else None
            ),
            "average": (
                round(float(values.mean()), 2)
                if values.notna().any() else None
            ),
        }

    warnings = []

    if total_records < MINIMUM_RECORDS:
        warnings.append(
            f"Only {total_records} records available. "
            f"At least {MINIMUM_RECORDS} are required by the "
            "current training script."
        )

    if duplicate_answers > 0:
        warnings.append(
            f"{duplicate_answers} duplicate question-answer pairs found."
        )

    if any(missing_values.values()):
        warnings.append("Missing values were found in the dataset.")

    if data["overallScore"].nunique() < 2:
        warnings.append(
            "The target score has fewer than two distinct values."
        )

    report = {
        "totalRecords": total_records,
        "minimumTrainingRecords": MINIMUM_RECORDS,
        "meetsMinimumRecordCount": total_records >= MINIMUM_RECORDS,
        "duplicateQuestionAnswerPairs": duplicate_answers,
        "missingValues": missing_values,
        "roleDistribution": role_distribution,
        "categoryDistribution": category_distribution,
        "difficultyDistribution": difficulty_distribution,
        "scoreStatistics": score_statistics,
        "warnings": warnings,
        "trainingReady": (
            total_records >= MINIMUM_RECORDS
            and duplicate_answers == 0
            and not any(missing_values.values())
            and data["overallScore"].nunique() >= 2
        ),
    }

    with REPORT_PATH.open("w", encoding="utf-8") as file:
        json.dump(report, file, indent=4)

    print("\nDataset Quality Report")
    print("======================")
    print(f"Total records: {total_records}")
    print(f"Duplicate pairs: {duplicate_answers}")
    print(f"Meets minimum record count: {report['meetsMinimumRecordCount']}")
    print(f"Training ready: {report['trainingReady']}")

    print("\nRole distribution:")
    print(role_distribution)

    print("\nCategory distribution:")
    print(category_distribution)

    print("\nDifficulty distribution:")
    print(difficulty_distribution)

    print("\nWarnings:")
    if warnings:
        for warning in warnings:
            print(f"- {warning}")
    else:
        print("No basic quality warnings.")

    print(f"\nReport saved to: {REPORT_PATH}")


if __name__ == "__main__":
    main()
