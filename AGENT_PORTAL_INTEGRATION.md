# Agent Portal Integration

The finance app reads customer registration data through `src/services/agentPortalService.js`.

## Runtime Modes

- Local development: if `VITE_AGENT_PORTAL_API_BASE_URL` is not set, the app uses `src/data/mockCustomers.js`.
- Integrated deployment: set `VITE_AGENT_PORTAL_API_BASE_URL` to the agent portal API base URL.

## Required API Endpoints

- `GET /health`
  - Used for availability checks.
- `GET /agent/customers`
  - Returns customer registration records created by agents.
- `POST /payments/manual`
  - Saves manual finance payment records to the backend database.

## Customer Contract

Each customer record should include:

```json
{
  "id": "CUS-001",
  "customerName": "Daniel Otieno",
  "customerPhone": "+254711223344",
  "agentName": "Mary Wanjiku",
  "bikeModel": "Boxer 150",
  "serialNumber": "BX150-88213",
  "totalPayable": 185000,
  "paidAmount": 74200,
  "balance": 110800,
  "dueDate": "2026-06-02",
  "registrationStatus": "active"
}
```

## Reliability Behavior

- If the configured agent portal API is unavailable, the app falls back to local cached/mock data.
- A visible alert is added to the Alerts screen: `Agent portal sync issue`.
- Payments are joined with agent portal registration data by customer phone or customer name.

## Maintainability Notes

- Keep API normalization inside `agentPortalService`.
- Keep payment joining rules inside `paymentService`.
- Keep alert display logic inside Notifications.
- When replacing mock data with a database, update only the backend endpoint, `agentPortalService`, or `paymentService`; screens should not change.
