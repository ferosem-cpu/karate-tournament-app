import { addDoc, collection, doc, updateDoc, serverTimestamp, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Submit a role request (e.g., apply for dojo_admin)
 */
export async function submitRoleRequest(userId, userEmail, requestedRole) {
  if (!userId || !userEmail || !requestedRole) {
    throw new Error('Missing required role request fields');
  }

  const docRef = await addDoc(collection(db, 'role_requests'), {
    userId,
    userEmail,
    requestedRole,
    status: 'pending',
    createdAt: serverTimestamp(),
  });

  return { id: docRef.id, status: 'pending' };
}

/**
 * Subscribe to all pending role requests (for super_admin)
 */
export function subscribeToPendingRoleRequests(callback) {
  const q = query(
    collection(db, 'role_requests'),
    where('status', '==', 'pending')
  );

  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    callback(requests);
  });
}

/**
 * Approve a role request and update user's role in users collection
 */
export async function approveRoleRequest(roleRequestId, userId, newRole) {
  // Update the role request document
  const requestRef = doc(db, 'role_requests', roleRequestId);
  await updateDoc(requestRef, {
    status: 'approved',
    approvedAt: serverTimestamp(),
  });

  // Update the user's role in the users collection
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    role: newRole,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Reject a role request
 */
export async function rejectRoleRequest(roleRequestId, reason = '') {
  const requestRef = doc(db, 'role_requests', roleRequestId);
  await updateDoc(requestRef, {
    status: 'rejected',
    rejectionReason: reason,
    rejectedAt: serverTimestamp(),
  });
}

/**
 * Get all pending role requests (for display)
 */
export async function getPendingRoleRequests() {
  const q = query(
    collection(db, 'role_requests'),
    where('status', '==', 'pending')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}
