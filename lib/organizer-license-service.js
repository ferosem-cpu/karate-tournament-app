import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Plan configurations
export const ORGANIZER_PLANS = {
  basic: {
    label: 'Basic',
    maxAthletes: 100,
    monthlyPrice: 99,
    features: ['Up to 100 athletes', 'Basic analytics', 'Email support'],
  },
  standard: {
    label: 'Standard',
    maxAthletes: 500,
    monthlyPrice: 299,
    features: ['Up to 500 athletes', 'Advanced analytics', 'Priority support', 'Custom branding'],
  },
  large: {
    label: 'Large',
    maxAthletes: 1000,
    monthlyPrice: 799,
    features: ['1000+ athletes', 'Full analytics', '24/7 support', 'API access', 'Dedicated manager'],
  },
};

/**
 * Create or update an organizer license
 */
export async function createOrganizerLicense(userId, plan = 'basic', durationMonths = 1) {
  if (!ORGANIZER_PLANS[plan]) {
    throw new Error('Invalid plan type');
  }

  const userRef = doc(db, 'users', userId);
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

  await updateDoc(userRef, {
    organizerLicense: {
      active: true,
      plan,
      expiresAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      durationMonths,
    },
    updatedAt: serverTimestamp(),
  });

  return { plan, active: true, expiresAt: expiresAt.toISOString() };
}

/**
 * Get organizer license details for a user
 */
export async function getOrganizerLicense(userId) {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    return null;
  }

  const userData = userDoc.data();
  return userData.organizerLicense || null;
}

/**
 * Check if organizer license is active
 */
export async function isOrganizerLicenseActive(userId) {
  const license = await getOrganizerLicense(userId);
  if (!license) return false;

  const expiresAt = license.expiresAt?.toDate?.() || new Date(license.expiresAt);
  return license.active && expiresAt > new Date();
}

/**
 * Renew or upgrade organizer license
 */
export async function renewOrganizerLicense(userId, newPlan = null, durationMonths = 1) {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    throw new Error('User not found');
  }

  const currentLicense = userDoc.data().organizerLicense;
  const plan = newPlan || currentLicense?.plan || 'basic';

  if (!ORGANIZER_PLANS[plan]) {
    throw new Error('Invalid plan type');
  }

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

  await updateDoc(userRef, {
    organizerLicense: {
      active: true,
      plan,
      expiresAt: serverTimestamp(),
      renewedAt: serverTimestamp(),
      durationMonths,
    },
    updatedAt: serverTimestamp(),
  });

  return { plan, active: true, expiresAt: expiresAt.toISOString() };
}

/**
 * Get plan details
 */
export function getPlanDetails(planType) {
  return ORGANIZER_PLANS[planType] || null;
}

/**
 * Check if athlete count exceeds plan limit
 */
export async function checkAthleteCountLimit(userId, athleteCount) {
  const license = await getOrganizerLicense(userId);
  if (!license) return { allowed: false, reason: 'No active license' };

  const plan = ORGANIZER_PLANS[license.plan];
  if (!plan) return { allowed: false, reason: 'Invalid plan' };

  const allowed = athleteCount <= plan.maxAthletes;
  return { allowed, limit: plan.maxAthletes, current: athleteCount };
}
