Event object (interface)
id: integer (unique)
title: string (required)
description: string (required)
location: string (required)
category: string (optional)
organizerId: int (required)
startDate: Date (required)
maxCapacity: int (optional?)
attendingUsers: User[] (required, can be empty)

User (Interface)
id: integer (unique)
name: string (required)
role: string (required)
attendingEvents: Event[] (required, can be empty)

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

Feature 2 – Event Editing
Expects:
(name, parameters, return type)
Returns (successful)
Errors:


Feature 3 – Event Editing
Expects:
New title (optional)
New description (optional)
New maxCapacity (optional)
New category (optional)
New startDate (optional)
Returns the modified Event object
Errors:
Any string argument is an empty string
maxCapacity is 

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
Re-rendered RSVP button inline through HTMX
Errors:
the event does not exist.
the requester is not allowed to RSVP, such as an organizer or admin.
the event is cancelled or already in the past.
the system could not correctly evaluate live capacity.
required IDs or inputs are missing or invalid.
repository or persistence failure prevented the RSVP toggle from completing.

Feature 5 – Event Publishing and Cancellation
Expects:
Event publishing
Event cancellation permanently


Returns:
Return status ok for publish
Return status ok for cancellation
Errors:
Missing event / Event not published
Event not cancelled permanently
Event does not exist

Feature 6 – Category and Date Filter
Expects
Category 
Date / Timeframe
Returns:
Returns status ok
Errors:
Does not filter properly

Feature 8 - Organize Event Dashboard
Expects:
organizerId
Role (or query for role)
Returns: 
New page
Errors: 
401 error
403 error

Feature 10 – Event Editing

Feature 12 – Attendee List (Organizer)
Expects:


Returns: 


Errors: 


