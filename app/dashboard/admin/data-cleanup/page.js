'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import SuperAdminDataCleanup from '@/components/super-admin-data-cleanup';
import Protected from '@/components/protected';
import PageHeader from '@/components/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Mail, Loader2, ShieldCheck } from 'lucide-react';

export default function DataCleanupPage() {
  const { profile } = useAuth();
  
  // Real-time states for email verification settings
  const [requireEmailVerification, setRequireEmailVerification] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Firestore listener to sync the requireEmailVerification state dynamically
  useEffect(() => {
    if (profile?.role !== 'super_admin') return;

    const docRef = doc(db, 'system_settings', 'registration');
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setRequireEmailVerification(!!docSnap.data().requireEmailVerification);
      } else {
        setRequireEmailVerification(false);
      }
      setLoadingSettings(false);
    }, (err) => {
      console.error("Error listening to registration settings:", err);
      setLoadingSettings(false);
    });

    return () => unsub();
  }, [profile]);

  if (profile?.role !== 'super_admin') {
    return (
      <Protected>
        <Alert variant="destructive" className="max-w-md mx-auto mt-8">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Only super admins can access this page.
          </AlertDescription>
        </Alert>
      </Protected>
    );
  }

  // Toggle handler updating the registration path instantly
  const handleToggleChange = async (e) => {
    const newValue = e.target.checked;
    try {
      const docRef = doc(db, 'system_settings', 'registration');
      // setDoc with merge: true ensures the document is created securely if it does not exist
      await setDoc(docRef, { requireEmailVerification: newValue }, { merge: true });
    } catch (err) {
      console.error("Error saving verification toggle:", err);
      alert("Failed to update registration settings: " + err.message);
    }
  };

  return (
    <Protected>
      <PageHeader
        title="Data Cleanup & Dev Utility"
        description="Permanent data deletion tools for administrators. Use with extreme caution."
        breadcrumb={[{ label: 'Admin' }]}
      />

      <div className="container mx-auto py-6 space-y-6">
        {/* Email Verification Settings Card */}
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="h-5 w-5 text-zinc-500" />
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              System Registration Settings
            </h2>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            Configure global access restrictions and validation parameters for new sign-ups.
          </p>

          {loadingSettings ? (
            <div className="flex items-center gap-2 text-sm text-zinc-500 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
              <span>Loading registration configuration parameters...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 block">
                    Require Email Verification
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed block max-w-xl">
                    When enabled, new users must successfully click a verification link sent to their registered email before accessing platform systems.
                  </span>
                </div>
                
                {/* Standard JavaScript Toggle Switch */}
                <div className="flex items-center pt-1 h-6">
                  <input
                    type="checkbox"
                    id="require-email-verification"
                    checked={requireEmailVerification}
                    onChange={handleToggleChange}
                    className="w-9 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 checked:bg-zinc-950 dark:checked:bg-zinc-50 appearance-none cursor-pointer transition-all duration-300 relative before:content-[''] before:absolute before:h-4 before:w-4 before:rounded-full before:bg-white before:top-0.5 before:left-0.5 checked:before:translate-x-4 before:transition-transform before:shadow-sm"
                  />
                </div>
              </div>

              {requireEmailVerification && (
                <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-lg border border-emerald-200/40 dark:border-emerald-900/40">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Email verification check is active. Sign-up flows will reject instant unverified entries.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Existing SuperAdmin Data Cleanup Area */}
        <SuperAdminDataCleanup />
      </div>
    </Protected>
  );
}