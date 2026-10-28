# Connectly feature contract

This is the implementation checklist for the product brief. A feature is marked **done** only when it has a user-facing screen, an API/data path, validation, and a testable failure state.

## Current product surface

| Area | Status | Notes |
| --- | --- | --- |
| Authentication and session refresh | Done | Login, signup, secure refresh, logout, password validation |
| Home feed | Done | For-you, following, friends, latest, trending, saved, pagination, pull-to-refresh |
| Posts | Done | Text, image, video, carousel media, edit/delete ownership controls |
| Engagement | Done | Reactions, comments, shares, saves, hide, snooze |
| Profiles and follows | Done | Profile view/edit, follow/unfollow, follower counts, public profile posts |
| Friends and discovery | Done | Search, follow requests, accepted friends |
| Notifications | Done | Reaction, comment, share, follow and friend activity |
| Reels | Partial | Upload/playback and comments exist; creator insights and moderation remain |
| Admin dashboard | Partial | Overview, users, reports and audit logs exist; verification, announcements, settings and analytics remain |
| Stories | Planned | Data model, expiry, viewers, stickers, music and mentions are not wired |
| Messaging | Planned | Conversations, files, voice messages, receipts, typing and calls are not wired |
| Communities and groups | Planned | Membership, roles, moderation and group posts are not wired |
| Pages | Planned | Public organization/creator pages with page roles and publishing are not wired |
| Creator/page dashboard | Planned | Analytics, audience, content performance and earnings dashboard are not wired |
| Content monetization | Planned | Eligibility, subscriptions, tips, ads/revenue share and payouts are not wired |
| Live streaming | Planned | Requires streaming provider and moderation pipeline |
| Creator accounts and monetization | Planned | Requires verification, analytics, payouts and policy decisions |
| Marketplace | Planned | Requires listings, search, buyer/seller messaging and reporting |
| AI features | Planned | Recommendations, captions, descriptions, translation and writing assistance require provider selection and opt-in controls |
| Two-factor authentication | Planned | Requires enrollment, recovery codes and challenge flow |

## Delivery order

### Phase 1 — MVP hardening

- Add API integration tests for auth, feed pagination, post ownership, reactions, comments, saves, reports and blocks.
- Add profile privacy enforcement to every read and interaction route.
- Complete password reset, account deletion, data export and notification preferences.
- Add loading, empty, offline and retry states to every mobile screen.
- Add admin verification, announcements, feature flags and analytics endpoints.

### Phase 2 — Stories and search

- Story and story-view models with a 24-hour expiry query.
- Photo/video story creation, viewer lists, mentions, text and stickers.
- Hashtag extraction, hashtag search, user/post search and trending topics.
- Explore screen with ranking, sponsored-content labeling and report controls.

### Phase 3 — Real-time communication

- Conversation and message models with authorization checks.
- Socket.IO presence, typing indicators, delivery/read receipts and reconnect handling.
- Text, image, video, file and voice messages with upload limits and scanning.
- Reply, forward, edit, delete, group conversations and notification deep links.

### Phase 4 — Safety and scale

- Two-factor authentication, login alerts, session management and recovery codes.
- Automated moderation queues, rate limits, spam/scam detection and sensitive-content controls.
- Redis caching, background media processing, observability and production deployment checks.

### Phase 5 — Advanced ecosystem

- Groups, Pages, live streaming, creator dashboards, verification, monetization, marketplace and AI-assisted features.
- Each advanced feature must ship behind a feature flag with consent, reporting and admin controls.

## Groups

Groups may be public, private or hidden. A group needs:

- Create/edit/archive group, name, description, cover image, rules and category.
- Public group discovery and private/hidden invite links.
- Join requests, invites, approval workflows and membership removal.
- Roles: owner, admin, moderator and member, with least-privilege permissions.
- Group feed with text, image, video, carousel, polls, pinned announcements and scheduled posts.
- Nested comments, reactions, mentions, saved posts and group notifications.
- Moderation queue, keyword filters, slow mode, member reports and moderator audit log.
- Group insights for admins: members, active members, reach, posts, comments and retention.

## Pages

Pages represent creators, businesses, organizations, communities or public figures and are separate from personal profiles.

- Page creation with name, handle, category, bio, website, logo, cover photo and contact details.
- Public/private publishing settings, verification request and page deletion/export controls.
- Page roles: owner, editor, moderator, analyst and advertiser.
- Page feed with drafts, scheduled posts, reels, stories, live events, pinned posts and cross-posting.
- Page inbox for messages, comments and mentions, with assignment and response status.
- Follow/like page, invite friends, notifications and page discovery.
- Page moderation, blocked words, comment controls, reports and action history.

## Creator and Page dashboard

The dashboard should be available to eligible creators and authorized Page roles:

- Overview: followers, reach, impressions, engagement, watch time and profile/page visits.
- Content analytics: post-level reactions, comments, shares, saves, completion rate and best posting times.
- Audience: location, language, age-range summaries, active times and follower growth.
- Reels/video analytics: views, 3-second views, completion, average watch time and retention curve.
- Revenue: estimated earnings, finalized earnings, pending balance, payout history and tax status.
- Content calendar with drafts, scheduled posts and failed publishing jobs.
- Export reports as CSV and restrict analytics to authorized roles.

## Content monetization

Monetization must be policy-controlled and unavailable until eligibility checks pass.

- Creator/Page eligibility: age and region checks, account standing, verified payout identity, minimum audience and original-content requirements.
- Revenue products: fan subscriptions, one-time tips, paid supporter badges, branded content disclosures, paid posts and eligible video/reel ad revenue share.
- Monetization settings: enable/disable products, supporter benefits, pricing, payout account and tax information.
- Ledger model for gross revenue, platform fee, refunds, chargebacks, taxes, net earnings and payout status.
- Payout flow with minimum threshold, payout schedule, failed payout recovery and immutable transaction history.
- Admin controls for approval, suspension, demonetization, manual adjustments, fraud review and dispute resolution.
- Required disclosures on sponsored content and transparent labels on monetized posts.
- Safety protections: copyright claims, reused-content detection, advertiser-suitable content review and creator appeals.

These systems must not store payment card details directly. Use a payment provider for checkout and payouts, keep provider references in the database, encrypt sensitive account metadata, and record every financial/admin action in the audit log.

## Required stack boundaries

- Mobile: React Native CLI, TypeScript and React Navigation.
- API: Node.js, Express, REST and JWT session management.
- Data: MongoDB with indexes for feed, relationships, messages, stories and reports.
- Real-time: Socket.IO for presence and messaging events.
- Media: Cloudinary or S3 with signed uploads and asynchronous processing.
- Notifications: FCM and APNs.
- Scale: Redis for caching/rate limiting and a durable background job queue.

The roadmap intentionally keeps advanced features behind production-grade safety and privacy foundations instead of exposing incomplete screens as if they were finished.
