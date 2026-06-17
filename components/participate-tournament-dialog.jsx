'use client';

import { useState, useEffect } from 'react';
import { collection, doc, writeBatch, serverTimestamp, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Loader2, Users } from 'lucide-react';
import { computeAge } from '@/lib/constants';
import { tournamentRequiresApproval } from '@/lib/tournament-registrations';

export default function ParticipateTournamentDialog({ open, onOpenChange, tournament }) {
  const { user, profile } = useAuth();
  const [dojo, setDojo] = useState(null);
  const [athletes, setAthletes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [existingRegs, setExistingRegs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState('');
  const [selectedAthletes, setSelectedAthletes] = useState({}); // { [athleteId]: boolean }
  const [athleteSelections, setAthleteSelections] = useState({}); // { [athleteId]: string[] }
  const [hasInitialized, setHasInitialized] = useState(false);

  // Fetch Dojo, Athletes, Categories, and existing registrations
  useEffect(() => {
    if (!open || !tournament?.id || !user?.uid) return;

    setLoading(true);
    setHasInitialized(false);

    let unsubAthletes = () => {};
    let unsubRegs = () => {};

    // Get tournament categories
    const qCats = query(collection(db, 'categories'), where('tournamentId', '==', tournament.id));
    const unsubCats = onSnapshot(qCats, (snapCats) => {
      setCategories(snapCats.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Get dojo owned by current user
    const qDojo = query(collection(db, 'dojos'), where('ownerId', '==', user.uid));
    const unsubDojo = onSnapshot(qDojo, (snapDojo) => {
      if (!snapDojo.empty) {
        const dojoDoc = snapDojo.docs[0];
        const dojoData = { id: dojoDoc.id, ...dojoDoc.data() };
        setDojo(dojoData);

        // Get athletes of this dojo
        const qAthletes = query(collection(db, 'athletes'), where('dojoId', '==', dojoData.id));
        unsubAthletes = onSnapshot(qAthletes, (snapAthletes) => {
          setAthletes(snapAthletes.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // Get registrations of this dojo for this tournament
        const qRegs = query(
          collection(db, 'tournament_registrations'),
          where('tournamentId', '==', tournament.id),
          where('dojoId', '==', dojoData.id)
        );
        unsubRegs = onSnapshot(qRegs, (snapRegs) => {
          const rows = snapRegs.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((r) => r.athleteId && !r.athleteIds)
            .filter((r) => r.status === 'approved' || r.status === 'pending');
          setExistingRegs(rows);
          setLoading(false);
        });
      } else {
        setDojo(null);
        setAthletes([]);
        setExistingRegs([]);
        setLoading(false);
      }
    });

    return () => {
      unsubCats();
      unsubDojo();
      unsubAthletes();
      unsubRegs();
    };
  }, [open, tournament?.id, user?.uid]);

  // Helper matching rule
  const getMatchingCategories = (athlete, categoriesList) => {
    const athleteAge = computeAge(athlete.dateOfBirth);
    const isAthleteBlackBelt = athlete.belt && (athlete.belt.toLowerCase().startsWith('black') || athlete.belt.toLowerCase().includes('dan'));

    return categoriesList.filter((c) => {
      // Gender match
      if (c.gender && c.gender !== 'Mixed' && athlete.gender && c.gender.toLowerCase() !== athlete.gender.toLowerCase()) {
        return false;
      }

      // Black Belt check
      const isBlackBeltCategory = c.beltMin === 'Black' || (c.name && c.name.toLowerCase().includes('black belt'));
      if (isBlackBeltCategory) {
        if (!isAthleteBlackBelt) return false;
      } else {
        if (isAthleteBlackBelt) {
          // Black belt athlete can only match the Open category
          const isOpenCategory = !c.byAge && !c.byWeight;
          if (!isOpenCategory) return false;
        }
      }

      // Age match
      if (c.byAge) {
        if (athleteAge == null) return false;
        if (c.ageMin !== '' && c.ageMin != null && athleteAge < Number(c.ageMin)) return false;
        if (c.ageMax !== '' && c.ageMax != null && athleteAge > Number(c.ageMax)) return false;
      }

      // Weight match
      if (c.byWeight) {
        if (athlete.weight == null || athlete.weight === '') return false;
        if (c.weightMin !== '' && c.weightMin != null && Number(athlete.weight) < Number(c.weightMin)) return false;
        if (c.weightMax !== '' && c.weightMax != null && Number(athlete.weight) > Number(c.weightMax)) return false;
      }

      return true;
    });
  };

  // Sync state with loaded data
  useEffect(() => {
    if (!open || loading || hasInitialized || athletes.length === 0) return;

    const initialSelected = {};
    const initialSelections = {};

    athletes.forEach((athlete) => {
      const regs = existingRegs.filter((r) => r.athleteId === athlete.id);
      const matches = getMatchingCategories(athlete, categories);
      
      if (regs.length > 0) {
        initialSelected[athlete.id] = true;
        initialSelections[athlete.id] = regs.map((r) => r.categoryId).filter(Boolean);
      } else {
        initialSelected[athlete.id] = false;
        if (matches.length > 0) {
          initialSelections[athlete.id] = matches.map((m) => m.id);
        } else {
          initialSelections[athlete.id] = [];
        }
      }
    });

    setSelectedAthletes(initialSelected);
    setAthleteSelections(initialSelections);
    setHasInitialized(true);
  }, [open, loading, athletes, existingRegs, categories, hasInitialized]);

  // Reset states on close
  useEffect(() => {
    if (!open) {
      setHasInitialized(false);
      setSelectedAthletes({});
      setAthleteSelections({});
      setSearch('');
    }
  }, [open]);

  const handleCheckboxChange = (athleteId, checked) => {
    setSelectedAthletes((prev) => ({ ...prev, [athleteId]: !!checked }));
    if (checked) {
      setAthleteSelections((prev) => {
        const current = prev[athleteId] || [];
        if (current.length === 0) {
          const athlete = athletes.find((a) => a.id === athleteId);
          const matches = athlete ? getMatchingCategories(athlete, categories) : [];
          return { ...prev, [athleteId]: matches.map((m) => m.id) };
        }
        return prev;
      });
    } else {
      setAthleteSelections((prev) => ({ ...prev, [athleteId]: [] }));
    }
  };

  const toggleCategorySelection = (athleteId, categoryId) => {
    setAthleteSelections((prev) => {
      const current = prev[athleteId] || [];
      const updated = current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId];
      
      setSelectedAthletes((prevSelected) => ({
        ...prevSelected,
        [athleteId]: updated.length > 0
      }));

      return { ...prev, [athleteId]: updated };
    });
  };

  const getTriggerText = (athlete) => {
    const selectedIds = athleteSelections[athlete.id] || [];
    const matches = getMatchingCategories(athlete, categories);
    
    if (selectedIds.length === 0) {
      return 'Select events...';
    }
    
    const matchIds = matches.map((m) => m.id);
    const isAllMatching = matchIds.length > 0 && 
      matchIds.every((mId) => selectedIds.includes(mId)) && 
      selectedIds.length === matchIds.length;

    if (isAllMatching) {
      return `All Recommended (${selectedIds.length})`;
    }

    return `Selected (${selectedIds.length})`;
  };

  const filteredAthletes = athletes.filter((a) => {
    const matches = getMatchingCategories(a, categories);
    const athleteRegs = existingRegs.filter((r) => r.athleteId === a.id);
    if (matches.length === 0 && athleteRegs.length === 0) {
      return false;
    }
    return (a.fullName || '').toLowerCase().includes(search.toLowerCase());
  });

  const handleSelectAll = () => {
    const updated = { ...selectedAthletes };
    filteredAthletes.forEach((athlete) => {
      updated[athlete.id] = true;
    });
    setSelectedAthletes(updated);
  };

  const handleDeselectAll = () => {
    const updated = { ...selectedAthletes };
    filteredAthletes.forEach((athlete) => {
      updated[athlete.id] = false;
    });
    setSelectedAthletes(updated);
  };

  const handleSave = async () => {
    if (!dojo) return;
    setBusy(true);
    const needsApproval = tournamentRequiresApproval(tournament);
    const regStatus = needsApproval ? 'pending' : 'approved';

    try {
      const batch = writeBatch(db);

      for (const athlete of athletes) {
        const isChecked = !!selectedAthletes[athlete.id];
        const selectedIds = athleteSelections[athlete.id] || [];
        
        if (isChecked && selectedIds.length === 0) {
          toast.error(`Please select at least one event category for ${athlete.fullName}`);
          setBusy(false);
          return;
        }

        const targetCategoryIds = isChecked ? selectedIds : [];

        const athleteRegs = existingRegs.filter((r) => r.athleteId === athlete.id);
        const registeredCategoryIds = athleteRegs.map((r) => r.categoryId);

        // Deletes: registrations in DB that are not in targetCategoryIds
        const regsToDelete = athleteRegs.filter((r) => !targetCategoryIds.includes(r.categoryId));
        for (const reg of regsToDelete) {
          batch.delete(doc(db, 'tournament_registrations', reg.id));
        }

        // Adds: targetCategoryIds that are not in DB
        const categoryIdsToAdd = targetCategoryIds.filter((id) => !registeredCategoryIds.includes(id));
        for (const catId of categoryIdsToAdd) {
          const category = categories.find((c) => c.id === catId);
          if (!category) continue;

          const qDup = query(
            collection(db, 'tournament_registrations'),
            where('tournamentId', '==', tournament.id),
            where('athleteId', '==', athlete.id),
            where('categoryId', '==', catId)
          );
          const snapDup = await getDocs(qDup);
          const activeDups = snapDup.docs.filter((d) => d.data().status !== 'rejected');
          if (activeDups.length > 0) {
            toast.error(`${athlete.fullName} is already registered for "${category.name || 'this category'}" in this tournament.`);
            setBusy(false);
            return;
          }

          const newRef = doc(collection(db, 'tournament_registrations'));
          batch.set(newRef, {
            tournamentId: tournament.id,
            tournamentName: tournament.name,
            athleteId: athlete.id,
            athleteName: athlete.fullName || '',
            athletePhotoUrl: athlete.photoUrl || '',
            athleteBelt: athlete.belt || '',
            athleteWeight: athlete.weight || null,
            athleteGender: athlete.gender || '',
            athleteEventType: athlete.eventType || '',
            dojoId: dojo.id,
            dojoName: dojo.name || '',
            categoryId: catId,
            categoryName: category.name || '',
            status: regStatus,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: user.uid,
          });
        }
      }

      await batch.commit();
      toast.success(
        needsApproval
          ? 'Registration submitted for organizer approval'
          : 'Dojo participation updated successfully'
      );
      onOpenChange(false);
    } catch (err) {
      toast.error(err.message || 'Failed to save registrations');
    } finally {
      setBusy(false);
    }
  };

  const renderCategorySelect = (athlete) => {
    const matches = getMatchingCategories(athlete, categories);
    const selectedIds = athleteSelections[athlete.id] || [];
    const isChecked = !!selectedAthletes[athlete.id];

    // Find any selected category that is not in the eligible categories (matches) list
    const eligibleIds = new Set(matches.map((m) => m.id));
    const extraSelectedCategories = categories.filter((c) => selectedIds.includes(c.id) && !eligibleIds.has(c.id));

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            disabled={!isChecked}
            variant="outline"
            className="w-[200px] h-8 text-xs bg-zinc-900 border-zinc-800 flex justify-between items-center px-3"
          >
            <span className="truncate">{getTriggerText(athlete)}</span>
            <span className="text-[10px] text-zinc-500 ml-1">▼</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[240px] max-h-72 overflow-y-auto" align="end">
          {matches.length > 0 && (
            <>
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-primary">
                Eligible Events
              </DropdownMenuLabel>
              {matches.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.id}
                  checked={selectedIds.includes(c.id)}
                  onCheckedChange={() => toggleCategorySelection(athlete.id, c.id)}
                  className="text-xs"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-[10px] text-zinc-500">{c.eventType}</span>
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
            </>
          )}

          {extraSelectedCategories.length > 0 && (
            <>
              {matches.length > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-amber-500">
                Previously Registered
              </DropdownMenuLabel>
              {extraSelectedCategories.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.id}
                  checked={selectedIds.includes(c.id)}
                  onCheckedChange={() => toggleCategorySelection(athlete.id, c.id)}
                  className="text-xs text-amber-400"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-[10px] text-zinc-500">{c.eventType}</span>
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
            </>
          )}

          {matches.length === 0 && extraSelectedCategories.length === 0 && (
            <div className="p-2 text-center text-xs text-zinc-500">No events available</div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-4 border-b border-zinc-800">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Participate in {tournament?.name}
          </DialogTitle>
          <DialogDescription>
            Select your Dojo's competitors and their events. Registrations are automatically approved.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-zinc-400">Loading Dojo athletes...</span>
          </div>
        ) : !dojo ? (
          <div className="py-8 text-center">
            <p className="text-sm text-zinc-400">No Dojo registered for your account.</p>
            <p className="text-xs text-zinc-500 mt-1">Please create a Dojo first in the dashboard.</p>
          </div>
        ) : athletes.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-zinc-400">No athletes found in your Dojo (<strong>{dojo.name}</strong>).</p>
            <p className="text-xs text-zinc-500 mt-1">Please register athletes/kohais first to participate.</p>
          </div>
        ) : (
          <>
            {/* Search and Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-3 py-4 items-center justify-between">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search competitor by name..."
                className="w-full sm:max-w-xs"
              />
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="flex-1 sm:flex-initial text-xs"
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAll}
                  className="flex-1 sm:flex-initial text-xs"
                >
                  Deselect All
                </Button>
              </div>
            </div>

            {/* Athletes List */}
            <div className="flex-1 overflow-y-auto min-h-[200px] pr-2 space-y-2 py-2">
              {filteredAthletes.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-sm">No competitors match "{search}"</div>
              ) : (
                filteredAthletes.map((athlete) => {
                  const matches = getMatchingCategories(athlete, categories);
                  const isChecked = !!selectedAthletes[athlete.id];
                  const isRecommended = matches.length > 0;

                  return (
                    <div
                      key={athlete.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border transition ${
                        isChecked
                          ? 'border-primary/50 bg-primary/5'
                          : 'border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`athlete-${athlete.id}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => handleCheckboxChange(athlete.id, checked)}
                        />
                        <Avatar className="h-9 w-9 border border-zinc-850">
                          <AvatarImage src={athlete.photoUrl} />
                          <AvatarFallback className="bg-zinc-800 text-zinc-300 text-xs">
                            {(athlete.fullName || 'K').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <label
                            htmlFor={`athlete-${athlete.id}`}
                            className="text-sm font-medium text-zinc-200 cursor-pointer hover:text-white"
                          >
                            {athlete.fullName}
                          </label>
                          <div className="text-xs text-zinc-500 flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                            <span>{athlete.gender}</span>
                            <span>•</span>
                            <span>{computeAge(athlete.dateOfBirth)} yrs</span>
                            {athlete.weight && (
                              <>
                                <span>•</span>
                                <span>{athlete.weight} kg</span>
                              </>
                            )}
                            {athlete.belt && (
                              <>
                                <span>•</span>
                                <span className="text-zinc-400">{athlete.belt}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 sm:mt-0 flex items-center gap-2 pl-7 sm:pl-0">
                        <div className="text-right hidden md:block">
                          <span className="text-[10px] uppercase tracking-wider text-zinc-500 block">
                            Event Selection
                          </span>
                          {isChecked && (
                            <span className="text-[10px] text-zinc-400">
                              {isRecommended
                                ? `${matches.length} matching division(s)`
                                : 'No perfect division matches'}
                            </span>
                          )}
                        </div>
                        {renderCategorySelect(athlete)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <DialogFooter className="pt-4 border-t border-zinc-800 mt-4 gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={busy}
                className="bg-primary hover:bg-primary/90 min-w-[140px]"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Participation'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
