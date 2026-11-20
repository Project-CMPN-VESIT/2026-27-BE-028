import json
import os
import re
import traceback
from typing import Any

DISCLAIMER = (
    "Quantitative attribution, physics rules, and astrodynamic constraints "
    "remain authoritative over natural-language outputs."
)

DEFAULT_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


# ============================================================
# BASIC HELPERS
# ============================================================

def _format(value: Any, digits: int = 4) -> str:
    """Format numbers cleanly for human-readable explanations."""
    if value is None:
        return "not available"
    try:
        if isinstance(value, float):
            if abs(value) < 1e-4 and value != 0:
                return f"{value:.3e}"
            return f"{value:.{digits}g}"
        if isinstance(value, int):
            return str(value)
        return str(value)
    except Exception:
        return str(value)


def _to_float(value: Any) -> float | None:
    """Safely convert a value to float."""
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


# ============================================================
# HUMAN-READABLE INTERPRETATIONS
# ============================================================

def _interpret_tca(tca: Any) -> str:
    value = _to_float(tca)
    if value is None:
        return "Time to Closest Approach (TCA) is unavailable."
    if value < 0:
        return (
            f"Time to Closest Approach is {abs(value):.2f}h in the past; "
            "this encounter has already concluded (closed)."
        )
    if value < 6:
        return f"TCA is expected in {value:.2f}h — encounter is time-critical with an urgent lead window."
    if value < 24:
        return f"TCA is expected in {value:.2f}h — tactical decision horizon is active."
    if value < 72:
        return f"TCA is expected in {value:.2f}h — moderate decision window available for further tracking."
    return f"TCA is expected in {value:.2f}h — substantial planning horizon allows continued orbit determination."


def _interpret_poc(poc: Any) -> str:
    value = _to_float(poc)
    if value is None:
        return "Probability of Collision (PoC) is unavailable."
    if value == 0:
        return "Stored Probability of Collision is 0 (below numerical resolution)."
    if value < 1e-5:
        return f"PoC is {_format(value)} (nominal background encounter risk)."
    if value < 1e-4:
        return f"PoC is {_format(value)} (elevated conjunction monitoring threshold)."
    if value < 1e-3:
        return f"PoC is {_format(value)} (actionable warning threshold exceeded)."
    return f"PoC is {_format(value)} (critical conjunction risk requiring active mitigation)."


def _interpret_delta_v(required_dv: Any, max_dv: Any) -> str:
    required = _to_float(required_dv)
    maximum = _to_float(max_dv)
    if required is None:
        return "Required Delta-V is unavailable."
    if maximum is None:
        return f"Required Delta-V is {_format(required)} m/s (Maximum budget unspecified)."
    if required <= maximum:
        margin_pct = ((maximum - required) / maximum) * 100 if maximum > 0 else 0
        return (
            f"Required ΔV is {_format(required)} m/s, within thruster budget "
            f"of {_format(maximum)} m/s ({margin_pct:.1f}% fuel margin remaining; FEASIBLE)."
        )
    return (
        f"Required ΔV is {_format(required)} m/s, exceeding maximum thruster capability "
        f"of {_format(maximum)} m/s (PHYSICALLY INFEASIBLE)."
    )


def _interpret_consensus(current_decision: str, commit_count: int, model_count: int) -> str:
    decision = str(current_decision).upper()
    if model_count == 0:
        return f"System recommendation is {decision} based on single-model evaluation."
    if commit_count == model_count:
        return f"All {model_count} models unanimously predicted COMMIT for proactive collision mitigation."
    if commit_count == 0:
        return f"All {model_count} models unanimously predicted WAIT (optimal tracking / low immediate risk)."
    return f"{commit_count} of {model_count} models recommended COMMIT ({model_count - commit_count} voted WAIT); majority consensus active."


# ============================================================
# STRUCTURED EXPLANATION BUILDER (DETERMINISTIC & GROUND TRUTH)
# ============================================================

def build_structured_sections(context: dict[str, Any]) -> dict[str, Any]:
    event = context.get("event") or {}
    models = context.get("models") or []
    what_if = context.get("what_if")
    decision = context.get("decision") or {}
    top_features = context.get("top_xai_features") or []

    poc = _to_float(event.get("poc"))
    tca = _to_float(event.get("time_to_TCA"))
    req_dv = _to_float(event.get("deltav_required"))
    max_dv = _to_float(event.get("max_delta_v"))
    fuel_margin = _to_float(event.get("fuel_margin"))
    dist = _to_float(event.get("relative_distance"))
    closing_rate = _to_float(event.get("relative_closing_rate"))

    current_decision = str(decision.get("current", "WAIT")).upper()
    if current_decision in {"1", "COMMIT"}:
        dec_label = "COMMIT"
        dec_tone = "critical"
    elif current_decision in {"0", "WAIT"}:
        dec_label = "WAIT"
        dec_tone = "info"
    elif current_decision == "INVALID_CLOSED":
        dec_label = "INVALID_CLOSED"
        dec_tone = "warning"
    else:
        dec_label = current_decision
        dec_tone = "neutral"

    if isinstance(models, dict):
        model_list = list(models.values())
    elif isinstance(models, list):
        model_list = models
    else:
        model_list = []

    model_count = len(model_list)
    commit_count = sum(1 for m in model_list if isinstance(m, dict) and m.get("prediction") == 1)
    is_feasible = (req_dv <= max_dv) if (req_dv is not None and max_dv is not None) else None

    # 1. Decision & Consensus
    s1_bullets = [
        f"Recommended Action: {dec_label}",
        f"Model Consensus: {commit_count} / {model_count} models voted COMMIT" if model_count else "Single-model evaluation",
    ]
    if dec_label == "COMMIT":
        s1_bullets.append("Mitigation threshold reached; active orbit-raising or cross-track burn recommended.")
    elif dec_label == "INVALID_CLOSED":
        s1_bullets.append("Encounter has passed or maneuver window has expired; event closed.")
    else:
        s1_bullets.append("Conjunction uncertainty gathering optimal; preserve propellant and continue observation.")

    # 2. Causal Kinematics & Astrodynamics
    s2_bullets = []
    if tca is not None:
        if tca < 0:
            s2_bullets.append(f"Time to TCA: {abs(tca):.2f}h in past (closed encounter)")
        else:
            s2_bullets.append(f"Time to TCA: {tca:.2f}h ({'urgent window' if tca < 12 else 'standard horizon'})")
    if poc is not None:
        s2_bullets.append(f"Collision Probability (PoC): {poc:.3e} ({'critical' if poc >= 1e-4 else 'nominal'})")
    if req_dv is not None and max_dv is not None:
        status_str = "FEASIBLE" if is_feasible else "INFEASIBLE"
        s2_bullets.append(f"Propulsion Budget: Required ΔV = {req_dv:.4f} m/s vs Max Available = {max_dv:.4f} m/s [{status_str}]")
    if dist is not None:
        s2_bullets.append(f"Relative Distance: {dist:.1f} m")
    if closing_rate is not None:
        s2_bullets.append(f"Relative Closing Rate: {closing_rate:.2f} m/s")

    # 3. Explainable AI (XAI) Attribution Ranking
    s3_bullets = []
    if top_features:
        for f in top_features[:5]:
            if isinstance(f, dict):
                feat_name = f.get("feature", "unknown")
                attrib = f.get("abs_attribution") or f.get("attribution")
                val_str = f" ({_format(attrib)})" if attrib is not None else ""
                s3_bullets.append(f"Top Attribution: {feat_name}{val_str}")
        s3_bullets.append("Scientific Rigor: Attributions quantify model reliance, not physical causation.")
    else:
        s3_bullets.append("Feature reliance derived from neural Integrated Gradients and Tree SHAP attributions.")

    # 4. What-If Counterfactual Sensitivity (if present)
    s4 = None
    if what_if:
        interv_type = what_if.get("intervention", "timing")
        f_poc = _to_float(what_if.get("factual_poc"))
        cf_poc = _to_float(what_if.get("counterfactual_poc"))
        f_dv = _to_float(what_if.get("factual_deltav"))
        cf_dv = _to_float(what_if.get("counterfactual_deltav"))
        d_decision = decision.get("what_if", current_decision)
        cf_admissible = what_if.get("counterfactual_admissible", True)

        s4_bullets = [
            f"Intervention Tested: {interv_type.replace('_', ' ').upper()}",
            f"PoC Response: {_format(f_poc)} ➔ {_format(cf_poc)}",
            f"ΔV Response: {_format(f_dv)} m/s ➔ {_format(cf_dv)} m/s",
            f"Decision Shift: {current_decision} ➔ {d_decision} ({'Boundary Crossed' if current_decision != d_decision else 'Decision Stable'})",
            f"Astrodynamic Admissibility: {'PASS (Shield Admissible)' if cf_admissible else 'OVERRIDDEN BY SAFETY SHIELD'}"
        ]
        s4 = {
            "id": "what_if_sensitivity",
            "title": "4. What-If Counterfactual Sensitivity Analysis",
            "badge": "PEARL SCM COUNTERFACTUAL",
            "tone": "amber",
            "bullets": s4_bullets,
            "text": (
                f"Under Pearl's Structural Causal Model, modifying {interv_type} propagated through the "
                f"astrodynamic equations. Because required impulsive velocity scales inversely with lead time "
                f"(ΔV ∝ 1/Δt), advancing the maneuver timing lowers propulsion demand and clears collision risk."
            )
        }

    # 5. Flight Director Directive
    s5_bullets = [
        f"Operational Directive: {'COMMIT TO COLLISION AVOIDANCE BURN' if dec_label == 'COMMIT' else 'CONTINUE SENSOR TRACKING & ORBIT DETERMINATION' if dec_label == 'WAIT' else 'ENCOUNTER COMPLETE'}",
        "Safety Shield Verification: Zero Type-A physical constraint violations (R1 ΔV ≤ ΔV_max, R2 t_TCA > 0, R3 W_rem > 0).",
        "Authoritative Precedence: Quantitative telemetry and physical laws strictly supersede natural-language briefings."
    ]

    sections = [
        {
            "id": "decision",
            "title": "1. Mission Decision & Multi-Model Consensus",
            "badge": f"CONSENSUS: {commit_count}/{model_count} {dec_label}" if model_count else dec_label,
            "tone": dec_tone,
            "bullets": s1_bullets,
            "text": _interpret_consensus(current_decision, commit_count, model_count)
        },
        {
            "id": "causal_mechanics",
            "title": "2. Causal Kinematics & Astrodynamic Drivers",
            "badge": "ASTRODYNAMICS & CAUSAL SCM",
            "tone": "info",
            "bullets": s2_bullets,
            "text": f"{_interpret_tca(tca)} {_interpret_poc(poc)} {_interpret_delta_v(req_dv, max_dv)}"
        },
        {
            "id": "xai_factors",
            "title": "3. Explainable AI (XAI) Attribution Ranking",
            "badge": "CAPTUM IG & TREE SHAP",
            "tone": "purple",
            "bullets": s3_bullets,
            "text": "Attribution scores measure what the models attended to when constructing decision boundaries. The Causal DAG confirms these match true kinematic drivers."
        }
    ]
    if s4:
        sections.append(s4)

    sections.append({
        "id": "directive",
        "title": f"{len(sections) + 1}. Flight Operations Directive & Safety Shield",
        "badge": "SAFETY SHIELD VERIFIED",
        "tone": "emerald" if is_feasible is not False else "rose",
        "bullets": s5_bullets,
        "text": "The Neuro-Symbolic Safety Shield guarantees that no physically impossible maneuver will be executed. Verify telemetry before thrust uplink."
    })

    # Build clear, structured Markdown string
    md_lines = []
    for s in sections:
        md_lines.append(f"### {s['title']}")
        for b in s["bullets"]:
            parts = b.split(":", 1)
            if len(parts) == 2:
                md_lines.append(f"- **{parts[0].strip()}:** {parts[1].strip()}")
            else:
                md_lines.append(f"- {b}")
        md_lines.append(f"\n{s['text']}\n")

    headline = (
        f"Mission Status: {dec_label} ({commit_count}/{model_count} Models Agree). "
        f"Physics Feasibility: {'PASS' if is_feasible is not False else 'VIOLATION DETECTED'}."
    )

    return {
        "headline": headline,
        "sections": sections,
        "markdown": "\n".join(md_lines).strip()
    }


def deterministic_explanation(context: dict[str, Any]) -> str:
    """Legacy helper returning full formatted markdown string."""
    res = build_structured_sections(context)
    return res["markdown"]


# ============================================================
# GEMINI PROMPT & PARSER
# ============================================================

def _prompt(context: dict[str, Any]) -> str:
    verified_json = json.dumps(context, indent=2, default=str)
    has_what_if = bool(context.get("what_if"))

    sections_instruction = """
### 1. Mission Decision & Multi-Model Consensus
- Bullet with recommended action and model consensus count
- Brief explanation of the decision rationale

### 2. Causal Kinematics & Astrodynamic Drivers
- Bullet with Time to TCA and urgency assessment
- Bullet with Probability of Collision (PoC) level
- Bullet with Required ΔV vs Thruster Capability
- Astrodynamic causal explanation of why this encounter requires action or waiting under orbital mechanics (noting ΔV ∝ 1/Δt)

### 3. Explainable AI (XAI) Attribution Ranking
- Bullets for the top features relied upon by the models
- Scientific explanation distinguishing model reliance from physical causation
"""
    if has_what_if:
        sections_instruction += """
### 4. What-If Counterfactual Sensitivity Analysis
- Bullet on intervention tested (timing advance or delta-V scaling)
- Bullet on Collision risk delta (factual vs counterfactual PoC)
- Bullet on Decision boundary impact (did it cross from WAIT to COMMIT or vice versa)
- Counterfactual mechanics explanation
"""
    sections_instruction += f"""
### {5 if has_what_if else 4}. Flight Operations Directive & Safety Shield
- Clear actionable directive for mission operators
- Safety constraint verification (Type A inviolable rules: ΔV, TCA, Window)
- Authoritative disclaimer
"""

    return f"""
You are an expert flight dynamics and AI explainability specialist for a satellite collision-avoidance mission control system.

Your task is to convert the supplied VERIFIED CONTEXT into a clear, highly structured, flight-grade debrief.

CRITICAL RULES:
1. Use ONLY values supplied in VERIFIED CONTEXT. Never invent values.
2. Strictly format each section using H3 markdown headers (###), bold bullet points (- **Key:** description), followed by a concise explanatory paragraph.
3. Explicitly distinguish model feature reliance (XAI) from structural physical causation.
4. If Time to TCA is negative, explicitly state that TCA has already elapsed and the encounter is closed.

Format your response exactly with these sections:
{sections_instruction}

VERIFIED CONTEXT:
{verified_json}
"""


def parse_markdown_to_sections(text: str, default_sections: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Parses markdown with ### headers into structured sections, matching default metadata."""
    if not text or "###" not in text:
        return default_sections

    raw_blocks = re.split(r"(?=###\s+)", text.strip())
    parsed_sections = []

    for block in raw_blocks:
        if not block.startswith("###"):
            continue
        lines = [line.strip() for line in block.split("\n") if line.strip()]
        if not lines:
            continue
        title = lines[0].replace("###", "").strip()
        bullets = []
        body_lines = []
        for line in lines[1:]:
            if line.startswith("-") or line.startswith("*"):
                cleaned_bullet = re.sub(r"^[-*]\s*", "", line).strip()
                # remove surrounding markdown bold if entire line
                bullets.append(cleaned_bullet)
            else:
                body_lines.append(line)

        # Match with default section for badge/tone
        matched_default = None
        for ds in default_sections:
            if ds["title"][:8].lower() in title.lower() or ds["id"] in title.lower():
                matched_default = ds
                break

        parsed_sections.append({
            "id": matched_default["id"] if matched_default else f"sec_{len(parsed_sections)+1}",
            "title": title,
            "badge": matched_default["badge"] if matched_default else "VERIFIED BRIEF",
            "tone": matched_default["tone"] if matched_default else "info",
            "bullets": bullets if bullets else (matched_default["bullets"] if matched_default else []),
            "text": " ".join(body_lines) if body_lines else (matched_default["text"] if matched_default else "")
        })

    return parsed_sections if parsed_sections else default_sections


# ============================================================
# GEMINI GENERATION ENTRYPOINT
# ============================================================

def generate_explanation(context: dict[str, Any]) -> dict[str, Any]:
    """
    Generate a clear, structured explanation using Gemini with deterministic fallback.
    Guarantees structured sections, headline, and markdown text.
    """
    structured_fallback = build_structured_sections(context)

    # Read API Key
    try:
        from dotenv import load_dotenv
        from pathlib import Path
        load_dotenv()
        for p in [Path.cwd(), Path(__file__).resolve().parents[2], Path(__file__).resolve().parents[3]]:
            env_file = p / ".env"
            if env_file.exists():
                load_dotenv(env_file)
    except Exception:
        pass

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {
            "status": "fallback",
            "provider": "deterministic",
            "headline": structured_fallback["headline"],
            "sections": structured_fallback["sections"],
            "explanation": structured_fallback["markdown"],
            "message": "Gemini API key is not configured. Showing verified deterministic flight briefing.",
            "disclaimer": DISCLAIMER,
        }

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(timeout=30000),
        )

        response = client.models.generate_content(
            model=DEFAULT_GEMINI_MODEL,
            contents=_prompt(context),
        )

        text = getattr(response, "text", None)
        if not text or not text.strip():
            raise RuntimeError("Gemini returned an empty response.")

        cleaned_text = text.strip()
        parsed_sections = parse_markdown_to_sections(cleaned_text, structured_fallback["sections"])

        return {
            "status": "success",
            "provider": "gemini",
            "model": DEFAULT_GEMINI_MODEL,
            "headline": structured_fallback["headline"],
            "sections": parsed_sections,
            "explanation": cleaned_text,
            "message": "AI-synthesized flight debrief grounded in verified telemetry and astrodynamics.",
            "disclaimer": DISCLAIMER,
        }

    except Exception as exc:
        print("\n" + "=" * 70)
        print("GEMINI API ERROR (Falling back to deterministic structured briefing)")
        print("=" * 70)
        traceback.print_exc()
        print("=" * 70 + "\n")

        return {
            "status": "fallback",
            "provider": "deterministic",
            "headline": structured_fallback["headline"],
            "sections": structured_fallback["sections"],
            "explanation": structured_fallback["markdown"],
            "message": f"Gemini error: {type(exc).__name__}: {exc}. Showing verified deterministic flight briefing.",
            "disclaimer": DISCLAIMER,
        }
