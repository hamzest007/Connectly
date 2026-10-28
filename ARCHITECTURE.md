# Connectly architecture

The repository keeps the React Native CLI project at the root so Android and iOS build commands remain standard. Product code lives under `src/`; the API lives under `backend/`.

```text
Connectly/
├── android/                 # React Native Android host
├── ios/                     # React Native iOS host
├── src/
│   ├── app/                 # application composition and navigation boundary
│   ├── components/          # reusable UI grouped by domain
│   ├── features/            # feature screens, state, API hooks, and types
│   ├── services/            # API, socket, and secure storage adapters
│   ├── theme/               # design tokens and theme providers
│   ├── types/               # shared client types
│   ├── hooks/               # cross-feature hooks
│   ├── utils/               # pure helpers
│   └── validation/          # client-side schemas
├── backend/
│   └── src/
│       ├── config/ common/ middleware/
│       ├── modules/         # isolated REST domains
│       ├── sockets/ jobs/ utils/
│       ├── app.ts
│       └── server.ts
└── __tests__/
```

## Data relationships

`User` owns profile/privacy settings and session records. `Post` references its author; `Comment`, `Reaction`, `SavedPost`, and `Report` reference posts independently. `Friendship` is a normalized relationship between two users. `Conversation` has participants, while `Message` is paginated separately. `Notification` and `StoryView` are also independent, indexed collections.

## Milestone 1 delivered

- Working mobile shell with Home, Friends/Create/Alerts/Menu tab boundary.
- Feed cards with local optimistic-like interaction, empty/loading-ready list structure, and composer screen.
- Backend health endpoint and validated auth route boundaries.
- Environment template and architecture documentation.

The auth handlers are intentionally boundaries until MongoDB/JWT persistence is wired; they do not pretend to authenticate users yet.
