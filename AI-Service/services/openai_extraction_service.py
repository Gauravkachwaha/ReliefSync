from __future__ import annotations

import os
from typing import Any, Optional

from services.openai_client_service import openai_client_service


VALID_CATEGORIES = [
    "MEDICAL_SUPPORT",
    "FOOD_RELIEF",
    "SHELTER_SUPPORT",
    "DISASTER_RELIEF",
    "WOMEN_CHILD_SAFETY",
    "CIVIC_GRIEVANCE",
    "GENERAL_SUPPORT",
]

VALID_SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]

VALID_SKILLS = [
    "first_aid",
    "medical_support",
    "food_distribution",
    "shelter_coordination",
    "disaster_response",
    "child_support",
    "women_safety_support",
    "community_coordination",
    "general_volunteering",
]

SYSTEM_PROMPT = (
    "You are an information-extraction assistant for a disaster/community relief "
    "platform. Read a citizen's raw complaint text (it may be in English, Hindi, "
    "or a mix of both) and extract structured fields.\n\n"
    f"- category must be exactly one of: {', '.join(VALID_CATEGORIES)}.\n"
    f"- severity must be exactly one of: {', '.join(VALID_SEVERITIES)}. Use CRITICAL "
    "only for immediate life-threatening danger (trapped, bleeding, active fire, "
    "building collapse). Use HIGH for urgent but not immediately life-threatening. "
    "Never invent urgency the text doesn't support.\n"
    "- required_people is your best-effort integer estimate of how many people need "
    "help (default 1 if unclear), between 1 and 100.\n"
    f"- required_skills is a list drawn only from: {', '.join(VALID_SKILLS)}.\n"
    "- needs_clarification is true only if the location AND the nature of help "
    "needed are both too vague to act on.\n"
    "- clarification_questions is a short list (0-3) of specific follow-up "
    "questions, only populated when needs_clarification is true.\n"
    "- summary is one short sentence (under 180 characters) summarizing the need.\n\n"
    "Respond ONLY with a JSON object with exactly these keys: category, severity, "
    "required_people, required_skills, needs_clarification, clarification_questions, "
    "summary."
)


class OpenAiExtractionService:
    def __init__(self) -> None:
        self.enabled = (
            os.getenv("OPENAI_EXTRACTION_ENABLED", "true").strip().lower()
            == "true"
        )

    def build_user_prompt(
        self,
        text: str,
        location_hint: Optional[str],
    ) -> str:
        location_line = (
            f"Reported location hint: {location_hint}"
            if location_hint
            else "No location hint was provided."
        )

        return f"{location_line}\n\nComplaint text:\n{text}"

    def sanitize(
        self,
        raw: dict[str, Any],
        location_hint: Optional[str],
    ) -> dict[str, Any]:
        category = str(raw.get("category") or "").upper()

        if category not in VALID_CATEGORIES:
            category = "GENERAL_SUPPORT"

        severity = str(raw.get("severity") or "").upper()

        if severity not in VALID_SEVERITIES:
            severity = "MEDIUM"

        try:
            required_people = max(
                1,
                min(int(raw.get("required_people", 1)), 100),
            )
        except (TypeError, ValueError):
            required_people = 1

        required_skills = raw.get("required_skills")

        if not isinstance(required_skills, list):
            required_skills = []

        required_skills = [
            skill for skill in required_skills if skill in VALID_SKILLS
        ]

        if not required_skills:
            required_skills = ["general_volunteering"]

        needs_clarification = bool(raw.get("needs_clarification", False))

        clarification_questions = raw.get("clarification_questions")

        if not isinstance(clarification_questions, list):
            clarification_questions = []

        clarification_questions = [
            str(question) for question in clarification_questions
        ][:3]

        summary = str(raw.get("summary") or "").strip()

        if not summary:
            summary = (
                f"{category.replace('_', ' ').title()} request marked {severity}."
            )

        if len(summary) > 220:
            summary = summary[:217] + "..."

        return {
            "summary": summary,
            "category": category,
            "severity": severity,
            "location_hint": location_hint,
            "required_people": required_people,
            "required_skills": required_skills,
            "needs_clarification": needs_clarification,
            "clarification_questions": clarification_questions,
            "processing_mode": "openai_llm",
        }

    def extract(
        self,
        text: str,
        location_hint: Optional[str],
    ) -> dict[str, Any]:
        if not self.enabled:
            raise RuntimeError("OpenAI extraction is disabled")

        raw = openai_client_service.complete_json(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=self.build_user_prompt(text, location_hint),
        )

        return self.sanitize(raw, location_hint)


openai_extraction_service = OpenAiExtractionService()
