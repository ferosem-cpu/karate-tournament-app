import {
  addDoc,
  collection,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { isBatchRegistration } from './tournament-registrations';

/**
 * Submit tournament registration from dojo_admin (batch, no categories).
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

export function subscribeToPendingRegistrations(tournamentId, callback) {
  const q = query(
    collection(db, 'tournament_registrations'),
    where('tournamentId', '==', tournamentId),
    where('status', '==', 'pending')
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

async function buildAthleteRegistrationPayload(athleteId, tournamentId, dojoId, dojoName, tournamentName) {
  const athleteSnap = await getDoc(doc(db, 'athletes', athleteId));
  const athlete = athleteSnap.exists() ? athleteSnap.data() : {};

  return {
    tournamentId,
    tournamentName: tournamentName || '',
    athleteId,
    athleteName: athlete.fullName || '',
    athletePhotoUrl: athlete.photoUrl || '',
    athleteBelt: athlete.belt || '',
    athleteWeight: athlete.weight ?? null,
    athleteGender: athlete.gender || '',
    athleteEventType: athlete.eventType || '',
    dojoId,
    dojoName: dojoName || athlete.dojoName || '',
    status: 'approved',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

/**
 * Approve a batch registration (parent doc with athleteIds).
 */
export async function approveTournamentRegistration(registrationId, registrationData) {
  const { tournamentId, athleteIds, dojoId, dojoName, categorySelections = {} } = registrationData;

  const tournamentSnap = await getDoc(doc(db, 'tournaments', tournamentId));
  const tournamentName = tournamentSnap.exists() ? tournamentSnap.data().name : '';

  const batch = writeBatch(db);
  const parentRef = doc(db, 'tournament_registrations', registrationId);

  batch.update(parentRef, {
    status: 'approved',
    updatedAt: serverTimestamp(),
    approvedAt: serverTimestamp(),
  });

  for (const athleteId of athleteIds) {
    const base = await buildAthleteRegistrationPayload(
      athleteId,
      tournamentId,
      dojoId,
      dojoName,
      tournamentName
    );
    const categoryIds = categorySelections[athleteId] || [];
    if (categoryIds.length === 0) {
      const childRef = doc(collection(db, 'tournament_registrations'));
      batch.set(childRef, {
        ...base,
        batchRegistrationId: registrationId,
      });
    } else {
      for (const categoryId of categoryIds) {
        const catSnap = await getDoc(doc(db, 'categories', categoryId));
        const catName = catSnap.exists() ? catSnap.data().name : '';
        const childRef = doc(collection(db, 'tournament_registrations'));
        batch.set(childRef, {
          ...base,
          categoryId,
          categoryName: catName,
          batchRegistrationId: registrationId,
        });
      }
    }
  }

  await batch.commit();
}

/**
 * Approve a single pending per-athlete registration row.
 */
export async function approvePendingRegistration(registrationId) {
  await updateDoc(doc(db, 'tournament_registrations', registrationId), {
    status: 'approved',
    approvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function rejectTournamentRegistration(registrationId, reason = '') {
  await updateDoc(doc(db, 'tournament_registrations', registrationId), {
    status: 'rejected',
    rejectionReason: reason,
    updatedAt: serverTimestamp(),
    rejectedAt: serverTimestamp(),
  });
}

export async function getPendingRegistrationsForTournament(tournamentId) {
  const q = query(
    collection(db, 'tournament_registrations'),
    where('tournamentId', '==', tournamentId),
    where('status', '==', 'pending')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export { isBatchRegistration };
