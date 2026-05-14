'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';

const AuthContext = createContext({});

const SUPER_ADMIN_EMAIL = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || '').toLowerCase();

async function ensureUserDoc(user, extra = {}) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  const isSuperAdmin = user.email && user.email.toLowerCase() === SUPER_ADMIN_EMAIL;
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || extra.displayName || (user.email ? user.email.split('@')[0] : 'User'),
      photoURL: user.photoURL || null,
      role: isSuperAdmin ? 'super_admin' : (extra.role || 'tournament_organizer'),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const newSnap = await getDoc(ref);
    return newSnap.data();
  } else {
    const data = snap.data();
    // auto-upgrade if matches super admin
    if (isSuperAdmin && data.role !== 'super_admin') {
      await setDoc(ref, { role: 'super_admin', updatedAt: serverTimestamp() }, { merge: true });
      return { ...data, role: 'super_admin' };
    }
    return data;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setUser(fbUser);
        try {
          const p = await ensureUserDoc(fbUser);
          setProfile(p);
        } catch (e) {
          console.error('ensureUserDoc error', e);
          setProfile(null);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signInEmail = async (email, password) => {
    const res = await signInWithEmailAndPassword(auth, email, password);
    await ensureUserDoc(res.user);
    return res.user;
  };

  const signUpEmail = async (email, password, displayName, role = 'tournament_organizer') => {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(res.user, { displayName });
    }
    await ensureUserDoc(res.user, { displayName, role });
    return res.user;
  };

  const signInGoogle = async () => {
    const res = await signInWithPopup(auth, googleProvider);
    await ensureUserDoc(res.user);
    return res.user;
  };

  const signOut = async () => {
    await fbSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signInEmail, signUpEmail, signInGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
