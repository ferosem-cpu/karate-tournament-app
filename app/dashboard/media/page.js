'use client';

import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import PageHeader from '@/components/page-header';
import { HardDrive, FileText, Image as ImageIcon, Film, Clock, AlertTriangle, ExternalLink, Trash2, Search, Archive } from 'lucide-react';
import { RETENTION_OPTIONS, MEDIA_TYPES } from '@/lib/constants';
import { toast } from 'sonner';

const TYPE_ICON = {
  tournament_logo: ImageIcon, tournament_banner: ImageIcon, dojo_logo: ImageIcon, kohai_photo: ImageIcon, weigh_in_photo: ImageIcon,
  tournament_brochure: FileText, certificate_export: FileText,
  protest_video: Film, match_recording: Film,
};

function fmtBytes(b) {
  if (!b) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function daysRemaining(expiry) {
  if (!expiry) return null;
  const d = new Date(expiry);
  const ms = d.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default function MediaPage() {
  const [items, setItems] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('__all__');
  const [tournamentFilter, setTournamentFilter] = useState('__all__');

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, 'tournament_media'), orderBy('uploadedAt', 'desc')), (s) => setItems(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(collection(db, 'tournaments'), (s) => setTournaments(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); };
  }, []);

  const filtered = items.filter((m) => {
    const matchSearch = [m.fileName, m.mediaType].join(' ').toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === '__all__' || m.mediaType === typeFilter;
    const matchTournament = tournamentFilter === '__all__' || m.tournamentId === tournamentFilter;
    return matchSearch && matchType && matchTournament;
  });

  const totalBytes = items.reduce((s, m) => s + (m.sizeBytes || 0), 0);
  const expiringSoon = items.filter((m) => { const d = daysRemaining(m.expiryDate); return d !== null && d <= 7; }).length;
  const permanent = items.filter((m) => m.isPermanent).length;

  const updateRetention = async (id, value) => {
    try {
      const opt = RETENTION_OPTIONS.find((o) => o.value === value);
      const expiryDate = opt && opt.days ? new Date(Date.now() + opt.days * 24 * 60 * 60 * 1000).toISOString() : null;
      await updateDoc(doc(db, 'tournament_media', id), { retentionPeriod: value, expiryDate, isPermanent: !expiryDate, updatedAt: serverTimestamp() });
      toast.success('Retention updated');
    } catch (e) { toast.error(e.message); }
  };

  const removeItem = async (id, fileName) => {
    if (!confirm(`Remove media record "${fileName}"? (Storage file is NOT deleted)`)) return;
    try { await deleteDoc(doc(db, 'tournament_media', id)); toast.success('Media record removed'); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <>
      <PageHeader title="Media" description="Track uploaded media, retention periods and expiry. Automatic cleanup jobs coming soon." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Kpi icon={HardDrive} label="Total Files" value={items.length} />
        <Kpi icon={HardDrive} label="Storage Used" valueText={fmtBytes(totalBytes)} />
        <Kpi icon={AlertTriangle} label="Expiring ≤7 days" value={expiringSoon} accentRed={expiringSoon > 0} />
        <Kpi icon={Archive} label="Permanent" value={permanent} />
      </div>

      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search filename or type…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__all__">All types</SelectItem>{MEDIA_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select>
        <Select value={tournamentFilter} onValueChange={setTournamentFilter}><SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__all__">All tournaments</SelectItem>{tournaments.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>
      </div>

      <Card className="border-border/60"><CardContent className="p-0">
        {filtered.length === 0 ? <div className="p-16 text-center text-sm text-muted-foreground">No media items yet. Uploads from tournament/dojo/kohai forms will appear here.</div> :
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>File</TableHead><TableHead>Type</TableHead><TableHead>Size</TableHead><TableHead>Retention</TableHead><TableHead>Expires</TableHead><TableHead className="text-right">—</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map((m) => {
                  const Icon = TYPE_ICON[m.mediaType] || FileText;
                  const dr = daysRemaining(m.expiryDate);
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {m.mediaType?.includes('photo') || m.mediaType?.includes('logo') || m.mediaType?.includes('banner') ?
                            <img src={m.mediaUrl} alt="" className="h-10 w-10 rounded object-cover ring-1 ring-border" /> :
                            <div className="h-10 w-10 rounded bg-secondary flex items-center justify-center"><Icon className="h-4 w-4 text-muted-foreground" /></div>}
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate max-w-[280px]">{m.fileName || '—'}</div>
                            <div className="text-[10px] text-muted-foreground">{m.tournamentId ? tournaments.find((t) => t.id === m.tournamentId)?.name || '—' : 'no tournament'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{m.mediaType?.replace(/_/g, ' ') || '—'}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtBytes(m.sizeBytes)}</TableCell>
                      <TableCell>
                        <Select value={m.retentionPeriod || '90d'} onValueChange={(v) => updateRetention(m.id, v)}>
                          <SelectTrigger className="h-8 text-xs w-[120px]"><SelectValue /></SelectTrigger>
                          <SelectContent>{RETENTION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs">
                        {m.isPermanent ? <Badge variant="outline" className="bg-emerald-500/15 text-emerald-300 border-emerald-500/40 text-[10px]"><Archive className="h-3 w-3 mr-1" /> Permanent</Badge> :
                          dr === null ? <span className="text-muted-foreground">—</span> :
                          dr <= 0 ? <Badge variant="outline" className="bg-red-500/15 text-red-300 border-red-500/40 text-[10px]">Expired</Badge> :
                          dr <= 7 ? <Badge variant="outline" className="bg-amber-500/15 text-amber-300 border-amber-500/40 text-[10px]"><Clock className="h-3 w-3 mr-1" /> {dr}d left</Badge> :
                          <span className="text-muted-foreground">{dr} days</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="ghost"><a href={m.mediaUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a></Button>
                        <Button size="sm" variant="ghost" onClick={() => removeItem(m.id, m.fileName)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>}
      </CardContent></Card>
    </>
  );
}

function Kpi({ icon: Icon, label, value, valueText, accentRed }) {
  return (
    <Card className="border-border/60"><CardContent className="p-4">
      <div className="flex items-center gap-2">
        <div className={`h-9 w-9 rounded-md ${accentRed ? 'bg-red-500/15' : 'bg-primary/10'} flex items-center justify-center`}><Icon className={`h-4 w-4 ${accentRed ? 'text-red-400' : 'text-primary'}`} /></div>
        <div className="min-w-0">{valueText ? <div className="text-base font-bold truncate">{valueText}</div> : <div className="text-xl font-bold tabular-nums">{value}</div>}<div className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{label}</div></div>
      </div>
    </CardContent></Card>
  );
}
