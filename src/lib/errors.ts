export type EventError =
  | { name: "EventNotFound"; message: string }
  | { name: "InvalidContent"; message: string }
  | { name: "ValidationError"; message: string }
  | { name: "UnexpectedDependencyError"; message: string };

// when the event is not found in the database, we can return this error
export const EventNotFound = (message: string): EventError => ({
  name: "EventNotFound",
  message,
});

// when the content of the event is invalid (mostly for event creation or updating)
export const InvalidContent = (message: string): EventError => ({
  name: "InvalidContent",
  message,
});

// when the input data for event creation or updating fails validation checks
export const ValidationError = (message: string): EventError => ({
  name: "ValidationError",
  message,
});

// when there is an unexpected error from a dependency (e.g., database, external API), we can return this error
export const UnexpectedDependencyError = (message: string): EventError => ({
  name: "UnexpectedDependencyError",
  message,
});
