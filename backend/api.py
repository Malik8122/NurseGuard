# backend/api.py
import os, io, math, json, random
from datetime import date, timedelta
from typing import Optional
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd

from engine.fatigue import (
    compute_score, score_all, label as fatigue_label,
    SHIFT_DISPLAY, total_hours, weekly_hours_list, FORBIDDEN_SUC
)
from engine.nsga2 import run as run_nsga2
from ml.predict   import predict_all, is_ready, get_meta

# ── App setup ─────────────────────────────────────────────────────────────────
app = FastAPI(title="NurseGuard API", version="2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory state ───────────────────────────────────────────────────────────
STATE = {
    "nurses":    {},      # {nurse_id: nurse_dict}
    "schedule":  {},      # {nurse_id: [shifts]}
    "fatigue":   {},      # {nurse_id: score}
    "settings":  {
        "pop_size":           50,
        "generations":        100,
        "max_consecutive":    5,
        "min_rest_hours":     11,
        "fatigue_weight":     80,
        "coverage_weight":    100,
        "fatigue_threshold":  5.0,
        "auto_approve":       False,
        "night_bonus":        2.0,
    },
    "alerts":    [],
    "week_start": str(date.today() - timedelta(days=date.today().weekday())),
}

# Default shift requirements (min, max) per day of week [Mon..Sun]
DEFAULT_REQUIREMENTS = {
    "Morning": [(3, 8)] * 7,
    "Evening": [(2, 6)] * 7,
    "Night":   [(2, 5)] * 7,
}

# ── Auth ──────────────────────────────────────────────────────────────────────
USERS = {
    "admin":   {"password": "admin123",   "role": "Admin",   "name": "Admin",      "title": "Head Nurse"},
    "nurse1":  {"password": "nurse123",   "role": "Nurse",   "name": "Nurse Joy",  "title": "RN"},
    "manager": {"password": "manager123", "role": "Manager", "name": "Sr. Manager","title": "Ward Manager"},
}

class LoginReq(BaseModel):
    username: str
    password: str

@app.post("/api/auth/login")
def login(req: LoginReq):
    u = USERS.get(req.username)
    if u and u["password"] == req.password:
        return {"ok": True, "role": u["role"], "name": u["name"],
                "title": u["title"], "username": req.username}
    return {"ok": False, "message": "Invalid credentials"}


# ── Helpers ───────────────────────────────────────────────────────────────────
def _safe(v, d=0.0):
    try:
        f = float(v)
        return d if (math.isnan(f) or math.isinf(f)) else f
    except Exception:
        return d

def _build_alerts():
    alerts = []
    for nid, score in STATE["fatigue"].items():
        threshold = STATE["settings"].get("fatigue_threshold", 5.0)
        nurse     = STATE["nurses"].get(nid, {})
        shifts    = STATE["schedule"].get(nid, [])
        if score >= threshold:
            # Check consecutive days
            consec = 0
            for s in shifts:
                consec = consec + 1 if s != "Off" else 0
            if consec > STATE["settings"]["max_consecutive"]:
                alerts.append({
                    "type":    "danger",
                    "message": f"Nurse {nurse.get('name', nid)} exceeded max consecutive shifts ({consec} days)",
                    "detail":  nurse.get("department", ""),
                    "action":  "Reassign",
                    "nurse_id": nid,
                })
            else:
                alerts.append({
                    "type":    "warning",
                    "message": f"Nurse {nurse.get('name', nid)} approaching fatigue threshold (score: {score})",
                    "detail":  nurse.get("department", ""),
                    "action":  "Review",
                    "nurse_id": nid,
                })
    # Coverage alerts
    if STATE["schedule"]:
        schedlen = len(next(iter(STATE["schedule"].values())))
        for day in range(min(schedlen, 7)):
            dow = day % 7
            night_count = sum(1 for sh in STATE["schedule"].values() if day < len(sh) and sh[day] == "Night")
            req_min     = DEFAULT_REQUIREMENTS["Night"][dow][0]
            if night_count < req_min:
                alerts.append({
                    "type":    "danger",
                    "message": f"Night shift understaffed — needs {req_min - night_count} more nurses",
                    "detail":  "ICU",
                    "action":  "Fill gap",
                    "nurse_id": None,
                })
                break
    STATE["alerts"] = alerts[:8]


# ── Dashboard ─────────────────────────────────────────────────────────────────
@app.get("/api/dashboard")
def dashboard():
    nurses   = STATE["nurses"]
    schedule = STATE["schedule"]
    fatigue  = STATE["fatigue"]

    total_nurses = len(nurses)
    today        = date.today()
    week_shifts  = sum(
        1 for shifts in schedule.values()
        for d, s in enumerate(shifts)
        if s != "Off" and d < 7
    )
    high_fatigue = sum(1 for v in fatigue.values() if _safe(v) >= STATE["settings"]["fatigue_threshold"])
    on_duty      = sum(1 for shifts in schedule.values() if shifts and shifts[0] != "Off")
    on_leave     = sum(1 for n in nurses.values() if n.get("on_leave", False))

    # Shift coverage today
    coverage = {}
    for shift in ["Morning", "Evening", "Night", "ICU"]:
        actual = sum(1 for shifts in schedule.values() if shifts and shifts[0] == shift)
        req    = DEFAULT_REQUIREMENTS.get(shift, [(3, 8)] * 7)[0]
        coverage[shift] = {"actual": actual, "required": req[1], "label": shift}

    # Open shifts = days with understaffing
    open_shifts = 0
    if schedule:
        schedlen = len(next(iter(schedule.values())))
        for day in range(min(schedlen, 7)):
            dow = day % 7
            for shift, reqs in DEFAULT_REQUIREMENTS.items():
                mn = reqs[dow][0]
                cnt = sum(1 for sh in schedule.values() if day < len(sh) and sh[day] == shift)
                if cnt < mn:
                    open_shifts += (mn - cnt)

    _build_alerts()

    return {
        "total_nurses":  total_nurses,
        "shifts_week":   week_shifts,
        "coverage_pct":  round(week_shifts / max(total_nurses * 5, 1) * 100),
        "high_fatigue":  high_fatigue,
        "open_shifts":   open_shifts,
        "on_duty":       on_duty,
        "on_leave":      on_leave,
        "day_off":       total_nurses - on_duty - on_leave,
        "shift_coverage": coverage,
        "alerts":        STATE["alerts"],
        "model_ready":   is_ready(),
        "week_start":    STATE["week_start"],
        "today":         str(today),
    }


# ── Nurses ────────────────────────────────────────────────────────────────────
@app.get("/api/nurses")
def get_nurses(ward: Optional[str] = None, search: Optional[str] = None):
    nurses  = list(STATE["nurses"].values())
    fatigue = STATE["fatigue"]
    result  = []
    for n in nurses:
        nid   = n["nurse_id"]
        score = _safe(fatigue.get(nid, 0.0))
        lbl, color = fatigue_label(score)
        shifts = STATE["schedule"].get(nid, [])
        result.append({
            **n,
            "fatigue_score": score,
            "fatigue_label": lbl,
            "fatigue_color": color,
            "total_hours":   total_hours(shifts),
            "consecutive_days": _get_consecutive(shifts),
            "night_shifts":  shifts.count("Night"),
        })
    if ward and ward != "All wards":
        result = [r for r in result if r.get("department") == ward or r.get("ward") == ward]
    if search:
        q = search.lower()
        result = [r for r in result if q in r.get("name","").lower() or q in r.get("nurse_id","").lower()]
    return {"nurses": result, "total": len(result), "wards": _get_wards()}


def _get_wards():
    wards = list(set(n.get("department", n.get("ward", "General"))
                     for n in STATE["nurses"].values()))
    return sorted(wards)


def _get_consecutive(shifts):
    consec = 0
    for s in shifts:
        consec = consec + 1 if s != "Off" else 0
    return consec


@app.post("/api/nurses")
def add_nurse(data: dict):
    nid = data.get("nurse_id") or f"N{len(STATE['nurses'])+1:03d}"
    data["nurse_id"] = nid
    STATE["nurses"][nid] = data
    return {"ok": True, "nurse_id": nid}


@app.put("/api/nurses/{nurse_id}")
def update_nurse(nurse_id: str, data: dict):
    if nurse_id not in STATE["nurses"]:
        raise HTTPException(404, "Nurse not found")
    STATE["nurses"][nurse_id].update(data)
    return {"ok": True}


@app.post("/api/nurses/upload")
async def upload_nurses(file: UploadFile = File(...)):
    contents = await file.read()
    df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    loaded = 0
    for _, row in df.iterrows():
        nid = str(row.get("nurse_id", f"N{loaded+1:03d}"))
        nurse = {
            "nurse_id":               nid,
            "name":                   str(row.get("name",       f"Nurse {nid}")),
            "role":                   str(row.get("role",       "RN")),
            "department":             str(row.get("department", row.get("ward", "General"))),
            "ward":                   str(row.get("ward",       row.get("department", "General"))),
            "shift_preference":       str(row.get("shift_preference", row.get("preferred_shift", "Morning"))).strip(),
            "max_hours_per_week":     int(_safe(row.get("max_hours_per_week", row.get("max_weekly_hours", 40)), 40)),
            "max_consecutive_shifts": int(_safe(row.get("max_consecutive_shifts", row.get("max_consecutive_days", 5)), 5)),
            "days_available":         str(row.get("days_available", "Mon,Tue,Wed,Thu,Fri")),
            "on_leave":               str(row.get("on_leave", "No")).strip().lower() in ["yes", "true", "1"],
            "fatigue_score":          0.0,
        }
        STATE["nurses"][nid] = nurse
        loaded += 1
    return {"ok": True, "loaded": loaded,
            "columns": list(df.columns), "wards": _get_wards()}


# ── Schedule ──────────────────────────────────────────────────────────────────
class GAReq(BaseModel):
    generations: int = 100
    pop_size:    int = 50
    days:        int = 14

@app.post("/api/schedule/generate")
def generate_schedule(req: GAReq):
    if not STATE["nurses"]:
        raise HTTPException(400, "Upload nurse CSV first")

    nurses_for_ga = {
        nid: {
            "shift_preference":       n.get("shift_preference", "Morning"),
            "max_consecutive_shifts": n.get("max_consecutive_shifts", STATE["settings"]["max_consecutive"]),
            "on_leave":               n.get("on_leave", False),
        }
        for nid, n in STATE["nurses"].items()
        if not n.get("on_leave", False)
    }

    schedule, stats = run_nsga2(
        nurses_for_ga,
        DEFAULT_REQUIREMENTS,
        days=req.days,
        pop_size=req.pop_size,
        generations=req.generations,
    )

    # Add on-leave nurses with all-Off schedule
    for nid, n in STATE["nurses"].items():
        if n.get("on_leave", False):
            schedule[nid] = ["Off"] * req.days

    STATE["schedule"] = schedule
    STATE["fatigue"]  = predict_all(schedule)
    _build_alerts()

    return {
        "ok":           True,
        "avg_fatigue":  round(_safe(sum(STATE["fatigue"].values()) / max(len(STATE["fatigue"]), 1)), 2),
        "high_risk":    sum(1 for v in STATE["fatigue"].values() if _safe(v) >= 5.0),
        "violations":   stats["violations"],
        "total_nurses": len(schedule),
        "days":         req.days,
        "stats":        stats,
    }


@app.get("/api/schedule")
def get_schedule(ward: Optional[str] = None, week: int = 0):
    if not STATE["schedule"]:
        return {"rows": [], "violations": [], "weeks": 0}

    DAYS    = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    fat     = STATE["fatigue"]
    nurses  = STATE["nurses"]
    sched   = STATE["schedule"]
    schedlen = len(next(iter(sched.values())))
    num_weeks = schedlen // 7

    rows       = []
    violations = []

    for nid, shifts in sched.items():
        n     = nurses.get(nid, {})
        if ward and ward != "All wards":
            dept = n.get("department", n.get("ward", ""))
            if dept != ward:
                continue

        score       = _safe(fat.get(nid, 0.0))
        lbl, color  = fatigue_label(score)
        week_start  = week * 7
        week_end    = min(week_start + 7, len(shifts))
        week_shifts = shifts[week_start:week_end]

        # Pad to 7 days
        while len(week_shifts) < 7:
            week_shifts.append("Off")

        row = {
            "nurse_id":     nid,
            "name":         n.get("name",       nid),
            "ward":         n.get("department", n.get("ward", "—")),
            "role":         n.get("role",       "RN"),
            "fatigue_score": score,
            "fatigue_label": lbl,
            "fatigue_color": color,
            "hours":         total_hours(shifts),
            "shifts":        {DAYS[i]: SHIFT_DISPLAY.get(s, s[:1]) if s != "Off" else "OFF"
                              for i, s in enumerate(week_shifts)},
            "raw_shifts":    {DAYS[i]: s for i, s in enumerate(week_shifts)},
        }
        rows.append(row)

        # Check violations
        for i in range(len(shifts) - 1):
            if shifts[i+1] in FORBIDDEN_SUC.get(shifts[i], []):
                day_label = f"W{i//7+1}-{DAYS[i%7]}"
                violations.append({
                    "nurse":  n.get("name", nid),
                    "issue":  f"{shifts[i]} → {shifts[i+1]} (insufficient rest)",
                    "day":    day_label,
                    "severity": "hard",
                })
        # Consecutive days
        consec = 0
        for i, s in enumerate(shifts):
            consec = consec + 1 if s != "Off" else 0
            max_c  = nurses.get(nid, {}).get("max_consecutive_shifts",
                     STATE["settings"]["max_consecutive"])
            if consec > max_c:
                violations.append({
                    "nurse":  n.get("name", nid),
                    "issue":  f"{consec} consecutive shifts (max {max_c})",
                    "day":    f"Day {i+1}",
                    "severity": "soft",
                })
                break

    return {
        "rows":       rows,
        "violations": violations[:20],
        "weeks":      num_weeks,
        "days":       schedlen,
        "wards":      _get_wards(),
    }


@app.post("/api/schedule/assign")
def assign_shift(data: dict):
    nid   = data.get("nurse_id")
    day   = int(data.get("day_index", 0))
    shift = data.get("shift", "Off")
    if nid not in STATE["schedule"]:
        raise HTTPException(404, "Nurse not in schedule")
    if day >= len(STATE["schedule"][nid]):
        raise HTTPException(400, "Day index out of range")
    STATE["schedule"][nid][day] = shift
    STATE["fatigue"][nid] = predict_all({nid: STATE["schedule"][nid]})[nid]
    _build_alerts()
    return {"ok": True, "new_score": STATE["fatigue"][nid]}


# ── Fatigue ───────────────────────────────────────────────────────────────────
@app.get("/api/fatigue")
def get_fatigue():
    fat    = STATE["fatigue"]
    nurses = STATE["nurses"]
    sched  = STATE["schedule"]
    result = []
    for nid, score in fat.items():
        n     = nurses.get(nid, {})
        score = _safe(score)
        lbl, color = fatigue_label(score)
        shifts = sched.get(nid, [])
        consec = _get_consecutive(shifts)
        nights = shifts.count("Night")
        hours  = total_hours(shifts)
        result.append({
            "nurse_id":        nid,
            "name":            n.get("name", nid),
            "ward":            n.get("department", n.get("ward", "—")),
            "role":            n.get("role", "RN"),
            "consecutive_days": consec,
            "night_shifts":    nights,
            "total_hours":     hours,
            "fatigue_score":   score,
            "fatigue_label":   lbl,
            "fatigue_color":   color,
        })
    result.sort(key=lambda x: x["fatigue_score"], reverse=True)
    threshold = STATE["settings"]["fatigue_threshold"]
    return {
        "nurses":   result,
        "high":     sum(1 for r in result if r["fatigue_score"] >= threshold),
        "medium":   sum(1 for r in result if 2.0 <= r["fatigue_score"] < threshold),
        "safe":     sum(1 for r in result if r["fatigue_score"] < 2.0),
        "threshold": threshold,
    }


# ── Reports ───────────────────────────────────────────────────────────────────
@app.get("/api/reports/summary")
def reports_summary():
    fat    = STATE["fatigue"]
    nurses = STATE["nurses"]
    sched  = STATE["schedule"]
    threshold = STATE["settings"]["fatigue_threshold"]
    rows   = []
    for nid, score in fat.items():
        n     = nurses.get(nid, {})
        score = _safe(score)
        lbl, _ = fatigue_label(score)
        shifts = sched.get(nid, [])
        rows.append({
            "nurse_id":      nid,
            "name":          n.get("name", nid),
            "ward":          n.get("department", "—"),
            "role":          n.get("role", "RN"),
            "total_hours":   total_hours(shifts),
            "night_shifts":  shifts.count("Night"),
            "overtime":      max(0, total_hours(shifts) - n.get("max_hours_per_week", 40) * len(shifts) // 7),
            "fatigue_score": score,
            "fatigue_label": lbl,
            "violations":    sum(1 for i in range(len(shifts)-1)
                                 if shifts[i+1] in FORBIDDEN_SUC.get(shifts[i], [])),
        })
    return {
        "rows":       rows,
        "total_hours": sum(r["total_hours"] for r in rows),
        "avg_fatigue": round(_safe(sum(r["fatigue_score"] for r in rows) / max(len(rows), 1)), 2),
        "high_risk":   sum(1 for r in rows if r["fatigue_score"] >= threshold),
        "violations":  sum(r["violations"] for r in rows),
    }


# ── Settings ──────────────────────────────────────────────────────────────────
@app.get("/api/settings")
def get_settings():
    return {**STATE["settings"], "model_meta": get_meta()}

@app.put("/api/settings")
def update_settings(data: dict):
    STATE["settings"].update(data)
    return {"ok": True, "settings": STATE["settings"]}


# ── Model info ────────────────────────────────────────────────────────────────
@app.get("/api/model/status")
def model_status():
    meta = get_meta()
    return {
        "ready":    is_ready(),
        "mae":      meta.get("mae"),
        "r2":       meta.get("r2"),
        "samples":  meta.get("train_samples"),
        "datasets": meta.get("datasets_used", []),
    }