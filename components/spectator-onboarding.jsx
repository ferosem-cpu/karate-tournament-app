'use client';

// Option A: Sensei onboarding directly upgrades users to dojo_admin after creating a dojo.
// ApplyForRoleButton (approval queue) is for spectators who did not use this path.

import { useState, useEffect, useRef } from 'react';
import { collection, doc, addDoc, setDoc, onSnapshot, getDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { uploadFileWithTracking } from '@/lib/media';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  Building2, 
  Users, 
  Eye, 
  ArrowRight, 
  ArrowLeft, 
  Loader2, 
  User, 
  ShieldCheck, 
  FileText, 
  Image as ImageIcon, 
  X, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { BELTS, GENDERS, EVENT_TYPES } from '@/lib/constants';

export default function SpectatorOnboarding({ onComplete }) {
  const { user, profile } = useAuth();
  
  // Selection or specific wizards
  const [step, setStep] = useState('selection'); // 'selection' | 'spectator_register' | 'sensei_dojo' | ...
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  // Dojo list for student registration
  const [dojos, setDojos] = useState([]);
  const [dojosLoaded, setDojosLoaded] = useState(false);

  // Forms state
  const [dojoForm, setDojoForm] = useState({
    name: '',
    logoUrl: '',
    instructorName: profile?.displayName || user?.displayName || '',
    phone: '',
    whatsapp: '',
    email: profile?.email || user?.email || '',
    address: '',
    city: '',
    state: '',
    country: 'India',
  });

  const [localKohais, setLocalKohais] = useState([]);
  const [kohaiForm, setKohaiForm] = useState({
    fullName: '',
    photoUrl: '',
    gender: '',
    dateOfBirth: '',
    belt: 'White',
    weight: '',
    eventType: '',
    proofOfAgeUrl: '',
    proofOfAgeFileName: '',
    emergencyContactEmail: '',
  });

  const [studentForm, setStudentForm] = useState({
    fullName: profile?.displayName || user?.displayName || '',
    photoUrl: '',
    gender: '',
    dateOfBirth: '',
    belt: 'White',
    weight: '',
    dojoId: '',
    eventType: '',
    proofOfAgeUrl: '',
    proofOfAgeFileName: '',
    emergencyContactEmail: '',
  });

  const [spectatorForm, setSpectatorForm] = useState({
    fullName: profile?.displayName || user?.displayName || '',
    email: profile?.email || user?.email || '',
    city: profile?.city || '',
    country: profile?.country || 'India',
  });

  // Logo & Proof input refs
  const logoInputRef = useRef();
  const proofInputRef = useRef();
  const studentPhotoInputRef = useRef();
  const studentProofInputRef = useRef();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'dojos'), (s) => {
      setDojos(s.docs.map((d) => ({ id: d.id, ...d.data() })));
      setDojosLoaded(true);
    });
    return () => unsub();
  }, []);

  // Sensei: handle dojo change
  const handleDojoFormChange = (k, v) => setDojoForm((f) => ({ ...f, [k]: v }));
  
  // Sensei: handle kohai change
  const handleKohaiFormChange = (k, v) => setKohaiForm((f) => ({ ...f, [k]: v }));

  // Student: handle student form change
  const handleStudentFormChange = (k, v) => setStudentForm((f) => ({ ...f, [k]: v }));

  // File Upload Helper
  const performUpload = async (file, mediaType, onDone, kind) => {
    setProgress(1);
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `onboarding/${user.uid}/${Date.now()}_${safe}`;
    try {
      const { url } = await uploadFileWithTracking({
        file, path, user, mediaType,
        retentionPeriod: '90d', entityType: 'onboarding',
        onProgress: (pct) => setProgress(pct || 1),
      });
      onDone(url, file.name);
      toast.success(`${kind} uploaded successfully`);
    } catch (err) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setProgress(0);
    }
  };

  // Dojo logo upload
  const uploadDojoLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    performUpload(file, 'dojo_logo', (url) => handleDojoFormChange('logoUrl', url), 'Logo');
  };

  // Kohai proof upload
  const uploadKohaiProof = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type)) return toast.error('Only PDF, JPG or PNG allowed');
    performUpload(file, 'kohai_proof_of_age', (url, name) => {
      handleKohaiFormChange('proofOfAgeUrl', url);
      handleKohaiFormChange('proofOfAgeFileName', name);
    }, 'Proof of age');
  };

  // Student photo upload
  const uploadStudentPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    performUpload(file, 'kohai_photo', (url) => handleStudentFormChange('photoUrl', url), 'Photo');
  };

  // Student proof upload
  const uploadStudentProof = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type)) return toast.error('Only PDF, JPG or PNG allowed');
    performUpload(file, 'kohai_proof_of_age', (url, name) => {
      handleStudentFormChange('proofOfAgeUrl', url);
      handleStudentFormChange('proofOfAgeFileName', name);
    }, 'Proof of age');
  };

  // Sensei: add single kohai locally
  const addLocalKohai = (e) => {
    e.preventDefault();
    if (!kohaiForm.fullName.trim()) return toast.error('Athlete Full name is required');
    if (!kohaiForm.gender) return toast.error('Athlete Gender is required');
    if (!kohaiForm.dateOfBirth) return toast.error('Athlete Date of Birth is required');
    if (!kohaiForm.proofOfAgeUrl) return toast.error('Athlete Proof of Age is required');

    setLocalKohais((prev) => [...prev, { ...kohaiForm, id: Date.now().toString() }]);
    setKohaiForm({
      fullName: '',
      photoUrl: '',
      gender: '',
      dateOfBirth: '',
      belt: 'White',
      weight: '',
      eventType: '',
      proofOfAgeUrl: '',
      proofOfAgeFileName: '',
      emergencyContactEmail: '',
    });
    toast.success('Competitor added to registration list');
  };

  // Sensei: remove local kohai
  const removeLocalKohai = (idx) => {
    setLocalKohais((prev) => prev.filter((_, i) => i !== idx));
  };

  // Sensei Onboarding: Submit Dojo + Kohais + Role Upgrade
  const submitSensei = async () => {
    if (!dojoForm.name.trim()) return toast.error('Dojo name is required');
    if (!dojoForm.logoUrl) return toast.error('Dojo logo is required');
    if (!dojoForm.phone.trim()) return toast.error('Phone number is required');
    if (!dojoForm.whatsapp.trim()) return toast.error('WhatsApp number is required');
    if (!dojoForm.address.trim()) return toast.error('Dojo Address is required');
    if (localKohais.length === 0) return toast.error('Minimum 1 registered Kohai is mandatory to create a Dojo');

    setBusy(true);
    try {
      // 1. Create Dojo Doc
      const dojoRef = await addDoc(collection(db, 'dojos'), {
        ...dojoForm,
        isPublic: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ownerId: user.uid,
        createdBy: user.uid,
      });

      // 2. Create Athlete Docs
      for (const k of localKohais) {
        await addDoc(collection(db, 'athletes'), {
          fullName: k.fullName.trim(),
          gender: k.gender,
          dateOfBirth: k.dateOfBirth,
          belt: k.belt,
          weight: k.weight === '' || k.weight == null ? null : Number(k.weight),
          dojoId: dojoRef.id,
          dojoName: dojoForm.name,
          eventType: k.eventType,
          proofOfAgeUrl: k.proofOfAgeUrl,
          proofOfAgeFileName: k.proofOfAgeFileName,
          photoUrl: k.photoUrl || '',
          status: 'approved', // Auto-approved because Dojo Admin created them
          ownerId: user.uid,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          emergencyContactEmail: k.emergencyContactEmail || '',
        });
      }

      // 3. Upgrade User Profile
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        role: 'dojo_admin',
        onboardedRoleSelection: 'sensei',
        updatedAt: serverTimestamp(),
      }, { merge: true });

      toast.success('Dojo created and athletes registered! Profile upgraded to Dojo Admin.');
      onComplete();
    } catch (err) {
      toast.error(`Setup failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  // Student Onboarding: Submit Athlete Registration (Pending Approval) + Notification
  const submitStudent = async (e) => {
    e.preventDefault();
    if (!studentForm.fullName.trim()) return toast.error('Full Name is required');
    if (!studentForm.gender) return toast.error('Gender is required');
    if (!studentForm.dateOfBirth) return toast.error('Date of Birth is required');
    if (!studentForm.dojoId) return toast.error('Affiliated Dojo selection is mandatory');
    if (!studentForm.proofOfAgeUrl) return toast.error('Proof of age document is required');

    setBusy(true);
    try {
      const selectedDojo = dojos.find((d) => d.id === studentForm.dojoId);
      if (!selectedDojo) throw new Error('Selected Dojo is invalid');

      // 1. Create Athlete Doc (status: pending_approval)
      const athleteRef = await addDoc(collection(db, 'athletes'), {
        fullName: studentForm.fullName.trim(),
        photoUrl: studentForm.photoUrl || '',
        gender: studentForm.gender,
        dateOfBirth: studentForm.dateOfBirth,
        belt: studentForm.belt,
        weight: studentForm.weight === '' || studentForm.weight == null ? null : Number(studentForm.weight),
        dojoId: selectedDojo.id,
        dojoName: selectedDojo.name,
        eventType: studentForm.eventType,
        proofOfAgeUrl: studentForm.proofOfAgeUrl,
        proofOfAgeFileName: studentForm.proofOfAgeFileName,
        status: 'pending_approval',
        ownerId: user.uid,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        emergencyContactEmail: studentForm.emergencyContactEmail || '',
      });

      // 2. Get Dojo Owner Email
      let recipientEmail = selectedDojo.email || '';
      if (selectedDojo.ownerId) {
        const ownerSnap = await getDoc(doc(db, 'users', selectedDojo.ownerId));
        if (ownerSnap.exists()) {
          recipientEmail = ownerSnap.data().email || recipientEmail;
        }
      }

      // 3. Create Notification Doc for Dojo Admin
      await addDoc(collection(db, 'notifications'), {
        type: 'registration_approval',
        channel: 'email',
        status: 'pending',
        recipientEmail,
        dojoId: selectedDojo.id,
        athleteId: athleteRef.id,
        subject: 'New Student Registration Awaiting Approval',
        body: `${studentForm.fullName} has registered as a student and is awaiting approval to join ${selectedDojo.name}.`,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });

      // 4. Update User Profile
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        onboardedRoleSelection: 'student',
        updatedAt: serverTimestamp(),
      }, { merge: true });

      setStep('student_submitted');
      toast.success('Registration submitted for Dojo Admin approval!');
    } catch (err) {
      toast.error(`Registration failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleSpectatorFormChange = (k, v) => setSpectatorForm((f) => ({ ...f, [k]: v }));

  // Spectator registration: full name, email, city, country
  const submitSpectatorRegistration = async (e) => {
    e?.preventDefault?.();
    if (!spectatorForm.fullName.trim()) return toast.error('Full name is required');
    if (!spectatorForm.email.trim()) return toast.error('Email is required');
    if (!spectatorForm.city.trim()) return toast.error('City is required');
    if (!spectatorForm.country.trim()) return toast.error('Country is required');

    setBusy(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(
        userRef,
        {
          role: 'spectator',
          displayName: spectatorForm.fullName.trim(),
          email: spectatorForm.email.trim().toLowerCase(),
          city: spectatorForm.city.trim(),
          country: spectatorForm.country.trim(),
          onboardedRoleSelection: 'spectator',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      toast.success('Spectator registration complete. Welcome to Tournament Hub!');
      onComplete();
    } catch (err) {
      toast.error(`Registration failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  if (step === 'selection') {
    return (
      <div className="max-w-4xl w-full mx-auto py-10 px-4">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-3" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
            Welcome to Tournament Hub
          </h1>
          <p className="text-zinc-400 max-w-lg mx-auto text-sm md:text-base">
            To get started, please tell us how you would like to participate in the competition platform.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Card 1: Sensei */}
          <Card 
            className="border-zinc-800 bg-zinc-950/80 hover:border-zinc-700 transition duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
            onClick={() => setStep('sensei_dojo')}
          >
            <CardContent className="p-6 text-center space-y-4">
              <div className="h-16 w-16 mx-auto rounded-xl bg-gold-primary/10 flex items-center justify-center border border-gold-primary/20">
                <Building2 className="h-8 w-8 text-gold-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">I am a Sensei</h3>
                <p className="text-xs text-zinc-400">Register your Dojo, manage athletes, and submit registrations for championships.</p>
              </div>
              <Button className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 mt-2 text-xs">
                Setup Dojo <ArrowRight className="h-3 w-3 ml-1.5" />
              </Button>
            </CardContent>
          </Card>

          {/* Card 2: Student */}
          <Card 
            className="border-zinc-800 bg-zinc-950/80 hover:border-zinc-700 transition duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
            onClick={() => setStep('student')}
          >
            <CardContent className="p-6 text-center space-y-4">
              <div className="h-16 w-16 mx-auto rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <Users className="h-8 w-8 text-blue-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">I am a Student</h3>
                <p className="text-xs text-zinc-400">Register as a competitor under an existing Dojo and join live matches.</p>
              </div>
              <Button className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 mt-2 text-xs">
                Register Profile <ArrowRight className="h-3 w-3 ml-1.5" />
              </Button>
            </CardContent>
          </Card>

          {/* Card 3: Spectator */}
          <Card
            className="border-zinc-800 bg-zinc-950/80 hover:border-zinc-700 transition duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
            onClick={() => setStep('spectator_register')}
          >
            <CardContent className="p-6 text-center space-y-4">
              <div className="h-16 w-16 mx-auto rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                <Eye className="h-8 w-8 text-purple-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">I am a Spectator</h3>
                <p className="text-xs text-zinc-400">View tournament overviews, brackets, and scoreboards. Register with your name, email, and location.</p>
              </div>
              <Button className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 mt-2 text-xs">
                Register <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ---------------- SPECTATOR REGISTRATION ----------------
  if (step === 'spectator_register') {
    return (
      <div className="max-w-lg w-full mx-auto bg-zinc-950/90 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl p-6 md:p-8">
        <div className="flex items-center gap-2 text-zinc-400 text-xs mb-4">
          <Button variant="ghost" size="sm" className="p-0 h-auto text-zinc-400 hover:text-white" onClick={() => setStep('selection')}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
          </Button>
          <span>· Spectator registration</span>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-black text-white">Spectator Registration</h2>
          <p className="text-xs text-zinc-400 mt-1">View-only access to tournaments, brackets, and live scoreboards.</p>
        </div>

        <form onSubmit={submitSpectatorRegistration} className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400">Full Name *</Label>
            <Input
              value={spectatorForm.fullName}
              onChange={(e) => handleSpectatorFormChange('fullName', e.target.value)}
              placeholder="Your full name"
              required
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400">Email ID *</Label>
            <Input
              type="email"
              value={spectatorForm.email}
              onChange={(e) => handleSpectatorFormChange('email', e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-zinc-400">City *</Label>
              <Input
                value={spectatorForm.city}
                onChange={(e) => handleSpectatorFormChange('city', e.target.value)}
                placeholder="Mumbai"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-zinc-400">Country *</Label>
              <Input
                value={spectatorForm.country}
                onChange={(e) => handleSpectatorFormChange('country', e.target.value)}
                placeholder="India"
                required
              />
            </div>
          </div>

          <Button type="submit" disabled={busy} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold mt-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            Complete Registration
          </Button>
        </form>
      </div>
    );
  }

  // ---------------- SENSEI FLOW: STEP 1 (DOJO FORM) ----------------
  if (step === 'sensei_dojo') {
    return (
      <div className="max-w-2xl w-full mx-auto bg-zinc-950/90 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl p-6 md:p-8">
        <div className="flex items-center gap-2 text-zinc-400 text-xs mb-4">
          <Button variant="ghost" size="sm" className="p-0 h-auto text-zinc-400 hover:text-white" onClick={() => setStep('selection')}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
          </Button>
          <span>· Step 1 of 2: Create Dojo</span>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-black text-white">Dojo Registration</h2>
          <p className="text-xs text-zinc-400 mt-1">Configure your martial arts academy. Phone, WhatsApp, Logo, and Address are mandatory.</p>
        </div>

        <div className="space-y-5">
          <div className="grid md:grid-cols-[130px_1fr] gap-4">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5 block">Dojo Logo *</Label>
              <div 
                onClick={() => logoInputRef.current?.click()} 
                className="aspect-square rounded-lg border border-dashed border-zinc-800 bg-zinc-900/60 overflow-hidden flex items-center justify-center hover:border-gold-primary/50 transition cursor-pointer relative"
              >
                {dojoForm.logoUrl ? (
                  <img src={dojoForm.logoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="text-zinc-500 flex flex-col items-center gap-1">
                    <ImageIcon className="h-5 w-5" />
                    <span className="text-[10px]">Upload</span>
                  </div>
                )}
                {dojoForm.logoUrl && (
                  <button 
                    type="button" 
                    onClick={(e) => { e.stopPropagation(); handleDojoFormChange('logoUrl', ''); }} 
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                )}
                {progress > 0 && <div className="absolute inset-x-2 bottom-2"><Progress value={progress} /></div>}
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={uploadDojoLogo} />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400">Dojo Name *</Label>
                <Input value={dojoForm.name} onChange={(e) => handleDojoFormChange('name', e.target.value)} placeholder="Tanaka Karate Dojo" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400">Lead Instructor (Sensei)</Label>
                <Input value={dojoForm.instructorName} disabled className="bg-zinc-900 border-zinc-800 text-zinc-500" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400">Email Address</Label>
                <Input value={dojoForm.email} disabled className="bg-zinc-900 border-zinc-800 text-zinc-500" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400">Phone Number *</Label>
                <Input value={dojoForm.phone} onChange={(e) => handleDojoFormChange('phone', e.target.value)} placeholder="+91 98765 00000" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400">WhatsApp *</Label>
                <Input value={dojoForm.whatsapp} onChange={(e) => handleDojoFormChange('whatsapp', e.target.value)} placeholder="+91 98765 00000" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400">City</Label>
                <Input value={dojoForm.city} onChange={(e) => handleDojoFormChange('city', e.target.value)} placeholder="Mumbai" />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-zinc-400">Dojo Address *</Label>
            <Input value={dojoForm.address} onChange={(e) => handleDojoFormChange('address', e.target.value)} placeholder="Dojo street name, landmark, address details..." />
          </div>

          <div className="flex gap-3 justify-end pt-3 border-t border-zinc-900">
            <Button variant="outline" className="border-zinc-850 hover:bg-zinc-900" onClick={() => setStep('selection')}>
              Cancel
            </Button>
            <Button 
              className="bg-gold-primary hover:bg-gold-primary/90 text-zinc-950 font-bold"
              onClick={() => {
                if (!dojoForm.name.trim() || !dojoForm.logoUrl || !dojoForm.phone.trim() || !dojoForm.whatsapp.trim() || !dojoForm.address.trim()) {
                  toast.error('Please complete all mandatory Dojo fields and upload a logo');
                  return;
                }
                setStep('sensei_kohai');
              }}
            >
              Next: Register Kohais <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- SENSEI FLOW: STEP 2 (REGISTER KOHAIS) ----------------
  if (step === 'sensei_kohai') {
    return (
      <div className="max-w-4xl w-full mx-auto grid md:grid-cols-2 gap-6 bg-zinc-950/90 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl p-6 md:p-8">
        
        {/* Left column: Add Kohai Form */}
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-2">
            <Button variant="ghost" size="sm" className="p-0 h-auto text-zinc-400 hover:text-white" onClick={() => setStep('sensei_dojo')}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
            </Button>
            <span>· Step 2 of 2: Register Kohais</span>
          </div>

          <div className="mb-4">
            <h2 className="text-xl font-black text-white">Add Athlete (Kohai)</h2>
            <p className="text-xs text-zinc-400 mt-1">Register athletes to your Dojo. Minimum 1 athlete is mandatory.</p>
          </div>

          <form onSubmit={addLocalKohai} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-xs text-zinc-400 font-semibold">Full Name *</Label>
                <Input value={kohaiForm.fullName} onChange={(e) => handleKohaiFormChange('fullName', e.target.value)} placeholder="Student's name" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400 font-semibold">Gender *</Label>
                <Select value={kohaiForm.gender} onValueChange={(v) => handleKohaiFormChange('gender', v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400 font-semibold">Date of Birth *</Label>
                <Input type="date" value={kohaiForm.dateOfBirth} onChange={(e) => handleKohaiFormChange('dateOfBirth', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400 font-semibold">Belt</Label>
                <Select value={kohaiForm.belt} onValueChange={(v) => handleKohaiFormChange('belt', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-56">{BELTS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400 font-semibold">Weight (kg)</Label>
                <Input type="number" step="0.1" value={kohaiForm.weight} onChange={(e) => handleKohaiFormChange('weight', e.target.value)} placeholder="65" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs text-zinc-400 font-semibold">Event Category</Label>
                <Select value={kohaiForm.eventType} onValueChange={(v) => handleKohaiFormChange('eventType', v)}>
                  <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                  <SelectContent>{EVENT_TYPES.map((et) => <SelectItem key={et} value={et}>{et}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs text-zinc-400 font-semibold">Emergency Contact Email (Parent/Guardian)</Label>
                <Input type="email" value={kohaiForm.emergencyContactEmail} onChange={(e) => handleKohaiFormChange('emergencyContactEmail', e.target.value)} placeholder="parent@example.com" className="bg-zinc-900 border-zinc-800 text-white" />
              </div>
            </div>

            {/* Proof of Age Document Upload */}
            <div className="space-y-1">
              <Label className="text-xs text-zinc-400 font-semibold">Proof of Age Document *</Label>
              <div 
                onClick={() => proofInputRef.current?.click()} 
                className="border border-dashed border-zinc-800 bg-zinc-900/60 rounded-lg p-3 hover:border-gold-primary/50 transition cursor-pointer text-center"
              >
                {kohaiForm.proofOfAgeUrl ? (
                  <div className="flex items-center gap-2 justify-center">
                    <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
                    <span className="text-xs text-emerald-300 truncate max-w-[200px]">{kohaiForm.proofOfAgeFileName}</span>
                    <button type="button" className="text-zinc-400 hover:text-white text-xs ml-2 underline" onClick={(e) => { e.stopPropagation(); handleKohaiFormChange('proofOfAgeUrl', ''); }}>Clear</button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-zinc-500 py-1">
                    <FileText className="h-5 w-5" />
                    <span className="text-xs">Upload (PDF, JPG or PNG)</span>
                  </div>
                )}
                {progress > 0 && <Progress value={progress} className="mt-2" />}
                <input ref={proofInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={uploadKohaiProof} />
              </div>
            </div>

            <Button type="submit" variant="outline" className="w-full border-zinc-850 hover:bg-zinc-900 mt-2 text-xs">
              + Add Student to List
            </Button>
          </form>
        </div>

        {/* Right column: Local Registered Competitors List */}
        <div className="flex flex-col justify-between border-t md:border-t-0 md:border-l border-zinc-850 pt-5 md:pt-0 md:pl-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-lg">Dojo Roster</h3>
              <Badge variant="outline" className="bg-zinc-900 text-zinc-300 border-zinc-800">
                {localKohais.length} added
              </Badge>
            </div>

            {localKohais.length === 0 ? (
              <div className="p-10 border border-dashed border-zinc-900 rounded-lg text-center text-zinc-500 text-xs">
                No students registered yet. Add at least 1 student on the left form to proceed.
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {localKohais.map((k, idx) => (
                  <div key={k.id} className="flex justify-between items-center bg-zinc-900/60 border border-zinc-900 rounded-lg p-3 hover:border-zinc-800 transition">
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-zinc-200 truncate">{k.fullName}</div>
                      <div className="text-[10px] text-zinc-400 flex gap-2 mt-0.5">
                        <span>{k.belt} Belt</span>
                        <span>·</span>
                        <span>{k.eventType}</span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeLocalKohai(idx)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-950/20 p-1.5 h-auto"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-5 border-t border-zinc-900 mt-6">
            <Button variant="outline" className="border-zinc-850 hover:bg-zinc-900" onClick={() => setStep('sensei_dojo')}>
              Back
            </Button>
            <Button 
              className="bg-gold-primary hover:bg-gold-primary/90 text-zinc-950 font-bold"
              disabled={busy || localKohais.length === 0}
              onClick={submitSensei}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Finalize & Create Dojo'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- STUDENT FLOW (ATHLETE FORM & MANDATORY DOJO DROPDOWN) ----------------
  if (step === 'student') {
    return (
      <div className="max-w-2xl w-full mx-auto bg-zinc-950/90 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl p-6 md:p-8">
        <div className="flex items-center gap-2 text-zinc-400 text-xs mb-4">
          <Button variant="ghost" size="sm" className="p-0 h-auto text-zinc-400 hover:text-white" onClick={() => setStep('selection')}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
          </Button>
          <span>· Athlete Self-Registration</span>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-black text-white">Competitor Profile Form</h2>
          <p className="text-xs text-zinc-400 mt-1">Register yourself as an athlete. Selecting your registered Dojo is mandatory.</p>
        </div>

        <form onSubmit={submitStudent} className="space-y-5">
          <div className="grid md:grid-cols-[130px_1fr] gap-4">
            {/* Athlete profile photo */}
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5 block">Profile Photo</Label>
              <div 
                onClick={() => studentPhotoInputRef.current?.click()} 
                className="aspect-square rounded-lg border border-dashed border-zinc-800 bg-zinc-900/60 overflow-hidden flex items-center justify-center hover:border-gold-primary/50 transition cursor-pointer relative"
              >
                {studentForm.photoUrl ? (
                  <img src={studentForm.photoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="text-zinc-500 flex flex-col items-center gap-1">
                    <User className="h-5 w-5" />
                    <span className="text-[10px]">Upload</span>
                  </div>
                )}
                {studentForm.photoUrl && (
                  <button 
                    type="button" 
                    onClick={(e) => { e.stopPropagation(); handleStudentFormChange('photoUrl', ''); }} 
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                )}
                {progress > 0 && <div className="absolute inset-x-2 bottom-2"><Progress value={progress} /></div>}
                <input ref={studentPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={uploadStudentPhoto} />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400">Full Name *</Label>
                <Input value={studentForm.fullName} onChange={(e) => handleStudentFormChange('fullName', e.target.value)} required placeholder="Your full name" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400 font-semibold">Gender *</Label>
                <Select value={studentForm.gender} onValueChange={(v) => handleStudentFormChange('gender', v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400">Date of Birth *</Label>
                <Input type="date" value={studentForm.dateOfBirth} onChange={(e) => handleStudentFormChange('dateOfBirth', e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400 font-semibold">Belt</Label>
                <Select value={studentForm.belt} onValueChange={(v) => handleStudentFormChange('belt', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-56">{BELTS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400">Weight (kg)</Label>
                <Input type="number" step="0.1" value={studentForm.weight} onChange={(e) => handleStudentFormChange('weight', e.target.value)} placeholder="65" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400 font-semibold">Event Category</Label>
                <Select value={studentForm.eventType} onValueChange={(v) => handleStudentFormChange('eventType', v)}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{EVENT_TYPES.map((et) => <SelectItem key={et} value={et}>{et}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Dojo Selector */}
            <div className="space-y-1">
              <Label className="text-xs text-zinc-400 font-semibold">Affiliated Dojo *</Label>
              <Select value={studentForm.dojoId} onValueChange={(v) => handleStudentFormChange('dojoId', v)}>
                <SelectTrigger><SelectValue placeholder="Select Dojo" /></SelectTrigger>
                <SelectContent>
                  {!dojosLoaded ? <SelectItem disabled value="loading">Loading dojos...</SelectItem> :
                    dojos.length === 0 ? <SelectItem disabled value="empty">No registered dojos found</SelectItem> :
                    dojos.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Emergency Contact Email */}
            <div className="space-y-1">
              <Label className="text-xs text-zinc-400 font-semibold">Emergency Contact Email (Parent/Guardian)</Label>
              <Input type="email" value={studentForm.emergencyContactEmail || ''} onChange={(e) => handleStudentFormChange('emergencyContactEmail', e.target.value)} placeholder="parent@example.com" className="bg-zinc-900 border-zinc-800 text-white" />
            </div>

            {/* Proof of Age */}
            <div className="space-y-1 col-span-2">
              <Label className="text-xs text-zinc-400 font-semibold">Proof of Age Document *</Label>
              <div 
                onClick={() => studentProofInputRef.current?.click()} 
                className="border border-dashed border-zinc-800 bg-zinc-900/60 rounded-lg p-3 hover:border-gold-primary/50 transition cursor-pointer text-center"
              >
                {studentForm.proofOfAgeUrl ? (
                  <div className="flex items-center gap-2 justify-center">
                    <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
                    <span className="text-xs text-emerald-300 truncate max-w-[180px]">{studentForm.proofOfAgeFileName}</span>
                    <button type="button" className="text-zinc-400 hover:text-white text-xs ml-2 underline" onClick={(e) => { e.stopPropagation(); handleStudentFormChange('proofOfAgeUrl', ''); }}>Clear</button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-zinc-500 py-1">
                    <FileText className="h-5 w-5" />
                    <span className="text-xs">Upload (PDF, JPG or PNG)</span>
                  </div>
                )}
                {progress > 0 && <Progress value={progress} className="mt-2" />}
                <input ref={studentProofInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={uploadStudentProof} />
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-3 border-t border-zinc-900">
            <Button type="button" variant="outline" className="border-zinc-850 hover:bg-zinc-900" onClick={() => setStep('selection')}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-gold-primary hover:bg-gold-primary/90 text-zinc-950 font-bold"
              disabled={busy}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Registration'}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // ---------------- STUDENT SUBMITTED CONGRATS SCREEN ----------------
  if (step === 'student_submitted') {
    return (
      <div className="max-w-md w-full mx-auto bg-zinc-950/90 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl p-8 text-center">
        <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 mb-5">
          <CheckCircle className="h-8 w-8 text-emerald-400" />
        </div>
        
        <h2 className="text-2xl font-black text-white mb-2">Registration Submitted!</h2>
        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
          Your athlete registration has been successfully submitted. It is currently **pending approval** from the Dojo Admin. You will receive access once they review your application.
        </p>

        <Button 
          className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          onClick={onComplete}
        >
          Enter Dashboard (Visitor Mode)
        </Button>
      </div>
    );
  }

  return null;
}
