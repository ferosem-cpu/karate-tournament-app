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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Loader2, Upload, FileText, Image as ImageIcon, X } from 'lucide-react';

const STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'registration_open', label: 'Registration Open' },
  { value: 'live', label: 'Live' },
  { value: 'completed', label: 'Completed' },
];

export default function TournamentForm({ initial, id }) {
  const router = useRouter();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: initial?.name || '',
    organizerName: initial?.organizerName || '',
    venue: initial?.venue || '',
    city: initial?.city || '',
    country: initial?.country || 'India',
    startDate: initial?.startDate || '',
    endDate: initial?.endDate || '',
    registrationDeadline: initial?.registrationDeadline || '',
    numberOfTatamis: initial?.numberOfTatamis || 1,
    status: initial?.status || 'draft',
    description: initial?.description || '',
    logoUrl: initial?.logoUrl || '',
    bannerUrl: initial?.bannerUrl || '',
    brochureUrl: initial?.brochureUrl || '',
    brochureName: initial?.brochureName || '',
  });
  const [progress, setProgress] = useState({ logo: 0, banner: 0, brochure: 0 });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const uploadFile = (file, kind) => new Promise((resolve, reject) => {
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `tournaments/${user.uid}/${Date.now()}_${kind}_${safe}`;
    const r = sRef(storage, path);
    const task = uploadBytesResumable(r, file);
    task.on('state_changed',
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        setProgress((p) => ({ ...p, [kind]: pct }));
      },
      (err) => reject(err),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve({ url, path, name: file.name });
      }
    );
  });

  const handleFile = async (e, kind) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (kind === 'brochure' && file.type !== 'application/pdf') {
      toast.error('Brochure must be a PDF');
      return;
    }
    try {
      const { url, name } = await uploadFile(file, kind);
      if (kind === 'logo') set('logoUrl', url);
      if (kind === 'banner') set('bannerUrl', url);
      if (kind === 'brochure') { set('brochureUrl', url); set('brochureName', name); }
      toast.success(`${kind} uploaded`);
    } catch (err) {
      console.error(err);
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setProgress((p) => ({ ...p, [kind]: 0 }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Tournament name is required');
    setBusy(true);
    try {
      const payload = {
        ...form,
        numberOfTatamis: Number(form.numberOfTatamis) || 1,
        updatedAt: serverTimestamp(),
        ownerId: user.uid,
      };
      if (id) {
        await updateDoc(doc(db, 'tournaments', id), payload);
        toast.success('Tournament updated');
        router.push(`/dashboard/tournaments/${id}`);
      } else {
        payload.createdAt = serverTimestamp();
        payload.createdBy = user.uid;
        const res = await addDoc(collection(db, 'tournaments'), payload);
        toast.success('Tournament created!');
        router.push(`/dashboard/tournaments/${res.id}`);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Branding */}
      <Card className="border-border/60">
        <CardContent className="p-6">
          <h2 className="font-semibold text-lg mb-1">Tournament Branding</h2>
          <p className="text-sm text-muted-foreground mb-5">Logo, banner image and brochure visible on the public tournament page.</p>
          <div className="grid md:grid-cols-3 gap-4">
            <UploadBox
              label="Logo"
              hint="Square. PNG/JPG"
              icon={ImageIcon}
              accept="image/*"
              preview={form.logoUrl}
              progress={progress.logo}
              onChange={(e) => handleFile(e, 'logo')}
              onClear={() => set('logoUrl', '')}
            />
            <UploadBox
              label="Banner"
              hint="Wide. 1600×600 recommended"
              icon={ImageIcon}
              accept="image/*"
              preview={form.bannerUrl}
              progress={progress.banner}
              onChange={(e) => handleFile(e, 'banner')}
              onClear={() => set('bannerUrl', '')}
            />
            <UploadBox
              label="Brochure (PDF)"
              hint="Downloadable from public page"
              icon={FileText}
              accept="application/pdf"
              preview={form.brochureUrl}
              previewLabel={form.brochureName || 'Brochure.pdf'}
              isPdf
              progress={progress.brochure}
              onChange={(e) => handleFile(e, 'brochure')}
              onClear={() => { set('brochureUrl', ''); set('brochureName', ''); }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <Card className="border-border/60">
        <CardContent className="p-6">
          <h2 className="font-semibold text-lg mb-5">Tournament Details</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Tournament Name *">
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="National Karate Championship 2025" />
            </Field>
            <Field label="Organizer Name">
              <Input value={form.organizerName} onChange={(e) => set('organizerName', e.target.value)} placeholder="India Karate Federation" />
            </Field>
            <Field label="Venue">
              <Input value={form.venue} onChange={(e) => set('venue', e.target.value)} placeholder="Indoor Stadium, Sector 5" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City">
                <Input value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Mumbai" />
              </Field>
              <Field label="Country">
                <Input value={form.country} onChange={(e) => set('country', e.target.value)} placeholder="India" />
              </Field>
            </div>
            <Field label="Start Date">
              <Input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
            </Field>
            <Field label="End Date">
              <Input type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} />
            </Field>
            <Field label="Registration Deadline">
              <Input type="date" value={form.registrationDeadline} onChange={(e) => set('registrationDeadline', e.target.value)} />
            </Field>
            <Field label="Number of Tatamis">
              <Input type="number" min="1" value={form.numberOfTatamis} onChange={(e) => set('numberOfTatamis', e.target.value)} />
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Description">
                <Textarea rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="About the tournament…" />
              </Field>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={busy} className="bg-primary hover:bg-primary/90 min-w-[160px]">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (id ? 'Save Changes' : 'Create Tournament')}
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

function UploadBox({ label, hint, icon: Icon, accept, preview, previewLabel, isPdf, progress, onChange, onClear }) {
  const ref = useRef();
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">{label}</Label>
      <div className="relative aspect-video rounded-md border-2 border-dashed border-border bg-secondary/30 overflow-hidden flex items-center justify-center hover:border-primary/50 transition cursor-pointer" onClick={() => ref.current?.click()}>
        {preview ? (
          isPdf ? (
            <div className="flex flex-col items-center gap-2 p-3 text-center">
              <FileText className="h-8 w-8 text-primary" />
              <div className="text-xs truncate max-w-[200px]">{previewLabel}</div>
            </div>
          ) : (
            <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Icon className="h-7 w-7" />
            <div className="text-xs">Click to upload</div>
          </div>
        )}
        {progress > 0 && progress < 100 && (
          <div className="absolute inset-x-2 bottom-2"><Progress value={progress} /></div>
        )}
        {preview && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onClear(); }} className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <input ref={ref} type="file" accept={accept} className="hidden" onChange={onChange} />
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>
    </div>
  );
}
