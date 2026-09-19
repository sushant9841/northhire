# HR Suite — Permissions matrix

Source of truth: `server/routes/hr.js`. Every route requires `requireHrAuth` (a valid HR session)
first; the columns below are the *additional* gate on top of that. The client nav
(`src/shells/HrShell.jsx` + `modulesForRole` in `src/store/useHrStore.js`) is derived from the
same role list and must never grant more than the server allows — if a module shows in the
sidebar, the server accepts it for that role; if it doesn't, `HrShell` now renders a visible
"Permission denied" state instead of silently redirecting (fixed in the H2 audit — previously it
bounced back to the dashboard with no explanation, or in some cases let the page render and fail
per-request with an unexplained 403).

Legend: **Owner** (Rachel), **Admin** (Priya), **HR** (Linda), **Finance** (Isaac), **Employee**
(Daniel, and every non-privileged role).

## Server gate functions

- `requireHrAuth` — any signed-in HR employee at the company.
- `requireHrPriv` (`isPriv`) — **Owner / Admin / HR** only.
- `requireHrMoney` (`isMoneyRole`) — **Owner / Admin / HR / Finance**... no — see below: **Owner /
  Finance*** for the money surface, see the H2 fix note.
- Per-route custom checks: `canDecideFor` / `canDecideByChain` (a manager can decide their own
  reports' leave/expenses even without a privileged role), `resolveOwnHrInvoice` (company
  scoping), self-only checks (`sync-consent`, punch PIN).

> **H2 fix**: `requireHrMoney` was added in this tranche. Previously every payroll/invoice/tax-slip/
> ROE/expense-payment route used `requireHrPriv` (Owner/Admin/HR), which does **not** include
> `finance` — so Isaac (Finance) was silently 403'd on the exact surface his role exists for, while
> the client nav already let him click into Payroll/Invoices. `requireHrMoney` = Owner/Admin/HR
> **or** Finance, applied additively (nothing that could already reach these routes lost access).

## Module × role (client nav visibility = server `modulesForRole`)

| Module | Owner | Admin | HR | Finance | Employee |
|---|---|---|---|---|---|
| Dashboard / Overview | ✅ | ✅ | ✅ | ✅ | ✅ |
| People (Directory) | ✅ full | ✅ full | ✅ full | ⚠️ not in nav yet — see note | — |
| My profile | ✅ | ✅ | ✅ | ✅ | ✅ |
| Attendance | ✅ | ✅ | ✅ | ✅ (view) | ✅ (own) |
| Leave | ✅ | ✅ | ✅ | — | ✅ (own) |
| Expenses | ✅ | ✅ | ✅ | ✅ | ✅ (own) |
| Tasks | ✅ | ✅ | ✅ | ✅ | ✅ (own) |
| Calendar | ✅ | ✅ | ✅ | ✅ | ✅ (own) |
| Chat | ✅ | ✅ | ✅ | ✅ | ✅ |
| Trainings | ✅ | ✅ | ✅ | — | — |
| Badges | ✅ | ✅ | ✅ | — | — |
| Hiring | ✅ | ✅ | ✅ | — | — |
| Invoices | ✅ | ✅ | — | ✅ | — |
| Payroll | ✅ | ✅ | — | ✅ | — |
| Reports | ✅ | ✅ | ✅ | ✅ | — |
| Settings | ✅ | ✅ | — | — | — |
| Integrations | ✅ | ✅ | — | — | — |
| Policies & sign-off | ✅ | ✅ | ✅ | ✅ | ✅ |
| Shift roster | ✅ | ✅ | ✅ | ✅ | ✅ (own shifts) |

Payslips (`/hr/payslips/mine`, `/hr/tax-slips/:year/mine`) are available to **every** role, always
scoped to the caller's own record — this is intentionally not in the table above since it isn't a
module gate, it's a "my own data" endpoint.

> **Note — Finance directory access**: the transformation plan calls for Finance to get an
> "everyone-view" of People (name + department only, no personal data). The *data* side of this is
> now fixed server-side: `maskHrEmployeeForViewer` gives a `finance`-role viewer a hard-restricted
> object (`id, name, title, dept, seed, status, role` — no email/phone/salary/birthDate/manager/
> notes/badges), regardless of the target employee's own visibility opt-outs, wherever the roster
> is already fetched (e.g. the topbar's global search, which loads for every role). The existing
> `HrPeople` directory page itself is a full management surface (search assumes `e.email` exists,
> CSV export, add/edit/salary) that is **not** safe to point Finance at yet without a dedicated
> read-only variant — that UI is deferred, tracked as a residual item, not shipped half-working.

## Action × role (server route gate)

| Action | Route(s) | Gate |
|---|---|---|
| View directory | `GET /employees` | `requireHrAuth` (response masked per-viewer) |
| Add/edit/delete/erase employee | `POST/PATCH/DELETE /employees*` | `requireHrPriv` |
| Award/remove badge | `PATCH /employees/:id/badges` | `requireHrPriv` |
| Own profile-sync consent | `GET/POST /employees/:id/sync*` | self only |
| Own visibility toggles | `PATCH /employees/:id/visibility` | self (or priv) |
| Documents (upload/delete) | `POST/DELETE .../documents` | `requireHrPriv` |
| View own/team documents | `GET .../documents` | `requireHrAuth`, scoped |
| Shifts (create/edit/delete) | `POST/PATCH/DELETE /shifts` | `requireHrPriv` |
| View shifts/roster | `GET /shifts` | `requireHrAuth` (own vs. all split server-side) |
| Kiosk devices | `/kiosk/devices*` | `requireHrPriv` |
| Punch PIN | `PUT /employees/:id/punch-pin` | self, or `requireHrPriv` for anyone |
| Punch in/out | `/attendance/punch-*` | `requireHrAuth`, self-scoped |
| Leave request | `POST /leave` | `requireHrAuth`, self |
| Leave decision | `PATCH /leave/:id/decide` | `canDecideByChain` (manager of the requester, or priv, or a configured approval chain) |
| Tasks (CRUD) | `/tasks*` | `requireHrAuth` (assign/decide scoped in-route) |
| Calendar events | `/events*` | `requireHrAuth` |
| Invoices (create/send/mark paid/reverse) | `/invoices*` | **`requireHrMoney`** (Owner/Admin/HR/Finance) |
| View invoices | `GET /invoices` | `requireHrAuth` |
| Departments (CRUD) | `/departments*` | `requireHrPriv` |
| Submit own expense | `POST /expenses` | `requireHrAuth`, self |
| Approve/deny expense | `PATCH /expenses/:id/decide` | `canDecideFor` (manager or priv) |
| Company-wide expense list | `GET /expenses/company` | **`requireHrMoney`** |
| Mark expense paid | `PATCH /expenses/:id/pay` | **`requireHrMoney`** |
| Payroll (run/approve/execute/reverse) | `/payruns*` | **`requireHrMoney`** |
| Own payslips | `GET /payslips/mine` | `requireHrAuth`, self only |
| Tax slip years / T4 batch | `GET /tax-slips/years`, `GET /tax-slips/:year` | **`requireHrMoney`** |
| Own T4 | `GET /tax-slips/:year/mine` | `requireHrAuth`, self only |
| ROE | `GET /roe/:employeeId` | **`requireHrMoney`** |
| 1:1 log | `/one-on-ones*` | `requireHrAuth`, manager/report pair (or priv) |
| Audit log | `GET /audit-log` | `requireHrAuth` — company-scoped; UI only surfaces it to priv roles today |
| Chat | `/chats*` | `requireHrAuth`, participant-scoped |
| Company settings (view) | `GET /company-settings` | `requireHrAuth` |
| Company settings (change) | `PATCH /company-settings` | `requireHrPriv` |
| E-sign documents (create/list all/delete) | `/sign-documents*` | `requireHrPriv` (own sign action is `requireHrAuth`) |
| Task comments | `/tasks/:id/comments*` | `requireHrAuth` |
| Expense categories (view/edit) | `GET/PUT /expense-categories` | view: `requireHrAuth`; edit: `requireHrPriv` |

## Known residual items (not fixed in this tranche)

1. **Finance directory UI** — data exposure is fixed (see above), but there's no dedicated
   read-only "everyone-view" People page for Finance yet; the existing `HrPeople.jsx` isn't safe
   to point Finance at without changes (it assumes fields Finance's masked response omits).
2. **Owner/Admin/HR still share full money-route access** (`requireHrPriv` routes untouched). The
   transformation plan's nav lists imply Admin and HR should *not* see Payroll/Invoices day-to-day;
   this tranche only *added* Finance access rather than narrowing Owner/Admin/HR's existing access,
   to avoid destabilizing other already-verified demo flows without a dedicated regression pass.
   Flagged here rather than silently left out of the audit.
3. **`maskHrEmployeeForViewer`'s general (non-Finance) branch** still keys personal-field masking
   off the *target* employee's own public-profile visibility toggles, not a separate "what can a
   colleague see internally" concept — pre-existing, out of scope for this pass.
