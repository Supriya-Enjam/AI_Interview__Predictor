
# InterviewIQ – Interview Answer Scoring Guide

## Purpose
This guide ensures that interview answers receive consistent,
human-reviewed scores before being used for machine-learning experiments.

Maximum total score: 20

## 1. Completeness – 0 to 4

- 0: No meaningful answer.
- 1: Very incomplete; misses most of the question.
- 2: Addresses part of the question.
- 3: Covers most important aspects.
- 4: Fully answers the question with sufficient detail.

## 2. Structure – 0 to 3

- 0: No understandable structure.
- 1: Poorly organized response.
- 2: Mostly logical and organized.
- 3: Clear beginning, explanation, and conclusion.

## 3. Specificity – 0 to 3

- 0: No relevant examples or details.
- 1: Mostly generic statements.
- 2: Includes some useful details or examples.
- 3: Provides concrete examples, evidence, or implementation details.

## 4. Relevance – 0 to 5

- 0: Completely unrelated.
- 1: Mostly unrelated.
- 2: Addresses only a small part of the question.
- 3: Generally relevant.
- 4: Directly addresses the question.
- 5: Fully focused and answers all important aspects.

## 5. Communication – 0 to 5

- 0: Cannot understand the response.
- 1: Very difficult to understand.
- 2: Understandable with significant clarity issues.
- 3: Generally clear.
- 4: Clear and well expressed.
- 5: Exceptionally clear, concise, and professional.

## Total score

overallScore =
completenessScore +
structureScore +
specificityScore +
relevanceScore +
communicationScore

Maximum: 20

## Annotation rules

1. Score the answer against the specific question.
2. Do not award points simply because an answer is long.
3. Do not penalize an answer for being concise if it is complete.
4. Evaluate technical correctness when the question is technical.
5. Use the same scoring criteria for every candidate.
6. Have a second reviewer check a sample of labelled records.
7. Do not invent scores or treat unreviewed synthetic examples as ground truth.
8. Record only appropriately consented and anonymized interview data.
