'use client';

import { useState, useEffect } from 'react';
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { computeAge } from '@/lib/constants';

export default function RegistrationDialog({ open, onOpenChange, tournament }) {
  const { user, profile } = useAuth();
  const [athletes, setAthletes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [busy, setBusy] = useState(false);
  const [athleteId, setAthleteId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const [showMatchingOnly, setShowMatchingOnly] = useState(true);

  useEffect(() => {
    if (!open) return;
    const u1 = onSnapshot(collection(db, 'athletes'), (s) => setAthletes(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(collection(db, 'categories'), (s) => setCategories(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); };
  }, [open]);

  useEffect(() => { if (open) { setAthleteId(''); setCategoryId(''); setSearch(''); setShowMatchingOnly(true); } }, [open]);

  // Auto-assign category when competitor changes
  useEffect(() => {
    if (!athleteId) {
      setCategoryId('');
      return;
    }
    const selected = athletes.find((a) => a.id === athleteId);
    if (!selected) return;

    const tCats = categories.filter((c) => !c.tournamentId || c.tournamentId === '__global__' || c.tournamentId === tournament?.id);
    const matches = tCats.filter((c) => {
      // Gender match
      if (c.gender && c.gender !== 'Mixed' && selected.gender && c.gender.toLowerCase() !== selected.gender.toLowerCase()) {
        return false;
      }
      // Age match
      const ageVal = computeAge(selected.dateOfBirth);
      if (ageVal != null) {
        if (c.ageMin !== '' && c.ageMin != null && ageVal < Number(c.ageMin)) return false;
        if (c.ageMax !== '' && c.ageMax != null && ageVal > Number(c.ageMax)) return false;
      }
      // Weight match
      if (selected.weight != null && selected.weight !== '') {
        if (c.weightMin !== '' && c.weightMin != null && Number(selected.weight) < Number(c.weightMin)) return false;
        if (c.weightMax !== '' && c.weightMax != null && Number(selected.weight) > Number(c.weightMax)) return false;
      }
      return true;
    });

    if (matches.length > 0) {
      setCategoryId(matches[0].id);
    } else {
      setCategoryId('');
    }
  }, [athleteId, athletes, categories, tournament]);

  const selectedAthlete = athletes.find((a) => a.id === athleteId);
  const athleteAge = selectedAthlete ? computeAge(selectedAthlete.dateOfBirth) : null;

  const tournamentCategories = categories.filter((c) => !c.tournamentId || c.tournamentId === '__global__' || c.tournamentId === tournament?.id);

  const matchingCategories = tournamentCategories.filter((c) => {
    if (!selectedAthlete) return false;
    // Gender match
    if (c.gender && c.gender !== 'Mixed' && selectedAthlete.gender && c.gender.toLowerCase() !== selectedAthlete.gender.toLowerCase()) {
      return false;
    }
    // Age match
    if (athleteAge != null) {
      if (c.ageMin !== '' && c.ageMin != null && athleteAge < Number(c.ageMin)) return false;
      if (c.ageMax !== '' && c.ageMax != null && athleteAge > Number(c.ageMax)) return false;
    }
    // Weight match
    if (selectedAthlete.weight != null && selectedAthlete.weight !== '') {
      if (c.weightMin !== '' && c.weightMin != null && Number(selectedAthlete.weight) < Number(c.weightMin)) return false;
      if (c.weightMax !== '' && c.weightMax != null && Number(selectedAthlete.weight) > Number(c.weightMax)) return false;
    }
    return true;
  });

  const visibleCategories = showMatchingOnly && selectedAthlete ? matchingCategories : tournamentCategories;
  const filteredAthletes = athletes.filter((a) => (a.fullName || '').toLowerCase().includes(search.toLowerCase()));

  const canManageRegistrations = profile?.role === 'super_admin' || (profile?.role === 'tournament_organizer' && tournament?.ownerId === user?.uid);

  const submit = async (e) => {
    e.preventDefault();
    if (!canManageRegistrations) {
      toast.error('You do not have permission to add registrations directly.');
      return;
    }
    if (!athleteId) return toast.error('Select a kohai');
    const a = athletes.find((x) => x.id === athleteId);
    const c = categories.find((x) => x.id === categoryId);
    setBusy(true);
    try {
      await addDoc(collection(db, 'tournament_registrations'), {
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        athleteId,
        athleteName: a?.fullName || '',
        athletePhotoUrl: a?.photoUrl || '',
        athleteBelt: a?.belt || '',
        athleteWeight: a?.weight || null,
        athleteGender: a?.gender || '',
        athleteEventType: a?.eventType || '',
        dojoId: a?.dojoId || null,
        dojoName: a?.dojoName || '',
        categoryId: categoryId || null,
        categoryName: c?.name || '',
        status: 'approved',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
      });
      toast.success('Registration added');
      onOpenChange(false);
    } catch (err) {
      toast.error(err.message || 'Failed to register');
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Register Kohai to Tournament</DialogTitle>
          <DialogDescription>Add an athlete to <strong>{tournament?.name}</strong>.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 mt-2">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Search Kohai</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type to filter…" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Kohai *</Label>
            <Select value={athleteId} onValueChange={setAthleteId}>
              <SelectTrigger><SelectValue placeholder="Select kohai…" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {filteredAthletes.length === 0 ? <div className="px-2 py-1.5 text-xs text-muted-foreground">No kohai found</div> :
                  filteredAthletes.map((a) => <SelectItem key={a.id} value={a.id}>{a.fullName} {a.dojoName ? `· ${a.dojoName}` : ''} {a.belt ? `· ${a.belt}` : ''}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Select category (optional)…" /></SelectTrigger>
              <SelectContent>
                {visibleCategories.length === 0 ? (
                  <SelectItem disabled value="none">
                    {showMatchingOnly ? 'No matching recommended categories' : 'No categories available'}
                  </SelectItem>
                ) : (
                  visibleCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} · {c.eventType}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {athleteId && (
              <div className="flex items-center space-x-2 mt-2 bg-zinc-900/40 p-2.5 rounded border border-zinc-800">
                <input 
                  type="checkbox" 
                  id="matching-only" 
                  checked={showMatchingOnly} 
                  onChange={(e) => setShowMatchingOnly(e.target.checked)} 
                  className="h-3.5 w-3.5 rounded border-zinc-800 bg-zinc-900 text-primary focus:ring-primary"
                />
                <label htmlFor="matching-only" className="text-xs text-zinc-400 cursor-pointer flex-1">
                  Show recommended categories only
                  <span className="block text-[10px] text-zinc-500 mt-0.5">
                    Matches age ({athleteAge != null ? `${athleteAge} yrs` : 'N/A'}) and weight ({selectedAthlete?.weight ? `${selectedAthlete.weight} kg` : 'N/A'})
                  </span>
                </label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            {!canManageRegistrations ? (
              <div className="text-xs text-muted-foreground italic">Registration direct addition disabled for your role/permissions.</div>
            ) : (
              <Button type="submit" disabled={busy} className="bg-primary hover:bg-primary/90 min-w-[140px]">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Registration'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
