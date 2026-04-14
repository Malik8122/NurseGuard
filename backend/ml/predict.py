# backend/ml/predict.py
import os, math, joblib, json
from engine.fatigue import extract_features, compute_score, label as fatigue_label

MODEL_DIR   = os.path.join(os.path.dirname(__file__), "..", "model")
_model      = None
_scaler     = None
_meta       = None


def _load():
    global _model, _scaler, _meta
    if _model is None:
        mp = os.path.join(MODEL_DIR, "fatigue_rf.pkl")
        sp = os.path.join(MODEL_DIR, "scaler.pkl")
        jp = os.path.join(MODEL_DIR, "model_meta.json")
        if os.path.exists(mp) and os.path.exists(sp):
            _model  = joblib.load(mp)
            _scaler = joblib.load(sp)
        if os.path.exists(jp):
            with open(jp) as f:
                _meta = json.load(f)


def is_ready() -> bool:
    _load()
    return _model is not None


def predict_score(shifts: list) -> float:
    """Predict fatigue score using ML model. Falls back to rule-based if model not loaded."""
    _load()
    feat = extract_features(shifts)
    if feat is None:
        return 0.0
    if _model is None:
        return compute_score(shifts)
    try:
        X   = _scaler.transform([feat])
        val = float(_model.predict(X)[0])
        val = max(0.0, min(10.0, val))
        if math.isnan(val) or math.isinf(val):
            val = compute_score(shifts)
        return round(val, 2)
    except Exception:
        return compute_score(shifts)


def predict_all(schedule: dict) -> dict:
    """Predict fatigue scores for all nurses in a schedule"""
    return {nid: predict_score(shifts) for nid, shifts in schedule.items()}


def get_meta() -> dict:
    _load()
    return _meta or {}