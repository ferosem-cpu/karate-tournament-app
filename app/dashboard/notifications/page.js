'use client';

import { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import PageHeader from '@/components/page-header';
import { Plus, Bell, Mail, MessageCircle, Smartphone, Trash2, Send } from 'lucide-react';
import { NOTIFICATION_TYPES } from '@/lib/constants';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: 'tournament_announcement', subject: '', body: '', recipientEmail: '', tournamentId: '' });
  const [tournaments, setTournaments] = useState([]);

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, 'notifications'), orderBy('createdAt', 'desc')), (s) => setItems(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(collection(db, 'tournaments'), (s) => setTournaments(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); };
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const create = async () => {
    if (!form.subject) return toast.error('Subject required');
    try {
      const t = tournaments.find((x) => x.id === form.tournamentId);
      await addDoc(collection(db, 'notifications'), {
        ...form, channel: 'email', status: 'draft',
        tournamentName: t?.name || '', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        createdBy: user.uid,
      });
      toast.success('Notification draft saved');
      setOpen(false);
      setForm({ type: 'tournament_announcement', subject: '', body: '', recipientEmail: '', tournamentId: '' });
    } catch (e) { toast.error(e.message); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this notification?')) return;
    try { await deleteDoc(doc(db, 'notifications', id)); toast.success('Deleted'); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Email, WhatsApp and push notifications. Email integration coming soon — currently saved as drafts."
        actions={<Button onClick={() => setOpen(true)} className="bg-primary hover:bg-primary/90"><Plus className="h-4 w-4 mr-2" /> Compose</Button>}
      />

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Channel icon={Mail} label="Email" status="Architecture Ready" enabled />
        <Channel icon={MessageCircle} label="WhatsApp" status="Coming Soon" />
        <Channel icon={Smartphone} label="Push" status="Coming Soon" />
      </div>

      <Card className="border-border/60"><CardContent className="p-0">
        {items.length === 0 ? (
          <div className="p-16 text-center">
            <Bell className="h-12 w-12 mx-auto text-primary mb-3" />
            <h3 className="font-semibold text-lg">No notifications yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-5">Compose your first announcement.</p>
            <Button onClick={() => setOpen(true)} className="bg-primary hover:bg-primary/90"><Plus className="h-4 w-4 mr-2" /> Compose Notification</Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((n) => {
              const meta = NOTIFICATION_TYPES.find((t) => t.value === n.type) || { label: n.type };
              return (
                <div key={n.id} className="p-4 hover:bg-secondary/30">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0"><Bell className="h-4 w-4 text-primary" /></div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold truncate">{n.subject}</span>
                          <Badge variant="outline" className="text-[10px]">{meta.label}</Badge>
                          <Badge variant="outline" className="text-[10px] bg-zinc-700 text-zinc-200">{n.status || 'draft'}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.body}</p>
                        <div className="text-[10px] text-muted-foreground mt-1">To: {n.recipientEmail || 'all'} · {n.tournamentName ? `→ ${n.tournamentName} · ` : ''}{formatDate(n.createdAt)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="outline" disabled title="Email integration coming soon"><Send className="h-3.5 w-3.5 mr-1" /> Send</Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(n.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Compose Notification</DialogTitle><DialogDescription>Saves as draft. Email sending will be enabled once SendGrid is wired up.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Type</Label>
              <Select value={form.type} onValueChange={(v) => set('type', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{NOTIFICATION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Tournament (optional)</Label>
              <Select value={form.tournamentId} onValueChange={(v) => set('tournamentId', v)}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{tournaments.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Recipient Email (optional, blank = all)</Label><Input type="email" value={form.recipientEmail} onChange={(e) => set('recipientEmail', e.target.value)} placeholder="name@dojo.com" /></div>
            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Subject</Label><Input value={form.subject} onChange={(e) => set('subject', e.target.value)} placeholder="Tournament announcement…" /></div>
            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Body</Label><Textarea rows={5} value={form.body} onChange={(e) => set('body', e.target.value)} placeholder="Message…" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create} className="bg-primary hover:bg-primary/90">Save Draft</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Channel({ icon: Icon, label, status, enabled }) {
  return (
    <Card className="border-border/60"><CardContent className="p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-md flex items-center justify-center ${enabled ? 'bg-emerald-500/10' : 'bg-zinc-700/40'}`}><Icon className={`h-5 w-5 ${enabled ? 'text-emerald-400' : 'text-muted-foreground'}`} /></div>
      <div><div className="font-semibold">{label}</div><div className="text-[10px] text-muted-foreground uppercase tracking-wider">{status}</div></div>
    </CardContent></Card>
  );
}
