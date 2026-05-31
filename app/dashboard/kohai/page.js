'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import PageHeader from '@/components/page-header';
import { Plus, Upload, Users, Search, Pencil, Trash2 } from 'lucide-react';
import { beltClass } from '@/lib/constants';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

export default function KohaiPage() {
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { profile, user } = useAuth();
  const [ownedDojoIds, setOwnedDojoIds] = useState(new Set());

  const canManageKohai =
    profile?.role === 'super_admin' ||
    profile?.role === 'dojo_admin' ||
    profile?.role === 'coach' ||
    profile?.role === 'tournament_organizer';

  useEffect(() => {
    if (!user || profile?.role !== 'dojo_admin') return;
    const q = query(collection(db, 'dojos'), where('ownerId', '==', user.uid));
    const unsub = onSnapshot(q, (s) => {
      setOwnedDojoIds(new Set(s.docs.map((d) => d.id)));
    }, () => {});
    return () => unsub();
  }, [user, profile]);

  useEffect(() => {
    if (!user) return;

    // Build query based on user role
    let q;
    if (profile?.role === 'super_admin') {
      // Super admin sees all athletes
      q = query(collection(db, 'athletes'), orderBy('createdAt', 'desc'));
    } else if (profile?.role === 'dojo_admin' || profile?.role === 'tournament_organizer') {
      // Dojo admin and tournament organizer see only their own athletes
      q = query(
        collection(db, 'athletes'),
        where('ownerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
    } else {
      // Other roles (coach, spectator, etc.) see no athletes or handle as needed
      q = query(
        collection(db, 'athletes'),
        where('ownerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
    }

    const unsub = onSnapshot(q, (s) => {
      setAthletes(s.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [user, profile]);

  const filtered = athletes
    .filter((a) => {
      if (a.status === 'pending_approval') {
        const isOwner = a.ownerId === user?.uid;
        const isSuperAdmin = profile?.role === 'super_admin';
        const isDojoAdminOfThisDojo = profile?.role === 'dojo_admin' && ownedDojoIds.has(a.dojoId);
        return isOwner || isSuperAdmin || isDojoAdminOfThisDojo;
      }
      return true;
    })
    .filter((a) => [a.fullName, a.dojoName, a.belt].join(' ').toLowerCase().includes(search.toLowerCase()));

  const remove = async (id, name) => {
    if (!confirm(`Remove kohai "${name}"?`)) return;
    try { await deleteDoc(doc(db, 'athletes', id)); toast.success('Kohai removed'); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <>
      <PageHeader
        title="Kohai"
        description={`${athletes.length} registered athletes · frontend term: Kohai · backend collection: athletes`}
        actions={
  canManageKohai && profile?.role !== 'spectator' && (
    <>
      <Button asChild variant="outline">
        <Link href="/dashboard/kohai/bulk-upload">
          <Upload className="h-4 w-4 mr-2" />
          Bulk Upload
        </Link>
      </Button>

      <Button asChild className="bg-primary hover:bg-primary/90">
        <Link href="/dashboard/kohai/new">
          <Plus className="h-4 w-4 mr-2" />
          Register Kohai
        </Link>
      </Button>
    </>
  )
}
      />

      <div className="mb-5 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by name, dojo, belt…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card className="border-border/60">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center">
              <Users className="h-12 w-12 mx-auto text-primary mb-3" />
              <h3 className="font-semibold text-lg">No Kohai registered yet</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-5">Add kohai individually or use bulk upload.</p>
              {canManageKohai && profile?.role !== 'spectator' && (
                <div className="flex gap-2 justify-center">
                  <Button asChild variant="outline"><Link href="/dashboard/kohai/bulk-upload"><Upload className="h-4 w-4 mr-2" /> Bulk Upload</Link></Button>
                  <Button asChild className="bg-primary hover:bg-primary/90"><Link href="/dashboard/kohai/new"><Plus className="h-4 w-4 mr-2" /> Register Kohai</Link></Button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kohai</TableHead>
                    <TableHead>Dojo</TableHead>
                    <TableHead>Belt</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>DOB</TableHead>
                    <TableHead>Weight</TableHead>
                    {profile?.role !== 'spectator' && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a) => (
                    <TableRow key={a.id} className="hover:bg-secondary/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={a.photoUrl} />
                            <AvatarFallback className="bg-primary/20 text-primary text-xs">{(a.fullName || 'K').slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="font-medium">{a.fullName || '—'}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{a.dojoName || '—'}</TableCell>
                      <TableCell>{a.belt ? <Badge className={`${beltClass(a.belt)} text-[10px]`} variant="outline">{a.belt}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-muted-foreground">{a.gender || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(a.dateOfBirth)}</TableCell>
                      <TableCell className="text-muted-foreground">{a.weight ? `${a.weight} kg` : '—'}</TableCell>
                      <TableCell className="text-right">
                        {profile?.role !== 'spectator' && (
                          <>
                            <Button asChild size="sm" variant="ghost"><Link href={`/dashboard/kohai/${a.id}`}><Pencil className="h-3.5 w-3.5" /></Link></Button>
                            <Button size="sm" variant="ghost" onClick={() => remove(a.id, a.fullName)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
