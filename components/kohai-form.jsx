'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { addDoc, collection, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { uploadFileWithTracking } from '@/lib/media';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import RetentionSelect from '@/components/retention-select';
import { toast } from 'sonner';
import { Loader2, Image as ImageIcon, X, User, AlertCircle, FileText, ShieldCheck, Building2 } from 'lucide-react';
import { BELTS, GENDERS, EVENT_TYPES, computeAge } from '@/lib/constants';

const NO_DOJO_MSG = 'No affiliated dojo found. Please ensure your dojo is registered before proceeding.';

export default function KohaiForm({ initial, id }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryDojoId = searchParams.get('dojoId');
  const { user, profile } = useAuth();
  const fileRef = useRef();
  const docRef = useRef();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ photo: 0, proof: 0 });
  const [dojos, setDojos] = useState([]);
  const [dojosLoaded, setDojosLoaded] = useState(false);

  const [form, setForm] = useState({
    fullName: initial?.fullName || '',
    photoUrl: initial?.photoUrl || '',
    gender: initial?.gender || '',
    dateOfBirth: initial?.dateOfBirth || '',
    belt: initial?.belt || '',
    weight: initial?.weight ?? '',
    dojoId: initial?.dojoId || '',
    dojoName: initial?.dojoName || '',
    eventType: initial?.eventType || '',
    emergencyContactName: initial?.emergencyContactName || '',
    emergencyContactEmail: initial?.emergencyContactEmail || '',
    emergencyContactPhone: initial?.emergencyContactPhone || '',
    emergencyContactRelation: initial?.emergencyContactRelation || '',
    proofOfAgeUrl: initial?.proofOfAgeUrl || '',
    proofOfAgeFileName: initial?.proofOfAgeFileName || '',
    retentionPeriod: initial?.retentionPeriod || '90d',
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'dojos'), (s) => {
      const allDojos = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      setDojos(allDojos);
      setDojosLoaded(true);

      if (!id) {
        if (profile?.role === 'dojo_admin' && user?.uid) {
          const myDojo = allDojos.find((d) => d.ownerId === user.uid);
          if (myDojo) {
            setForm((f) => ({ ...f, dojoId: myDojo.id, dojoName: myDojo.name }));
          }
        } else if (queryDojoId) {
          const selectedDojo = allDojos.find((d) => d.id === queryDojoId);
          if (selectedDojo) {
            setForm((f) => ({ ...f, dojoId: selectedDojo.id, dojoName: selectedDojo.name }));
          }
        }
      }
    });
    return () => unsub();
  }, [user, profile, id, queryDojoId]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const age = useMemo(() => computeAge(form.dateOfBirth), [form.dateOfBirth]);

  const onDojoChange = (id) => {
    const d = dojos.find((x) => x.id === id);
    setForm((f) => ({ ...f, dojoId: id, dojoName: d?.name || '' }));
  };

  const uploadPhoto = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `athletes/${user.uid}/${Date.now()}_${safe}`;
    try {
      const { url } = await uploadFileWithTracking({
        file, path, user, mediaType: 'kohai_photo',
        retentionPeriod: form.retentionPeriod, entityType: 'kohai',
        onProgress: (pct) => setProgress((p) => ({ ...p, photo: pct })),
      });
      set('photoUrl', url); toast.success('Photo uploaded');
    } catch (err) { toast.error(err.message); }
    finally { setProgress((p) => ({ ...p, photo: 0 })); }
  };

  const uploadProof = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type)) { toast.error('Only PDF, JPG or PNG allowed'); return; }
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `athletes/${user.uid}/proof_${Date.now()}_${safe}`;
    try {
      const { url } = await uploadFileWithTracking({
        file, path, user, mediaType: 'kohai_proof_of_age',
        retentionPeriod: form.retentionPeriod, entityType: 'kohai',
        onProgress: (pct) => setProgress((p) => ({ ...p, proof: pct })),
      });
      set('proofOfAgeUrl', url); set('proofOfAgeFileName', file.name);
      toast.success('Proof of age uploaded');
    } catch (err) { toast.error(err.message); }
    finally { setProgress((p) => ({ ...p, proof: 0 })); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) return toast.error('Full name is required');
    if (!form.gender) return toast.error('Gender is required');
    if (!form.dateOfBirth) return toast.error('Date of birth is required');
    if (!form.weight || form.weight === '') return toast.error('Weight is required');
    if (!form.dojoId) return toast.error(dojos.length === 0 ? NO_DOJO_MSG : 'Please select a registered dojo');
    if (!form.eventType) return toast.error('Event category is required');
    if (!form.proofOfAgeUrl) return toast.error('Proof of age document is required (PDF/JPG/PNG)');

    let finalDojoId = form.dojoId;
    let finalDojoName = form.dojoName;
    if (profile?.role === 'dojo_admin') {
      const myDojo = dojos.find((d) => d.ownerId === user.uid);
      if (myDojo) {
        finalDojoId = myDojo.id;
        finalDojoName = myDojo.name;
      } else {
        toast.error(NO_DOJO_MSG);
        return;
      }
    }

    setBusy(true);
    try {
      const payload = {
        ...form,
        dojoId: finalDojoId,
        dojoName: finalDojoName,
        weight: form.weight === '' || form.weight == null ? null : Number(form.weight),
        age: age ?? null,
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
      {dojosLoaded && dojos.length === 0 && (
        <Card className="border-red-500/40 bg-red-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-red-300">{NO_DOJO_MSG}</div>
              <Button asChild size="sm" variant="outline" className="mt-2"><Link href="/dashboard/dojos/new"><Building2 className="h-3.5 w-3.5 mr-1" /> Register Dojo</Link></Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/60"><CardContent className="p-6">
        <h2 className="font-semibold text-lg mb-5">Personal Details</h2>
        <div className="grid md:grid-cols-[160px_1fr] gap-5">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Profile Photo</Label>
            <div onClick={() => fileRef.current?.click()} className="aspect-square rounded-md border-2 border-dashed border-border bg-secondary/30 overflow-hidden flex items-center justify-center hover:border-primary/50 transition cursor-pointer relative">
              {form.photoUrl ? <img src={form.photoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <div className="text-muted-foreground flex flex-col items-center gap-1"><User className="h-6 w-6" /><span className="text-xs">Upload</span></div>}
              {form.photoUrl && <button type="button" onClick={(e) => { e.stopPropagation(); set('photoUrl', ''); }} className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center"><X className="h-3.5 w-3.5" /></button>}
              {progress.photo > 0 && progress.photo < 100 && <div className="absolute inset-x-2 bottom-2"><Progress value={progress.photo} /></div>}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Full Name *"><Input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} required placeholder="Hiro Tanaka" /></Field>
            <Field label="Gender *">
              <Select value={form.gender || undefined} onValueChange={(v) => set('gender', v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Date of Birth *">
              <div>
                <Input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} required />
                {age != null && <div className="mt-1 flex items-center gap-2"><Badge variant="outline" className="bg-primary/10 text-primary border-primary/40 text-[10px]">Age auto: {age} years</Badge></div>}
              </div>
            </Field>
            <Field label="Weight (kg) *"><Input type="number" step="0.1" value={form.weight} onChange={(e) => set('weight', e.target.value)} required placeholder="65" /></Field>
          </div>
        </div>
      </CardContent></Card>

      <Card className="border-border/60"><CardContent className="p-6">
        <h2 className="font-semibold text-lg mb-5">Karate Profile</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Belt">
            <Select value={form.belt || undefined} onValueChange={(v) => set('belt', v)}>
              <SelectTrigger><SelectValue placeholder="Select belt…" /></SelectTrigger>
              <SelectContent className="max-h-72">{BELTS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          {profile?.role === 'dojo_admin' ? (
            <Field label="Dojo">
              <Input value={form.dojoName || 'Your Registered Dojo'} disabled className="bg-secondary/40 text-muted-foreground border-border/40" />
            </Field>
          ) : (
            <Field label="Dojo *">
              <Select value={form.dojoId || undefined} onValueChange={onDojoChange}>
                <SelectTrigger><SelectValue placeholder="Select registered dojo…" /></SelectTrigger>
                <SelectContent>
                  {dojosLoaded && dojos.length === 0 ? <div className="px-2 py-1.5 text-xs text-red-300">{NO_DOJO_MSG}</div> :
                    dojos.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field label="Event Category *">
            <Select value={form.eventType || undefined} onValueChange={(v) => set('eventType', v)}>
              <SelectTrigger><SelectValue placeholder="Kata / Kumite / Team…" /></SelectTrigger>
              <SelectContent>{EVENT_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
      </CardContent></Card>

      <Card className="border-border/60"><CardContent className="p-6">
        <h2 className="font-semibold text-lg mb-1">Proof of Age <span className="text-red-400">*</span></h2>
        <p className="text-sm text-muted-foreground mb-4">Required document: passport, birth certificate, school ID or government ID. Accepted formats: PDF, JPG, PNG.</p>
        <div onClick={() => docRef.current?.click()} className="border-2 border-dashed border-border bg-secondary/30 rounded-md p-6 hover:border-primary/50 transition cursor-pointer relative">
          <div className="flex items-center gap-4">
            {form.proofOfAgeUrl ? (
              <>
                <div className="h-12 w-12 rounded-md bg-emerald-500/10 flex items-center justify-center"><ShieldCheck className="h-6 w-6 text-emerald-400" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{form.proofOfAgeFileName || 'Proof of age uploaded'}</div>
                  <div className="text-xs text-emerald-400 mt-0.5 flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Verified upload · click to replace</div>
                </div>
                <a href={form.proofOfAgeUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-primary hover:underline">View</a>
                <button type="button" onClick={(e) => { e.stopPropagation(); set('proofOfAgeUrl', ''); set('proofOfAgeFileName', ''); }}><X className="h-4 w-4" /></button>
              </>
            ) : (
              <>
                <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center"><FileText className="h-6 w-6 text-primary" /></div>
                <div className="flex-1">
                  <div className="font-medium">Click to upload proof of age</div>
                  <div className="text-xs text-muted-foreground mt-0.5">PDF, JPG or PNG · max ~10 MB</div>
                </div>
              </>
            )}
          </div>
          {progress.proof > 0 && progress.proof < 100 && <div className="mt-3"><Progress value={progress.proof} /></div>}
          <input ref={docRef} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="hidden" onChange={uploadProof} />
        </div>
      </CardContent></Card>

      <Card className="border-border/60"><CardContent className="p-6">
        <h2 className="font-semibold text-lg mb-5">Emergency Contact</h2>
        <div className="grid sm:grid-cols-4 gap-4">
          <Field label="Contact Name"><Input value={form.emergencyContactName} onChange={(e) => set('emergencyContactName', e.target.value)} placeholder="Parent / Guardian" /></Field>
          <Field label="Contact Email"><Input type="email" value={form.emergencyContactEmail || ''} onChange={(e) => set('emergencyContactEmail', e.target.value)} placeholder="parent@example.com" /></Field>
          <Field label="Contact Phone"><Input value={form.emergencyContactPhone} onChange={(e) => set('emergencyContactPhone', e.target.value)} placeholder="+91…" /></Field>
          <Field label="Relationship"><Input value={form.emergencyContactRelation} onChange={(e) => set('emergencyContactRelation', e.target.value)} placeholder="Father / Mother" /></Field>
        </div>
        <div className="mt-4 max-w-xs">
          <RetentionSelect value={form.retentionPeriod} onChange={(v) => set('retentionPeriod', v)} label="Media Retention (uploads)" />
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
  return <div><Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">{label}</Label>{children}</div>;
}
