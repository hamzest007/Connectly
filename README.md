# Connectly

Connectly is a React Native social platform with a modular TypeScript/Express backend and a dedicated Vite-powered admin center. The repository contains the mobile client, backend modules, API documentation, architecture notes, tests, and administrative workflows in one product workspace.

## Highlights

- React Native mobile application
- TypeScript/Express backend modules
- Authentication and user flows
- Posts, comments, reactions, and saved content
- Friends, groups, and notifications
- Moderation and verification workflows
- Admin analytics, configuration, and audit logs
- Jest tests and documented architecture boundaries

## Repository structure

| Directory | Purpose |
| --- | --- |
| `src/` | Mobile application code |
| `backend/` | Backend modules and server-side functionality |
| `admin/` | Vite/React administration center |
| `docs/` | API documentation |
| `__tests__/` | Application tests |

See [ARCHITECTURE.md](./ARCHITECTURE.md), [FEATURES.md](./FEATURES.md), and [docs/API.md](./docs/API.md) for the current implementation notes and delivery status.

## Run the mobile app

Complete the official [React Native environment setup](https://reactnative.dev/docs/set-up-your-environment) first.

```bash
npm install
npm start
```

In a second terminal:

```bash
npm run android
# or
npm run ios
```

For iOS, install CocoaPods dependencies when required:

```bash
bundle install
bundle exec pod install --project-directory=ios
```

## Run the admin center

```bash
cd admin
npm install
npm run dev
```

## Local configuration

Create environment files locally for the backend and admin center as needed. Environment files are intentionally excluded from version control. Use local values for MongoDB, JWT signing secrets, Cloudinary settings, and seed credentials; never commit those values to GitHub.

## Test and lint

```bash
npm test
npm run lint
```

## Project status

This repository is public. The README documents the product scope without publishing credentials, service URLs, or private deployment details.
