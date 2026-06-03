/** Per-athlete registration row (excludes batch parent docs). */
export function isPerAthleteRegistration(reg) {
  return Boolean(reg?.athleteId) && !Array.isArray(reg?.athleteIds);
}

/** Batch submission awaiting organizer review. */
export function isBatchRegistration(reg) {
  return Array.isArray(reg?.athleteIds) && reg.athleteIds.length > 0;
}

export function filterDisplayedRegistrations(registrations) {
  return (registrations || []).filter(isPerAthleteRegistration);
}

export function tournamentRequiresApproval(tournament) {
  return tournament?.requiresRegistrationApproval === true;
}
