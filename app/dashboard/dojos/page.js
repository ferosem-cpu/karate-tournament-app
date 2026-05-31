'use client';
import { useAuth } from '@/lib/auth-context';
import { where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/page-header';
import { Plus, Building2, Search, MapPin, Phone, Mail, Globe, Trash2, Pencil, Eye, EyeOff, Users, Trophy } from 'lucide-react';
import { toast } from 'sonner';

export default function DojosPage() {
  const [dojos, setDojos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { user, profile } = useAuth();
  const canManageDojo =
  profile?.role === 'super_admin' ||
  profile?.role === 'dojo_admin' ||
  profile?.role === 'coach' ||
  profile?.role === 'tournament_organizer';

  useEffect(() => {
    let q;

if (profile?.role === 'super_admin') {
  q = query(
    collection(db, 'dojos'),
    orderBy('createdAt', 'desc')
  );
} else {
  q = query(
    collection(db, 'dojos'),
    where('ownerId', '==', user?.uid)
  );
}
    const unsub = onSnapshot(q, (s) => {
      setDojos(s.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  const filtered = dojos.filter((d) => [d.name, d.city, d.instructorName].join(' ').toLowerCase().includes(search.toLowerCase()));

  const remove = async (id, name) => {
    if (!confirm(`Delete dojo "${name}"?`)) return;
    try { await deleteDoc(doc(db, 'dojos', id)); toast.success('Dojo deleted'); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <>
      <PageHeader
        title="Dojos"
        description="Manage dojo profiles, instructors, contacts and public visibility."
        actions={
          <div className="flex items-center gap-3">
            {profile?.role === 'dojo_admin' && (
              <Button asChild className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-650 hover:to-yellow-750 text-zinc-950 font-bold border-none shadow-md">
                <Link href="/dashboard/dojos/payment">
                  <Trophy className="h-4 w-4 mr-2" />
                  I want to conduct a tournament
                </Link>
              </Button>
            )}
            {canManageDojo && profile?.role !== 'spectator' && (
              <Button asChild className="bg-primary hover:bg-primary/90">
                <Link href="/dashboard/dojos/new"><Plus className="h-4 w-4 mr-2" /> New Dojo</Link>
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-5 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search dojos…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <Card className="border-border/60"><CardContent className="p-10 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card className="border-border/60"><CardContent className="p-16 text-center">
          <Building2 className="h-12 w-12 mx-auto text-primary mb-3" />
          <h3 className="font-semibold text-lg">No dojos yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-5">Create your first dojo to start registering kohai.</p>
          <div className="flex gap-2 justify-center">
            {profile?.role === 'dojo_admin' && (
              <Button asChild className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-650 hover:to-yellow-750 text-zinc-950 font-bold border-none shadow-md">
                <Link href="/dashboard/dojos/payment">
                  <Trophy className="h-4 w-4 mr-2" />
                  I want to conduct a tournament
                </Link>
              </Button>
            )}
            {canManageDojo && profile?.role !== 'spectator' && (
              <Button asChild className="bg-primary hover:bg-primary/90">
                <Link href="/dashboard/dojos/new"><Plus className="h-4 w-4 mr-2" /> Create Dojo</Link>
              </Button>
            )}
          </div>
        </CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((d) => (
            <Card key={d.id} className="border-border/60 bg-card hover:border-primary/40 transition group overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  {d.logoUrl ? (
                    <img src={d.logoUrl} alt="" className="h-14 w-14 rounded-md object-cover ring-1 ring-border" />
                  ) : (
                    <div className="h-14 w-14 rounded-md gradient-red-gold flex items-center justify-center">
                      <Building2 className="h-7 w-7 text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate group-hover:text-primary transition">{d.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">Sensei {d.instructorName || '—'}</p>
                    <div className="mt-1">
                      {d.isPublic ? (
                        <Badge variant="outline" className="text-[10px] bg-emerald-600/10 text-emerald-300 border-emerald-500/40"><Eye className="h-3 w-3 mr-1" />Public</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-zinc-700 text-zinc-200 border-zinc-600"><EyeOff className="h-3 w-3 mr-1" />Private</Badge>
                      )}
                    </div>
                    <DojoKohaiCount dojoId={d.id} />
                  </div>
                </div>
                {canManageDojo && (
  <div className="flex gap-2 mt-4">
    <Button asChild size="sm" variant="outline" className="flex-1">
      <Link href={`/dashboard/dojos/${d.id}`}>
        <Pencil className="h-3.5 w-3.5 mr-1" />
        Edit
      </Link>
    </Button>

    <Button
      size="sm"
      variant="ghost"
      onClick={() => remove(d.id, d.name)}
    >
      <Trash2 className="h-3.5 w-3.5 text-destructive" />
    </Button>
  </div>
)}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function DojoKohaiCount({ dojoId }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!dojoId) return;
    const q = query(collection(db, 'athletes'), where('dojoId', '==', dojoId));
    const unsub = onSnapshot(q, (s) => {
      setCount(s.size);
    });
    return () => unsub();
  }, [dojoId]);

  return (
    <div className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
      <Users className="h-3.5 w-3.5 text-primary" />
      <span>{count} Kohai</span>
    </div>
  );
}
