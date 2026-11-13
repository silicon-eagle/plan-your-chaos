# Reader Icon Permissions Design

## Goal

Allow an Admin to restrict each Reader account to events with selected icons, while retaining an explicit All icons option. Enforce the restriction in server-side database queries so client-side filtering and direct URLs cannot bypass it.

## Required Behavior

- Admin and User event visibility remains unchanged.
- Readers continue to exclude hidden events.
- A Reader configured for All icons can see every non-hidden event.
- A restricted Reader can see only non-hidden events whose icon is selected for that account.
- Existing Readers and newly created Readers default to All icons.
- Changing any account to the Reader role resets its icon visibility to All.
- Changing a Reader to another role clears its stored icon selections.
- Permission changes apply on the next request without requiring a new session.
- Restricted Readers see only their allowed icons in the event-list icon filter.

## Data Model

Add a non-null `reader_all_icons` boolean column to `users`, defaulting to `true`.

Add a `reader_icon_permissions` table with:

- `user_id`, referencing `users.id` with cascading deletion
- `icon_id`, referencing `icons.id` with cascading deletion
- a composite primary key on `(user_id, icon_id)`

The boolean makes unrestricted access explicit. Permission rows are meaningful only when `reader_all_icons` is false.

## Server-Side Visibility

Create one server-only event visibility helper that accepts the authenticated user's ID and role and produces the database predicate used by all event reads.

- Admin and User: preserve the existing visibility predicate.
- Reader with All icons: require `events.hidden = false`.
- Restricted Reader: require `events.hidden = false` and an associated `reader_icon_permissions` row matching both the Reader and the event icon.

Use the shared helper in:

- date-range event queries used by calendars and the events API
- direct event detail lookup
- previous-event navigation
- next-event navigation

A Reader requesting a disallowed event detail URL receives the existing not-found response. This avoids revealing whether the event exists.

## Admin User Management

Extend the Admin user edit page with a **Reader event visibility** section. The section appears whenever the form's selected role is Reader.

The section contains:

- an **All icons** control
- a keyboard-accessible multi-select grid showing the actual pixel-art icon images
- visible selected, hover, and focus states consistent with the existing pixel-art UI
- accessible labels derived from icon names, while the visible choices remain image-based

Selecting All icons disables individual icon selection. When All icons is off, at least one icon must be selected.

The edit page loads all icons and the account's current visibility setting. The existing Admin Server Action submits the All flag and selected icon IDs with the other account fields.

When the form changes a non-Reader account to Reader, the visibility section shows that the first save will use All icons and does not allow individual selection. After that save, the account is an existing Reader and the Admin can configure selected icons.

## Admin Service Rules

Treat all submitted permission fields as untrusted.

- Validate the account ID and editable role using existing rules.
- Parse icon IDs as unique positive integers.
- Verify every selected icon exists.
- Reject a restricted Reader with no selected icons.
- Reject client attempts to assign Reader icon permissions to Admin or User accounts.
- Perform the account update and complete permission replacement in one transaction.
- When changing an account to Reader, force All icons and clear permission rows, regardless of submitted permission fields.
- When changing a Reader to User, clear permission rows and retain the All default.
- For an existing Reader whose role remains Reader, save the submitted All or selected-icon scope.

Validation failures return an `AdminValidationError`, preserve the previous database state, and appear in the existing form feedback area.

## Reader Filter Options

The event list currently loads icon filter options separately from event results. Update this server-side icon-option query:

- Admin and User receive all icons.
- Readers with All icons receive all icons.
- Restricted Readers receive only their allowed icons.

The React icon filter continues to filter already-authorized event data and is not an authorization boundary.

## Session Behavior

Do not store icon permissions in `AuthenticatedSession`. Event and icon-option reads query current permissions from PostgreSQL, so Admin changes take effect on the Reader's next request without revoking sessions.

## Testing

Add focused tests for:

- migration/schema definitions and relationships
- existing and newly created Readers defaulting to All icons
- role changes to Reader resetting visibility to All
- role-change submissions being unable to apply restrictions until a later save
- role changes away from Reader clearing icon rows
- saving All and selected-icon scopes atomically
- malformed, duplicate, missing, and nonexistent icon IDs
- restricted Reader queries combining non-hidden and allowed-icon predicates
- unrestricted Reader, User, and Admin query behavior
- direct event detail denial for a disallowed icon
- previous/next navigation skipping disallowed events
- events API inheriting the server-side restriction
- restricted Reader icon filters containing only allowed icons
- Admin form image-grid selection, All behavior, keyboard access, focus state, and validation feedback

## Out of Scope

- Reader self-service permission changes
- permissions based on event owner, attendee, date, or individual event
- changing Admin or User visibility
- adding a separate permission for events without an icon
