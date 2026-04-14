# backend/engine/fatigue.py
"""
Fatigue scoring engine based on real hospital regulations:
- NHS: max 48h/week, min 11h rest between shifts
- Joint Commission (USA): flag >5 consecutive days, >3 consecutive nights
- ICN: weekend limits, night shift penalties
Scores are 0-10 (matching CareSync display format)
"""

SHIFT_HOURS = {
    "Morning": 8, "Evening": 8, "Night": 10, "Off": 0,
    "Early": 8,   "Day": 8,    "Late": 8,
}
SHIFT_WEIGHT = {
    "Morning": 10, "Evening": 12, "Night": 20, "Off": 0,
    "Early": 10,   "Day": 8,     "Late": 12,
}
FORBIDDEN_SUC = {
    "Night":   ["Morning", "Early", "Day"],
    "Late":    ["Early", "Morning"],
    "Evening": ["Morning", "Early"],
    "Day":     [], "Early": [], "Morning": [], "Off": [],
}

SHIFT_DISPLAY = {
    "Morning": "M", "Evening": "E", "Night": "N", "Off": "OFF",
    "Early": "M",   "Day": "M",    "Late": "E",  "AL": "AL",
}


def compute_score(shifts: list) -> float:
    """Return fatigue score 0–10"""
    n = len(shifts)
    if n == 0:
        return 0.0
    s = 0.0

    # 1. Base fatigue load (0–4 pts)
    base = sum(SHIFT_WEIGHT.get(x, 0) for x in shifts)
    s += min(base / (n * 20) * 4, 4.0)

    # 2. Consecutive work streak — NHS flag >5 days
    consec = max_consec = 0
    for x in shifts:
        consec = consec + 1 if x != "Off" else 0
        max_consec = max(max_consec, consec)
    if max_consec > 5:
        s += min((max_consec - 5) * 0.5, 2.0)

    # 3. Night streak — Joint Commission flag >3 nights
    nc = max_nc = 0
    for x in shifts:
        nc = nc + 1 if x == "Night" else 0
        max_nc = max(max_nc, nc)
    if max_nc > 3:
        s += min((max_nc - 3) * 0.4, 2.0)

    # 4. Forbidden successions — insufficient rest
    for i in range(n - 1):
        if shifts[i + 1] in FORBIDDEN_SUC.get(shifts[i], []):
            s += 0.3

    # 5. Weekly hours — NHS flag >48h/week
    for w in range(n // 7):
        week = shifts[w * 7:(w + 1) * 7]
        hours = sum(SHIFT_HOURS.get(x, 0) for x in week)
        if hours > 48:
            s += 0.5

    # 6. Weekend overwork — ICN
    weekend = sum(1 for i, x in enumerate(shifts) if i % 7 in [5, 6] and x != "Off")
    if weekend > 2:
        s += min((weekend - 2) * 0.2, 1.0)

    return round(min(s, 10.0), 2)


def score_all(schedule: dict) -> dict:
    return {nid: compute_score(shifts) for nid, shifts in schedule.items()}


def label(score: float) -> tuple:
    """Returns (label, color_hex)"""
    if score >= 5.0:
        return "High risk", "#EF4444"
    if score >= 2.0:
        return "Medium", "#F59E0B"
    return "Safe", "#10B981"


def extract_features(shifts: list) -> list | None:
    """Extract 12 ML features — must match training notebook exactly"""
    n = len(shifts)
    if n == 0:
        return None

    night_ratio   = shifts.count("Night") / n
    evening_ratio = sum(1 for s in shifts if s in ["Evening", "Late"]) / n
    morning_ratio = sum(1 for s in shifts if s in ["Morning", "Early", "Day"]) / n
    off_ratio     = shifts.count("Off") / n

    streak = consec = 0
    for x in shifts:
        consec = consec + 1 if x != "Off" else 0
        streak = max(streak, consec)

    nstreak = nc = 0
    for x in shifts:
        nc = nc + 1 if x == "Night" else 0
        nstreak = max(nstreak, nc)

    weekend_work = sum(1 for i, x in enumerate(shifts) if i % 7 in [5, 6] and x != "Off")
    bad_trans    = sum(1 for i in range(n - 1) if shifts[i + 1] in FORBIDDEN_SUC.get(shifts[i], []))

    weekly_hours = []
    for w in range(n // 7):
        week = shifts[w * 7:(w + 1) * 7]
        weekly_hours.append(sum(SHIFT_HOURS.get(x, 0) for x in week))
    max_wh = max(weekly_hours) if weekly_hours else 0
    avg_wh = sum(weekly_hours) / len(weekly_hours) if weekly_hours else 0

    fatigue_load      = sum(SHIFT_WEIGHT.get(x, 0) for x in shifts) / (n * 20)
    rest_viol_ratio   = bad_trans / max(n - 1, 1)

    return [night_ratio, evening_ratio, morning_ratio, off_ratio,
            float(streak), float(nstreak), float(weekend_work), float(bad_trans),
            float(max_wh), float(avg_wh), fatigue_load, rest_viol_ratio]


def total_hours(shifts: list) -> int:
    return sum(SHIFT_HOURS.get(x, 0) for x in shifts)


def weekly_hours_list(shifts: list) -> list:
    return [sum(SHIFT_HOURS.get(x, 0) for x in shifts[w * 7:(w + 1) * 7])
            for w in range(len(shifts) // 7)]