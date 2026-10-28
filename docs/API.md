# Connectly API

Base URL: `/api/v1`

All responses use `{ success, data }` on success and `{ success: false, error: { message } }` on failure.

## Implemented now

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /posts?limit=20&before=<ISO date>`
- `POST /posts`
- `PATCH /posts/:id`
- `DELETE /posts/:id`
- `PUT /posts/:id/reaction`
- `DELETE /posts/:id/reaction`
- `GET /posts/:id/comments`
- `POST /posts/:id/comments`
- `POST /posts/:id/save`
- `DELETE /posts/:id/save`
- `GET /posts/saved`
- `POST /posts/:id/share`
- `GET /users/search?q=...`
- `GET /users/me`
- `PATCH /users/me`
- `GET /users/:username`
- `POST /friends/:userId`
- `GET /friends/requests`
- `PATCH /friends/:id`
- `GET /notifications`
- `PATCH /notifications/:id/read`
- `POST /notifications/read-all`
- `GET /uploads/signature`
- `POST /reports`
- `GET /reports/mine`
- `GET /blocks`
- `POST /blocks/:userId`
- `DELETE /blocks/:userId`

Authenticated endpoints require `Authorization: Bearer <accessToken>`.
