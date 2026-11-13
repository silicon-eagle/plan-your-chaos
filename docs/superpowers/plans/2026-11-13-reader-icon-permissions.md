# Reader Icon Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Admins restrict Reader accounts to events with selected icons, enforced by every server-side event read.

**Architecture:** Store an explicit All-icons flag on users and selected icon grants in a join table. Reuse one server-only visibility predicate for list, API, detail, and previous/next reads; extend the Admin account form with an image-based multi-select.

**Tech Stack:** Next.js 16, React 19, TypeScript, Drizzle ORM, PostgreSQL, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-11-13-reader-icon-permissions-design.md`

## Global Constraints

- Existing and newly created Readers default to All icons.
- User-to-Reader role changes force All icons on the first save.
- Reader-to-User role changes clear stored icon permissions.
- Restricted Readers see only non-hidden events with allowed icons.
- Admin and User event visibility remains unchanged.
- Restricted Readers receive only allowed event-list icon filters.
- Use the existing pixel-art palette and actual icon images.
- Do not add dependencies.
- Do not perform commits or any other write-oriented Git operations.

---

### Task 1: Persist Reader Icon Permissions

**Files:**
- Modify: `db/schema.ts`
- Modify: `db/schema.test.ts`
- Create: generated `drizzle/0011_*.sql`
- Create/Modify: generated `drizzle/meta/0011_snapshot.json`
- Modify: `drizzle/meta/_journal.json`

**Interfaces:**
- Produces: `users.readerAllIcons: boolean`
- Produces: `readerIconPermissions` with `userId` and `iconId`

- [ ] **Step 1: Write failing schema tests**

Add assertions equivalent to:

```ts
expect(schema.users.readerAllIcons.default).toBe(true);
expect(schema.users.readerAllIcons.notNull).toBe(true);
expect(getTableConfig(schema.readerIconPermissions).primaryKeys).toHaveLength(1);
expect(getTableConfig(schema.readerIconPermissions).foreignKeys).toHaveLength(2);
```

- [ ] **Step 2: Run the schema test and verify failure**

Run: `pnpm test db/schema.test.ts`

- [ ] **Step 3: Add the schema**

Add:

```ts
readerAllIcons: boolean("reader_all_icons").default(true).notNull(),
```

Add a `reader_icon_permissions` table with cascading `user_id` and `icon_id` foreign keys and a composite primary key. Add Drizzle relations from users and icons.

- [ ] **Step 4: Generate the migration**

Run: `pnpm db:generate`

Verify the SQL adds the boolean with `DEFAULT true NOT NULL`, creates the join table, primary key, and cascading foreign keys.

- [ ] **Step 5: Run the schema test**

Run: `pnpm test db/schema.test.ts`

### Task 2: Add Transactional Admin Permission Management

**Files:**
- Modify: `lib/auth/admin-service.ts`
- Modify: `lib/auth/admin-service.test.ts`
- Modify: `app/(authenticated)/admin/actions.ts`
- Modify: `app/(authenticated)/admin/actions.test.ts`

**Interfaces:**
- Extend `ManagedUser` with `readerAllIcons: boolean` and `readerIconIds: number[]`
- Add `ReaderIconScope = { allIcons: true; iconIds: [] } | { allIcons: false; iconIds: number[] }`
- Change `updateManagedUser(userId, name, role, readerIconScope)`

- [ ] **Step 1: Write failing service tests**

Cover:

```ts
it("forces All icons when User becomes Reader", async () => {});
it("replaces icon grants for an existing restricted Reader", async () => {});
it("clears grants when Reader becomes User", async () => {});
it("rejects restricted Readers with no icons", async () => {});
it("rejects nonexistent icon ids before mutation", async () => {});
```

Assert the account update, permission delete, and permission insert share one transaction and no write occurs after validation failure.

- [ ] **Step 2: Run service tests and verify failure**

Run: `pnpm test lib/auth/admin-service.test.ts`

- [ ] **Step 3: Implement service loading and updates**

Load current permission rows when returning a managed user. Validate unique positive integer icon IDs and verify their existence. Lock the target user, compare its persisted role, then:

```ts
if (oldRole !== "Reader" && role === "Reader") {
  // force readerAllIcons=true and clear grants
} else if (role !== "Reader") {
  // set readerAllIcons=true and clear grants
} else {
  // save submitted All/selected scope
}
```

- [ ] **Step 4: Parse the action form**

Parse `readerAllIcons` and repeated `readerIconIds` values. Pass the typed scope to `updateManagedUser`. Keep create behavior unchanged so new Readers use the database default.

- [ ] **Step 5: Run focused service/action tests**

Run: `pnpm test lib/auth/admin-service.test.ts 'app/(authenticated)/admin/actions.test.ts'`

### Task 3: Build the Admin Icon Selector

**Files:**
- Modify: `app/(authenticated)/admin/[id]/page.tsx`
- Modify: `app/(authenticated)/admin/page.test.tsx`
- Modify: `app/(authenticated)/admin/AdminUserForm.tsx`
- Modify: `app/(authenticated)/admin/AdminUserForm.test.tsx`
- Modify: `app/(authenticated)/admin/admin.module.css`

**Interfaces:**
- Add `icons: Array<{ id: number; name: string; fileName: string }>` to `AdminUserForm`
- Reuse `EventIcon` for visible icon images

- [ ] **Step 1: Write failing page and component tests**

Cover:

```tsx
expect(screen.getByRole("group", { name: "Reader event visibility" })).toBeVisible();
expect(screen.getByRole("checkbox", { name: "Music icon" })).toBeChecked();
expect(screen.getByRole("checkbox", { name: "Christmas icon" })).not.toBeChecked();
```

Also test All disables individual choices, icon toggles submit repeated `readerIconIds`, User accounts changing to Reader show the forced-All message, and Admin/User saved roles do not expose active Reader permissions.

- [ ] **Step 2: Run UI tests and verify failure**

Run: `pnpm test 'app/(authenticated)/admin/AdminUserForm.test.tsx' 'app/(authenticated)/admin/page.test.tsx'`

- [ ] **Step 3: Load icons on the protected detail page**

After Admin authorization, query icons ordered by name and pass them with the managed user to `AdminUserForm`.

- [ ] **Step 4: Implement the selector**

Track the selected role and All-icons state. Render semantic checkbox inputs with `EventIcon` images and visually-hidden text labels. For a persisted non-Reader changing to Reader, force All and render: `Save as Reader before restricting icons.`

- [ ] **Step 5: Add pixel-art responsive styles**

Use hard 4px borders, palette variables, solid selected states, and visible `:focus-visible`. Avoid gradients, blur, pills, and new colors.

- [ ] **Step 6: Run focused UI tests**

Run: `pnpm test 'app/(authenticated)/admin/AdminUserForm.test.tsx' 'app/(authenticated)/admin/page.test.tsx'`

### Task 4: Centralize Server-Side Event Visibility

**Files:**
- Create: `lib/events/visibility.ts`
- Create: `lib/events/visibility.test.ts`
- Modify: `lib/events/queries.ts`
- Modify: `lib/events/queries.test.ts`
- Modify: `app/(authenticated)/events/[id]/page.tsx`
- Modify: `app/(authenticated)/events/[id]/page.test.tsx`

**Interfaces:**
- Produce `eventVisibility(user: { id: number; role: UserRole }): SQL | undefined`

- [ ] **Step 1: Write failing predicate tests**

Compile predicates with `PgDialect` and assert:

```ts
eventVisibility({ id: 3, role: "Reader" })
```

contains `events.hidden = false` and an `exists` subquery matching both `reader_icon_permissions.user_id = 3` and `reader_icon_permissions.icon_id = events.icon_id`, while User/Admin predicates preserve current behavior.

- [ ] **Step 2: Write failing detail/navigation tests**

Assert the event lookup, previous lookup, and next lookup all receive the same Reader predicate and disallowed direct IDs result in `NEXT_NOT_FOUND`.

- [ ] **Step 3: Run tests and verify failure**

Run: `pnpm test lib/events/visibility.test.ts lib/events/queries.test.ts 'app/(authenticated)/events/[id]/page.test.tsx'`

- [ ] **Step 4: Implement the shared helper**

Use an `exists` subquery that allows a Reader when `users.reader_all_icons = true` or a matching permission row exists. Keep hidden filtering for Readers in the same predicate.

- [ ] **Step 5: Replace all event read predicates**

Pass `session.user` to the helper in range, detail, previous, and next queries. The API already calls `getEventsInRange`, so it inherits enforcement without duplicate logic.

- [ ] **Step 6: Run focused visibility tests**

Run: `pnpm test lib/events/visibility.test.ts lib/events/queries.test.ts 'app/(authenticated)/events/[id]/page.test.tsx' app/api/events/permissions.test.ts`

### Task 5: Restrict Reader Icon Filter Options

**Files:**
- Create: `lib/events/icon-options.ts`
- Create: `lib/events/icon-options.test.ts`
- Modify: `components/EventList/EventList.tsx`
- Modify: `components/EventList/EventList.test.tsx`

**Interfaces:**
- Produce `getVisibleIconOptions(user: { id: number; role: UserRole }): Promise<EventIconOption[]>`

- [ ] **Step 1: Write failing option-query tests**

Assert User/Admin and All-icon Readers query all icons, while restricted Readers join `reader_icon_permissions` and filter by the authenticated user ID.

- [ ] **Step 2: Run tests and verify failure**

Run: `pnpm test lib/events/icon-options.test.ts components/EventList/EventList.test.tsx`

- [ ] **Step 3: Implement and integrate the helper**

Move icon-option loading out of `EventList`; call the helper only when filters and icon filtering are enabled. Preserve icon ordering by name.

- [ ] **Step 4: Run focused list tests**

Run: `pnpm test lib/events/icon-options.test.ts components/EventList/EventList.test.tsx components/EventList/EventListClient.test.tsx`

### Task 6: Verify the Complete Feature

**Files:**
- Modify only files required to fix failures caused by Tasks 1-5

- [ ] **Step 1: Run all feature tests**

Run:

```bash
pnpm test db/schema.test.ts lib/auth/admin-service.test.ts \
  'app/(authenticated)/admin/actions.test.ts' \
  'app/(authenticated)/admin/AdminUserForm.test.tsx' \
  'app/(authenticated)/admin/page.test.tsx' \
  lib/events/visibility.test.ts lib/events/queries.test.ts \
  'app/(authenticated)/events/[id]/page.test.tsx' \
  app/api/events/permissions.test.ts \
  lib/events/icon-options.test.ts \
  components/EventList/EventList.test.tsx \
  components/EventList/EventListClient.test.tsx
```

- [ ] **Step 2: Run static checks**

Run: `pnpm lint && pnpm exec tsc --noEmit`

- [ ] **Step 3: Run the full test suite**

Run: `pnpm test`

- [ ] **Step 4: Run the production build**

Run: `pnpm build`

- [ ] **Step 5: Inspect the final diff read-only**

Run: `git --no-pager diff --check && git --no-pager diff --stat`
