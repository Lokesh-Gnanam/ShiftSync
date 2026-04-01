// ═══════════════════════════════════════════════════════════════════════════
// ShiftSync AI - Neo4j Chat Schema Setup
// ═══════════════════════════════════════════════════════════════════════════

// 1. Create Constraints
CREATE CONSTRAINT session_id IF NOT EXISTS FOR (s:Session) REQUIRE s.id IS UNIQUE;
CREATE CONSTRAINT message_id IF NOT EXISTS FOR (m:Message) REQUIRE m.id IS UNIQUE;
CREATE CONSTRAINT equipment_name IF NOT EXISTS FOR (e:Equipment) REQUIRE e.name IS UNIQUE;
CREATE CONSTRAINT protocol_id IF NOT EXISTS FOR (p:Protocol) REQUIRE p.id IS UNIQUE;

// 2. Create Sample Equipment Nodes
MERGE (p3:Equipment {name: "Pump 3", type: "Centrifugal Pump", location: "Building A"})
MERGE (hvac:Equipment {name: "HVAC Unit 2", type: "Cooling System", location: "Building B"})
MERGE (valve:Equipment {name: "Safety Valve SV-101", type: "Pressure Relief", location: "Boiler Room"})
MERGE (cnc:Equipment {name: "CNC Mill 5", type: "Machining Center", location: "Shop Floor"});

// 3. Create Protocol Nodes with Detailed Steps
MERGE (proto1:Protocol {
  id: "PROTO-001",
  title: "Pump 3 Recalibration Protocol",
  equipment: "Pump 3",
  steps: [
    "Isolate pump from system and lock out power supply",
    "Drain residual fluid and inspect impeller for wear",
    "Recalibrate pressure sensors using digital gauge",
    "Test run at 50% capacity for 10 minutes",
    "Verify flow rate matches specification sheet"
  ],
  audioUrl: "/static/audio/pump3-protocol.mp3",
  duration: "1:15",
  safetyNote: "Ensure no dry-run condition before testing"
});

MERGE (proto2:Protocol {
  id: "PROTO-002",
  title: "HVAC Filter Replacement",
  equipment: "HVAC Unit 2",
  steps: [
    "Turn off HVAC unit and isolate electrical supply",
    "Remove access panel and locate filter housing",
    "Replace filter with correct MERV rating",
    "Check for air leaks around housing seal",
    "Restore power and verify airflow"
  ],
  audioUrl: "/static/audio/hvac-filter.mp3",
  duration: "0:58",
  safetyNote: "Isolate electrical supply before servicing"
});

MERGE (proto3:Protocol {
  id: "PROTO-003",
  title: "Safety Valve Inspection",
  equipment: "Safety Valve SV-101",
  steps: [
    "Vent steam pressure completely before inspection",
    "Visually inspect valve seat for corrosion",
    "Test spring tension with calibrated gauge",
    "Verify set pressure matches nameplate rating",
    "Document inspection in maintenance log"
  ],
  audioUrl: "/static/audio/valve-check.mp3",
  duration: "1:02",
  safetyNote: "Vent steam pressure before opening any valve"
});

// 4. Link Equipment to Protocols
MATCH (e:Equipment {name: "Pump 3"}), (p:Protocol {id: "PROTO-001"})
MERGE (e)-[:HAS_PROTOCOL]->(p);

MATCH (e:Equipment {name: "HVAC Unit 2"}), (p:Protocol {id: "PROTO-002"})
MERGE (e)-[:HAS_PROTOCOL]->(p);

MATCH (e:Equipment {name: "Safety Valve SV-101"}), (p:Protocol {id: "PROTO-003"})
MERGE (e)-[:HAS_PROTOCOL]->(p);

// 5. Create Sample Session for Junior Tech
MATCH (u:Technician {username: "junior"})
CREATE (s:Session {
  id: "SESSION-001",
  title: "Pump 3 Calibration",
  created: datetime(),
  status: "active"
})
MERGE (u)-[:OWNS]->(s);

// 6. Create Sample Messages in Session
MATCH (s:Session {id: "SESSION-001"}), (e:Equipment {name: "Pump 3"})
CREATE (m1:Message {
  id: "MSG-001",
  sender: "user",
  content: "I need help with Pump 3 calibration. It's showing inconsistent pressure readings.",
  timestamp: datetime(),
  order: 1
})
CREATE (m2:Message {
  id: "MSG-002",
  sender: "bot",
  content: "I'll help you with Pump 3 recalibration. Let me pull up the protocol.",
  timestamp: datetime() + duration({seconds: 2}),
  order: 2
})
CREATE (m1)-[:REFERENCES]->(e)
CREATE (s)-[:CONTAINS]->(m1)
CREATE (s)-[:CONTAINS]->(m2);

// 7. Example Query to get Protocol for Equipment in Message
// MATCH (m:Message {id: "MSG-001"})-[:REFERENCES]->(e:Equipment)-[:HAS_PROTOCOL]->(p:Protocol)
// RETURN p;

  protocolId: "PROTO-001"
})
MERGE (s)-[:CONTAINS]->(m1)
MERGE (s)-[:CONTAINS]->(m2)
MERGE (m1)-[:REFERENCES]->(e)
MERGE (m2)-[:REFERENCES]->(e);

// 7. Verify Schema
MATCH (u:Technician)-[:OWNS]->(s:Session)-[:CONTAINS]->(m:Message)
OPTIONAL MATCH (m)-[:REFERENCES]->(e:Equipment)-[:HAS_PROTOCOL]->(p:Protocol)
RETURN u.username, s.title, m.content, e.name, p.title
LIMIT 5;
