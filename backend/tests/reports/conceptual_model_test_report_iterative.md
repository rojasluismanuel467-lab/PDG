# Conceptual Diagram Test Report (Iterative)

Date: 2026-04-01  
Module: AS-IS/TO-BE Conceptual Diagram (editor, versions, preview/restore, comments, crow's foot notation)

## Iteration Summary

### Iteration 1 - Baseline and smoke
- Goal: executable baseline and smoke over conceptual artifact.
- Evidence:
  - `backend/tests/integration/test_conceptual_model_endpoints.py`
  - Result: `10 passed` (initial run), then expanded in later iterations.

### Iteration 2 - Backend functional adequacy
- Goal: core business behavior in conceptual endpoints.
- Added/validated:
  - preview version success and not found (`404`)
  - restore version success, forbidden (`403`), not found (`404`)
  - validation mapping (`422`) and permission mapping (`403`) in upsert flows
- Evidence:
  - `backend/tests/integration/test_conceptual_model_endpoints.py`

### Iteration 3 - API contract stability
- Goal: stable response contracts and error codes for frontend integration.
- Added/validated:
  - response-schema contract tests for model, versions, preview and comments
  - JSON snapshots for `model`, `versions`, `comments` and conceptual OpenAPI paths
  - error contract tests (`403`, `409`, `422`)
  - OpenAPI snapshot for conceptual paths and HTTP methods
- Evidence:
  - `backend/tests/integration/test_conceptual_model_api_contract.py`
  - `backend/tests/fixtures/conceptual_contract/*.snapshot.json`
  - `backend/tests/integration/test_openapi_contract.py`
  - Execution: `21 passed` (`test_conceptual_model_api_contract.py` + `test_conceptual_model_endpoints.py`)
  - Endpoint coverage (`app/api/v1/endpoints/conceptual_model.py`): **98%**

### Iteration 4 - Frontend behavior (no mocks to backend contracts)
- Goal: critical UI flows and crow's foot rendering behavior.
- Added/validated:
  - preview modal opens from versions tab
  - preview supports `v`-prefixed versions (`"v4"`)
  - restore from preview modal with styled confirmation modal (confirm/cancel)
  - read-only mode hides restore action
  - 404 and generic preview errors show styled feedback modal
  - edge component renders source/target crow's foot notations
  - E2E puntual: consultant can open conceptual artifact, preview a prior version and trigger restore confirmation
- Evidence:
  - `frontend/tests/component/conceptual-model-editor.test.tsx`
  - `frontend/tests/component/conceptual-relation-edge.test.tsx`
  - `frontend/tests/component/conceptual-crowfoot.test.ts`
  - `frontend/tests/e2e/conceptual-flow.spec.ts`
  - Execution:
    - `npm run test:component` -> `5 files, 13 tests passed`
    - `npm run test:e2e -- tests/e2e/conceptual-flow.spec.ts` -> `1 passed`

### Iteration 5 - Consolidation
- Goal: consolidated execution and metrics.
- Final execution:
  - Backend:
    - Command:
      - `backend\.venv\Scripts\python.exe -m pytest tests\integration\test_conceptual_model_endpoints.py tests\integration\test_conceptual_model_api_contract.py tests\integration\test_openapi_contract.py --cov=app.api.v1.endpoints.conceptual_model --cov-report=term-missing -q`
    - Result: `59 passed` (unit + integration + contract)
    - Coverage (`app/api/v1/endpoints/conceptual_model.py`): **98%**
    - Coverage (`app/services/conceptual_model_service.py`): **87%**
    - Combined coverage (service + endpoint): **88%**
  - Frontend:
    - Command:
      - `npm run test:component`
    - Result: `5 files, 13 tests passed`
  - E2E puntual:
    - Command:
      - `npm run test:e2e -- tests/e2e/conceptual-flow.spec.ts`
    - Result: `1 passed`

## Traceability to Evaluation Plan (ISO/IEC 25010)

- Functional Adequacy:
  - Covered by backend integration + API contract tests.
  - Status: **PASS**
- Interaction Capability:
  - Covered by frontend tests over preview modal, restore flow, read-only restrictions, and user-facing 404 messaging.
  - Status: **PASS**
- Maintainability:
  - Automated tests added in backend and frontend with repeatable commands and coverage thresholds on frontend helper logic.
  - Status: **PASS** (with note below)

## Notes / Remaining Gaps

- Frontend coverage is currently focused on the crow's foot rules module and critical ER UI flows.
- If required, next increment can add Playwright E2E against running backend for full browser path:
  - project -> conceptual artifact -> versions -> preview modal -> restore.
