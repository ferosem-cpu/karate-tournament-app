import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

function mapWizardCategory(cat, tournamentId, tournamentName, userId) {
  const byAge = Boolean(cat.byAge);
  const byWeight = Boolean(cat.byWeight);
  return {
    name: cat.name,
    tournamentId,
    tournamentName,
    eventType: cat.eventType || 'Kumite',
    gender: cat.gender || 'Mixed',
    ageMin: byAge && cat.minAge !== '' && cat.minAge != null ? Number(cat.minAge) : null,
    ageMax: byAge && cat.maxAge !== '' && cat.maxAge != null ? Number(cat.maxAge) : null,
    weightMin: byWeight && cat.minWeight !== '' && cat.minWeight != null ? Number(cat.minWeight) : null,
    weightMax: byWeight && cat.maxWeight !== '' && cat.maxWeight != null ? Number(cat.maxWeight) : null,
    byAge,
    byWeight,
    beltMin: cat.beltMin || '__any__',
    beltMax: cat.beltMax || '__any__',
    description: cat.description || '',
    isActive: true,
    ownerId: userId,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

/**
 * Persist wizard data: tournament, categories, and tatamis.
 */
export async function publishTournamentFromWizard(wizardData, userId, displayName) {
  const info = wizardData.tournamentInfo || {};
  const rules = wizardData.registrationRules || {};
  const categories = wizardData.categories || [];
  const tatamis = wizardData.tatamis || [];

  if (!info.name?.trim()) {
    throw new Error('Tournament name is required');
  }

  const tournamentPayload = {
    name: info.name.trim(),
    organizerName: info.organizerName?.trim() || displayName || '',
    venue: info.venue || '',
    city: info.city || '',
    country: info.country || 'India',
    startDate: info.startDate || '',
    endDate: info.endDate || '',
    registrationDeadline: info.registrationDeadline || '',
    numberOfTatamis: Number(info.numberOfTatamis) || tatamis.length || 1,
    description: info.description || '',
    status: 'registration_open',
    requiresRegistrationApproval: rules.requireApproval !== false,
    allowSpotRegistration: Boolean(rules.allowSpotRegistration),
    maxAthletesPerDojo: rules.maxAthlatesPerDojo ? Number(rules.maxAthlatesPerDojo) : null,
    ownerId: userId,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const tRef = await addDoc(collection(db, 'tournaments'), tournamentPayload);
  const tournamentId = tRef.id;
  const tournamentName = tournamentPayload.name;

  for (const cat of categories) {
    await addDoc(collection(db, 'categories'), mapWizardCategory(cat, tournamentId, tournamentName, userId));
  }

  const tatamiList = tatamis.length > 0
    ? tatamis
    : Array.from({ length: tournamentPayload.numberOfTatamis }, (_, i) => ({ name: `Tatami ${i + 1}` }));

  for (const tat of tatamiList) {
    await addDoc(collection(db, 'tatamis'), {
      name: tat.name || 'Tatami',
      tournamentId,
      tournamentName,
      assignedRefereeName: tat.assignedRefereeName || 'TBD',
      assignedRefereeId: tat.assignedRefereeId || null,
      notes: '',
      ownerId: userId,
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  return tournamentId;
}
