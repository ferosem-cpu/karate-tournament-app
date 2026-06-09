'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, doc, getDoc, onSnapshot, query, where, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/page-header';
import CategoryFormDialog from '@/components/category-form-dialog';
import AutoCreateCategoriesDialog from '@/components/auto-create-categories-dialog';
import { Plus, Tags, Pencil, Trash2, Wand2, ArrowRight, ArrowLeft, Loader2, Lock } from 'lucide-react';
import { canManageCategories } from '@/lib/constants';
import { toast } from 'sonner';

export default function SetupCategoriesPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, profile } = useAuth();

  const [tournament, setTournament] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const isOwner = tournament?.ownerId === user?.uid;
  const canManage = profile?.role === 'super_admin' || (profile?.role === 'tournament_organizer' && isOwner);

  useEffect(() => {
    if (!id) return;

    const getT = async () => {
      const snap = await getDoc(doc(db, 'tournaments', id));
      if (snap.exists()) setTournament({ id: snap.id, ...snap.data() });
    };
    getT();

    const q = query(collection(db, 'categories'), where('tournamentId', '==', id));
    const unsub = onSnapshot(
      q,
      (s) => {
        setCategories(s.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, [id]);

  const remove = async (catId, name) => {
    if (!canManage) return toast.error('View-only: you cannot delete event categories');
    if (!confirm(`Delete event category "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'categories', catId));
      toast.success('Event Category removed');
    } catch (e) {
      toast.error(`Delete failed: ${e.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-zinc-400 gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Loading setup step...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-1 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
        <span>Wizard Step 1 of 2</span>
        <span>•</span>
        <span className="text-zinc-350">{tournament?.name || 'Tournament'}</span>
      </div>

      <PageHeader
        title="Setup Competition Event Categories"
        description="Configure standard Age/Gender/Belt event categories for matches."
        actions={
          canManage ? (
            <div className="flex gap-2">
              <Button onClick={() => setAutoOpen(true)} variant="outline" className="border-amber-500/40 text-amber-350 hover:bg-amber-500/10 h-10">
                <Wand2 className="h-4 w-4 mr-2" /> Auto Create Event Categories
              </Button>
              <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="bg-primary hover:bg-primary/90 h-10 font-bold">
                <Plus className="h-4 w-4 mr-2" /> Add Event Category Manually
              </Button>
            </div>
          ) : (
            <Badge variant="outline" className="px-3 py-1.5"><Lock className="h-3 w-3 mr-1" /> View-only</Badge>
          )
        }
      />

      {!canManage && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-3 text-sm text-amber-200">
            Spectators and non-organizers have view-only access. Only tournament organizers can create or delete categories.
          </CardContent>
        </Card>
      )}

      <Card className="border-zinc-800 bg-zinc-950/40">
        <CardContent className="p-0">
          {categories.length === 0 ? (
            <div className="p-16 text-center">
              <Tags className="h-12 w-12 mx-auto text-zinc-600 mb-3" />
              <h3 className="font-bold text-zinc-200 text-lg">No event categories created yet</h3>
              <p className="text-xs text-zinc-400 mt-1 mb-5">
                {canManage ? 'Select Auto Create to populate standard divisions instantly.' : 'Categories will appear here once configured by the organizer.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-905">
              {categories.map((c) => (
                <div key={c.id} className="p-4 flex items-center justify-between hover:bg-zinc-900/30 transition">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm text-zinc-100">{c.name}</h4>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">{c.eventType}</Badge>
                      <Badge variant="outline" className="text-[10px] bg-zinc-900 border-zinc-800 text-zinc-300">{c.gender}</Badge>
                      {c.ageMin != null && <Badge variant="outline" className="text-[10px] bg-zinc-900 border-zinc-800 text-zinc-350">Age {c.ageMin}–{c.ageMax}</Badge>}
                      {c.weightMin != null && <Badge variant="outline" className="text-[10px] bg-zinc-900 border-zinc-800 text-zinc-350">{c.weightMin}–{c.weightMax} kg</Badge>}
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="border-zinc-800 hover:bg-zinc-900" onClick={() => { setEditing(c); setDialogOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-950/20" onClick={() => remove(c.id, c.name)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between items-center pt-6 border-t border-zinc-850 mt-8">
        <Button variant="ghost" onClick={() => router.push('/dashboard/tournaments')} className="text-zinc-400 hover:text-white">
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Exit to Tournaments
        </Button>
        {canManage && (
          <Button
            onClick={() => router.push(`/dashboard/tournaments/${id}/setup/tatamis`)}
            className="bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold px-6 h-10"
          >
            Next: Setup Tatamis <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        )}
      </div>

      {canManage && (
        <>
          <CategoryFormDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            tournaments={tournament ? [tournament] : []}
            lockedTournamentId={id}
            initial={editing}
            id={editing?.id}
          />
          <AutoCreateCategoriesDialog
            open={autoOpen}
            onOpenChange={setAutoOpen}
            tournaments={tournament ? [tournament] : []}
            lockedTournamentId={id}
          />
        </>
      )}
    </div>
  );
}
