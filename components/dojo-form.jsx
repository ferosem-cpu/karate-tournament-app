'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ref as sRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Loader2, Image as ImageIcon, X, Building2 } from 'lucide-react';

export default function DojoForm({ initial, id }) {
  const router = useRouter();
  const { user } = useAuth();
  const fileRef = useRef();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [form, setForm] = useState({
    name: initial?.name || '',
    logoUrl: initial?.logoUrl || '',
    instructorName: initial?.instructorName || '',
    phone: initial?.phone || '',
    whatsapp: initial?.whatsapp || '',
    email: initial?.email || '',
    website: initial?.website || '',
    address: initial?.address || '',
    city: initial?.city || '',
    state: initial?.state || '',
    country: initial?.country || 'India',
    googleMapsUrl: initial?.googleMapsUrl || '',
    latitude: initial?.latitude || '',
    longitude: initial?.longitude || '',
    facebook: initial?.facebook || '',
    instagram: initial?.instagram || '',
    youtube: initial?.youtube || '',
    isPublic: initial?.isPublic ?? false,
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const uploadLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `dojos/${user.uid}/${Date.now()}_${safe}`;
    const task = uploadBytesResumable(sRef(storage, path), file);
    task.on('state_changed',
      (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      (err) => { toast.error(err.message); setProgress(0); },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        set('logoUrl', url);
        toast.success('Logo uploaded');
        setProgress(0);
      }
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Dojo name is required');
    setBusy(true);
    try {
      const payload = {
        ...form,
        latitude: form.latitude === '' ? null : Number(form.latitude),
        longitude: form.longitude === '' ? null : Number(form.longitude),
        updatedAt: serverTimestamp(),
        ownerId: user.uid,
      };
      if (id) {
        await updateDoc(doc(db, 'dojos', id), payload);
        toast.success('Dojo updated');
      } else {
        payload.createdAt = serverTimestamp();
        payload.createdBy = user.uid;
        await addDoc(collection(db, 'dojos'), payload);
        toast.success('Dojo created');
      }
      router.push('/dashboard/dojos');
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card className="border-border/60"><CardContent className="p-6">
        <h2 className="font-semibold text-lg mb-1">Dojo Identity</h2>
        <p className="text-sm text-muted-foreground mb-5">Logo + name + lead instructor.</p>
        <div className="grid md:grid-cols-[160px_1fr] gap-5">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Logo</Label>
            <div onClick={() => fileRef.current?.click()} className="aspect-square rounded-md border-2 border-dashed border-border bg-secondary/30 overflow-hidden flex items-center justify-center hover:border-primary/50 transition cursor-pointer relative">
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="text-muted-foreground flex flex-col items-center gap-1"><ImageIcon className="h-6 w-6" /><span className="text-xs">Upload</span></div>
              )}
              {form.logoUrl && (
                <button type="button" onClick={(e) => { e.stopPropagation(); set('logoUrl', ''); }} className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center"><X className="h-3.5 w-3.5" /></button>
              )}
              {progress > 0 && progress < 100 && <div className="absolute inset-x-2 bottom-2"><Progress value={progress} /></div>}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Dojo Name *"><Input value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="Tanaka Karate Dojo" /></Field>
            <Field label="Lead Instructor"><Input value={form.instructorName} onChange={(e) => set('instructorName', e.target.value)} placeholder="Sensei Hiro Tanaka" /></Field>
            <div className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-4 py-3 sm:col-span-2">
              <div>
                <div className="text-sm font-medium">Public Visibility</div>
                <div className="text-xs text-muted-foreground">Show this dojo on the public discovery page (future).</div>
              </div>
              <Switch checked={form.isPublic} onCheckedChange={(v) => set('isPublic', v)} />
            </div>
          </div>
        </div>
      </CardContent></Card>

      <Card className="border-border/60"><CardContent className="p-6">
        <h2 className="font-semibold text-lg mb-5">Contact Details</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Phone"><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 98765 43210" /></Field>
          <Field label="WhatsApp"><Input value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="+91 98765 43210" /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="info@dojo.com" /></Field>
          <Field label="Website"><Input value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://dojo.com" /></Field>
        </div>
      </CardContent></Card>

      <Card className="border-border/60"><CardContent className="p-6">
        <h2 className="font-semibold text-lg mb-5">Location</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Field label="Address"><Textarea rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Street, area, landmark" /></Field></div>
          <Field label="City"><Input value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Mumbai" /></Field>
          <Field label="State"><Input value={form.state} onChange={(e) => set('state', e.target.value)} placeholder="Maharashtra" /></Field>
          <Field label="Country"><Input value={form.country} onChange={(e) => set('country', e.target.value)} /></Field>
          <Field label="Google Maps URL"><Input value={form.googleMapsUrl} onChange={(e) => set('googleMapsUrl', e.target.value)} placeholder="https://maps.google.com/?q=…" /></Field>
          <Field label="Latitude"><Input type="number" step="any" value={form.latitude} onChange={(e) => set('latitude', e.target.value)} placeholder="19.0760" /></Field>
          <Field label="Longitude"><Input type="number" step="any" value={form.longitude} onChange={(e) => set('longitude', e.target.value)} placeholder="72.8777" /></Field>
        </div>
      </CardContent></Card>

      <Card className="border-border/60"><CardContent className="p-6">
        <h2 className="font-semibold text-lg mb-5">Social Media</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Facebook"><Input value={form.facebook} onChange={(e) => set('facebook', e.target.value)} placeholder="facebook.com/…" /></Field>
          <Field label="Instagram"><Input value={form.instagram} onChange={(e) => set('instagram', e.target.value)} placeholder="@handle" /></Field>
          <Field label="YouTube"><Input value={form.youtube} onChange={(e) => set('youtube', e.target.value)} placeholder="youtube.com/@…" /></Field>
        </div>
      </CardContent></Card>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={busy} className="bg-primary hover:bg-primary/90 min-w-[140px]">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (id ? 'Save Changes' : 'Create Dojo')}
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
