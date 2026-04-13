export type EventError =
  | { name: "EventNotFound"; message: string }
  | { name: "ValidationError"; message: string }
  | { name: "AuthorizationRequired"; message: string }
  | { name: "InvalidContent"; message: string }
  | { name: "CapacityEvaluationFailed"; message: string }
  | { name: "UnexpectedDependencyError"; message: string };

export const EventNotFound = (message: string): EventError => ({
  name: "EventNotFound",
  message,
});

export const ValidationError = (message: string): EventError => ({
  name: "ValidationError",
  message,
});

export const AuthorizationRequired = (message: string): EventError => ({
  name: "AuthorizationRequired",
  message,
});

export const InvalidContent = (message: string): EventError => ({
  name: "InvalidContent",
  message,
});

export const CapacityEvaluationFailed = (message: string): EventError => ({
  name: "CapacityEvaluationFailed",
  message,
});

export const UnexpectedDependencyError = (message: string): EventError => ({
  name: "UnexpectedDependencyError",
  message,
});