'use client';

import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/page-header';
import CategoryFormDialog from '@/components/category-form-dialog';
import { Plus, Tags, Search, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tournamentFilter, setTournamentFilter] = useState('__all__');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'categories'), orderBy('createdAt', 'desc'));
    const u1 = onSnapshot(q, (s) => { setCategories(s.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); }, () => setLoading(false));
    const u2 = onSnapshot(collection(db, 'tournaments'), (s) => setTournaments(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); };
  }, []);

  const filtered = categories.filter((c) => {
    const matchesSearch = [c.name, c.tournamentName, c.eventType].join(' ').toLowerCase().includes(search.toLowerCase());
    const matchesTournament = tournamentFilter === '__all__' || c.tournamentId === tournamentFilter || (tournamentFilter === '__global__' && (!c.tournamentId || c.tournamentId === '__global__'));
    return matchesSearch && matchesTournament;
  });

  const remove = async (id, name) => {
    if (!confirm(`Delete category "${name}"?`)) return;
    try { await deleteDoc(doc(db, 'categories', id)); toast.success('Category deleted'); }
    catch (e) { toast.error(e.message); }
  };

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (c) => { setEditing(c); setDialogOpen(true); };

  return (
    <>
      <PageHeader
        title="Categories"
        description="Kata & Kumite categories · age, gender, belt and weight rules."
        actions={<Button onClick={openCreate} className="bg-primary hover:bg-primary/90"><Plus className="h-4 w-4 mr-2" /> New Category</Button>}
      />

      <div className="mb-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search categories…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={tournamentFilter} onValueChange={setTournamentFilter}>
          <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All tournaments</SelectItem>
            <SelectItem value="__global__">Global only</SelectItem>
            {tournaments.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? <Card className="border-border/60"><CardContent className="p-10 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
        : filtered.length === 0 ? (
          <Card className="border-border/60"><CardContent className="p-16 text-center">
            <Tags className="h-12 w-12 mx-auto text-primary mb-3" />
            <h3 className="font-semibold text-lg">No categories yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-5">Create your first competition category.</p>
            <Button onClick={openCreate} className="bg-primary hover:bg-primary/90"><Plus className="h-4 w-4 mr-2" /> Create Category</Button>
          </CardContent></Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c) => (
              <Card key={c.id} className="border-border/60 hover:border-primary/40 transition">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{c.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.tournamentName || 'Global'}</p>
                    </div>
                    {c.isActive !== false ? (
                      <Badge variant="outline" className="bg-emerald-500/15 text-emerald-300 border-emerald-500/40 text-[10px]">Active</Badge>
                    ) : <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/40">{c.eventType}</Badge>
                    <Badge variant="outline" className="text-[10px]">{c.gender}</Badge>
                    {(c.ageMin != null || c.ageMax != null) && <Badge variant="outline" className="text-[10px]">Age {c.ageMin ?? '?'}–{c.ageMax ?? '?'}</Badge>}
                    {(c.weightMin != null || c.weightMax != null) && <Badge variant="outline" className="text-[10px]">{c.weightMin ?? '?'}–{c.weightMax ?? '?'} kg</Badge>}
                    {c.beltMin && c.beltMin !== '__any__' && <Badge variant="outline" className="text-[10px]">Belt: {c.beltMin}{c.beltMax && c.beltMax !== '__any__' ? `→${c.beltMax}` : '+'}</Badge>}
                  </div>
                  {c.description && <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{c.description}</p>}
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline" onClick={() => openEdit(c)} className="flex-1"><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(c.id, c.name)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      <CategoryFormDialog open={dialogOpen} onOpenChange={setDialogOpen} tournaments={tournaments} initial={editing} id={editing?.id} />
    </>
  );
}
