
import csv
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

INPUT_FILE = DATA_DIR / "interview_training_template.csv"
OUTPUT_FILE = DATA_DIR / "interview_training_cleaned.csv"
INVALID_FILE = DATA_DIR / "interview_training_invalid.csv"

load_dotenv(BASE_DIR / ".env")

REQUIRED_COLUMNS = [
    "question",
    "answer",
    "targetRole",
    "category",
    "difficulty",
    "completenessScore",
    "structureScore",
    "specificityScore",
    "relevanceScore",
    "communicationScore",
    "overallScore",
]

SCORE_LIMITS = {
    "completenessScore": (0, 5),
    "structureScore": (0, 5),
    "specificityScore": (0, 5),
    "relevanceScore": (0, 5),
    "communicationScore": (0, 5),
    "overallScore": (0, 25),
}

VALID_CATEGORIES = {
    "technical", "behavioral", "hr",
    "situational", "coding", "mixed"
}

VALID_DIFFICULTIES = {
    "beginner", "intermediate", "advanced"
}


def validate_row(row):
    cleaned = {
        key: str(row.get(key) or "").strip()
        for key in REQUIRED_COLUMNS
    }

    for field in ("question", "answer", "targetRole"):
        if not cleaned[field]:
            raise ValueError(f"{field} cannot be empty")

    cleaned["category"] = cleaned["category"].lower()
    cleaned["difficulty"] = cleaned["difficulty"].lower()

    if cleaned["category"] not in VALID_CATEGORIES:
        raise ValueError("Invalid category")

    if cleaned["difficulty"] not in VALID_DIFFICULTIES:
        raise ValueError("Invalid difficulty")

    scores = {}

    for field, (minimum, maximum) in SCORE_LIMITS.items():
        try:
            value = int(cleaned[field])
        except (ValueError, TypeError):
            raise ValueError(f"{field} must be an integer")

        if not minimum <= value <= maximum:
            raise ValueError(
                f"{field} must be between {minimum} and {maximum}"
            )

        scores[field] = value
        cleaned[field] = str(value)

    calculated_total = sum(
        scores[field]
        for field in (
            "completenessScore",
            "structureScore",
            "specificityScore",
            "relevanceScore",
            "communicationScore",
        )
    )

    if scores["overallScore"] != calculated_total:
        raise ValueError(
            f"overallScore should equal {calculated_total}, "
            f"but received {scores['overallScore']}"
        )

    return cleaned


def read_csv_file(file_path):
    with file_path.open(
        "r", encoding="utf-8-sig", newline=""
    ) as file:
        reader = csv.DictReader(file)

        if not reader.fieldnames:
            raise ValueError("CSV file has no header")

        missing = set(REQUIRED_COLUMNS) - set(reader.fieldnames)

        if missing:
            raise ValueError(
                f"Missing required columns: {', '.join(sorted(missing))}"
            )

        return list(reader)


def read_json_file(file_path):
    with file_path.open("r", encoding="utf-8-sig") as file:
        records = json.load(file)

    if not isinstance(records, list):
        raise ValueError("JSON dataset must contain an array")

    if not all(isinstance(record, dict) for record in records):
        raise ValueError("Every JSON record must be an object")

    return records


def read_uploaded_datasets():
    mongo_uri = os.getenv("MONGODB_URI")

    if not mongo_uri:
        raise RuntimeError("MONGODB_URI is missing from backend/.env")

    client = MongoClient(
        mongo_uri,
        serverSelectionTimeoutMS=5000
    )

    try:
        client.admin.command("ping")

        database = client.get_default_database()

        if database is None:
            raise RuntimeError(
                "Could not determine the MongoDB database from MONGODB_URI"
            )

        datasets = database["datasets"].find({
            "status": "active"
        })

        uploaded_records = []
        loaded_count = 0

        for dataset in datasets:
            file_path = Path(dataset["filePath"])
            file_type = dataset.get("fileType")

            if not file_path.is_file():
                print(
                    f"Warning: Uploaded file not found: "
                    f"{dataset.get('originalFileName', file_path.name)}"
                )
                continue

            try:
                if file_type == "csv":
                    records = read_csv_file(file_path)
                elif file_type == "json":
                    records = read_json_file(file_path)
                else:
                    print(
                        f"Skipping unsupported dataset type: {file_type}"
                    )
                    continue

                for record in records:
                    uploaded_records.append(record)

                loaded_count += 1

                print(
                    f"Loaded active dataset: "
                    f"{dataset.get('name', file_path.name)} "
                    f"({len(records)} records)"
                )

            except (ValueError, json.JSONDecodeError, OSError) as error:
                print(
                    f"Warning: Could not read dataset "
                    f"{dataset.get('name', file_path.name)}: {error}"
                )

        print(f"Active uploaded datasets loaded: {loaded_count}")

        return uploaded_records

    finally:
        client.close()


def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    all_rows = []

    # Read the original training template.
    if INPUT_FILE.exists():
        all_rows.extend(read_csv_file(INPUT_FILE))
        print("Loaded the original training template.")
    else:
        print("Training template not found; continuing with uploaded data.")

    # Read active datasets stored in MongoDB.
    try:
        uploaded_rows = read_uploaded_datasets()
        all_rows.extend(uploaded_rows)
    except Exception as error:
        print(f"Could not load uploaded datasets: {error}")
        return

    valid_rows = []
    invalid_rows = []

    for row_number, row in enumerate(all_rows, start=1):
        try:
            valid_rows.append(validate_row(row))
        except ValueError as error:
            invalid_rows.append({
                **{
                    key: row.get(key, "")
                    for key in REQUIRED_COLUMNS
                },
                "error": str(error),
                "lineNumber": row_number,
            })

    with OUTPUT_FILE.open(
        "w", encoding="utf-8", newline=""
    ) as file:
        writer = csv.DictWriter(
            file,
            fieldnames=REQUIRED_COLUMNS
        )
        writer.writeheader()
        writer.writerows(valid_rows)

    invalid_columns = REQUIRED_COLUMNS + ["error", "lineNumber"]

    with INVALID_FILE.open(
        "w", encoding="utf-8", newline=""
    ) as file:
        writer = csv.DictWriter(
            file,
            fieldnames=invalid_columns,
            extrasaction="ignore"
        )
        writer.writeheader()
        writer.writerows(invalid_rows)

    print("\nDataset preprocessing completed.")
    print(f"Total records read: {len(all_rows)}")
    print(f"Valid records: {len(valid_rows)}")
    print(f"Invalid records: {len(invalid_rows)}")
    print(f"Cleaned dataset: {OUTPUT_FILE}")
    print(f"Invalid records report: {INVALID_FILE}")


if __name__ == "__main__":
    main()
