export type RsvpError =
  | { name: "RsvpValidationError"; message: string }
  | { name: "RsvpNotAllowed"; message: string }
  | { name: "RsvpNotFound"; message: string }
  | { name: "RsvpInvalidState"; message: string }
  | { name: "RsvpCapacityError"; message: string }
  | { name: "RsvpDependencyError"; message: string };

export const RsvpValidationError = (message: string): RsvpError => ({
  name: "RsvpValidationError",
  message,
});

export const RsvpNotAllowed = (message: string): RsvpError => ({
  name: "RsvpNotAllowed",
  message,
});

export const RsvpNotFound = (message: string): RsvpError => ({
  name: "RsvpNotFound",
  message,
});

export const RsvpInvalidState = (message: string): RsvpError => ({
  name: "RsvpInvalidState",
  message,
});

export const RsvpCapacityError = (message: string): RsvpError => ({
  name: "RsvpCapacityError",
  message,
});

export const RsvpDependencyError = (message: string): RsvpError => ({
  name: "RsvpDependencyError",
  message,
});
