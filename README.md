<div align="center">

<img src="https://img.shields.io/badge/NurseGuard-CareSync%20v2.1-059669?style=for-the-badge&logo=shield&logoColor=white" alt="NurseGuard" />

# 🏥 NurseGuard — CareSync v2.1

### AI-Powered Nurse Scheduling & Fatigue Management System

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

> An intelligent, fatigue-aware nurse scheduling system using **NSGA-II multi-objective genetic algorithms** and a **hybrid rule-based + ML fatigue scoring engine** — built for real hospital environments.

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [System Architecture](#-system-architecture)
- [Fatigue Scoring Engine](#-fatigue-scoring-engine)
- [Genetic Algorithm — NSGA-II](#-genetic-algorithm--nsga-ii)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [CSV Format](#-csv-format)
- [API Reference](#-api-reference)
- [Screenshots](#-screenshots)
- [Tech Stack](#-tech-stack)

---

## 🌟 Overview

NurseGuard is a full-stack hospital scheduling platform that solves one of healthcare's most critical problems: **nurse fatigue and shift burnout**. It combines:

- A **multi-objective evolutionary algorithm (NSGA-II)** to generate optimal 14-day shift schedules
- A **clinically-grounded fatigue scoring engine** based on NHS, Joint Commission, and ICN guidelines
- An optional **Random Forest ML model** that learns from historical scheduling patterns
- A **modern React dashboard** for real-time monitoring, alerts, and schedule management

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🧬 **NSGA-II Scheduler** | Multi-objective GA minimizes fatigue & coverage violations simultaneously |
| 🔥 **Fatigue Monitor** | 0–10 score per nurse with High/Medium/Safe classification |
| 📊 **Live Dashboard** | Real-time stats: nurses on duty, open shifts, fatigue alerts |
| 📁 **CSV Upload** | Bulk-import 500+ nurses in one click |
| 📅 **Schedule Viewer** | Week-by-week grid with colour-coded shift cells |
| 🤖 **ML Fallback** | Random Forest model augments rule-based scoring when trained |
| 🌓 **Dark / Light Mode** | Full theme toggle across the entire UI |
| 🔒 **Role-Based Auth** | Admin, Manager, and Nurse login roles |
| 📄 **Reports** | Per-nurse summary: hours, night shifts, overtime, violations |
| ⚙️ **Settings** | Tune GA parameters, fatigue thresholds, shift requirements |

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│   Dashboard │ Schedule │ Nurses │ Fatigue │ Reports      │
│                  (Vite + TypeScript)                     │
└───────────────────────┬─────────────────────────────────┘
                        │ REST API (JSON)
                        ▼
┌─────────────────────────────────────────────────────────┐
│               FastAPI Backend  (port 8000)               │
│                                                         │
│  ┌──────────────┐  ┌─────────────┐  ┌───────────────┐  │
│  │  Auth /login │  │  /schedule  │  │   /fatigue    │  │
│  └──────────────┘  └──────┬──────┘  └──────┬────────┘  │
│                           │                │            │
│              ┌────────────▼──────────────────▼──────┐   │
│              │         Engine Layer                  │   │
│              │  ┌─────────────┐  ┌───────────────┐  │   │
│              │  │   nsga2.py  │  │  fatigue.py   │  │   │
│              │  │  (GA/NSGA2) │  │ (Rule engine) │  │   │
│              │  └─────────────┘  └───────────────┘  │   │
│              │         ┌──────────────┐              │   │
│              │         │  predict.py  │              │   │
│              │         │ (ML / RF)    │              │   │
│              │         └──────────────┘              │   │
│              └────────────────────────────────────── ┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 🔥 Fatigue Scoring Engine

Scores are on a **0–10 scale** built from 6 additive penalty terms grounded in real clinical standards:

$$F = \min\!\left( P_1 + P_2 + P_3 + P_4 + P_5 + P_6,\;\; 10.0 \right)$$

| Term | Rule | Standard | Max |
|------|------|----------|-----|
| **P₁** Base load | Weighted shift sum / normalised | ICN | 4.0 |
| **P₂** Consecutive days | +0.5 per day beyond 5 | NHS | 2.0 |
| **P₃** Night streak | +0.4 per night beyond 3 | Joint Commission | 2.0 |
| **P₄** Forbidden transitions | +0.3 per violation (e.g. Night→Morning) | NHS (11h rest) | — |
| **P₅** Weekly hours | +0.5 per week exceeding 48h | NHS | — |
| **P₆** Weekend overwork | +0.2 per weekend day beyond 2 | ICN | 1.0 |

### Shift Weights

| Shift | Hours | Fatigue Weight |
|-------|-------|---------------|
| Morning | 8h | 10 |
| Evening | 8h | 12 |
| Night | 10h | 20 |
| Off | 0h | 0 |

### Risk Classification

| Score | Label | Colour |
|-------|-------|--------|
| ≥ 5.0 | 🔴 High Risk | Red |
| 2.0 – 4.9 | 🟡 Medium | Amber |
| < 2.0 | 🟢 Safe | Green |

---

## 🧬 Genetic Algorithm — NSGA-II

NurseGuard uses **Non-dominated Sorting Genetic Algorithm II** to solve the multi-objective scheduling problem.

### Objectives

$$\text{Minimise } \mathbf{f}(\mathbf{x}) = \begin{bmatrix} f_1 = \text{avg fatigue score} \\ f_2 = \text{coverage violations} \end{bmatrix}$$

### Algorithm Flow

```
INITIALISE population (default pop_size = 50)
  └── Each individual: {nurse_id → [shift_day_1 ... shift_day_14]}
  └── Preference-weighted, forbidden-succession-aware random generation

FOR generation = 1 to 100:
  │
  ├── EVALUATE  f(x) = [avg_fatigue, violations] for each individual
  │
  ├── NSGA-II RANK  → Pareto front sorting (F₁ dominates F₂ ...)
  │
  ├── TRACK BEST  → save schedule if violations=0 AND fatigue < best
  │
  └── GENERATE new population:
        ├── TOURNAMENT SELECT  (binary, rank-based)
        ├── CROSSOVER          (single-point over nurse axis)
        └── MUTATE             (per-gene rate = 3%, respects rest rules)

RETURN best schedule + convergence stats
```

### Operators

| Operator | Method |
|----------|--------|
| **Representation** | Dictionary: nurse → shift array |
| **Initialisation** | Preference-weighted, constraint-aware random |
| **Parent Selection** | Binary tournament on Pareto rank |
| **Crossover** | Single-point over nurse list |
| **Mutation** | Uniform per-gene (rate = 3%) |
| **Survivor Selection** | (μ, λ) full replacement + global elitism |
| **Constraint handling** | Forbidden successions filtered at mutation & init |

---

## 📁 Project Structure

```
nurseguard/
├── backend/
│   ├── api.py                  # FastAPI application & all endpoints
│   ├── requirements.txt        # Python dependencies
│   ├── engine/
│   │   ├── fatigue.py          # Rule-based fatigue scoring engine
│   │   └── nsga2.py            # NSGA-II multi-objective GA scheduler
│   └── ml/
│       └── predict.py          # ML model wrapper (Random Forest)
│
├── frontend/
│   ├── index.html
│   ├── vite.config.ts
│   ├── package.json
│   └── src/
│       ├── App.tsx             # Routes & auth guard
│       ├── api.ts              # API client
│       ├── index.css           # Global design system
│       ├── components/
│       │   └── Layout.tsx      # Sidebar + topbar shell
│       ├── context/
│       │   └── ThemeContext.tsx
│       └── pages/
│           ├── Dashboard.tsx   # KPI cards, coverage, alerts
│           ├── Schedule.tsx    # Week-by-week shift grid
│           ├── UploadCSV.tsx   # Nurse CSV import + GA trigger
│           ├── Nurses.tsx      # Nurse card grid with fatigue badges
│           ├── Fatigue.tsx     # Fatigue table + summary cards
│           ├── Reports.tsx     # Per-nurse report summary
│           ├── Settings.tsx    # GA params + threshold config
│           └── Login.tsx       # Auth page
│
├── model/
│   └── model_meta.json         # RF model metadata (MAE, R², samples)
│
└── data/
    ├── benchmarks/             # INRC1 & INRC2 benchmark instances
    └── validation/             # ORTEC validation datasets
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+

### 1. Clone the repository

```bash
git clone https://github.com/Malik8122/NurseGuard.git
cd NurseGuard
```

### 2. Start the Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn api:app --reload --port 8000
```

Backend runs at → `http://localhost:8000`
Interactive API docs → `http://localhost:8000/docs`

### 3. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at → `http://localhost:5173`

### 4. Login

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | Admin |
| `manager` | `manager123` | Manager |
| `nurse1` | `nurse123` | Nurse |

---

## 📄 CSV Format

Upload nurse data via the **Upload CSV** page. Required columns:

```csv
nurse_id,name,role,department,shift_preference,max_hours_per_week,max_consecutive_shifts,days_available
N001,Sarah Khan,RN,ICU,Morning,38,5,"Mon,Tue,Wed,Thu,Fri"
N002,James Okafor,RN,Ward 1A,Evening,42,5,"Mon,Tue,Wed,Thu,Fri,Sat"
N003,Priya Sharma,LPN,Ward 2B,Night,36,4,"Tue,Wed,Thu,Fri,Sat,Sun"
```

| Column | Description | Example |
|--------|-------------|---------|
| `nurse_id` | Unique ID | N001 |
| `name` | Full name | Sarah Khan |
| `role` | RN / LPN / CNA / NP / Charge Nurse | RN |
| `department` | Ward/Unit | ICU |
| `shift_preference` | Morning / Evening / Night / Any | Morning |
| `max_hours_per_week` | Weekly hour cap | 40 |
| `max_consecutive_shifts` | Max consecutive working days | 5 |
| `days_available` | Comma-separated days | Mon,Tue,Wed,Thu,Fri |

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Authenticate user |
| `GET` | `/api/dashboard` | Dashboard KPIs and alerts |
| `GET` | `/api/nurses` | List nurses (filter by ward/search) |
| `POST` | `/api/nurses` | Add a single nurse |
| `PUT` | `/api/nurses/{id}` | Update nurse record |
| `POST` | `/api/nurses/upload` | Bulk upload via CSV |
| `POST` | `/api/schedule/generate` | Run NSGA-II and generate schedule |
| `GET` | `/api/schedule` | Get current schedule (by week/ward) |
| `POST` | `/api/schedule/assign` | Manually assign a single shift |
| `GET` | `/api/fatigue` | Get fatigue scores for all nurses |
| `GET` | `/api/reports/summary` | Per-nurse hour/fatigue report |
| `GET` | `/api/settings` | Get system settings |
| `PUT` | `/api/settings` | Update GA/threshold settings |
| `GET` | `/api/model/status` | ML model readiness & metrics |

---

## 🛠 Tech Stack

**Backend**
- [FastAPI](https://fastapi.tiangolo.com) — REST API framework
- [NumPy](https://numpy.org) — NSGA-II computation
- [Pandas](https://pandas.pydata.org) — CSV processing
- [scikit-learn](https://scikit-learn.org) — Random Forest ML model
- [Uvicorn](https://www.uvicorn.org) — ASGI server

**Frontend**
- [React 18](https://react.dev) + [TypeScript](https://typescriptlang.org)
- [Vite 6](https://vitejs.dev) — build tool
- [Framer Motion](https://www.framer.com/motion/) — animations
- [Recharts](https://recharts.org) — data visualisation
- [Lucide React](https://lucide.dev) — icon set
- [Tailwind CSS v4](https://tailwindcss.com) — utility classes

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Built with ❤️ for better nurse wellbeing and smarter healthcare scheduling.

**[⬆ Back to top](#-nurseguard--caresync-v21)**

</div>
