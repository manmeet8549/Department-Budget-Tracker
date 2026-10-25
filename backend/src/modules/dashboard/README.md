# Dashboard Module (`dashboard`)

## 1. Overview
The Dashboard module provides high-level financial health and budget control summaries for college administrators, finance officers, auditors, and department heads. It serves as the primary landing data source after user login.

## 2. Architecture & Invariants
- **Layer:** L3 (Aggregator / Application layer).
- **Ownership:** Owns no database tables.
- **Data Sources:** Strictly reads from `balances/index.js` and `master/index.js`.
- **Invariants:**
  - The dashboard executes **no SQL of its own** and performs **no money arithmetic**.
  - All financial numbers (`allocated`, `committed`, `spent`, `available`) are calculated by `balances` and returned as exact two-decimal strings (`NUMERIC(14,2)` representations), never floating-point numbers.
  - Department inclusion rule: Includes every department that has an `APPROVED` budget in the specified (or active) financial year.
  - Department scoping:
    - `HOD` and `STAFF` receive only their own assigned department, and `college` summary is `null`.
    - `MANAGEMENT`, `FINANCE`, `AUDITOR`, and `SUPER_ADMIN` receive all approved departments and college-wide consolidated totals.
  - Sub-units (e.g. BBA, BCOM under MT) include their `parentCode` (or `null` if top-level).
  - Unauthenticated requests return `401 Unauthorized`.

## 3. API Endpoints
- `GET /api/v1/dashboard/summary?financialYearId=`
  - Query: `financialYearId` (optional, defaults to currently active financial year).
  - Headers: `Authorization: Bearer <token>`
  - Response:
    ```json
    {
      "success": true,
      "data": {
        "financialYear": {
          "id": 1,
          "year": "2026-27",
          "status": "OPEN",
          "isActive": true
        },
        "college": {
          "allocated": "800000.00",
          "committed": "150000.50",
          "spent": "0.00",
          "available": "649999.50",
          "utilisationPercent": 18.75
        },
        "departments": [
          {
            "id": 1,
            "code": "ET",
            "name": "Engineering Block",
            "parentCode": null,
            "allocated": "800000.00",
            "committed": "150000.50",
            "spent": "0.00",
            "available": "649999.50",
            "utilisationPercent": 18.75
          }
        ]
      }
    }
    ```

## 4. Version History

| Version | Iteration | Status | Content |
|---|---|---|---|
| v1 | 5 | ✅ Done | Initial `GET /dashboard/summary` implementation. Aggregation through `balances` and `master` with zero SQL and zero money arithmetic. Exact 2-decimal strings, role scoping, parentCode support. |
| v2 | 9 | 🔲 Planned | Monthly trend line, category breakdown, pending approvals widget, threshold alert counts |

