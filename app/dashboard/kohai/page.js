'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, where, writeBatch } from 'firebase/firestore';
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
import { Checkbox } from '@/components/ui/checkbox';

export default function KohaiPage() {
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { profile, user } = useAuth();
  const [ownedDojoIds, setOwnedDojoIds] = useState(new Set());
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    setSelectedIds([]);
  }, [search]);

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
    } else if (profile?.role === 'dojo_admin') {
      // Dojo admin sees athletes belonging to their owned dojos
      if (ownedDojoIds.size === 0) {
        setAthletes([]);
        setLoading(false);
        return;
      }
      const dojoIdsArray = Array.from(ownedDojoIds);
      q = query(
        collection(db, 'athletes'),
        where('dojoId', 'in', dojoIdsArray),
        orderBy('createdAt', 'desc')
      );
    } else {
      // Tournament organizers, coaches, etc. see only their own registered athletes
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
  }, [user, profile, ownedDojoIds]);

  const canModifyAthlete = (a) => {
    if (profile?.role === 'super_admin') return true;
    if (user?.uid === a.ownerId) return true;
    if (profile?.role === 'dojo_admin' && ownedDojoIds.has(a.dojoId)) return true;
    return false;
  };

  const filtered = athletes
    .filter((a) => {
      // Extra safety filter in case dojo_admin is active
      if (profile?.role === 'dojo_admin') {
        return ownedDojoIds.has(a.dojoId);
      }
      return true;
    })
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

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(filtered.map((a) => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id, checked) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you absolutely sure you want to permanently delete the ${selectedIds.length} selected Kohais? This action cannot be undone.`)) return;
    try {
      const batch = writeBatch(db);
      selectedIds.forEach((id) => {
        batch.delete(doc(db, 'athletes', id));
      });
      await batch.commit();
      toast.success(`${selectedIds.length} Kohais successfully deleted.`);
      setSelectedIds([]);
    } catch (e) {
      toast.error(e.message || 'Bulk deletion failed');
    }
  };

  const remove = async (athlete) => {
    if (!canModifyAthlete(athlete)) {
      toast.error('Access Denied. You do not have permission to delete this competitor.');
      return;
    }
    if (!confirm(`Remove kohai "${athlete.fullName}"?`)) return;
    try { 
      await deleteDoc(doc(db, 'athletes', athlete.id)); 
      toast.success('Kohai removed'); 
    } catch (e) { 
      toast.error(e.message); 
    }
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

      <div className="mb-5 flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name, dojo, belt…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {profile?.role === 'super_admin' && selectedIds.length > 0 && (
          <Button onClick={handleBulkDelete} variant="destructive" className="bg-red-600 hover:bg-red-700 text-white font-bold">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected ({selectedIds.length})
          </Button>
        )}
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
                    {profile?.role === 'super_admin' && (
                      <TableHead className="w-[50px] pr-0">
                        <Checkbox
                          checked={filtered.length > 0 && selectedIds.length === filtered.length}
                          onCheckedChange={(checked) => handleSelectAll(!!checked)}
                        />
                      </TableHead>
                    )}
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
                      {profile?.role === 'super_admin' && (
                        <TableCell className="pr-0">
                          <Checkbox
                            checked={selectedIds.includes(a.id)}
                            onCheckedChange={(checked) => handleSelectOne(a.id, !!checked)}
                          />
                        </TableCell>
                      )}
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
                        {profile?.role !== 'spectator' && canModifyAthlete(a) ? (
                          <>
                            <Button asChild size="sm" variant="ghost"><Link href={`/dashboard/kohai/${a.id}`}><Pencil className="h-3.5 w-3.5" /></Link></Button>
                            <Button size="sm" variant="ghost" onClick={() => remove(a)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                          </>
                        ) : (
                          <span className="text-zinc-600 text-xs">—</span>
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
