User (Interface)
  id: string; change this to uuid
  email: string;
  displayName: string;
  role: UserRole;
  passwordHash: string;
attendingEvents: Event[] (prisma many-to-many relationship)

There are 3 user objects, IUserRecord, IAuthenticatedUser, IUserSummary. Each event is going to store IUserSummary for security. SO it might be better to store the events each user is attending in the repository rather than the user object for simplicity to not have to juggle multiple objects

It’s a many to many relationship, so behind the scenes its going to have to create an intermediary third table anyways. The process of getting the attendingEvents of a user is almost identical to getting the attendingUsers of an event. By keeping that information in the repository i’m not sure how scalable it would be
EventError (interface)
EventNotFound
InvalidContent
ValidationError
UnexpectedDependencyError
Feature 1 - Event Creation
Expects: 
title: string (required)
description: string (required)
location: string (required)
category: string (optional)
organizerId: int (required)
startDate: Date (required)
maxCapacity: int (optional)
Returns an Event object 
Errors: 
Missing field 
Invalid values 
Min chars not met or max chars too much
Date must be in the future 
Valid category 
Feature 2 – Event Detail Page
Display Event Detail Page
Expects:
Event id
(name, parameters, return type)
Returns: shows a page with the full details of the event. Including:


attendingUsers / maxCapacity: shows how many attending users compared to max capacity
Displays RSVP Button
Has a “Draft Mode” where organizers / admins can edit event details before publishing
Must check for roles before giving edit / view permissions for drafts
This is implemented in Feature 5
Organizers and Admins can (Implemented in Feature 3):
Edit Event here
Cancel Event here
title: string (required)
description: string (required)
location: string (required)
category: string (optional)
organizerId: int (required): Show organizer name
startDate: Date (required)
Errors:
Draft events are only visible to the organizer who created them and to admins; all other users receive a not-found response. EventNotFound
If event doesn’t exist: not-found response. EventNotFound
If event has invalid state: InvalidContent error


Feature 3 – Event Editing
Expects:
eventId: int (required)
title: string (optional)
description: string (optional)
location: string (optional)
category: Category (optional)
public: boolean (optional)
startDate: Date (optional)
maxCapacity: int (optional)
Returns the Event object after edits are applied
Errors:
Not found
eventId does not correspond to an existing id
Not authorized
eventId corresponds to an existing id, but the user does not have access to it
Invalid state?
Invalid input:
Field does not correspond to a modifiable attribute (i.e. setting “eventName” instead of “title”)
Any string argument is an empty string

Feature 4 — RSVP Toggle
Expects: 
A valid event ID
a valid user ID
request from a member attempting to toggle their RSVP
Returns:
a new active RSVP as going,
a new RSVP as waitlisted if the event is already full,
A previously active RSVP changed to cancelled
updated attendee count
Re-rendered the RSVP button inline through HTMX
Errors:
The event does not exist.
The requester is not allowed to RSVP, such as an organiser or admin.
The event is cancelled or already in the past.
The system could not correctly evaluate live capacity.
required IDs or inputs are missing or invalid.
repository or persistence failure prevented the RSVP toggle from completing.

Feature 5 – Event Publishing and Cancellation
Expects:
Event publishing
Event cancellation permanently
An event detail page


Returns:
Return status ok for publish
Return status ok for cancellation
Errors:
Missing event / Event not published
Event not cancelled permanently
Event does not exist
Admin unable to edit/access

Feature 6 – Category and Date Filter
Expects
Category 
Date / Timeframe
Returns:
Returns status ok
Errors:
Does not filter properly
No authorization

Feature 7 – RSVPs Dashboard
Expects
n/a
Returns:
Dashboard with all of the user’s upcoming RSVPs and unavailable RSVPs (past/cancelled)
Errors:
Not authorized
Redirects to login page
Feature 8 - Organizer Event Dashboard
Expects:
organizerId
Role (or query for role)
Returns: 
New page
Errors: 
401 error
403 error

Feature 10 – Event Search
Expects:
In the main event list, it requires a search input (string). Should update as the user types. 
Debounced so it only calls the server function to filter events when the user stopped triggering the event for a predetermined amount of time (ex. 300–500ms).
Limit search query string length to 500 characters
Returns:
As the user types, the main event list updates to show only published upcoming events whose title, description, or location matches the search term.
If no search input (blank search bar), displays all events as normal event list
Errors:
If no events match search query in any way, display NoEventsFound
If search string is too long (500 chars), display error message: Invalid Input
Feature 12 – Attendee List (Organiser)
Expects:
valid event ID
authenticated user request from either the event organiser or an admin
RSVP records for the event
attendee’s display name
Sort records by creation time
Returns: 
A grouped attendee list for the specified event with three sections
Attending
Waitlisted
Cancelled
attendee’s display name and timestamp of RSVP
No page reload when list updates
Errors: 
The event does not exist.
The requester is not the event organiser or an admin.
The event ID or required input is missing or invalid.
An RSVP exists, but the associated attendee record cannot be resolved.
A repository, join, or persistence failure prevented the attendee list from being loaded.
