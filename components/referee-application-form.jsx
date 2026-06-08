'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { submitRefereeApplication } from '@/lib/referee-service';
import { uploadFileWithTracking } from '@/lib/media';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Upload, FileText, CheckCircle, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { BELTS } from '@/lib/constants';

const MARTIAL_ARTS_RANKS = ['1st Degree', '2nd Degree', '3rd Degree', '4th Degree', '5th Degree', '6th Degree+'];

export default function RefereeApplicationForm() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const fileRef = useRef();
  
  // Early return if not authenticated
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-border/60">
          <CardContent className="p-8 flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-muted-foreground">Loading…</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user?.uid) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert className="border-amber-500/40 bg-amber-500/5">
          <AlertCircle className="h-4 w-4 text-amber-400" />
          <AlertDescription className="text-amber-300">
            You must be logged in to submit a referee application.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [form, setForm] = useState({
    fullName: '',
    martialArtsRank: '',
    beltLevel: '',
    certifications: '',
    certificateUrl: '',
    certificateFileName: '',
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const uploadCertificate = async (e) => {
    const file = e.target?.files?.[0];
    if (!file || !user?.uid) {
      toast.error('No file selected or user not authenticated');
      return;
    }

    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type)) {
      toast.error('Only PDF, JPG, or PNG allowed');
      return;
    }

    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `referee_applications/${user.uid}/${Date.now()}_${safe}`;

      const uploadResult = await uploadFileWithTracking({
        file,
        path,
        user,
        mediaType: 'referee_certificate',
        retentionPeriod: '1y',
        entityType: 'referee',
        onProgress: (pct) => setUploadProgress(pct),
      });

      set('certificateUrl', uploadResult?.url || '');
      set('certificateFileName', file.name);
      toast.success('Certificate uploaded');
    } catch (err) {
      toast.error(err?.message || 'Upload failed');
    } finally {
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user?.uid) {
      toast.error('User not authenticated');
      return;
    }

    const fullName = profile?.displayName || user?.displayName || user?.email || 'Anonymous';
    if (!form.certifications?.trim()) return toast.error('Certifications description is required');

    setBusy(true);
    try {
      await submitRefereeApplication(
        user.uid,
        fullName,
        form.martialArtsRank || '—',
        form.beltLevel || '—',
        form.certifications,
        form.certificateUrl || null
      );

      toast.success('Referee application submitted!');
      setSubmitted(true);
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (err) {
      toast.error(err?.message || 'Failed to submit application');
    } finally {
      setBusy(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-emerald-500/40 bg-emerald-500/5">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-emerald-300 mb-2">Application Submitted!</h2>
            <p className="text-muted-foreground mb-6">
              Thank you for applying to become a referee. We will review your application and contact you shortly.
            </p>
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
              <a href="/dashboard">Return to Dashboard</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      <Card className="border-border/60">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-5">Certifications & Experience</h2>

          <div className="mb-4">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Certifications & Experience *
            </Label>
            <Textarea
              value={form.certifications}
              onChange={(e) => set('certifications', e.target.value)}
              placeholder="Describe your referee certifications, years of experience, and any relevant training…"
              rows={5}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Include details about referee clinics attended, certifying bodies, and years of experience
            </p>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Referee Certificate (PDF/JPG/PNG)
            </Label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border bg-secondary/30 rounded-md p-6 hover:border-primary/50 transition cursor-pointer"
            >
              <div className="flex items-center gap-4">
                {form.certificateUrl ? (
                  <>
                    <div className="h-12 w-12 rounded-md bg-emerald-500/10 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{form.certificateFileName}</div>
                      <div className="text-xs text-emerald-400 mt-0.5">Uploaded · click to replace</div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        set('certificateUrl', '');
                        set('certificateFileName', '');
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Click to upload certificate</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Optional · PDF, JPG or PNG</div>
                    </div>
                  </>
                )}
              </div>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-3">
                  <Progress value={uploadProgress} />
                </div>
              )}
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={uploadCertificate} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Alert className="border-blue-500/40 bg-blue-500/5">
        <AlertCircle className="h-4 w-4 text-blue-400" />
        <AlertDescription className="text-blue-300/90">
          Your application will be reviewed by our admin team. You'll receive an email once approved.
        </AlertDescription>
      </Alert>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy} className="bg-primary hover:bg-primary/90 min-w-[160px]">
          {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Submit Application
        </Button>
      </div>
    </form>
  );
}
