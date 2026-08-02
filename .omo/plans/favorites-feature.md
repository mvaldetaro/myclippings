# Favorites Feature Implementation Plan

## Summary
Add ability to favorite clippings (notes/highlights), filter favorites on books page, and a dedicated favorites route with book filtering.

## Architecture Decision
Clippings are stored in Markdown files (not SQLite). Favorites are user-specific operational metadata → stored in a new `clipping_favorites` table in SQLite. This avoids modifying the Markdown schema.

## Tasks

### 1. Database Schema
- Add `clipping_favorites` table to `packages/database/src/schema/index.ts`:
  - `userId` TEXT NOT NULL (FK → users.id)
  - `clippingId` TEXT NOT NULL (the SHA-256 fingerprint from Markdown)
  - `bookId` TEXT NOT NULL
  - `favoritedAt` TEXT NOT NULL
  - Primary key: `(userId, clippingId)`
- Generate Drizzle migration

### 2. API Routes
- **PATCH** `/api/clippings/:bookId/:clipId/favorite` — Toggle favorite (auth required)
- **GET** `/api/clippings/favorites` — List all favorites with optional `?bookId=` filter
- **Modify** existing clippings list endpoint to accept `?favorites=true` filter
- Add Zod schemas for request/response validation

### 3. Frontend Queries (`apps/web/src/queries/clippings.ts`)
- Add `useToggleFavorite()` mutation hook
- Add `useFavoriteClippings(filters?)` query hook
- Update `useClippings()` to pass `favorites` filter param

### 4. Frontend UI — Clipping Card (`apps/web/src/routes/books/$bookId.tsx`)
- Add heart/favorite button next to Copy/Copy Markdown buttons
- Add "Favorites only" toggle chip to the filter bar

### 5. Frontend UI — Books Page (`apps/web/src/routes/books/index.tsx`)
- Add "Favorites only" toggle option (e.g., a checkbox or chip)
- Pass favorites filter to the books list

### 6. Frontend UI — New Favorites Route (`apps/web/src/routes/favorites/index.tsx`)
- List all favorited clippings
- Filter by book dropdown
- Each clipping shows: content, book name, type, date, unfavorite button

### 7. Navigation (`apps/web/src/components/Layout.tsx`)
- Add "Favoritos" link with Heart icon to `authLinks`

### 8. Route Registration (`apps/web/src/routeTree.gen.ts`)
- Add favorites route to the route tree

### 9. Verification
- TypeScript typecheck
- Lint check
- Build verification
