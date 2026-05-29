export function isTournamentOwner(userId, tournament) {
  return userId === tournament?.ownerId;
}

export function isSuperAdmin(role) {
  return role === 'super_admin';
}

export function canEditTournament(userId, role, tournament) {
  if (isSuperAdmin(role)) return true;

  return isTournamentOwner(userId, tournament);
}

export function canDeleteTournament(userId, role, tournament) {
  return canEditTournament(userId, role, tournament);
}

export function canViewTournament() {
  return true;
}

const permissions = {
  isTournamentOwner,
  isSuperAdmin,
  canEditTournament,
  canDeleteTournament,
  canViewTournament,
};

export default permissions;
