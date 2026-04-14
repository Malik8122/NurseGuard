# backend/engine/nsga2.py
import random
import numpy as np
from engine.fatigue import compute_score, FORBIDDEN_SUC

SHIFTS = ["Morning", "Evening", "Night", "Off"]


def _random_schedule(nurses: dict, days: int) -> dict:
    schedule = {}
    for nid, info in nurses.items():
        max_consec = info.get("max_consecutive_shifts", 5)
        pref       = info.get("shift_preference", "Morning")
        shifts     = []
        streak     = 0
        for d in range(days):
            dow = d % 7
            if streak >= max_consec:
                shifts.append("Off"); streak = 0; continue
            if dow in [5, 6] and random.random() < 0.35:
                shifts.append("Off"); streak = 0; continue
            if random.random() > 0.15:
                prev    = shifts[-1] if shifts else None
                allowed = [s for s in SHIFTS if s != "Off"
                           and not (prev and s in FORBIDDEN_SUC.get(prev, []))]
                if not allowed:
                    allowed = [s for s in SHIFTS if s != "Off"]
                weights = [3 if s == pref else 1 for s in allowed]
                chosen  = random.choices(allowed, weights=weights)[0]
                shifts.append(chosen); streak += 1
            else:
                shifts.append("Off"); streak = 0
        schedule[nid] = shifts
    return schedule


def _coverage_violations(schedule: dict, requirements: dict, days: int) -> int:
    """Count how many shift slots are under/over staffed"""
    violations = 0
    for day in range(days):
        dow = day % 7
        for shift, req in requirements.items():
            if isinstance(req, list):
                mn = req[dow][0] if dow < len(req) else req[0][0]
                mx = req[dow][1] if dow < len(req) else req[0][1]
            else:
                mn, mx = req, req + 3
            count = sum(1 for shifts in schedule.values() if day < len(shifts) and shifts[day] == shift)
            if count < mn:
                violations += (mn - count) * 2
            if count > mx:
                violations += (count - mx)
    return violations


def _evaluate(schedule: dict, requirements: dict, days: int) -> tuple:
    scores      = [compute_score(sh) for sh in schedule.values()]
    avg_fatigue = float(np.mean(scores)) if scores else 0.0
    violations  = _coverage_violations(schedule, requirements, days)
    return avg_fatigue, violations


def _mutate(schedule: dict, nurses: dict, rate: float = 0.03) -> dict:
    new_schedule = {}
    for nid, shifts in schedule.items():
        new_shifts = shifts[:]
        for i in range(len(new_shifts)):
            if random.random() < rate:
                prev    = new_shifts[i - 1] if i > 0 else None
                allowed = [s for s in SHIFTS
                           if not (prev and s in FORBIDDEN_SUC.get(prev, []))]
                new_shifts[i] = random.choice(allowed)
        new_schedule[nid] = new_shifts
    return new_schedule


def _crossover(s1: dict, s2: dict) -> dict:
    ids   = list(s1.keys())
    point = random.randint(1, max(1, len(ids) - 1))
    return {nid: (s1[nid] if i < point else s2[nid])[:] for i, nid in enumerate(ids)}


def _dominates(a: tuple, b: tuple) -> bool:
    return all(x <= y for x, y in zip(a, b)) and any(x < y for x, y in zip(a, b))


def _nsga2_sort(objectives: list) -> list:
    n    = len(objectives)
    rank = [0] * n
    dc   = [0] * n
    db   = [[] for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i == j:
                continue
            if _dominates(objectives[i], objectives[j]):
                db[i].append(j)
            elif _dominates(objectives[j], objectives[i]):
                dc[i] += 1
        if dc[i] == 0:
            rank[i] = 0
    fronts = [[i for i in range(n) if dc[i] == 0]]
    f = 0
    while fronts[f]:
        nxt = []
        for i in fronts[f]:
            for j in db[i]:
                dc[j] -= 1
                if dc[j] == 0:
                    rank[j] = f + 1
                    nxt.append(j)
        fronts.append(nxt)
        f += 1
    return rank


def run(nurses: dict, requirements: dict, days: int = 14,
        pop_size: int = 50, generations: int = 100) -> tuple:
    """
    Run NSGA-II to generate a fatigue-optimal schedule.
    nurses: {nurse_id: {shift_preference, max_consecutive_shifts, ...}}
    requirements: {shift_name: [(min, max)] * 7 days}
    Returns (best_schedule, stats_dict)
    """
    population = [_random_schedule(nurses, days) for _ in range(pop_size)]
    best       = None
    best_fat   = float("inf")
    history    = []

    for gen in range(generations):
        objectives = [_evaluate(ind, requirements, days) for ind in population]
        ranks      = _nsga2_sort(objectives)

        # Track best
        for i, (fat, viol) in enumerate(objectives):
            if viol == 0 and fat < best_fat:
                best_fat = fat
                best     = population[i]

        avg_fat  = float(np.mean([o[0] for o in objectives]))
        avg_viol = float(np.mean([o[1] for o in objectives]))
        history.append({"gen": gen, "avg_fatigue": round(avg_fat, 3), "avg_violations": round(avg_viol, 1)})

        # Tournament selection + crossover + mutation
        new_pop = []
        while len(new_pop) < pop_size:
            i1, i2   = random.sample(range(pop_size), 2)
            p1       = population[i1] if ranks[i1] <= ranks[i2] else population[i2]
            i3, i4   = random.sample(range(pop_size), 2)
            p2       = population[i3] if ranks[i3] <= ranks[i4] else population[i4]
            child    = _mutate(_crossover(p1, p2), nurses)
            new_pop.append(child)
        population = new_pop

    if best is None:
        # Fallback: pick lowest fatigue from final population
        objectives = [_evaluate(ind, requirements, days) for ind in population]
        best = population[min(range(pop_size), key=lambda i: objectives[i][0])]

    final_fat, final_viol = _evaluate(best, requirements, days)
    stats = {
        "avg_fatigue":   round(final_fat, 2),
        "violations":    int(final_viol),
        "generations":   generations,
        "pop_size":      pop_size,
        "convergence":   history,
    }
    return best, stats