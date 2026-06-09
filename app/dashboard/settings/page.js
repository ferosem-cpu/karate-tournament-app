'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import PageHeader from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import ApplyForRoleButton from '@/components/apply-for-role-button';
import OrganizerBillingDashboard from '@/components/organizer-billing-dashboard';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { updateProfile } from 'firebase/auth';
import { toast } from 'sonner';
import { Loader2, User, Shield, UserCheck, Key } from 'lucide-react';

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const role = profile?.role || 'spectator';

  const [displayName, setDisplayName] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setCity(profile.city || '');
      setCountry(profile.country || '');
      setPhone(profile.phone || profile.phoneNumber || '');
    }
  }, [profile]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error('Display Name is required');
      return;
    }
    setBusy(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: displayName.trim(),
        city: city.trim(),
        country: country.trim(),
        phone: phone.trim(),
        updatedAt: serverTimestamp(),
      });

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: displayName.trim(),
        });
      }

      toast.success('Profile updated successfully!');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Settings" description="Manage your account profile and platform preferences." />
      
      <div className="grid md:grid-cols-2 gap-6 items-start mt-6 max-w-5xl">
        {/* Profile Editing Form */}
        <Card className="border-zinc-800 bg-zinc-950/60 backdrop-blur-sm shadow-xl">
          <CardHeader className="border-b border-zinc-900 pb-4">
            <CardTitle className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <User className="h-5 w-5 text-gold-primary" />
              <span>Personal Profile</span>
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Update your public display name and contact location.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="displayName" className="text-xs uppercase tracking-wider text-zinc-400 font-bold">Display Name *</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Sensei Tanaka"
                  className="bg-zinc-900 border-zinc-800 text-white focus:border-zinc-750"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-xs uppercase tracking-wider text-zinc-400 font-bold">City</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Tokyo"
                    className="bg-zinc-900 border-zinc-800 text-white focus:border-zinc-750"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="country" className="text-xs uppercase tracking-wider text-zinc-400 font-bold">Country</Label>
                  <Input
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Japan"
                    className="bg-zinc-900 border-zinc-800 text-white focus:border-zinc-750"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs uppercase tracking-wider text-zinc-400 font-bold">Phone Number</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+81 90-1234-5678"
                  className="bg-zinc-900 border-zinc-800 text-white focus:border-zinc-750"
                />
              </div>

              <Button
                type="submit"
                disabled={busy}
                className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold h-10 transition-all flex items-center justify-center gap-1.5 mt-2"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Profile Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Read-Only Credentials Card */}
        <div className="space-y-6">
          <Card className="border-zinc-800 bg-zinc-950 shadow-xl">
            <CardHeader className="border-b border-zinc-900 pb-4">
              <CardTitle className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <Shield className="h-5 w-5 text-gold-primary" />
                <span>Account Credentials</span>
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                System reference credentials and roles.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-zinc-900">
                <span className="text-xs uppercase tracking-wider text-zinc-500 font-bold flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-zinc-650" /> Account Role
                </span>
                <Badge className="bg-gold-primary/10 text-gold-primary border-gold-primary/20 capitalize font-bold text-xs py-1 px-2.5">
                  {role.replace(/_/g, ' ')}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-zinc-900">
                <span className="text-xs uppercase tracking-wider text-zinc-500 font-bold flex items-center gap-1.5">
                  <Key className="h-4 w-4 text-zinc-650" /> Account ID (UID)
                </span>
                <code className="text-[10px] text-zinc-400 bg-zinc-900 px-2 py-1 rounded border border-zinc-850 truncate max-w-[200px]">
                  {user?.uid}
                </code>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-zinc-900">
                <span className="text-xs uppercase tracking-wider text-zinc-500 font-bold flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-zinc-650" /> Email Address
                </span>
                <span className="text-xs text-zinc-350 truncate max-w-[200px]">{user?.email}</span>
              </div>
            </CardContent>
          </Card>

          {role === 'spectator' && !profile?.onboardedRoleSelection && (
            <div className="w-full">
              <ApplyForRoleButton />
            </div>
          )}

          {role === 'tournament_organizer' && (
            <div className="w-full">
              <OrganizerBillingDashboard />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
