# Module: auth (L1)

**Layer:** L1  
**Iteration:** 1 (Release 1: Working core)  
**Status:** In Progress / Active

---

## Responsibilities

- Authentication: user login with email and password via bcrypt comparison.
- Token management: issue JWT access token (15m expiration) and refresh token (7d expiration stored in an `httpOnly` secure cookie).
- Session handling: logout (clearing refresh token cookie), token refresh (`POST /auth/refresh`), change password (`POST /auth/change-password`).
- User Administration: create new users (`POST /users`), list users with pagination and filtering (`GET /users`), disable/enable or update user roles/departments (`PATCH /users/:id`).
- Authorization & Scoping: enforce 6 system roles (`SUPER_ADMIN`, `MANAGEMENT`, `FINANCE`, `HOD`, `STAFF`, `AUDITOR`) and department scoping (HOD and STAFF can only access their assigned department).
- Audit Integration: every write operation (`LOGIN`, `LOGOUT`, `PASSWORD_CHANGE`, `USER_CREATE`, `USER_UPDATE`, `USER_DISABLE`) calls `audit.log(tx, ...)`.
- Event emission: emits `user.created` and `user.disabled` on the platform event bus after transaction commit.

---

## Owns (tables)

`users`

---

## Public API (`index.js` exports)

```javascript
export { getUserById, getUserScope, isActive, listApprovers } from './service.js';
export { authRouter } from './routes.js';
export { usersRouter } from './users.routes.js';
```

- `getUserById(id)`: returns sanitized user object without `passwordHash`.
- `getUserScope(user)`: returns `{ role, departmentId }` scoping rules.
- `isActive(userId)`: returns boolean flag indicating whether the user is active.
- `listApprovers(deptId, role)`: lists active users eligible for approval roles in a department.

---

## Events emitted

- `user.created`: `{ userId, email, role, departmentId }`
- `user.disabled`: `{ userId }`

---

## Version history

| Version | Iteration | Status | Content |
|---|---|---|---|
| v1 | 1 | ✅ Done | Login, JWT access + refresh (httpOnly cookie), change password, create/disable users, 6 roles, department scoping, audit writer integration |
| v2 | 17 | 🔲 Planned | Redis refresh-token store, logout revocation list, login rate limit, forgot-password |
