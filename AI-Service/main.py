import os
import re
from typing import Any, List, Optional
from routes.spam_model import router as spam_model_router
from routes.embedding_model import router as embedding_model_router
from routes.complaint_classifier import (
    router as complaint_classifier_router,
)
from routes.cache import router as cache_router
from services.cache_service import cache_service
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, status
from pydantic import BaseModel, Field

load_dotenv()

app = FastAPI(
    title="ReliefSync AI Service",
    version="1.0.0",
)
#-----------------------------------
# Including the models 
#-----------------------------------
app.include_router(spam_model_router)
app.include_router(embedding_model_router)
app.include_router(complaint_classifier_router)
app.include_router(cache_router)
# -----------------------------
# Request and response models
# -----------------------------

class ComplaintExtractionRequest(BaseModel):
    text: str = Field(
        ...,
        min_length=5,
        max_length=5000,
        description="Raw complaint text submitted by the reporter",
    )
    location_hint: Optional[str] = Field(
        default=None,
        max_length=300,
        description="Optional location or nearest landmark",
    )


class ComplaintExtractionResult(BaseModel):
    summary: str
    category: str
    severity: str
    location_hint: Optional[str]
    required_people: int
    required_skills: List[str]
    needs_clarification: bool
    clarification_questions: List[str]
    processing_mode: str


class PriorityRequest(BaseModel):
    title: str = Field(
        default="Untitled report",
        max_length=300,
    )
    raw_text: str = Field(
        ...,
        min_length=5,
        max_length=5000,
    )
    ai_extracted_data: dict[str, Any] = Field(default_factory=dict)


class PriorityResult(BaseModel):
    priority: str
    reason: str
    processing_mode: str


class NeedSummaryRequest(BaseModel):
    title: str = Field(
        default="Untitled need",
        max_length=300,
    )
    priority: str = Field(
        default="medium",
        max_length=30,
    )
    extracted_data: dict[str, Any] = Field(default_factory=dict)


class NeedSummaryResult(BaseModel):
    summary: str
    processing_mode: str


# -----------------------------
# Security helper
# -----------------------------

def verify_service_key(x_service_key: Optional[str]) -> None:
    expected_key = os.getenv("AI_SERVICE_API_KEY")

    if not expected_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI_SERVICE_API_KEY is missing in AI-Service/.env",
        )

    if x_service_key != expected_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal service key",
        )


# -----------------------------
# Complaint extraction helpers
# -----------------------------

def detect_category(text: str) -> str:
    text = text.lower()

    disaster_keywords = [
        "flood",
        "earthquake",
        "fire",
        "cyclone",
        "landslide",
        "disaster",
        "storm",
        "trapped",
    ]

    if any(keyword in text for keyword in disaster_keywords):
        return "DISASTER_RELIEF"

    category_keywords = {
        "MEDICAL_SUPPORT": [
            "medical",
            "doctor",
            "medicine",
            "hospital",
            "injury",
            "injured",
            "bleeding",
            "ambulance",
            "health",
        ],
        "FOOD_RELIEF": [
            "food",
            "hungry",
            "hunger",
            "meal",
            "ration",
            "starving",
            "water",
            "drinking water",
        ],
        "SHELTER_SUPPORT": [
            "shelter",
            "homeless",
            "roof",
            "house collapsed",
            "temporary stay",
            "accommodation",
        ],
        "WOMEN_CHILD_SAFETY": [
            "child",
            "children",
            "woman",
            "women",
            "girl",
            "domestic violence",
            "abuse",
            "harassment",
        ],
        "CIVIC_GRIEVANCE": [
            "garbage",
            "drainage",
            "road",
            "streetlight",
            "water supply",
            "sewage",
            "pothole",
        ],
    }

    for category, keywords in category_keywords.items():
        if any(keyword in text for keyword in keywords):
            return category

    return "GENERAL_SUPPORT"


def detect_severity(text: str, category: str) -> str:
    text = text.lower()

    critical_keywords = [
        "life threatening",
        "dying",
        "bleeding",
        "trapped",
        "fire",
        "collapsed",
        "emergency",
        "immediately",
        "urgent",
    ]

    high_keywords = [
        "flood",
        "injured",
        "medical",
        "no food",
        "children",
        "elderly",
        "disabled",
        "unsafe",
    ]

    if any(keyword in text for keyword in critical_keywords):
        return "CRITICAL"

    if category in ["MEDICAL_SUPPORT", "DISASTER_RELIEF"]:
        return "HIGH"

    if any(keyword in text for keyword in high_keywords):
        return "HIGH"

    return "MEDIUM"


def detect_required_people(text: str) -> int:
    text = text.lower()

    match = re.search(
        r"\b(?:around|about|approximately|at least|minimum of)?\s*(\d{1,3})\s+"
        r"(?:people|persons|families|children|adults)\b",
        text,
    )

    if match:
        return max(1, min(int(match.group(1)), 100))

    return 1


def detect_required_skills(category: str) -> List[str]:
    skill_map = {
        "MEDICAL_SUPPORT": ["first_aid", "medical_support"],
        "FOOD_RELIEF": ["food_distribution"],
        "SHELTER_SUPPORT": ["shelter_coordination"],
        "DISASTER_RELIEF": ["disaster_response", "first_aid"],
        "WOMEN_CHILD_SAFETY": ["child_support", "women_safety_support"],
        "CIVIC_GRIEVANCE": ["community_coordination"],
        "GENERAL_SUPPORT": ["general_volunteering"],
    }

    return skill_map[category]


def build_clarification_questions(
    text: str,
    location_hint: Optional[str],
    required_people: int,
) -> List[str]:
    questions = []
    text = text.lower()

    if not location_hint:
        questions.append(
            "What is the nearest landmark or exact area where help is needed?"
        )

    if required_people == 1 and not re.search(
        r"\b\d{1,3}\s+(?:people|persons|families|children|adults)\b",
        text,
    ):
        questions.append("Approximately how many people need assistance?")

    if len(text.split()) < 12:
        questions.append(
            "Please briefly describe the problem and the immediate help required."
        )

    return questions


def build_summary(
    text: str,
    category: str,
    severity: str,
    required_people: int,
) -> str:
    clean_text = " ".join(text.strip().split())

    if len(clean_text) > 180:
        clean_text = clean_text[:177] + "..."

    return (
        f"{category.replace('_', ' ').title()} request marked {severity}. "
        f"Estimated people requiring support: {required_people}. "
        f"Reported issue: {clean_text}"
    )


# -----------------------------
# Priority calculation helper
# -----------------------------

def calculate_priority(
    raw_text: str,
    ai_extracted_data: dict[str, Any],
) -> tuple[str, str]:
    text = raw_text.lower()

    severity = str(
        ai_extracted_data.get("severity")
        or ai_extracted_data.get("urgencyHint")
        or ""
    ).lower()

    required_people = (
        ai_extracted_data.get("required_people")
        or ai_extracted_data.get("affectedPeople")
        or ai_extracted_data.get("requiredVolunteers")
        or 1
    )

    try:
        required_people = int(required_people)
    except (TypeError, ValueError):
        required_people = 1

    critical_keywords = [
        "life threatening",
        "dying",
        "bleeding",
        "trapped",
        "building collapsed",
        "house collapsed",
        "active fire",
        "severe injury",
        "immediate danger",
    ]

    high_keywords = [
        "flood",
        "fire",
        "injured",
        "medical emergency",
        "no food",
        "no water",
        "homeless",
        "unsafe",
        "elderly",
        "children",
        "disabled",
    ]

    if severity in ["critical", "very high"]:
        return "critical", "AI extraction marked this complaint as critical."

    if any(keyword in text for keyword in critical_keywords):
        return "critical", "The report contains immediate life-risk indicators."

    if required_people >= 100:
        return "critical", "A very large number of people require support."

    if severity == "high":
        return "high", "AI extraction marked this complaint as high severity."

    if any(keyword in text for keyword in high_keywords):
        return "high", "The report contains urgent disaster or vulnerability indicators."

    if required_people >= 20:
        return "high", "A significant number of people require assistance."

    if severity == "medium":
        return "medium", "AI extraction marked this complaint as medium severity."

    if severity == "low":
        return "low", "AI extraction marked this complaint as low severity."

    return "medium", "No critical indicator was found, so medium priority was selected."


# -----------------------------
# Need summary helper
# -----------------------------

def readable_label(value: Any) -> str:
    if not value:
        return ""

    return str(value).replace("_", " ").replace("-", " ").title()


def get_first_value(data: dict[str, Any], keys: List[str], default: Any = None) -> Any:
    for key in keys:
        value = data.get(key)

        if value not in [None, "", [], {}]:
            return value

    return default


def build_urgent_need_summary(
    title: str,
    priority: str,
    extracted_data: dict[str, Any],
) -> str:
    location = get_first_value(
        extracted_data,
        ["location", "location_hint"],
        "the reported area",
    )

    issue_type = get_first_value(
        extracted_data,
        ["issueType", "category"],
        "community support",
    )

    affected_people = get_first_value(
        extracted_data,
        ["affectedPeople", "required_people", "requiredVolunteers"],
        1,
    )

    skills = get_first_value(
        extracted_data,
        ["requiredSkills", "required_skills"],
        [],
    )

    if not isinstance(skills, list):
        skills = []

    readable_skills = [
        readable_label(skill)
        for skill in skills
        if str(skill).strip()
    ]

    priority_label = readable_label(priority or "medium")
    issue_label = readable_label(issue_type)

    try:
        affected_people = int(affected_people)
    except (TypeError, ValueError):
        affected_people = 1

    people_text = (
        "one person"
        if affected_people == 1
        else f"approximately {affected_people} people"
    )

    summary_parts = [
        f"{priority_label} priority: {title}.",
        f"A {issue_label.lower()} situation has been reported in {location}, affecting {people_text}.",
    ]

    if readable_skills:
        summary_parts.append(
            f"Immediate support is needed from volunteers with skills in {', '.join(readable_skills)}."
        )
    else:
        summary_parts.append(
            "Immediate support and available volunteers are needed."
        )

    summary_parts.append(
        "Eligible volunteers should review the case and respond as soon as possible."
    )

    return " ".join(summary_parts)


# -----------------------------
# Public health endpoint
# -----------------------------

@app.get("/health")
def health_check():
    return {
        "success": True,
        "service": "ReliefSync AI Service",
        "status": "running",
    }


# -----------------------------
# Protected extraction endpoint
# -----------------------------

@app.post("/internal/complaints/extract")
def extract_complaint(
    payload: ComplaintExtractionRequest,
    x_service_key: Optional[str] = Header(default=None),
):
    verify_service_key(x_service_key)

    category = detect_category(payload.text)
    severity = detect_severity(payload.text, category)
    required_people = detect_required_people(payload.text)
    required_skills = detect_required_skills(category)

    clarification_questions = build_clarification_questions(
        text=payload.text,
        location_hint=payload.location_hint,
        required_people=required_people,
    )

    result = ComplaintExtractionResult(
        summary=build_summary(
            text=payload.text,
            category=category,
            severity=severity,
            required_people=required_people,
        ),
        category=category,
        severity=severity,
        location_hint=payload.location_hint,
        required_people=required_people,
        required_skills=required_skills,
        needs_clarification=len(clarification_questions) > 0,
        clarification_questions=clarification_questions,
        processing_mode="rule_based_mvp",
    )

    return {
        "success": True,
        "data": result,
    }


# -----------------------------
# Protected priority endpoint
# -----------------------------

@app.post("/internal/complaints/priority")
def get_complaint_priority(
    payload: PriorityRequest,
    x_service_key: Optional[str] = Header(default=None),
):
    verify_service_key(x_service_key)

    priority, reason = calculate_priority(
        raw_text=payload.raw_text,
        ai_extracted_data=payload.ai_extracted_data,
    )

    result = PriorityResult(
        priority=priority,
        reason=reason,
        processing_mode="rule_based_mvp",
    )

    return {
        "success": True,
        "data": result,
    }


# -----------------------------
# Protected need-summary endpoint
# -----------------------------

@app.post("/internal/needs/summary")
def generate_need_summary(
    payload: NeedSummaryRequest,
    x_service_key: Optional[str] = Header(default=None),
):
    verify_service_key(x_service_key)

    summary = build_urgent_need_summary(
        title=payload.title,
        priority=payload.priority,
        extracted_data=payload.extracted_data,
    )

    result = NeedSummaryResult(
        summary=summary,
        processing_mode="rule_based_mvp",
    )

    return {
        "success": True,
        "data": result,
    }


# -----------------------------
# Protected connection test endpoint
# -----------------------------

@app.get("/internal/ping")
def internal_ping(
    x_service_key: Optional[str] = Header(default=None),
):
    verify_service_key(x_service_key)

    return {
        "success": True,
        "message": "FastAPI internal communication is protected and working",
    }

#The caching event

@app.on_event("shutdown")
def close_cache_connection() -> None:
    cache_service.close()