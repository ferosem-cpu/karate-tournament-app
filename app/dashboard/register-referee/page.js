'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { submitRefereeApplication } from '@/lib/referee-service';
import { uploadFileWithTracking } from '@/lib/media';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Upload, FileText, CheckCircle, Loader2, X, Award, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/page-header';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

export default function RegisterRefereePage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const fileRef = useRef();

  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [experience, setExperience] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [certificateUrl, setCertificateUrl] = useState('');
  const [certificateFileName, setCertificateFileName] = useState('');

  // Tournaments list state
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');

  // Fetch active tournaments on mount
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'tournaments'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      // Filter out completed and draft tournaments to show active/registration ones
      const activeList = list.filter(t => t.status !== 'completed' && t.status !== 'draft');
      setTournaments(activeList);
    }, (err) => {
      console.error("Error fetching tournaments:", err);
      toast.error("Failed to load tournaments list");
    });

    return () => unsub();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-gold-primary" />
          <span className="text-zinc-400 font-medium">Verifying authorization...</span>
        </div>
      </div>
    );
  }

  if (!user?.uid) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Alert variant="destructive" className="border-red-500/40 bg-red-500/5">
          <ShieldAlert className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300 font-medium">
            You must be logged in to submit a referee application.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Allow dojo_admin, super_admin, and tournament_organizer to apply (for testing and setup)
  const allowedRoles = ['dojo_admin', 'super_admin', 'tournament_organizer'];
  const userRole = profile?.role || 'spectator';
  if (!allowedRoles.includes(userRole)) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Alert variant="destructive" className="border-red-500/40 bg-red-500/5">
          <ShieldAlert className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300 font-medium">
            Access Denied. Only Dojo Administrators can submit a referee application from this portal.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleUploadCertificate = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type)) {
      toast.error('Only PDF, JPG, or PNG files are allowed');
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

      setCertificateUrl(uploadResult?.url || '');
      setCertificateFileName(file.name);
      toast.success('Certificate file uploaded successfully');
    } catch (err) {
      toast.error(err?.message || 'File upload failed');
    } finally {
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!experience) {
      toast.error('Please select your years of experience');
      return;
    }

    if (!selectedTournamentId) {
      toast.error('Please select the tournament where you wish to participate as a referee');
      return;
    }

    setBusy(true);
    try {
      const fullName = profile?.displayName || user?.displayName || user?.email || 'Anonymous';
      
      // Combine experience and notes into certifications field for compatibility
      const certificationsText = `Years of Experience: ${experience}. ${additionalNotes ? `Additional notes: ${additionalNotes}` : ''}`;

      const selectedTournament = tournaments.find(t => t.id === selectedTournamentId);
      const tournamentName = selectedTournament ? selectedTournament.name : null;

      await submitRefereeApplication(
        user.uid,
        fullName,
        '—', // rank
        '—', // beltLevel
        certificationsText,
        certificateUrl || null,
        selectedTournamentId,
        tournamentName
      );

      toast.success('Referee application submitted successfully!');
      setSubmitted(true);
    } catch (err) {
      toast.error(err?.message || 'Failed to submit referee application');
    } finally {
      setBusy(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="border-emerald-500/40 bg-zinc-950/60 backdrop-blur-md shadow-2xl">
          <CardContent className="p-8 text-center space-y-6">
            <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle className="h-10 w-10 text-emerald-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-emerald-400">Application Submitted!</h2>
              <p className="text-zinc-400 text-sm max-w-md mx-auto">
                Thank you for applying to become a referee. The tournament administrators will review your credentials and verification details.
              </p>
            </div>
            <div className="border-t border-zinc-900 pt-6">
              <Button onClick={() => router.push('/dashboard/dojos')} className="bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold px-6">
                Back to Dojos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <PageHeader
        title="Register as Referee"
        description="Submit your years of experience and optional certifications to apply for tournament referee status."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-zinc-800 bg-zinc-950 shadow-xl">
          <CardHeader className="border-b border-zinc-900 pb-4">
            <CardTitle className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <Award className="h-5 w-5 text-gold-primary" />
              <span>Referee Credentials & Experience</span>
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              All details will be reviewed by Tournament Hub administrators.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-5">
            {/* Read-Only Account Information */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-zinc-400 font-bold">Applicant Name</Label>
                <Input
                  value={profile?.displayName || user?.displayName || 'N/A'}
                  disabled
                  className="bg-zinc-900 border-zinc-800 text-zinc-300 font-medium cursor-not-allowed opacity-75"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-zinc-400 font-bold">Email Address</Label>
                <Input
                  value={user?.email || 'N/A'}
                  disabled
                  className="bg-zinc-900 border-zinc-800 text-zinc-300 font-medium cursor-not-allowed opacity-75"
                />
              </div>
            </div>

            {/* Experience Dropdown */}
            <div className="space-y-1.5">
              <Label htmlFor="experience" className="text-xs uppercase tracking-wider text-zinc-400 font-bold">
                Years of Referee Experience <span className="text-gold-primary">*</span>
              </Label>
              <Select value={experience} onValueChange={setExperience} required>
                <SelectTrigger id="experience" className="border-zinc-800 bg-zinc-900 text-zinc-100 focus:ring-1 focus:ring-gold-primary">
                  <SelectValue placeholder="Select years of experience" />
                </SelectTrigger>
                <SelectContent className="border-zinc-850 bg-zinc-950 text-zinc-100">
                  <SelectItem value="1+" className="hover:bg-zinc-900 focus:bg-zinc-900">1+ Years</SelectItem>
                  <SelectItem value="3+" className="hover:bg-zinc-900 focus:bg-zinc-900">3+ Years</SelectItem>
                  <SelectItem value="5+" className="hover:bg-zinc-900 focus:bg-zinc-900">5+ Years</SelectItem>
                  <SelectItem value="10+" className="hover:bg-zinc-900 focus:bg-zinc-900">10+ Years</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tournament Selection Dropdown */}
            <div className="space-y-1.5">
              <Label htmlFor="tournament" className="text-xs uppercase tracking-wider text-zinc-400 font-bold">
                Target Tournament <span className="text-gold-primary">*</span>
              </Label>
              <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId} required>
                <SelectTrigger id="tournament" className="border-zinc-800 bg-zinc-900 text-zinc-100 focus:ring-1 focus:ring-gold-primary">
                  <SelectValue placeholder="Select target tournament" />
                </SelectTrigger>
                <SelectContent className="border-zinc-850 bg-zinc-950 text-zinc-100">
                  {tournaments.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="hover:bg-zinc-900 focus:bg-zinc-900">
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-zinc-500 mt-1">
                Select the tournament you wish to participate in as a referee.
              </p>
            </div>

            {/* Certificate File Upload (Optional) */}
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-zinc-400 font-bold">
                Referee Certification File <span className="text-zinc-500">(Optional)</span>
              </Label>
              <div
                onClick={() => fileRef.current?.click()}
                className="border border-dashed border-zinc-800 bg-zinc-900/40 rounded-xl p-8 hover:border-gold-primary/50 transition cursor-pointer text-center group"
              >
                <div className="flex flex-col items-center gap-3">
                  {certificateUrl ? (
                    <>
                      <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner">
                        <FileText className="h-6 w-6 text-emerald-400" />
                      </div>
                      <div className="space-y-1">
                        <div className="font-bold text-sm text-zinc-100 truncate max-w-md">{certificateFileName}</div>
                        <div className="text-xs text-emerald-400 font-medium">Uploaded Successfully · Click to replace</div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCertificateUrl('');
                          setCertificateFileName('');
                        }}
                        className="p-1 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="h-12 w-12 rounded-xl bg-zinc-950 flex items-center justify-center border border-zinc-800 shadow-lg group-hover:border-gold-primary/30 transition">
                        <Upload className="h-6 w-6 text-zinc-400 group-hover:text-gold-primary transition" />
                      </div>
                      <div className="space-y-1">
                        <div className="font-bold text-sm text-zinc-200">Upload Referee Certification</div>
                        <div className="text-xs text-zinc-400">PDF, JPG, JPEG, or PNG formats only</div>
                      </div>
                    </>
                  )}
                </div>

                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-4 max-w-xs mx-auto space-y-1.5">
                    <Progress value={uploadProgress} className="h-1.5 bg-zinc-800 text-gold-primary" />
                    <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{uploadProgress}% Uploading...</div>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={handleUploadCertificate}
                />
              </div>
            </div>

            {/* Optional Additional Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="additionalNotes" className="text-xs uppercase tracking-wider text-zinc-400 font-bold">
                Additional Certifications or Notes <span className="text-zinc-500">(Optional)</span>
              </Label>
              <Textarea
                id="additionalNotes"
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Include other credentials, tournament affiliations, or relevant experiences..."
                rows={3}
                className="border-zinc-800 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 focus:ring-1 focus:ring-gold-primary"
              />
            </div>
          </CardContent>
        </Card>

        {/* Info Banner */}
        <Alert className="border-blue-500/20 bg-blue-500/5 text-blue-300">
          <AlertCircle className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-xs leading-relaxed">
            Your application will be queued for review. Upon approval, your account role will be upgraded to <strong>Referee</strong>.
          </AlertDescription>
        </Alert>

        {/* Actions */}
        <div className="flex gap-3 justify-end items-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/dojos')}
            className="border-zinc-800 text-zinc-300 hover:bg-zinc-900"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={busy || !experience || !selectedTournamentId}
            className="bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold px-6 min-w-[160px] disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Submit Application
          </Button>
        </div>
      </form>
    </div>
  );
}
