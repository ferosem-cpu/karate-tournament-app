import { addDoc, collection, doc, updateDoc, serverTimestamp, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Submit a referee application
 */
export async function submitRefereeApplication(
  userId,
  fullName,
  martialArtsRank,
  beltLevel,
  certifications,
  certificateUrl = null,
  tournamentId = null,
  tournamentName = null
) {
  if (!userId || !fullName) {
    throw new Error('Missing required referee application fields');
  }

  const docRef = await addDoc(collection(db, 'referee_applications'), {
    userId,
    fullName,
    name: fullName, // Compatibility field for RefereeApplicationReviewPanel
    martialArtsRank: martialArtsRank || '—',
    rank: martialArtsRank || '—', // Compatibility field for RefereeApplicationReviewPanel
    beltLevel: beltLevel || '—',
    certifications,
    certificateUrl,
    clinicCertificateUrl: certificateUrl, // Compatibility field for RefereeApplicationReviewPanel
    tournamentId,
    tournamentName,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { id: docRef.id, status: 'pending' };
}

/**
 * Subscribe to all pending referee applications (for admin review)
 */
export function subscribeToPendingRefereeApplications(callback) {
  const q = query(
    collection(db, 'referee_applications'),
    where('status', '==', 'pending')
  );

  return onSnapshot(q, (snapshot) => {
    const applications = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    callback(applications);
  });
}

/**
 * Approve a referee application and update user role
 */
export async function approveRefereeApplication(applicationId, userId) {
  // Update the application document
  const appRef = doc(db, 'referee_applications', applicationId);
  await updateDoc(appRef, {
    status: 'approved',
    approvedAt: serverTimestamp(),
  });

  // Update the user's role to referee
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    role: 'referee',
    updatedAt: serverTimestamp(),
  });
}

/**
 * Reject a referee application
 */
export async function rejectRefereeApplication(applicationId, reason = '') {
  const appRef = doc(db, 'referee_applications', applicationId);
  await updateDoc(appRef, {
    status: 'rejected',
    rejectionReason: reason,
    rejectedAt: serverTimestamp(),
  });
}

/**
 * Get all pending referee applications
 */
export async function getPendingRefereeApplications() {
  const q = query(
    collection(db, 'referee_applications'),
    where('status', '==', 'pending')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}
