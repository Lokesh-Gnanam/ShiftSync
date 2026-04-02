import os
import uuid
import json
import httpx
import asyncio
from datetime import datetime, timedelta
from typing import List, Optional, Dict

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from jose import jwt
from passlib.context import CryptContext
from neo4j import AsyncGraphDatabase
from dotenv import load_dotenv

# ─── CONFIG ────────────────────────────────────────────────────────────────────
load_dotenv()
GROQ_API_KEY  = os.getenv("GROQ_API_KEY")
NEO4J_URI     = os.getenv("NEO4J_URI",      "bolt://localhost:7687")
NEO4J_USER    = os.getenv("NEO4J_USER",     "neo4j")
NEO4J_PASSWORD= os.getenv("NEO4J_PASSWORD", "password")
NEO4J_DB      = "neo4j"
SECRET_KEY    = os.getenv("SECRET_KEY",     "industrial_grade_secret_key_2026")
ALGORITHM     = "HS256"
TOKEN_EXPIRE  = 60 * 24   # minutes

# ─── SAFETY RULES ──────────────────────────────────────────────────────────────
SAFETY_RULES: Dict[str, str] = {
    "motor":     "⚠️ Turn off power before inspection",
    "hydraulic": "⚠️ Release pressure before maintenance",
    "pump":      "⚠️ Ensure no dry-run condition before testing",
    "cnc":       "⚠️ Engage E-stop and clear tool path before maintenance",
    "hvac":      "⚠️ Isolate electrical supply before servicing cooling units",
    "boiler":    "⚠️ Vent steam pressure before opening any valve",
    "conveyor":  "⚠️ Lock-out tag-out before entering conveyor zone",
    "default":   "⚠️ Follow plant safety protocol before any maintenance activity",
}

def get_safety_message(machine: str) -> str:
    ml = (machine or "").lower()
    for kw, msg in SAFETY_RULES.items():
        if kw != "default" and kw in ml:
            return msg
    return SAFETY_RULES["default"]

# ─── SKILL CATEGORIES ──────────────────────────────────────────────────────────
SKILL_CATEGORIES = {
    "Hydraulics":  ["hydraulic", "pressure", "o-ring", "piston", "valve", "seal"],
    "Pumps":       ["pump", "cavitation", "suction", "npsh", "impeller", "priming"],
    "CNC / Lathe": ["cnc", "spindle", "axis", "drift", "lathe", "lead screw", "backlash"],
    "HVAC / VFD":  ["hvac", "vfd", "cooling", "fan", "inverter", "trip", "overload"],
    "Electrical":  ["motor", "current", "voltage", "relay", "contactor", "short circuit"],
    "Conveyor":    ["conveyor", "belt", "roller", "misalignment", "tension"],
}

# ─── HISTORICAL LOGS (seeded into Neo4j on first boot) ─────────────────────────
HISTORICAL_LOGS = [
    # 🔴 Pump P3 — fails ~100 hrs
    {"machine": "Pump P3",          "issue": "Cavitation",    "runtime_hours": 90,  "root_cause": "Clogged strainer",      "resolution": "Clean intake strainer and verify NPSH conditions.",          "confidence": 0.95},
    {"machine": "Pump P3",          "issue": "Cavitation",    "runtime_hours": 100, "root_cause": "Air suction leak",      "resolution": "Inspect and seal all suction line joints.",                   "confidence": 0.97},
    {"machine": "Pump P3",          "issue": "Cavitation",    "runtime_hours": 110, "root_cause": "Low NPSH",              "resolution": "Increase suction head; check pump sizing.",                   "confidence": 0.96},
    {"machine": "Pump P3",          "issue": "Cavitation",    "runtime_hours": 95,  "root_cause": "Blocked intake",        "resolution": "Flush intake pipe and remove debris buildup.",                "confidence": 0.94},
    {"machine": "Pump P3",          "issue": "Cavitation",    "runtime_hours": 105, "root_cause": "Debris accumulation",   "resolution": "Install Y-strainer upstream; schedule weekly inspection.",    "confidence": 0.93},
    # 🔵 Hydraulic Press 4 — fails ~80-90 hrs
    {"machine": "Hydraulic Press 4","issue": "Pressure Drop", "runtime_hours": 70,  "root_cause": "Seal wear",             "resolution": "Replace hydraulic seals; check assembly torque.",             "confidence": 0.97},
    {"machine": "Hydraulic Press 4","issue": "Pressure Drop", "runtime_hours": 85,  "root_cause": "O-ring fatigue",        "resolution": "Replace O-rings; verify proper lubrication.",                 "confidence": 0.99},
    {"machine": "Hydraulic Press 4","issue": "Pressure Drop", "runtime_hours": 90,  "root_cause": "Valve leakage",         "resolution": "Inspect proportional valve; replace if worn.",                "confidence": 0.96},
    {"machine": "Hydraulic Press 4","issue": "Pressure Drop", "runtime_hours": 75,  "root_cause": "Oil leakage",           "resolution": "Check fittings and hoses; re-torque connections.",            "confidence": 0.95},
    # 🟡 Cooling Tower 4 VFD — fails ~120-140 hrs
    {"machine": "Cooling Tower 4",  "issue": "VFD Trip",      "runtime_hours": 120, "root_cause": "Overheating",           "resolution": "Clean VFD heat sink; improve cabinet ventilation.",           "confidence": 0.98},
    {"machine": "Cooling Tower 4",  "issue": "VFD Trip",      "runtime_hours": 135, "root_cause": "Fan failure",           "resolution": "Replace cooling fan motor; check bearings.",                  "confidence": 0.97},
    {"machine": "Cooling Tower 4",  "issue": "VFD Trip",      "runtime_hours": 140, "root_cause": "Clogged filters",       "resolution": "Replace cabinet air filters; set monthly service alert.",     "confidence": 0.96},
    {"machine": "Cooling Tower 4",  "issue": "VFD Trip",      "runtime_hours": 125, "root_cause": "Heat buildup",          "resolution": "Install thermal sensor alarm; increase coolant flow.",        "confidence": 0.95},
    # 🟢 Drive Motor C — fails ~180-220 hrs
    {"machine": "Drive Motor C",    "issue": "Overload",      "runtime_hours": 180, "root_cause": "Bearing wear",          "resolution": "Replace motor bearings; realign shaft coupling.",             "confidence": 0.96},
    {"machine": "Drive Motor C",    "issue": "Overload",      "runtime_hours": 200, "root_cause": "Lubrication failure",   "resolution": "Flush and refill grease; restore auto-lube schedule.",       "confidence": 0.97},
    {"machine": "Drive Motor C",    "issue": "Overload",      "runtime_hours": 220, "root_cause": "Misalignment",          "resolution": "Laser-align motor to gearbox; check coupling wear.",          "confidence": 0.95},
    # 🟠 Conveyor B — frequent minor issue ~50-60 hrs
    {"machine": "Conveyor B",       "issue": "Misalignment",  "runtime_hours": 50,  "root_cause": "Roller misalignment",   "resolution": "Re-align tracking rollers; check belt edge wear.",            "confidence": 0.94},
    {"machine": "Conveyor B",       "issue": "Misalignment",  "runtime_hours": 60,  "root_cause": "Belt tension issue",    "resolution": "Adjust belt tension to specification; check tail pulley.",    "confidence": 0.93},
    {"machine": "Conveyor B",       "issue": "Misalignment",  "runtime_hours": 55,  "root_cause": "Frame friction",        "resolution": "Inspect frame joints; lubricate guide rails.",                "confidence": 0.92},
]

# ─── PYDANTIC MODELS ────────────────────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str

class User(BaseModel):
    username: str
    name: Optional[str] = None
    role: str

class UserCreate(BaseModel):
    username: str
    password: str
    name: str
    role: str

class LogIngest(BaseModel):
    transcript: str
    audio_url: Optional[str] = None

class SearchRequest(BaseModel):
    query: str

class ChatMessage(BaseModel):
    session_id: str
    content: str

class SessionCreate(BaseModel):
    title: str

# ─── APP SETUP ─────────────────────────────────────────────────────────────────
app = FastAPI(title="ShiftSync Industrial Backend", version="6.0.0")
pwd_context   = CryptContext(schemes=["pbkdf2_sha256"], pbkdf2_sha256__rounds=1000)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

AUDIO_DIR = "audio_uploads"
os.makedirs(AUDIO_DIR, exist_ok=True)
app.mount("/static/audio", StaticFiles(directory=AUDIO_DIR), name="audio")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ─── NEO4J ─────────────────────────────────────────────────────────────────────
driver = None

async def init_neo4j():
    global driver
    driver = AsyncGraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    await driver.verify_connectivity()
    print("[OK] Neo4j connected.")

# ─── AUTH ──────────────────────────────────────────────────────────────────────
def hash_pw(p):    return pwd_context.hash(p)
def verify_pw(p,h): return pwd_context.verify(p, h)

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        uname = str(payload.get("sub", "")).strip()
        if not uname: raise HTTPException(401)
    except Exception:
        raise HTTPException(401, "Invalid token")
    async with driver.session(database=NEO4J_DB) as s:
        r = await s.run("MATCH (u:Technician {username:$u}) RETURN u", u=uname)
        rec = await r.single()
        if rec:
            n = rec["u"]
            return User(username=n["username"], name=n.get("name"), role=n["role"])
    raise HTTPException(401, "User not found")

# ─── GROQ HELPERS ──────────────────────────────────────────────────────────────
GROQ_SYSTEM_PROMPT = """You are an expert industrial maintenance AI assistant.
Analyze the technician's voice transcript and extract structured troubleshooting insights.

Extract these fields:
1. machine      — full machine name
2. issue        — short technical term
3. extracted_insight — clear human-readable summary
4. root_cause   — specific technical reason
5. resolution   — clear actionable steps for technician
6. confidence   — float 0.0-1.0 based on transcript clarity

Return ONLY valid JSON:
{
  "machine": "...",
  "issue": "...",
  "extracted_insight": "...",
  "root_cause": "...",
  "resolution": "...",
  "confidence": 0.0
}"""

async def groq_extract(transcript: str) -> dict:
    """Call Groq llama3-70b-8192 to extract industrial entities from transcript."""
    if not GROQ_API_KEY:
        return {}
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                json={
                    "model": "llama3-70b-8192",
                    "response_format": {"type": "json_object"},
                    "messages": [
                        {"role": "system", "content": GROQ_SYSTEM_PROMPT},
                        {"role": "user",   "content": transcript},
                    ]
                },
                timeout=12.0
            )
            if res.status_code == 200:
                data = json.loads(res.json()["choices"][0]["message"]["content"])
                # Normalise confidence if returned as percentage
                if "confidence" in data:
                    c = float(data["confidence"])
                    data["confidence"] = round(c / 100.0, 3) if c > 1 else round(c, 3)
                return data
            else:
                print(f"Groq error {res.status_code}: {res.text[:200]}")
    except Exception as e:
        print(f"Groq call failed: {e}")
    return {}

async def groq_extract_query(q: str) -> dict:
    """Ask Groq to extract machine + issue from a search query."""
    if not GROQ_API_KEY:
        return {}
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                json={
                    "model": "llama3-70b-8192",
                    "response_format": {"type": "json_object"},
                    "messages": [
                        {"role": "system", "content": "Extract 'machine' and 'issue' from this industrial maintenance query. Return JSON only: {\"machine\":\"...\",\"issue\":\"...\"}. Use empty string if not found."},
                        {"role": "user",   "content": q},
                    ]
                },
                timeout=6.0
            )
            if res.status_code == 200:
                return json.loads(res.json()["choices"][0]["message"]["content"])
    except Exception:
        pass
    return {}

# ─── STARTUP ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    await init_neo4j()

    default_users = [
        {"username": "admin",  "password": "password123", "name": "Admin",       "role": "admin"},
        {"username": "senior", "password": "password123", "name": "Senior Tech", "role": "senior"},
        {"username": "junior", "password": "password123", "name": "Junior Tech", "role": "junior"},
    ]
    for u in default_users:
        u["password"] = hash_pw(u["password"])

    async with driver.session(database=NEO4J_DB) as s:
        try:
            await s.run("CREATE CONSTRAINT technician_id IF NOT EXISTS FOR (t:Technician) REQUIRE t.username IS UNIQUE")
        except Exception:
            pass

        for u in default_users:
            await s.run(
                "MERGE (t:Technician {username:$u}) ON CREATE SET t.password=$p, t.name=$n, t.role=$r",
                u=u["username"], p=u["password"], n=u["name"], r=u["role"]
            )

        # Seed HISTORICAL_LOGS if graph is empty
        res  = await s.run("MATCH (l:Log) RETURN count(l) as c")
        rec  = await res.single()
        if rec and rec["c"] == 0:
            print(f"[SEED] Seeding {len(HISTORICAL_LOGS)} historical logs into Neo4j...")
            for idx, entry in enumerate(HISTORICAL_LOGS):
                transcript = f"{entry['machine']} experiencing {entry['issue']}. Root cause: {entry['root_cause']}."
                await s.run("""
                    MATCH (u:Technician {username:'admin'})
                    MERGE (m:Machine   {name: $machine})
                    MERGE (i:Issue     {name: $issue})
                    MERGE (r:Resolution{steps: $resolution})
                    MERGE (rc:RootCause{reason: $root_cause})
                    CREATE (l:Log {
                        id:            $id,
                        transcript:    $transcript,
                        timestamp:     datetime() - duration({days: $day_offset}),
                        confidence:    $confidence,
                        runtime_hours: $runtime_hours,
                        frequency:     1,
                        machine:       $machine
                    })
                    MERGE (u) -[:LOGGED]          ->(l)
                    MERGE (l) -[:INVOLVES_MACHINE]->(m)
                    MERGE (l) -[:HAS_ISSUE]       ->(i)
                    MERGE (l) -[:HAS_ROOT_CAUSE]  ->(rc)
                    MERGE (l) -[:RESOLVED_BY]     ->(r)
                """, {
                    "id":           f"HIST-{idx:03d}",
                    "machine":      entry["machine"],
                    "issue":        entry["issue"],
                    "resolution":   entry["resolution"],
                    "root_cause":   entry["root_cause"],
                    "confidence":   float(entry["confidence"]),
                    "runtime_hours":int(entry["runtime_hours"]),
                    "transcript":   transcript,
                    "day_offset":   idx % 30,
                })
            print("[DONE] Historical graph seeded successfully.")

# ─── AUTH ENDPOINTS ────────────────────────────────────────────────────────────
@app.post("/register")
async def register(user: UserCreate):
    hashed = hash_pw(user.password)
    async with driver.session(database=NEO4J_DB) as s:
        res = await s.run("MATCH (u:Technician {username:$u}) RETURN u", u=user.username)
        if await res.single(): raise HTTPException(400, "User exists")
        await s.run(
            "CREATE (u:Technician {username:$u, password:$p, name:$n, role:$r})",
            u=user.username, p=hashed, n=user.name, r=user.role
        )
    return {"status": "registered"}

@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    username = form_data.username.strip()
    u_pw = None
    async with driver.session(database=NEO4J_DB) as s:
        res = await s.run("MATCH (u:Technician {username:$u}) RETURN u.password as p", u=username)
        rec = await res.single()
        if rec: u_pw = rec["p"]
    if not u_pw or not verify_pw(form_data.password, u_pw):
        raise HTTPException(401, "Invalid credentials")
    token = jwt.encode(
        {"sub": username, "exp": datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRE)},
        SECRET_KEY, algorithm=ALGORITHM
    )
    return {"access_token": token, "token_type": "bearer"}

@app.get("/users/me", response_model=User)
async def me(cu: User = Depends(get_current_user)):
    return cu

# ─── LOGS ──────────────────────────────────────────────────────────────────────
@app.get("/logs")
async def get_logs(cu: User = Depends(get_current_user)):
    async with driver.session(database=NEO4J_DB) as s:
        res = await s.run("""
            MATCH (l:Log)
            OPTIONAL MATCH (l)-[:INVOLVES_MACHINE]->(m:Machine)
            OPTIONAL MATCH (l)-[:HAS_ISSUE]       ->(i:Issue)
            OPTIONAL MATCH (l)-[:HAS_ROOT_CAUSE]  ->(rc:RootCause)
            OPTIONAL MATCH (l)-[:RESOLVED_BY]     ->(r:Resolution)
            RETURN l.id          AS id,
                   toString(l.timestamp) AS timestamp,
                   l.transcript  AS transcript,
                   l.audio_url   AS audio_url,
                   l.confidence  AS confidence,
                   l.runtime_hours AS runtime_hours,
                   m.name        AS machine,
                   i.name        AS issue,
                   r.steps       AS resolution,
                   rc.reason     AS root_cause
            ORDER BY l.timestamp DESC LIMIT 20
        """)
        return await res.data()

@app.post("/logs")
async def create_log(log: LogIngest, cu: User = Depends(get_current_user)):
    # Defaults
    entities = {
        "machine":           "Unknown Machine",
        "issue":             "Unknown Issue",
        "extracted_insight": log.transcript,
        "root_cause":        "Pending Analysis",
        "resolution":        "No action specified",
        "confidence":        0.50,
    }

    groq_data = await groq_extract(log.transcript)
    if groq_data:
        entities.update(groq_data)

    log_id = str(uuid.uuid4())
    async with driver.session(database=NEO4J_DB) as s:
        await asyncio.wait_for(s.run("""
            MATCH (u:Technician {username:$username})
            MERGE (m:Machine   {name: $machine})
            MERGE (i:Issue     {name: $issue})
            MERGE (r:Resolution{steps: $resolution})
            MERGE (rc:RootCause{reason: $root_cause})
            CREATE (l:Log {
                id:            $id,
                transcript:    $transcript,
                audio_url:     $audio_url,
                timestamp:     datetime(),
                confidence:    $confidence,
                runtime_hours: 100,
                frequency:     1,
                machine:       $machine
            })
            MERGE (u) -[:LOGGED]          ->(l)
            MERGE (l) -[:INVOLVES_MACHINE]->(m)
            MERGE (l) -[:HAS_ISSUE]       ->(i)
            MERGE (l) -[:HAS_ROOT_CAUSE]  ->(rc)
            MERGE (l) -[:RESOLVED_BY]     ->(r)
        """, {
            "username":   cu.username,
            "id":         log_id,
            "transcript": log.transcript,
            "audio_url":  log.audio_url,
            "machine":    str(entities.get("machine", "Unknown Machine")),
            "issue":      str(entities.get("issue",   "Unknown Issue")),
            "resolution": str(entities.get("resolution", "No action specified")),
            "root_cause": str(entities.get("root_cause", "Pending Analysis")),
            "confidence": float(entities.get("confidence", 0.5)),
        }), timeout=10.0)

    return {"status": "success", "entities": entities, "saved_to_graph": True}

# ─── SEARCH ────────────────────────────────────────────────────────────────────
@app.post("/search")
async def search(req: SearchRequest, cu: User = Depends(get_current_user)):
    q = req.query.strip().lower()

    # Groq-assisted query understanding
    extracted = await groq_extract_query(q)
    m_q = (extracted.get("machine") or "").lower()
    i_q = (extracted.get("issue")   or "").lower()

    async with driver.session(database=NEO4J_DB) as s:
        # Track search in graph for skill profiling
        if i_q:
            await s.run("""
                MATCH (u:Technician {username:$u})
                MERGE (i:Issue {name:$issue})
                MERGE (u)-[:SEARCHED]->(i)
            """, u=cu.username, issue=i_q)

        res = await s.run("""
            MATCH (l:Log)-[:RESOLVED_BY]->(r:Resolution)
            OPTIONAL MATCH (l)-[:INVOLVES_MACHINE]->(m:Machine)
            OPTIONAL MATCH (l)-[:HAS_ISSUE]       ->(i:Issue)
            OPTIONAL MATCH (l)-[:HAS_ROOT_CAUSE]  ->(rc:RootCause)
            WHERE toLower(l.transcript) CONTAINS toLower($q)
               OR ($m_q <> '' AND toLower(coalesce(m.name,'')) CONTAINS toLower($m_q))
               OR ($i_q <> '' AND toLower(coalesce(i.name,'')) CONTAINS toLower($i_q))
            RETURN coalesce(l.title, m.name + ' — ' + i.name, 'Technician Insight') AS title,
                   l.transcript   AS transcript,
                   l.audio_url    AS audio_url,
                   r.steps        AS solution,
                   rc.reason      AS root_cause,
                   l.confidence   AS confidence,
                   m.name         AS machine,
                   l.runtime_hours AS runtime_hours,
                   coalesce(l.frequency,1) AS frequency
            ORDER BY l.timestamp DESC LIMIT 20
        """, q=q, m_q=m_q, i_q=i_q)

        rows = await res.data()

    matches = []
    for row in rows:
        transcript_l = (row.get("transcript") or "").lower()
        machine_l    = (row.get("machine")    or "").lower()
        issue_l      = ""   # issue not returned directly; use machine+q match

        score = 0.0
        if q in transcript_l:                                           score += 0.70
        elif any(w in transcript_l for w in q.split() if len(w) > 3):  score += 0.50
        if m_q and m_q in machine_l:                                    score += 0.40
        if i_q and i_q in (row.get("title") or "").lower():            score += 0.40

        conf      = float(row.get("confidence") or 0.8)
        freq      = int(row.get("frequency") or 1)
        freq_norm = min(freq / 20.0, 1.0)
        smart     = score * 0.55 + conf * 0.30 + freq_norm * 0.15

        matches.append({
            "title":      row.get("title",      "Technician Insight"),
            "transcript": row.get("transcript", ""),
            "audio_url":  row.get("audio_url"),
            "solution":   row.get("solution",   "Refer to log."),
            "root_cause": row.get("root_cause"),
            "confidence": conf,
            "frequency":  freq,
            "safety":     get_safety_message(row.get("machine", "")),
            "machine":    row.get("machine"),
            "_score":     smart,
        })

    matches.sort(key=lambda x: x["_score"], reverse=True)
    top3 = matches[:3]
    for m in top3: m.pop("_score", None)
    return {"matches": top3, "match": top3[0] if top3 else None}

# ─── INSIGHTS ──────────────────────────────────────────────────────────────────
@app.get("/insights")
async def get_insights(cu: User = Depends(get_current_user)):
    """Top 5 recurring issues from the Neo4j graph."""
    async with driver.session(database=NEO4J_DB) as s:
        res = await s.run("""
            MATCH (i:Issue)<-[:HAS_ISSUE]-(l:Log)
            RETURN i.name AS issue_name, count(l) AS frequency
            ORDER BY frequency DESC LIMIT 5
        """)
        return await res.data()

# ─── HISTORICAL PATTERNS ───────────────────────────────────────────────────────
@app.get("/historical-patterns")
async def get_historical_patterns(cu: User = Depends(get_current_user)):
    """Per-machine failure stats for the Senior Dashboard chart."""
    async with driver.session(database=NEO4J_DB) as s:
        res = await s.run("""
            MATCH (l:Log)-[:INVOLVES_MACHINE]->(m:Machine)
            RETURN m.name                      AS machine,
                   count(l)                    AS failures,
                   round(avg(l.runtime_hours)) AS avg_runtime,
                   round(min(l.runtime_hours)) AS min_runtime,
                   round(max(l.runtime_hours)) AS max_runtime
            ORDER BY failures DESC
        """)
        return await res.data()

# ─── PREDICT ───────────────────────────────────────────────────────────────────
@app.get("/predict/{machine}")
async def predict(machine: str, cu: User = Depends(get_current_user)):
    m = machine.lower().strip()
    async with driver.session(database=NEO4J_DB) as s:
        res = await s.run("""
            MATCH (l:Log)-[:INVOLVES_MACHINE]->(mac:Machine)
            WHERE toLower(mac.name) CONTAINS $m OR toLower(l.machine) CONTAINS $m
            RETURN avg(coalesce(l.runtime_hours,100)) AS avg_rt,
                   count(l) AS cnt,
                   mac.name AS mac_name
            LIMIT 1
        """, m=m)
        rec = await res.single()

    if rec and rec["cnt"] > 0:
        avg_rt = float(rec["avg_rt"] or 100)
        cnt    = int(rec["cnt"])
        pred   = round(avg_rt * 1.10)
        display= rec.get("mac_name") or machine.title()
        return {
            "machine":           display,
            "avg_runtime_hours": round(avg_rt, 1),
            "log_count":         cnt,
            "prediction":        f"⚠️ {display} likely to fail after {pred} runtime hours",
            "next_inspection":   f"Schedule inspection every {round(avg_rt*0.8)} hours",
        }
    return {
        "machine":           machine.title(),
        "avg_runtime_hours": 100.0,
        "log_count":         0,
        "prediction":        f"⚠️ No historical data for '{machine}'. Schedule inspection after 100 hours.",
        "next_inspection":   "Schedule inspection every 80 hours",
    }

# ─── SKILL PROFILE ─────────────────────────────────────────────────────────────
@app.get("/profile")
async def get_profile(cu: User = Depends(get_current_user)):
    async with driver.session(database=NEO4J_DB) as s:
        res = await s.run("""
            MATCH (u:Technician {username:$u})-[:SEARCHED]->(i:Issue)
            RETURN i.name AS issue, count(i) AS cnt
        """, u=cu.username)
        history = await res.data()

    if not history:
        return {
            "username": cu.username, "name": cu.name,
            "total_searches": 0, "category_counts": {},
            "weak_area": "No activity yet", "strong_area": "No activity yet",
            "recommendation": "Search the knowledge base to build your skill profile.",
        }

    cat_counts = {c: 0 for c in SKILL_CATEGORIES}
    total = sum(h["cnt"] for h in history)
    for h in history:
        issue_lower = (h["issue"] or "").lower()
        for cat, kws in SKILL_CATEGORIES.items():
            if any(kw in issue_lower for kw in kws):
                cat_counts[cat] += h["cnt"]

    active = {k: v for k, v in cat_counts.items() if v > 0}
    weak   = min(active, key=active.get) if active else list(SKILL_CATEGORIES.keys())[0]
    strong = max(active, key=active.get) if active else None

    recs = {
        "Hydraulics":  "Review hydraulic pressure failures and seal maintenance logs.",
        "Pumps":       "Study cavitation diagnostics and NPSH calculations.",
        "CNC / Lathe": "Revisit spindle calibration and axis drift troubleshooting.",
        "HVAC / VFD":  "Review VFD fault codes and cooling system maintenance.",
        "Electrical":  "Study motor protection relay settings and overload diagnostics.",
        "Conveyor":    "Review belt tension and roller alignment procedures.",
    }
    return {
        "username": cu.username, "name": cu.name,
        "total_searches": total, "category_counts": cat_counts,
        "weak_area": weak, "strong_area": strong or "No data",
        "recommendation": recs.get(weak, "Continue exploring the knowledge base."),
    }

# ─── AUDIO UPLOAD ──────────────────────────────────────────────────────────────
@app.post("/upload-audio")
async def upload_audio(file: UploadFile = File(...)):
    ext   = file.filename.split(".")[-1]
    fname = f"{uuid.uuid4()}.{ext}"
    path  = os.path.join(AUDIO_DIR, fname)
    with open(path, "wb") as f:
        f.write(await file.read())
    return {"url": f"/static/audio/{fname}"}

# ─── ADMIN STATS ───────────────────────────────────────────────────────────────
@app.get("/stats")
async def get_stats(cu: User = Depends(get_current_user)):
    if cu.role != "admin":
        raise HTTPException(403, "Admin only")
    async with driver.session(database=NEO4J_DB) as s:
        res = await s.run("""
            MATCH (l:Log)
            RETURN count(l) AS total,
                   count(l.audio_url) AS with_audio
        """)
        rec = await res.data()
        total      = int(rec[0]["total"])      if rec else 0
        with_audio = int(rec[0]["with_audio"]) if rec else 0
    return {
        "nodes":           total * 5,
        "resolutionRate":  f"{int((with_audio/max(total,1))*100)}%",
        "downtimeSaved":   f"{total*2.5}h",
        "activeLogs":      total,
        "logsWithAudio":   with_audio,
        "totalResolutions":total,
    }

# ─── CHAT API ──────────────────────────────────────────────────────────────
@app.get("/api/v1/sessions/{user_id}")
async def get_user_sessions(user_id: str, cu: User = Depends(get_current_user)):
    """Fetch all chat sessions for a user (sidebar history)."""
    async with driver.session(database=NEO4J_DB) as s:
        res = await s.run("""
            MATCH (u:Technician {username:$user})-[:OWNS]->(sess:Session)
            RETURN sess.id AS id,
                   sess.title AS title,
                   sess.status AS status,
                   toString(sess.created) AS created
            ORDER BY sess.created DESC
        """, user=user_id)
        return await res.data()

@app.get("/api/v1/chat/{session_id}")
async def get_chat_thread(session_id: str, cu: User = Depends(get_current_user)):
    """Load all messages in a specific chat session."""
    async with driver.session(database=NEO4J_DB) as s:
        res = await s.run("""
            MATCH (sess:Session {id:$sid})-[:CONTAINS]->(m:Message)
            OPTIONAL MATCH (m)-[:REFERENCES]->(l:Log)-[:RESOLVED_BY]->(r:Resolution)
            OPTIONAL MATCH (l)-[:INVOLVES_MACHINE]->(mach:Machine)
            RETURN m.id AS id,
                   m.sender AS sender,
                   m.content AS content,
                   toString(m.timestamp) AS timestamp,
                   m.order AS order,
                   m.protocolId AS protocolId,
                   mach.name AS machineName,
                   r.steps AS rawSteps,
                   l.audio_url AS audioUrl,
                   l.transcript AS transcript
            ORDER BY m.order ASC
        """, sid=session_id)
        rows = await res.data()
        
    import re
    result_messages = []
    for row in rows:
        msg = {
            "id": row["id"],
            "sender": row["sender"],
            "content": row["content"],
            "timestamp": row["timestamp"],
            "order": row["order"],
            "protocolId": row["protocolId"],
            "protocolTitle": None,
            "protocolSteps": None,
            "audioUrl": None,
            "duration": None,
            "safetyNote": None,
            "protocolTranscript": None
        }
        
        if row.get("rawSteps"):
            machine_name = row.get("machineName") or "Equipment"
            msg["protocolTitle"] = f"Resolution for {machine_name}"
            msg["audioUrl"] = row.get("audioUrl")
            msg["duration"] = "N/A"
            msg["safetyNote"] = get_safety_message(machine_name)
            msg["protocolTranscript"] = row.get("transcript")
            
            # Form clean steps
            raw_steps = re.split(r'\. |; |\n', row["rawSteps"])
            steps = [st.strip() for st in raw_steps if len(st.strip()) > 5]
            if not steps:
                steps = [row["rawSteps"]]
            msg["protocolSteps"] = steps
            
        result_messages.append(msg)
        
    return result_messages

@app.post("/api/v1/chat/message")
async def send_chat_message(msg: ChatMessage, cu: User = Depends(get_current_user)):
    """Send a new message and get AI response with structured protocol data from Logs."""
    user_msg_id = str(uuid.uuid4())
    bot_msg_id = str(uuid.uuid4())
    
    q = msg.content.strip()
    
    # ─── 0. AI Explanation Intercept ───
    if q.startswith("__EXPLAIN__"):
        log_id = q.replace("__EXPLAIN__", "")
        async with driver.session(database=NEO4J_DB) as s:
            # Count
            count_res = await s.run("MATCH (sess:Session {id:$sid})-[:CONTAINS]->(m:Message) RETURN count(m) AS cnt", sid=msg.session_id)
            cnt = (await count_res.single())["cnt"]
            next_order = cnt + 1
            
            # Save User Message as a natural question
            user_content = "Can you explain this solution in more detail?"
            await s.run("""
                MATCH (sess:Session {id:$sid})
                CREATE (m:Message {id: $mid, sender: 'user', content: $content, timestamp: datetime(), order: $order})
                MERGE (sess)-[:CONTAINS]->(m)
            """, sid=msg.session_id, mid=user_msg_id, content=user_content, order=next_order)
            
            # Fetch log text
            res = await s.run("MATCH (l:Log {id:$id}) RETURN l.transcript AS transcript", id=log_id)
            rec = await res.single()
            
            bot_content = "I couldn't retrieve the transcript for this log."
            if rec and rec["transcript"]:
                transcript = rec["transcript"]
                import httpx
                try:
                    async with httpx.AsyncClient() as client:
                        prompt = f"""You are a Senior Industrial AI. A Junior technician asked you to explain a solution. The Senior Technician dictated the following note for the log:

\"{transcript}\"

Explain this step-by-step for a Junior technician, focusing on safety and clarity. Format it neatly without markdown headers."""
                        groq_res = await client.post(
                            "https://api.groq.com/openai/v1/chat/completions",
                            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                            json={"model": "llama3-70b-8192", "messages": [{"role": "user", "content": prompt}]},
                            timeout=15.0
                        )
                        if groq_res.status_code == 200:
                            bot_content = groq_res.json()["choices"][0]["message"]["content"]
                except Exception as e:
                    bot_content = f"Error consulting AI: {e}"
                    
            await s.run("""
                MATCH (sess:Session {id:$sid})
                CREATE (m:Message {id: $mid, sender: 'bot', content: $content, timestamp: datetime(), order: $order})
                MERGE (sess)-[:CONTAINS]->(m)
            """, sid=msg.session_id, mid=bot_msg_id, content=bot_content, order=next_order+1)
            
        return {
            "status": "success",
            "userMessage": {"id": user_msg_id, "sender": "user", "content": user_content, "order": next_order},
            "botMessage": {"id": bot_msg_id, "sender": "bot", "content": bot_content, "order": next_order + 1, "protocol": None}
        }
    
    # ─── 1. Groq-assisted query understanding ───
    extracted = await groq_extract_query(q)
    m_q = (extracted.get("machine") or "").lower()
    i_q = (extracted.get("issue")   or "").lower()
    
    protocol_data = None
    
    async with driver.session(database=NEO4J_DB) as s:
        # Get current message count
        count_res = await s.run("""
            MATCH (sess:Session {id:$sid})-[:CONTAINS]->(m:Message)
            RETURN count(m) AS cnt
        """, sid=msg.session_id)
        count_rec = await count_res.single()
        next_order = (count_rec["cnt"] if count_rec else 0) + 1
        
        # Save user message
        await s.run("""
            MATCH (sess:Session {id:$sid})
            CREATE (m:Message {
                id: $mid,
                sender: 'user',
                content: $content,
                timestamp: datetime(),
                order: $order
            })
            MERGE (sess)-[:CONTAINS]->(m)
        """, sid=msg.session_id, mid=user_msg_id, content=msg.content, order=next_order)
        
        # 2. Search for related Log
        res = await s.run("""
            MATCH (l:Log)-[:RESOLVED_BY]->(r:Resolution)
            OPTIONAL MATCH (l)-[:INVOLVES_MACHINE]->(mach:Machine)
            OPTIONAL MATCH (l)-[:HAS_ISSUE]       ->(i:Issue)
            WHERE toLower(l.transcript) CONTAINS toLower($q)
               OR ($m_q <> '' AND toLower(coalesce(mach.name,'')) CONTAINS toLower($m_q))
               OR ($i_q <> '' AND toLower(coalesce(i.name,'')) CONTAINS toLower($i_q))
            RETURN l.id AS log_id,
                   coalesce(mach.name, 'Unknown Machine') AS machine,
                   coalesce(i.name, 'Unknown Issue') AS issue,
                   r.steps AS solution,
                   l.audio_url AS audio_url,
                   l.transcript AS transcript
            ORDER BY l.timestamp DESC LIMIT 1
        """, q=q.lower(), m_q=m_q, i_q=i_q)
        match_rec = await res.single()
        
        # 3. Generate bot response
        bot_content = "I'm analyzing your request. Could you provide more details about the equipment or issue?"
        if match_rec:
            machine_name = match_rec["machine"]
            issue_name = match_rec["issue"]
            solution_text = match_rec["solution"] or ""
            
            # Form clean steps
            import re
            raw_steps = re.split(r'\. |; |\n', solution_text)
            steps = [st.strip() for st in raw_steps if len(st.strip()) > 5]
            if not steps:
                steps = [solution_text] if solution_text else ["No specific steps logged."]
                
            bot_content = f"I found historically relevant logs for {machine_name}: {issue_name}."
            protocol_data = {
                "id": match_rec["log_id"],
                "title": f"Resolution for {machine_name}",
                "steps": steps,
                "audioUrl": match_rec["audio_url"],
                "duration": "N/A",
                "safetyNote": get_safety_message(machine_name),
                "transcript": match_rec["transcript"]
            }
            
            # Save bot message linking back to the Log
            await s.run("""
                MATCH (sess:Session {id:$sid}), (l:Log {id:$lid})
                CREATE (m:Message {
                    id: $mid,
                    sender: 'bot',
                    content: $content,
                    timestamp: datetime(),
                    order: $order,
                    protocolId: $pid
                })
                MERGE (sess)-[:CONTAINS]->(m)
                MERGE (m)-[:REFERENCES]->(l)
            """, sid=msg.session_id, mid=bot_msg_id, content=bot_content, 
                 order=next_order+1, lid=match_rec["log_id"], pid=protocol_data["id"])
        else:
            # Fallback
            await s.run("""
                MATCH (sess:Session {id:$sid})
                CREATE (m:Message {
                    id: $mid,
                    sender: 'bot',
                    content: $content,
                    timestamp: datetime(),
                    order: $order
                })
                MERGE (sess)-[:CONTAINS]->(m)
            """, sid=msg.session_id, mid=bot_msg_id, content=bot_content, order=next_order+1)

    return {
        "status": "success",
        "userMessage": {
            "id": user_msg_id,
            "sender": "user",
            "content": msg.content,
            "order": next_order
        },
        "botMessage": {
            "id": bot_msg_id,
            "sender": "bot",
            "content": bot_content,
            "order": next_order + 1,
            "protocol": protocol_data
        }
    }

@app.post("/api/v1/sessions")
async def create_session(session: SessionCreate, cu: User = Depends(get_current_user)):
    """Create a new chat session."""
    session_id = str(uuid.uuid4())
    async with driver.session(database=NEO4J_DB) as s:
        await s.run("""
            MATCH (u:Technician {username:$user})
            CREATE (sess:Session {
                id: $sid,
                title: $title,
                created: datetime(),
                status: 'active'
            })
            MERGE (u)-[:OWNS]->(sess)
        """, user=cu.username, sid=session_id, title=session.title)
    return {"id": session_id, "title": session.title, "status": "active"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
