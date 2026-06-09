'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import DojoForm from '@/components/dojo-form';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { beltClass } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import { Loader2, Users, Plus, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

export default function EditDojoPage() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, 'dojos', id));
      if (snap.exists()) setData(snap.data());
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  if (!data) return <div>Dojo not found.</div>;
  if (
    profile?.role !== 'super_admin' &&
    data.ownerId !== user?.uid
  ) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold">
          Access Denied
        </h2>
        <p className="text-muted-foreground mt-2">
          You do not have permission to edit this dojo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Edit Dojo"
        description={data.name}
        breadcrumb={[{ label: 'Dojos', href: '/dashboard/dojos' }, { label: data.name }, { label: 'Edit' }]}
        actions={
          (profile?.role === 'dojo_admin' || profile?.role === 'super_admin') && (
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link href="/dashboard/dojos/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Additional Dojo
              </Link>
            </Button>
          )
        }
      />
      <DojoForm initial={data} id={id} />
      <DojoKohaiList dojoId={id} />
    </div>
  );
}

function DojoKohaiList({ dojoId }) {
  const { profile, user } = useAuth();
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dojoId) return;
    const q = query(
      collection(db, 'athletes'),
      where('dojoId', '==', dojoId)
    );
    const unsub = onSnapshot(q, (s) => {
      setAthletes(s.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [dojoId]);

  const handleApprove = async (id, name) => {
    try {
      await updateDoc(doc(db, 'athletes', id), {
        status: 'approved',
        updatedAt: serverTimestamp(),
      });
      toast.success(`Approved ${name}`);
    } catch (e) {
      toast.error(`Failed to approve: ${e.message}`);
    }
  };

  const handleReject = async (id, name) => {
    if (!confirm(`Reject and delete registration for ${name}?`)) return;
    try {
      await deleteDoc(doc(db, 'athletes', id));
      toast.success(`Rejected ${name}`);
    } catch (e) {
      toast.error(`Failed to reject: ${e.message}`);
    }
  };

  const handleDelete = async (athlete) => {
    if (!confirm(`Remove kohai "${athlete.fullName}"?`)) return;
    try {
      await deleteDoc(doc(db, 'athletes', athlete.id));
      toast.success('Kohai removed');
    } catch (e) {
      toast.error(e.message);
    }
  };

  const canManage = profile?.role === 'super_admin' || profile?.role === 'dojo_admin';

  if (loading) return <div className="text-sm text-muted-foreground mt-4 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading athletes…</div>;

  const activeAthletes = athletes.filter((a) => a.status !== 'pending_approval');
  const pendingAthletes = athletes.filter((a) => a.status === 'pending_approval');

  return (
    <div className="space-y-6">
      {/* 1. Pending Approvals Section */}
      {pendingAthletes.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-950/10">
          <CardContent className="p-0">
            <div className="p-5 border-b border-amber-500/20 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-lg text-amber-300 flex items-center gap-2">
                  <Users className="h-5 w-5 text-amber-400" />
                  Pending Approvals
                </h3>
                <p className="text-xs text-amber-450 mt-0.5">
                  {pendingAthletes.length} athlete(s) self-registered and awaiting approval
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-amber-500/10 hover:bg-transparent">
                    <TableHead className="text-amber-200">Kohai</TableHead>
                    <TableHead className="text-amber-200">Belt</TableHead>
                    <TableHead className="text-amber-200">Gender</TableHead>
                    <TableHead className="text-amber-200">DOB</TableHead>
                    <TableHead className="text-amber-200">Weight</TableHead>
                    <TableHead className="text-amber-200">Event Type</TableHead>
                    <TableHead className="text-amber-200 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingAthletes.map((a) => (
                    <TableRow key={a.id} className="border-amber-500/10 hover:bg-amber-500/5">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={a.photoUrl} />
                            <AvatarFallback className="bg-amber-500/20 text-amber-300 text-xs">{(a.fullName || 'K').slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="font-semibold text-sm text-zinc-100">{a.fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {a.belt ? (
                          <Badge className={`${beltClass(a.belt)} text-[10px]`} variant="outline">
                            {a.belt}
                          </Badge>
                        ) : (
                          <span className="text-zinc-500 text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-zinc-300 text-xs">{a.gender || '—'}</TableCell>
                      <TableCell className="text-zinc-300 text-xs">{formatDate(a.dateOfBirth)}</TableCell>
                      <TableCell className="text-zinc-300 text-xs">{a.weight ? `${a.weight} kg` : '—'}</TableCell>
                      <TableCell className="text-zinc-300 text-xs">{a.eventType || '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3"
                            onClick={() => handleApprove(a.id, a.fullName)}
                          >
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            className="text-xs font-semibold px-3"
                            onClick={() => handleReject(a.id, a.fullName)}
                          >
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Active Athletes Section */}
      <Card className="border-border/60">
        <CardContent className="p-0">
          <div className="p-5 border-b border-border flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-lg">Active Dojo Athletes (Kohai)</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeAthletes.length} athlete(s) registered under this dojo
              </p>
            </div>
            {canManage && (
              <Button asChild size="sm" className="bg-primary hover:bg-primary/90">
                <Link href={`/dashboard/kohai/new?dojoId=${dojoId}`}>
                  <Plus className="h-4 w-4 mr-1.5" /> Add Kohai
                </Link>
              </Button>
            )}
          </div>
          {activeAthletes.length === 0 ? (
            <div className="p-16 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/60 mb-3" />
              <h4 className="font-medium text-sm text-foreground">No active athletes found</h4>
              <p className="text-xs text-muted-foreground mt-1">No athletes have been registered to this dojo yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kohai</TableHead>
                    <TableHead>Belt</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>DOB</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Event Type</TableHead>
                    {canManage && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeAthletes.map((a) => (
                    <TableRow key={a.id} className="hover:bg-secondary/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={a.photoUrl} />
                            <AvatarFallback className="bg-primary/20 text-primary text-xs">{(a.fullName || 'K').slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{a.fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {a.belt ? (
                          <Badge className={`${beltClass(a.belt)} text-[10px]`} variant="outline">
                            {a.belt}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{a.gender || '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{formatDate(a.dateOfBirth)}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{a.weight ? `${a.weight} kg` : '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{a.eventType || '—'}</TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="ghost"><Link href={`/dashboard/kohai/${a.id}`}><Pencil className="h-3.5 w-3.5" /></Link></Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(a)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
