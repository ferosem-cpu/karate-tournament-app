'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, doc, getDocs, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ref as sRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Loader2, Image as ImageIcon, X, User } from 'lucide-react';
import { BELTS, GENDERS, EVENT_TYPES } from '@/lib/constants';

export default function KohaiForm({ initial, id }) {
  const router = useRouter();
  const { user } = useAuth();
  const fileRef = useRef();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dojos, setDojos] = useState([]);
  const [form, setForm] = useState({
    fullName: initial?.fullName || '',
    photoUrl: initial?.photoUrl || '',
    gender: initial?.gender || '',
    dateOfBirth: initial?.dateOfBirth || '',
    belt: initial?.belt || '',
    weight: initial?.weight || '',
    dojoId: initial?.dojoId || '',
    dojoName: initial?.dojoName || '',
    eventType: initial?.eventType || '',
    emergencyContactName: initial?.emergencyContactName || '',
    emergencyContactPhone: initial?.emergencyContactPhone || '',
    emergencyContactRelation: initial?.emergencyContactRelation || '',
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'dojos'), (s) => {
      setDojos(s.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const uploadPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `athletes/${user.uid}/${Date.now()}_${safe}`;
    const task = uploadBytesResumable(sRef(storage, path), file);
    task.on('state_changed',
      (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      (err) => { toast.error(err.message); setProgress(0); },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        set('photoUrl', url);
        toast.success('Photo uploaded');
        setProgress(0);
      }
    );
  };

  const onDojoChange = (id) => {
    const d = dojos.find((x) => x.id === id);
    setForm((f) => ({ ...f, dojoId: id, dojoName: d?.name || '' }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) return toast.error('Full name is required');
    setBusy(true);
    try {
      const payload = {
        ...form,
        weight: form.weight === '' ? null : Number(form.weight),
        updatedAt: serverTimestamp(),
        ownerId: user.uid,
      };
      if (id) {
        await updateDoc(doc(db, 'athletes', id), payload);
        toast.success('Kohai updated');
      } else {
        payload.createdAt = serverTimestamp();
        payload.createdBy = user.uid;
        await addDoc(collection(db, 'athletes'), payload);
        toast.success('Kohai registered');
      }
      router.push('/dashboard/kohai');
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card className="border-border/60"><CardContent className="p-6">
        <h2 className="font-semibold text-lg mb-5">Personal Details</h2>
        <div className="grid md:grid-cols-[160px_1fr] gap-5">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Profile Photo</Label>
            <div onClick={() => fileRef.current?.click()} className="aspect-square rounded-md border-2 border-dashed border-border bg-secondary/30 overflow-hidden flex items-center justify-center hover:border-primary/50 transition cursor-pointer relative">
              {form.photoUrl ? (
                <img src={form.photoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="text-muted-foreground flex flex-col items-center gap-1"><User className="h-6 w-6" /><span className="text-xs">Upload</span></div>
              )}
              {form.photoUrl && (
                <button type="button" onClick={(e) => { e.stopPropagation(); set('photoUrl', ''); }} className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center"><X className="h-3.5 w-3.5" /></button>
              )}
              {progress > 0 && progress < 100 && <div className="absolute inset-x-2 bottom-2"><Progress value={progress} /></div>}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Full Name *"><Input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} required placeholder="Hiro Tanaka" /></Field>
            <Field label="Gender">
              <Select value={form.gender} onValueChange={(v) => set('gender', v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Date of Birth"><Input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} /></Field>
            <Field label="Weight (kg)"><Input type="number" step="0.1" value={form.weight} onChange={(e) => set('weight', e.target.value)} placeholder="65" /></Field>
          </div>
        </div>
      </CardContent></Card>

      <Card className="border-border/60"><CardContent className="p-6">
        <h2 className="font-semibold text-lg mb-5">Karate Profile</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Belt">
            <Select value={form.belt} onValueChange={(v) => set('belt', v)}>
              <SelectTrigger><SelectValue placeholder="Select belt…" /></SelectTrigger>
              <SelectContent>{BELTS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Dojo">
            <Select value={form.dojoId} onValueChange={onDojoChange}>
              <SelectTrigger><SelectValue placeholder="Select dojo…" /></SelectTrigger>
              <SelectContent>
                {dojos.length === 0 ? <div className="px-2 py-1.5 text-xs text-muted-foreground">No dojos yet — create one first</div> :
                  dojos.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Primary Event">
            <Select value={form.eventType} onValueChange={(v) => set('eventType', v)}>
              <SelectTrigger><SelectValue placeholder="Kata / Kumite" /></SelectTrigger>
              <SelectContent>{EVENT_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
      </CardContent></Card>

      <Card className="border-border/60"><CardContent className="p-6">
        <h2 className="font-semibold text-lg mb-5">Emergency Contact</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Contact Name"><Input value={form.emergencyContactName} onChange={(e) => set('emergencyContactName', e.target.value)} placeholder="Parent / Guardian" /></Field>
          <Field label="Contact Phone"><Input value={form.emergencyContactPhone} onChange={(e) => set('emergencyContactPhone', e.target.value)} placeholder="+91…" /></Field>
          <Field label="Relationship"><Input value={form.emergencyContactRelation} onChange={(e) => set('emergencyContactRelation', e.target.value)} placeholder="Father / Mother" /></Field>
        </div>
      </CardContent></Card>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={busy} className="bg-primary hover:bg-primary/90 min-w-[160px]">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (id ? 'Save Changes' : 'Register Kohai')}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}
