import re
from functools import wraps
from flask import request, jsonify

# Comprehensive regex pattern list for medical & healthcare keywords, diagnoses, drugs, symptoms
HEALTHCARE_KEYWORDS = [
    r"\bdoctor\b", r"\bphysician\b", r"\bhospital\b", r"\bmedical\b", r"\bmedicine\b",
    r"\bpatient\b", r"\bdiagnosis\b", r"\bdiagnose\b", r"\bsymptom\b", r"\bsymptoms\b",
    r"\btreatment\b", r"\bdosage\b", r"\bprescription\b", r"\bpharmacist\b", r"\bpharmacy\b",
    r"\bhealth\b", r"\bhealthcare\b", r"\bclinical\b", r"\bclinic\b", r"\bcardiology\b",
    r"\boncology\b", r"\bpediatrics\b", r"\bsurgery\b", r"\bsurgic\w*\b", r"\bdisease\b",
    r"\binfection\b", r"\bantibiotic\b", r"\bvaccine\b", r"\bblood pressure\b",
    r"\bheart rate\b", r"\bdiabetes\b", r"\bcancer\b", r"\btumor\b", r"\bchemotherapy\b",
    r"\bamoxicillin\b", r"\bibuprofen\b", r"\bacetaminophen\b", r"\bparacetamol\b",
    r"\baspirin\b", r"\binsulin\b", r"\bpenicillin\b", r"\bcovid\b", r"\bvirus\b"
]

COMPILED_HEALTHCARE_REGEX = re.compile("|".join(HEALTHCARE_KEYWORDS), re.IGNORECASE)

def detect_healthcare_intent(text: str) -> tuple[bool, str]:
    """
    Analyzes input text to determine if the intent relates to healthcare, medicine, or clinical advice.
    Returns (is_medical, matched_term).
    """
    if not text:
        return False, ""
    
    match = COMPILED_HEALTHCARE_REGEX.search(text)
    if match:
        return True, match.group(0)
    return False, ""

def enforce_healthcare_guardrail(f):
    """
    Decorator for endpoints to block requests with Healthcare/Medical intent.
    Ejects with HTTP 403 Policy Violation.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        print("heree")
        data = request.get_json(silent=True) or {}
        query_text = (
    data.get("query")
    or data.get("text")
    or data.get("content")
    or data.get("prompt")
    or data.get("message")
    or data.get("input")
    or ""
)
        print(data)
        print(query_text)
        # Check query string params as well
        if not query_text:
            query_text = request.args.get("query", "")

        is_medical, term = detect_healthcare_intent(query_text)
        if is_medical:
            return jsonify({
                "layer": "Layer 1: Local Secure Gateway",
                "status": "EJECT",
                "code": 403,
                "error": "Policy Violation",
                "reason": f"Healthcare/Medical intent detected ('{term}'). Domain policy prohibits processing medical traffic.",
                "matched_term": term
            }), 403

        return f(*args, **kwargs)

    return decorated
