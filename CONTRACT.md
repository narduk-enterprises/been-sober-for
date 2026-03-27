Status: LOCKED

# API contract — Been Sober For.com

Locked after UI plan. Methods, paths, request/response fields, errors, auth.

## Conventions

- All **mutations** use layer mutation helpers and `withValidatedBody` / Zod
  schemas.
- **Imports:** `#server/` alias from `server/`.
- **JSON:** `Content-Type: application/json` where applicable.

## Existing app routes

### `GET /api/users`

- **Auth:** Admin only (`requireAdmin` or layer equivalent).
- **Query:** `page`, `limit` (validated).
- **Response:** Paginated user list (shape per implementation).
- **Errors:** 401/403 unauthenticated or non-admin; 400 invalid query.

## Planned MVP routes (implement with SPEC)

| Method  | Path                         | Auth    | Body                                                   | Success                                | Errors              |
| ------- | ---------------------------- | ------- | ------------------------------------------------------ | -------------------------------------- | ------------------- |
| `GET`   | `/api/profile`               | Session | —                                                      | Current user profile + sobriety fields | 401                 |
| `PATCH` | `/api/profile`               | Session | displayName?, avatar?, sobrietyStartedAt?, publicSlug? | Updated profile                        | 401, 400 validation |
| `POST`  | `/api/profile/start-again`   | Session | `{ startedAt: string (ISO date) }`                     | Updated profile                        | 401, 400            |
| `GET`   | `/api/public/profile/[slug]` | Public  | —                                                      | Public-safe DTO (no email)             | 404                 |

Exact path naming follows Nuxt server route files (e.g.
`server/api/profile.patch.ts`).

## Public DTO (example)

```json
{
  "displayName": "string",
  "avatarUrl": "string | null",
  "sobrietyStartedAt": "string (ISO)",
  "slug": "string"
}
```

## Auth

- Session cookie per layer `nuxt-auth-utils` / sealed cookie pattern.
- CSRF: follow layer rules for mutating routes.

## Rate limiting

- Use layer rate limiting for auth and mutation routes where configured; extend
  for public slug endpoint if abused.
