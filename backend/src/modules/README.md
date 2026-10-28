# Backend module roadmap

Each domain owns its routes, controllers, services, schemas, models, and types. Add modules in this order so every feature is implemented end-to-end:

`users` → `posts` → `feed` → `comments`/`reactions` → `friends` → `notifications` → `conversations`/`messages` → `stories` → `search` → `uploads` → `reports`/`blocks`.

Growing relationships such as reactions, comments, messages, story views, friendship requests, and notifications must remain separate collections. Do not embed unbounded arrays in user or post documents.
