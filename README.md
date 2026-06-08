# Marketing Dynamic Lead Routing Engine

An enterprise-grade B2B sales operations application that discards outdated geographic routing in favor of a propensity-weighted, capacity-aware distribution matrix. 

## 💡 The Core Problem & Algorithmic Solution
Routing inbound marketing leads purely by zip code creates extreme revenue loss if a rep has zero expertise in that lead's specific industry sector. However, routing exclusively to the "best" closer creates processing bottlenecks and starves the rest of the team.

This application implements a **matrix-conditioned probability model** that balances performance matching with systemic workload equity.

### 📊 The Distribution Logic
The assignment engine evaluates two distinct multi-variable metrics before calculating final assignment probability weights:

1. **Sector Specialization Capacity:** The algorithm tracks active leads assigned to a team member within the target industry vertical, assigning them to one of five distinct tier thresholds (Bucket 1 to Bucket 5).
2. **Global Workload Capacity:** The engine checks the total cross-sector active pipeline load of the salesperson to assess burnout risk, segmenting them into capacity groups (Pool 1 to Pool 5).
3. **Probability Matrix Calculation:** The system maps the intersection of the sector bucket and capacity pool to scale the rep's assignment probability weight. For example, a rep with high sector proficiency who currently has low overall pipeline volume scales to a maximum priority weight, while a bottlenecked rep automatically scales down to protect delivery speed.

## 🎛️ Administrative & CRUD Controls
* **Sales Team Management Dashboard:** Features a comprehensive administration interface allowing operators to dynamically add, modify, or remove sales profiles.
* **Sector Profiling:** Allows live administrative updates to each sales representative's Top 3 sector specializations as performance or market demands shift.
* **Real-Time Simulation Sandbox:** Allows operational managers to test simulated inbound leads (Sector + Region) to visualize the real-time probability curve adjustments.

## 🛠️ Tech Stack & Architecture
* **Frontend UI (`/client`):** Built with React, TailwindCSS, and TypeScript for an administrative sales control deck.
* **Logic Engine (`/server`):** Node.js runtime handling the probability weight array processing, data mutations, and distribution simulation state.
* **Data Management:** Configured via Drizzle ORM to maintain clean database schemas tracking sales reps, workloads, and territory metadata.
