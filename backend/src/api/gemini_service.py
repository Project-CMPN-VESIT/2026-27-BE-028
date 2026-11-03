import json
import os
import traceback
from typing import Any


DISCLAIMER = (
    "LLM explanation is a natural-language interpretation of model/XAI outputs "
    "and does not replace the underlying quantitative analysis."
)

DEFAULT_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


# ============================================================
# BASIC HELPERS
# ============================================================

def _format(value: Any, digits: int = 4) -> str:
    """
    Format numbers cleanly for human-readable explanations.
    """
    if value is None:
        return "not available"

    try:
        if isinstance(value, float):
            return f"{value:.{digits}g}"

        if isinstance(value, int):
            return str(value)

        return str(value)

    except Exception:
        return str(value)


def _to_float(value: Any) -> float | None:
    """
    Safely convert a value to float.
    """
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
    """
    Convert time_to_TCA into understandable language.
    """

    value = _to_float(tca)

    if value is None:
        return "The Time to Closest Approach (TCA) is not available."

    if value < 0:
        return (
            f"The Time to Closest Approach is {abs(value):.2f} hours in the past, "
            "which means this encounter has already passed."
        )

    if value < 6:
        return (
            f"The closest approach is expected in {value:.2f} hours, "
            "so the encounter is time-critical."
        )

    if value < 24:
        return (
            f"The closest approach is expected in {value:.2f} hours, "
            "so the available decision window is limited."
        )

    if value < 72:
        return (
            f"The closest approach is expected in {value:.2f} hours, "
            "leaving a moderate decision window."
        )

    return (
        f"The closest approach is expected in {value:.2f} hours, "
        "leaving a relatively large decision window."
    )


def _interpret_poc(poc: Any) -> str:
    """
    Convert PoC into understandable language.
    """

    value = _to_float(poc)

    if value is None:
        return "The Probability of Collision (PoC) is not available."

    if value == 0:
        return (
            "The stored Probability of Collision is 0, so the supplied event "
            "data does not indicate a collision risk according to the project's PoC calculation."
        )

    if value < 0.01:
        return (
            f"The Probability of Collision is {_format(value)}, "
            "which is very low."
        )

    if value < 0.1:
        return (
            f"The Probability of Collision is {_format(value)}, "
            "which indicates a relatively low collision probability."
        )

    return (
        f"The Probability of Collision is {_format(value)}, "
        "which indicates a higher collision probability and requires attention."
    )


def _interpret_delta_v(required_dv: Any, max_dv: Any) -> str:
    """
    Explain maneuver Delta-V and feasibility.
    """

    required = _to_float(required_dv)
    maximum = _to_float(max_dv)

    if required is None:
        return "The required Delta-V is not available."

    if maximum is None:
        return (
            f"The required Delta-V is {_format(required)}. "
            "The maximum available Delta-V is not available, so maneuver feasibility "
            "cannot be determined from these values alone."
        )

    if required <= maximum:
        return (
            f"The maneuver would require Delta-V of {_format(required)}, "
            f"while the maximum available Delta-V is {_format(maximum)}. "
            "The maneuver is within the available Delta-V capability."
        )

    return (
        f"The maneuver would require Delta-V of {_format(required)}, "
        f"but the maximum available Delta-V is only {_format(maximum)}. "
        "Therefore, the maneuver is beyond the available Delta-V capability."
    )


def _interpret_consensus(
    current_decision: str,
    commit_count: int,
    model_count: int,
) -> str:
    """
    Explain model consensus.
    """

    decision = str(current_decision).upper()

    if model_count == 0:
        return (
            f"The current decision is {decision}, but no model outputs "
            "are available to calculate model consensus."
        )

    if commit_count == model_count:
        return (
            f"All {model_count} models predicted COMMIT, giving a unanimous "
            "recommendation to perform the maneuver."
        )

    if commit_count == 0:
        return (
            f"All {model_count} models predicted WAIT/NO COMMIT, giving a "
            "unanimous recommendation not to perform the maneuver."
        )

    return (
        f"{commit_count} of {model_count} models predicted COMMIT, "
        "so the models do not have unanimous agreement."
    )


# ============================================================
# DETERMINISTIC FALLBACK
# ============================================================

def deterministic_explanation(context: dict[str, Any]) -> str:
    """
    Generate a human-readable explanation without an LLM.

    This is used when Gemini is unavailable.
    """

    event = context.get("event") or {}

    models = context.get("models") or []

    # --------------------------------------------------------
    # FIX:
    # models can be either a dictionary or a list.
    # --------------------------------------------------------

    if isinstance(models, dict):
        model_outputs = list(models.values())
    elif isinstance(models, list):
        model_outputs = models
    else:
        model_outputs = []

    what_if = context.get("what_if")
    decision = context.get("decision") or {}

    current_decision = decision.get(
        "current",
        "not available"
    )

    what_if_decision = decision.get(
        "what_if",
        current_decision
    )

    poc = event.get("poc")
    tca = event.get("time_to_TCA")
    required_dv = event.get("deltav_required")
    max_dv = event.get("max_delta_v")

    # --------------------------------------------------------
    # MODEL CONSENSUS
    # --------------------------------------------------------

    commit_count = sum(
        1
        for output in model_outputs
        if isinstance(output, dict)
        and output.get("prediction") == 1
    )

    model_count = len(model_outputs)

    # --------------------------------------------------------
    # FEASIBILITY
    # --------------------------------------------------------

    required_value = _to_float(required_dv)
    max_value = _to_float(max_dv)

    if required_value is not None and max_value is not None:
        feasible = required_value <= max_value
    else:
        feasible = None

    # --------------------------------------------------------
    # DECISION LABEL
    # --------------------------------------------------------

    decision_upper = str(current_decision).upper()

    if decision_upper in {"COMMIT", "1"}:
        decision_text = "COMMIT"
    elif decision_upper in {"WAIT", "0"}:
        decision_text = "WAIT"
    elif decision_upper == "INVALID_CLOSED":
        decision_text = "INVALID_CLOSED"
    else:
        decision_text = decision_upper

    # ========================================================
    # BUILD EXPLANATION
    # ========================================================

    lines = []

    # --------------------------------------------------------
    # DECISION SUMMARY
    # --------------------------------------------------------

    lines.extend([
        "Decision Summary",
        f"The current system decision is {decision_text}.",
        _interpret_consensus(
            current_decision,
            commit_count,
            model_count,
        ),
    ])

    # --------------------------------------------------------
    # WHY THE MODEL CHOSE THIS
    # --------------------------------------------------------

    lines.extend([
        "",
        "Why the Model Chose This",
        _interpret_tca(tca),
        _interpret_poc(poc),
        _interpret_delta_v(required_dv, max_dv),
    ])

    # --------------------------------------------------------
    # FEASIBILITY
    # --------------------------------------------------------

    if feasible is True:
        lines.append(
            "The maneuver passes the available Delta-V feasibility check."
        )
    elif feasible is False:
        lines.append(
            "The maneuver fails the available Delta-V feasibility check."
        )
    else:
        lines.append(
            "Maneuver feasibility cannot be fully determined because "
            "the required or maximum Delta-V value is unavailable."
        )

    # --------------------------------------------------------
    # MOST IMPORTANT XAI FACTORS
    # --------------------------------------------------------

    top_features = context.get("top_xai_features") or []

    if top_features:

        names = []

        for item in top_features[:5]:

            if not isinstance(item, dict):
                continue

            feature = item.get("feature")

            if feature and feature not in names:
                names.append(str(feature))

        if names:

            lines.extend([
                "",
                "Most Important Factors",
                (
                    "The stored XAI analysis identifies the following inputs "
                    "as important to the model's prediction: "
                    + ", ".join(names)
                    + "."
                ),
                (
                    "These features indicate what the model relied on for "
                    "its prediction; they should not be interpreted as proof "
                    "that these features physically caused the outcome."
                ),
            ])

        else:

            lines.extend([
                "",
                "Most Important Factors",
                "No usable feature names were found in the stored XAI artifact.",
            ])

    else:

        lines.extend([
            "",
            "Most Important Factors",
            "The event-level XAI artifact is not available.",
        ])

    # ========================================================
    # WHAT-IF ANALYSIS
    # ========================================================

    if what_if:

        intervention = what_if.get(
            "intervention",
            "sensitivity analysis"
        )

        factual_poc = what_if.get("factual_poc")
        counterfactual_poc = what_if.get("counterfactual_poc")

        factual_deltav = what_if.get("factual_deltav")
        counterfactual_deltav = what_if.get("counterfactual_deltav")

        lines.extend([
            "",
            "What-If Result",
            (
                f"The What-If analysis changed the selected input "
                f"({intervention})."
            ),
        ])

        # PoC explanation

        if factual_poc is not None and counterfactual_poc is not None:

            lines.append(
                f"PoC changed from {_format(factual_poc)} "
                f"to {_format(counterfactual_poc)}."
            )

        else:

            lines.append(
                "The What-If PoC values are not fully available."
            )

        # Delta-V explanation

        if factual_deltav is not None and counterfactual_deltav is not None:

            lines.append(
                f"Required Delta-V changed from {_format(factual_deltav)} "
                f"to {_format(counterfactual_deltav)}."
            )

        else:

            lines.append(
                "The What-If Delta-V values are not fully available."
            )

        # Decision change

        current_upper = str(current_decision).upper()
        what_if_upper = str(what_if_decision).upper()

        if current_upper == what_if_upper:

            lines.extend([
                (
                    f"The recommendation remained {what_if_upper} "
                    "after the What-If change."
                ),
                (
                    "This means the transformed inputs did not move the "
                    "model's recommendation across its existing decision boundary."
                ),
            ])

        else:

            lines.extend([
                (
                    f"The recommendation changed from {current_upper} "
                    f"to {what_if_upper} after the What-If change."
                ),
                (
                    "This indicates that the transformed input state was "
                    "sufficient to change the model's recommendation."
                ),
            ])

        lines.append(
            "The What-If result is a model sensitivity analysis. "
            "It is not a physically propagated maneuver simulation."
        )

    # ========================================================
    # WHAT THE NUMBERS MEAN
    # ========================================================

    lines.extend([
        "",
        "What the Numbers Mean",
        (
            "PoC represents the Probability of Collision used by the project. "
            "Time to TCA indicates how far the event is from its closest approach. "
            "Required Delta-V represents the maneuver effort estimated by the project."
        ),
    ])

    # ========================================================
    # OPERATIONAL INTERPRETATION
    # ========================================================

    if _to_float(tca) is not None and _to_float(tca) < 0:

        lines.extend([
            "",
            "Operational Interpretation",
            (
                "This encounter appears to be closed because its Time to "
                "Closest Approach is already in the past. Therefore, the "
                "decision should not be interpreted as a recommendation "
                "for a future maneuver on this encounter."
            ),
        ])

    elif decision_upper in {"COMMIT", "1"}:

        lines.extend([
            "",
            "Operational Interpretation",
            (
                "The system recommends COMMIT based on the supplied model "
                "outputs and safety-related inputs. This recommendation "
                "should still be evaluated against the project's operational "
                "constraints before execution."
            ),
        ])

    elif decision_upper in {"WAIT", "0"}:

        lines.extend([
            "",
            "Operational Interpretation",
            (
                "The system recommends WAIT based on the supplied model "
                "outputs and current event state. No maneuver should be "
                "inferred from this explanation alone."
            ),
        ])

    else:

        lines.extend([
            "",
            "Operational Interpretation",
            (
                "The event should be interpreted using the underlying "
                "quantitative outputs and safety checks because the current "
                "decision label is not a standard COMMIT/WAIT state."
            ),
        ])

    # ========================================================
    # INTERPRETATION BOUNDARY
    # ========================================================

    lines.extend([
        "",
        "Interpretation Boundary",
        (
            "XAI explains which inputs the models relied on for their "
            "prediction. It does not establish that those inputs caused "
            "the outcome. The causal analysis is observational and "
            "depends on its underlying assumptions."
        ),
    ])

    return "\n".join(lines)


# ============================================================
# GEMINI PROMPT
# ============================================================

def _prompt(context: dict[str, Any]) -> str:
    """
    Prompt Gemini to produce a clear human-readable explanation.
    """

    verified_json = json.dumps(
        context,
        indent=2,
        default=str,
    )

    return f"""
You are an explainability assistant for a satellite collision-avoidance
decision-support system.

Your job is to convert the supplied verified project data into a clear,
human-readable explanation.

IMPORTANT RULES:

1. Use ONLY the values supplied in VERIFIED CONTEXT.
2. Never invent missing measurements.
3. Never invent thresholds.
4. Never invent physical relationships.
5. Never change or override the system decision.
6. Never claim that an XAI feature caused the decision.
7. Feature importance means the model relied on that feature; it does NOT
   prove physical causation.
8. Clearly distinguish:
   - model prediction
   - XAI feature importance
   - What-If sensitivity analysis
   - observational causal analysis
9. If Time to TCA is negative, explicitly explain that the TCA is in the past
   and the encounter is already closed.
10. Explain numbers in simple language instead of merely repeating raw values.
11. Do not use unexplained abbreviations unless you explain them.
12. Do not say "not available from the current model output". Instead say
    "This value is not available in the supplied data."
13. If maximum Delta-V is missing, do not calculate feasibility.
14. Do not claim that a tiny or large Delta-V is automatically good or bad
    unless the supplied data supports that conclusion.
15. The What-If result is a sensitivity analysis, not a physically propagated
    maneuver simulation.

Write the answer using exactly these sections:

Decision Summary

Why the Model Chose This

Most Important Factors

What the Numbers Mean

What-If Result

Why the Decision Changed / Did Not Change

Operational Interpretation

Keep the explanation concise but understandable to a non-expert.

VERIFIED CONTEXT:
{verified_json}
"""


# ============================================================
# GEMINI GENERATION
# ============================================================

def generate_explanation(context: dict[str, Any]) -> dict[str, Any]:
    """
    Generate an explanation using Gemini.

    If Gemini is unavailable or fails, use the deterministic explanation.
    """

    # Always prepare fallback first.
    fallback = deterministic_explanation(context)

    # --------------------------------------------------------
    # READ API KEY
    # --------------------------------------------------------

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
            "explanation": fallback,
            "message": (
                "Gemini API key is not configured. "
                "Showing deterministic explanation from verified project data."
            ),
            "disclaimer": DISCLAIMER,
        }

    # --------------------------------------------------------
    # TRY GEMINI
    # --------------------------------------------------------

    try:

        from google import genai
        from google.genai import types

        client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(
                timeout=30000,
            ),
        )

        response = client.models.generate_content(
            model=DEFAULT_GEMINI_MODEL,
            contents=_prompt(context),
        )

        text = getattr(response, "text", None)

        if not text or not text.strip():

            raise RuntimeError(
                "Gemini returned an empty response."
            )

        return {
            "status": "success",
            "provider": "gemini",
            "model": DEFAULT_GEMINI_MODEL,
            "explanation": text.strip(),
            "disclaimer": DISCLAIMER,
        }

    # --------------------------------------------------------
    # GEMINI FAILURE
    # --------------------------------------------------------

    except Exception as exc:

        # Print complete traceback to FastAPI terminal.
        # This is important for debugging.
        print("\n" + "=" * 70)
        print("GEMINI API ERROR")
        print("=" * 70)
        traceback.print_exc()
        print("=" * 70 + "\n")

        return {
            "status": "fallback",
            "provider": "deterministic",
            "explanation": fallback,
            "message": (
                f"Gemini error: {type(exc).__name__}: {exc}. "
                "Showing deterministic explanation from verified project data."
            ),
            "disclaimer": DISCLAIMER,
        }