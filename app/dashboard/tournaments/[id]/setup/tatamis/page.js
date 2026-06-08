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
import TatamiFormDialog from '@/components/tatami-form-dialog';
import AutoCreateTatamisDialog from '@/components/auto-create-tatamis-dialog';
import { Plus, Grid3x3, Pencil, Trash2, Wand2, ArrowRight, ArrowLeft, Loader2, User, CheckCircle2, Lock } from 'lucide-react';
import { canManageTatamis } from '@/lib/constants';
import { toast } from 'sonner';

export default function SetupTatamisPage() {
  const { id } = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const canManage = canManageTatamis(profile?.role);

  const [tournament, setTournament] = useState(null);
  const [tatamis, setTatamis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    if (!id) return;

    const getT = async () => {
      const snap = await getDoc(doc(db, 'tournaments', id));
      if (snap.exists()) setTournament({ id: snap.id, ...snap.data() });
    };
    getT();

    const q = query(collection(db, 'tatamis'), where('tournamentId', '==', id));
    const unsub = onSnapshot(
      q,
      (s) => {
        setTatamis(s.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, [id]);

  const remove = async (tatamiId, name) => {
    if (!canManage) return toast.error('View-only: you cannot delete tatamis');
    if (!confirm(`Delete tatami "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'tatamis', tatamiId));
      toast.success('Tatami deleted');
    } catch (e) {
      toast.error(`Delete failed: ${e.message}`);
    }
  };

  const handleFinish = () => {
    if (!canManage) {
      router.push(`/dashboard/tournaments/${id}`);
      return;
    }
    toast.success('Tournament setup complete!');
    router.push(`/dashboard/tournaments/${id}`);
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
        <span>Wizard Step 2 of 2</span>
        <span>•</span>
        <span className="text-zinc-350">{tournament?.name || 'Tournament'}</span>
      </div>

      <PageHeader
        title="Setup Tatami Rings"
        description="Configure match areas (Tatamis) and assign lead referees."
        actions={
          canManage ? (
            <div className="flex gap-2">
              <Button onClick={() => setAutoOpen(true)} variant="outline" className="border-amber-500/40 text-amber-350 hover:bg-amber-500/10 h-10">
                <Wand2 className="h-4 w-4 mr-2" /> Auto Create Tatamis
              </Button>
              <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="bg-primary hover:bg-primary/90 h-10 font-bold">
                <Plus className="h-4 w-4 mr-2" /> Add Tatami Manually
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
            Spectators and non-organizers have view-only access. Only tournament organizers can create or delete tatamis.
          </CardContent>
        </Card>
      )}

      <Card className="border-zinc-800 bg-zinc-950/40">
        <CardContent className="p-0">
          {tatamis.length === 0 ? (
            <div className="p-16 text-center">
              <Grid3x3 className="h-12 w-12 mx-auto text-zinc-600 mb-3" />
              <h3 className="font-bold text-zinc-200 text-lg">No tatamis configured yet</h3>
              <p className="text-xs text-zinc-400 mt-1 mb-5">
                {canManage ? 'Click Auto Create to generate tatamis with default referees.' : 'Tatamis will appear here once configured by the organizer.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-905">
              {tatamis.map((t) => (
                <div key={t.id} className="p-4 flex items-center justify-between hover:bg-zinc-900/30 transition">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                      <Grid3x3 className="h-4 w-4 text-primary" />
                      {t.name}
                    </h4>
                    <div className="flex flex-wrap gap-2 mt-2 items-center text-xs text-zinc-400">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-zinc-550" />
                        Referee: <strong className="text-zinc-300 font-semibold">{t.assignedRefereeName || 'Unassigned'}</strong>
                      </span>
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="border-zinc-800 hover:bg-zinc-900" onClick={() => { setEditing(t); setDialogOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-950/20" onClick={() => remove(t.id, t.name)}>
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
        <Button variant="ghost" onClick={() => router.push(canManage ? `/dashboard/tournaments/${id}/setup/categories` : `/dashboard/tournaments/${id}`)} className="text-zinc-400 hover:text-white">
          <ArrowLeft className="h-4 w-4 mr-1.5" /> {canManage ? 'Back to Event Categories' : 'Back to Tournament'}
        </Button>
        <Button
          onClick={handleFinish}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold px-8 h-10 shadow-md border-none flex items-center gap-1.5"
        >
          <CheckCircle2 className="h-4.5 w-4.5" />
          {canManage ? 'Finish & View Dashboard' : 'Back to Tournament'}
        </Button>
      </div>

      {canManage && (
        <>
          <TatamiFormDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            tournaments={tournament ? [tournament] : []}
            lockedTournamentId={id}
            initial={editing}
            id={editing?.id}
          />
          <AutoCreateTatamisDialog
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
