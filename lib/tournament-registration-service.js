import { addDoc, collection, doc, updateDoc, serverTimestamp, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Submit tournament registration from dojo_admin
 * Creates a registration request with pending status
 */
export async function submitTournamentRegistration(tournamentId, dojoId, ownerId, athleteIds, dojoName) {
  if (!tournamentId || !dojoId || !ownerId || !athleteIds?.length) {
    throw new Error('Missing required registration fields');
  }

  const docRef = await addDoc(collection(db, 'tournament_registrations'), {
    tournamentId,
    dojoId,
    dojoName,
    ownerId,
    athleteIds,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { id: docRef.id, status: 'pending', createdAt: new Date() };
}

/**
 * Query pending registrations for a tournament
 */
export function subscribeToPendingRegistrations(tournamentId, callback) {
  const q = query(
    collection(db, 'tournament_registrations'),
    where('tournamentId', '==', tournamentId),
    where('status', '==', 'pending')
  );

  return onSnapshot(q, (snapshot) => {
    const registrations = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    callback(registrations);
  });
}

/**
 * Approve a tournament registration submission
 */
export async function approveTournamentRegistration(registrationId, registrationData) {
  const docRef = doc(db, 'tournament_registrations', registrationId);
  
  await updateDoc(docRef, {
    status: 'active',
    updatedAt: serverTimestamp(),
    approvedAt: serverTimestamp(),
  });

  // Create individual athlete registrations for each athlete in the approved batch
  const { tournamentId, athleteIds, dojoId, dojoName } = registrationData;
  
  for (const athleteId of athleteIds) {
    await addDoc(collection(db, 'tournament_registrations'), {
      tournamentId,
      athleteId,
      dojoId,
      dojoName,
      status: 'approved',
      createdAt: serverTimestamp(),
      batchRegistrationId: registrationId,
    });
  }
}

/**
 * Reject a tournament registration submission
 */
export async function rejectTournamentRegistration(registrationId, reason = '') {
  const docRef = doc(db, 'tournament_registrations', registrationId);
  
  await updateDoc(docRef, {
    status: 'rejected',
    rejectionReason: reason,
    updatedAt: serverTimestamp(),
    rejectedAt: serverTimestamp(),
  });
}

/**
 * Get all pending registrations for a tournament organizer
 */
export async function getPendingRegistrationsForTournament(tournamentId) {
  const q = query(
    collection(db, 'tournament_registrations'),
    where('tournamentId', '==', tournamentId),
    where('status', '==', 'pending')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}
