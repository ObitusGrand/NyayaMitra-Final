"""
NyayaScore Router — Legal health score computation.
POST /score/compute — 0-100 score across 4 components.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class ClauseInput(BaseModel):
    risk: str  # safe | caution | illegal
    law_act: str
    category: str = ""  # employment | rental | consumer | criminal


class ScoreRequest(BaseModel):
    clauses: list[ClauseInput] = []
    case_types: list[str] = []
    documents_analysed: int = 0
    active_cases: int = 0
    limitation_days_left: int = 365


class ComponentScore(BaseModel):
    score: int
    max_score: int = 25
    issues: list[str] = []


class ScoreIssue(BaseModel):
    issue: str
    points_lost: int
    fix_action: str
    law_section: str


class ScoreResponse(BaseModel):
    score: int
    components: dict[str, ComponentScore]
    top_issues: list[ScoreIssue]
    improvement_tips: list[str]


# ── Scoring helpers ──────────────────────────────────────────────────────────
def _categorize_clause(clause: ClauseInput) -> str:
    """Detect clause category from law_act if not provided."""
    if clause.category:
        return clause.category

    act = clause.law_act.lower()
    if any(k in act for k in ["wage", "industrial", "epf", "gratuity", "maternity", "posh"]):
        return "employment"
    elif any(k in act for k in ["property", "rent", "rera", "transfer"]):
        return "rental"
    elif any(k in act for k in ["consumer", "negotiable"]):
        return "consumer"
    return "criminal"


@router.post("/compute", response_model=ScoreResponse)
async def compute_score(request: ScoreRequest):
    """
    NyayaScore algorithm — Start with 100, deduct per issue.
    4 components (25 pts each): employment, rental, consumer, active_risk.
    """
    try:
        emp_deduction = 0
        rental_deduction = 0
        consumer_deduction = 0
        risk_deduction = 0

        emp_issues: list[str] = []
        rental_issues: list[str] = []
        consumer_issues: list[str] = []
        risk_issues: list[str] = []

        top_issues: list[ScoreIssue] = []

        # ── Score clauses ────────────────────────────────────────────────
        for clause in request.clauses:
            cat = _categorize_clause(clause)

            if cat == "employment":
                if clause.risk == "illegal":
                    emp_deduction += 8
                    issue = f"Illegal employment clause under {clause.law_act}"
                    if issue not in emp_issues:
                        emp_issues.append(issue)
                        top_issues.append(ScoreIssue(
                            issue=issue, points_lost=8,
                            fix_action="Challenge this clause under the cited Act",
                            law_section=clause.law_act,
                        ))
                elif clause.risk == "caution":
                    emp_deduction += 3
                    if f"Cautionary clause in {clause.law_act}" not in emp_issues:
                        emp_issues.append(f"Cautionary clause in {clause.law_act}")

            elif cat == "rental":
                if clause.risk == "illegal":
                    rental_deduction += 10
                    issue = f"Illegal rental clause under {clause.law_act}"
                    if issue not in rental_issues:
                        rental_issues.append(issue)
                        top_issues.append(ScoreIssue(
                            issue=issue, points_lost=10,
                            fix_action="This clause violates tenant rights — remove it",
                            law_section=clause.law_act,
                        ))
                elif clause.risk == "caution":
                    rental_deduction += 5
                    if f"Unfavorable rental term in {clause.law_act}" not in rental_issues:
                        rental_issues.append(f"Unfavorable rental term in {clause.law_act}")

            elif cat == "consumer":
                if clause.risk == "illegal":
                    consumer_deduction += 6
                    issue = f"Illegal consumer clause under {clause.law_act}"
                    if issue not in consumer_issues:
                        consumer_issues.append(issue)
                        top_issues.append(ScoreIssue(
                            issue=issue, points_lost=6,
                            fix_action="File complaint with Consumer Forum",
                            law_section=clause.law_act,
                        ))
                elif clause.risk == "caution":
                    consumer_deduction += 3

        # Average deductions over documents analysed
        docs_count = max(1, request.documents_analysed)
        emp_score = max(0, 25 - (emp_deduction // docs_count))
        rental_score = max(0, 25 - (rental_deduction // docs_count))
        consumer_score = max(0, 25 - (consumer_deduction // docs_count))

        # ── Active risk deductions ───────────────────────────────────────
        if request.active_cases > 0:
            case_deduction = min(10, request.active_cases * 3)
            risk_deduction += case_deduction
            risk_issues.append(f"{request.active_cases} active case(s)")

        if request.limitation_days_left < 30:
            risk_deduction += 15
            risk_issues.append("Limitation deadline approaching (<30 days)")
            top_issues.append(ScoreIssue(
                issue="Case limitation period expiring soon",
                points_lost=15,
                fix_action="File before deadline — consult DLSA for free legal aid",
                law_section="Limitation Act 1963",
            ))

        risk_score = max(0, 25 - risk_deduction)

        total = emp_score + rental_score + consumer_score + risk_score

        # ── Improvement tips ─────────────────────────────────────────────
        tips = []
        if emp_score < 20:
            tips.append("Get your employment contract reviewed — illegal clauses detected")
        if rental_score < 20:
            tips.append("Consult a lawyer about your rental agreement clauses")
        if consumer_score < 20:
            tips.append("File consumer complaints for illegal clauses — it's free")
        if risk_score < 20:
            tips.append("Address active cases urgently — limitation deadlines approaching")
        if not tips:
            tips.append("Your legal health is good! Review documents periodically")

        return ScoreResponse(
            score=total,
            components={
                "employment": ComponentScore(score=emp_score, issues=emp_issues),
                "rental": ComponentScore(score=rental_score, issues=rental_issues),
                "consumer": ComponentScore(score=consumer_score, issues=consumer_issues),
                "active_risk": ComponentScore(score=risk_score, issues=risk_issues),
            },
            top_issues=top_issues[:5],  # max 5
            improvement_tips=tips,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Score computation error: {str(e)}")
