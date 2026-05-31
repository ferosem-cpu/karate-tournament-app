'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { collection, doc, onSnapshot, query, where, updateDoc, deleteDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import PageHeader from '@/components/page-header';
import { CERT_TYPES } from '@/lib/constants';
import { getCategoryPlacements } from '@/lib/match-engine';
import { Download, FileDown, Award, Loader2, Pencil, Trash2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';

export default function CertificatesPage() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [categories, setCategories] = useState([]);
  const [dbCerts, setDbCerts] = useState([]);
  const [signatory1, setSignatory1] = useState('Chief Organizer');
  const [signatory2, setSignatory2] = useState('Chief Referee');
  const [myDojoId, setMyDojoId] = useState(null);
  const [myKohais, setMyKohais] = useState([]);
  
  const [busy, setBusy] = useState(false);
  const [previewCert, setPreviewCert] = useState(null);
  const certRef = useRef();

  // Signature states & refs
  const [sig1Url, setSig1Url] = useState('');
  const [sig2Url, setSig2Url] = useState('');
  const [busy1, setBusy1] = useState(false);
  const [busy2, setBusy2] = useState(false);
  const sig1InputRef = useRef();
  const sig2InputRef = useRef();

  // Registration & Dropdown selection states
  const [registrations, setRegistrations] = useState([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editingCert, setEditingCert] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', dojoName: '', categoryName: '', type: '', eventType: '' });

  // Manual form state
  const [manualForm, setManualForm] = useState({ name: '', dojoName: '', categoryName: '', type: 'participation', eventType: 'Kumite' });

  const isOrganizer = profile?.role === 'super_admin' || (profile?.role === 'tournament_organizer' && tournament?.ownerId === user?.uid);

  // Load spectator's linked children
  useEffect(() => {
    if (profile?.role === 'spectator' && user?.email) {
      const q = query(
        collection(db, 'athletes'),
        where('emergencyContactEmail', '==', user.email)
      );
      const unsub = onSnapshot(q, (s) => {
        setMyKohais(s.docs.map((d) => ({ id: d.id, ...d.data() })));
      });
      return () => unsub();
    }
  }, [profile, user]);

  const myKohaiIds = new Set(myKohais.map(k => k.id));
  const visibleCerts = dbCerts.filter((cert) => {
    if (profile?.role === 'spectator') {
      const hasEmailMatch = cert.emergencyContactEmail?.toLowerCase() === user?.email?.toLowerCase();
      const hasIdMatch = cert.athleteId && myKohaiIds.has(cert.athleteId);
      return hasEmailMatch || hasIdMatch;
    }
    return true;
  });

  useEffect(() => {
    if (!id) return;
    
    const u1 = onSnapshot(doc(db, 'tournaments', id), (s) => {
      if (s.exists()) {
        const data = s.data();
        setTournament({ id: s.id, ...data });
        if (data.signatory1) setSignatory1(data.signatory1);
        if (data.signatory2) setSignatory2(data.signatory2);
        setSig1Url(data.signatory1Img || '');
        setSig2Url(data.signatory2Img || '');
      }
    });

    const u2 = onSnapshot(query(collection(db, 'categories'), where('tournamentId', '==', id)), (s) => {
      setCategories(s.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const u3 = onSnapshot(query(collection(db, 'certificates'), where('tournamentId', '==', id)), (s) => {
      setDbCerts(s.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const u4 = onSnapshot(query(collection(db, 'tournament_registrations'), where('tournamentId', '==', id)), (s) => {
      setRegistrations(s.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => { u1(); u2(); u3(); u4(); };
  }, [id]);

  // Load owned Dojo ID for Dojo Admin
  useEffect(() => {
    if (profile?.role === 'dojo_admin' && user?.uid) {
      const q = query(collection(db, 'dojos'), where('ownerId', '==', user.uid));
      const unsub = onSnapshot(q, (s) => {
        if (s.docs.length > 0) {
          setMyDojoId(s.docs[0].id);
        }
      });
      return () => unsub();
    }
  }, [profile, user]);

  // Run auto-create for all categories on load
  useEffect(() => {
    if (!tournament || categories.length === 0) return;
    const runAutoCreate = async () => {
      const { autoCreateCertificates } = await import('@/lib/match-engine');
      for (const cat of categories) {
        try {
          await autoCreateCertificates(id, cat.id);
        } catch (err) {
          console.error('Auto create error:', err);
        }
      }
    };
    runAutoCreate();
  }, [tournament, categories, id]);

  const handleSignatureUpload = async (e, num) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'image/jpeg' && file.type !== 'image/jpg' && !file.name.toLowerCase().endsWith('.jpg') && !file.name.toLowerCase().endsWith('.jpeg')) {
      return toast.error('Only JPG format signatures are allowed');
    }
    const setBusySig = num === 1 ? setBusy1 : setBusy2;
    const setSigUrl = num === 1 ? setSig1Url : setSig2Url;
    setBusySig(true);
    try {
      const { uploadFileWithTracking } = await import('@/lib/media');
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `tournaments/${id}/signatures/${num}_${Date.now()}_${safe}`;
      const { url } = await uploadFileWithTracking({
        file, path, user, mediaType: 'certificate_export',
        retentionPeriod: 'permanent', tournamentId: id, entityType: 'tournament', entityId: id
      });
      setSigUrl(url);
      toast.success(`Signature ${num} uploaded. Remember to click 'Save Signatories' to finalize.`);
    } catch (err) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setBusySig(false);
    }
  };

  const removeSignature = (num) => {
    const setSigUrl = num === 1 ? setSig1Url : setSig2Url;
    setSigUrl('');
    toast.success(`Signature ${num} cleared. Click 'Save Signatories' to save.`);
  };

  const saveSignatories = async () => {
    if (!isOrganizer) return toast.error('Only the tournament organizer can modify signatories');
    setBusy(true);
    try {
      await updateDoc(doc(db, 'tournaments', id), {
        signatory1,
        signatory2,
        signatory1Img: sig1Url,
        signatory2Img: sig2Url,
        updatedAt: serverTimestamp(),
      });
      toast.success('Signatories and signatures updated successfully');
    } catch (e) {
      toast.error(`Update failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  // Derive selectable registrations based on role and linked children
  const selectableRegistrations = registrations.filter((reg) => {
    if (profile?.role === 'spectator') {
      const isMyKohai = myKohais.some(k => k.id === reg.athleteId);
      return isMyKohai;
    }
    if (profile?.role === 'dojo_admin') {
      if (myDojoId) {
        return reg.dojoId === myDojoId;
      }
    }
    return true;
  });

  // Extract unique athletes from selectable registrations
  const uniqueAthletes = [];
  const seenAthletes = new Set();
  selectableRegistrations.forEach((reg) => {
    if (reg.athleteId && !seenAthletes.has(reg.athleteId)) {
      seenAthletes.add(reg.athleteId);
      uniqueAthletes.push({
        id: reg.athleteId,
        name: reg.athleteName,
        dojoId: reg.dojoId,
        dojoName: reg.dojoName
      });
    }
  });

  // Reactive state synchronization for the custom certificate form
  useEffect(() => {
    if (!selectedAthleteId) {
      setManualForm({ name: '', dojoName: '', categoryName: '', type: 'participation', eventType: 'Kumite' });
      setSelectedCategoryId('');
      return;
    }
    const athleteRegs = registrations.filter((r) => r.athleteId === selectedAthleteId);
    
    if (athleteRegs.length > 0) {
      const firstReg = athleteRegs[0];
      const dojoVal = firstReg.dojoName || '';
      
      let catId = selectedCategoryId;
      if (!catId || !athleteRegs.some(r => r.categoryId === catId)) {
        catId = firstReg.categoryId || '';
      }
      
      const matchedReg = athleteRegs.find(r => r.categoryId === catId) || firstReg;
      const catObj = categories.find(c => c.id === catId);
      const eventType = catObj?.eventType || matchedReg.athleteEventType || 'Kumite';
      
      const matchedCert = dbCerts.find(c => c.athleteId === selectedAthleteId && c.categoryId === catId);
      const certType = matchedCert?.type || 'participation';
      
      setManualForm({
        name: matchedReg.athleteName || '',
        dojoName: dojoVal,
        categoryName: matchedReg.categoryName || '',
        eventType,
        type: certType
      });
      
      if (catId !== selectedCategoryId) {
        setSelectedCategoryId(catId);
      }
    }
  }, [selectedAthleteId, selectedCategoryId, registrations, dbCerts, categories]);

  const exportPdf = async (cert) => {
    setPreviewCert(cert);
    setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 400));
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const canvas = await html2canvas(certRef.current, { scale: 2, backgroundColor: '#0a0a0a', useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
      const safe = `${cert.name}_${cert.type}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');
      pdf.save(safe);
      toast.success('Certificate downloaded');
    } catch (e) { 
      toast.error(e.message); 
    } finally { 
      setBusy(false); 
      setPreviewCert(null); 
    }
  };

  const deleteCert = async (certId, athleteName) => {
    if (!isOrganizer) return toast.error('Only organizers can delete certificates');
    if (!confirm(`Delete certificate for ${athleteName}?`)) return;
    try {
      await deleteDoc(doc(db, 'certificates', certId));
      toast.success('Certificate deleted');
    } catch (e) {
      toast.error(e.message);
    }
  };

  const openEdit = (cert) => {
    setEditingCert(cert);
    setEditForm({
      name: cert.athleteName || '',
      dojoName: cert.dojoName || '',
      categoryName: cert.categoryName || '',
      eventType: cert.eventType || '',
      type: cert.type || '',
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!isOrganizer) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, 'certificates', editingCert.id), {
        athleteName: editForm.name,
        dojoName: editForm.dojoName,
        categoryName: editForm.categoryName,
        eventType: editForm.eventType,
        type: editForm.type,
        updatedAt: serverTimestamp(),
      });
      toast.success('Certificate updated');
      setEditOpen(false);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleManualDownload = async () => {
    if (!manualForm.name) return toast.error('Athlete name is required');
    await exportPdf({
      name: manualForm.name,
      dojoName: manualForm.dojoName,
      categoryName: manualForm.categoryName,
      type: manualForm.type,
      eventType: manualForm.eventType,
      tournamentName: tournament?.name,
      logoUrl: tournament?.logoUrl,
    });
  };

  if (!tournament) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-zinc-400 gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        <span>Loading tournament certificates...</span>
      </div>
    );
  }

  if (profile?.role === 'tournament_organizer' && tournament.ownerId !== user?.uid) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center p-8">
        <ShieldAlert className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-zinc-100">Access Denied</h2>
        <p className="text-sm text-zinc-400 mt-2 max-w-md">
          You do not have permission to view or manage certificates for this tournament. You may only manage certificates for tournaments you organize.
        </p>
        <Button asChild className="mt-6 bg-zinc-800 hover:bg-zinc-700 text-white">
          <Link href="/dashboard/tournaments">Back to Tournaments</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Certificate Management"
        description="Auto-generate, review, and download tournament certificates."
        breadcrumb={[{ label: 'Tournaments', href: '/dashboard/tournaments' }, { label: tournament?.name || '…', href: `/dashboard/tournaments/${id}` }, { label: 'Certificates' }]}
      />

      <div className="grid md:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          {/* Signatories (Organizer Only editing) */}
          <Card className="border-border/60">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-zinc-100">Official Signatories</h3>
                {!isOrganizer && (
                  <Badge variant="outline" className="bg-zinc-900 text-zinc-400 border-zinc-800 text-[10px]">
                    View Only
                  </Badge>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2 border border-zinc-900 bg-zinc-950/20 p-3.5 rounded-lg">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Signatory 1 (Left)</Label>
                  <Input 
                    value={signatory1} 
                    onChange={(e) => setSignatory1(e.target.value)} 
                    disabled={!isOrganizer}
                    className="bg-zinc-900/60 border-zinc-800 disabled:opacity-70 disabled:text-zinc-450 text-sm"
                    placeholder="Signatory Name (e.g. Chief Organizer)"
                  />
                  <div className="space-y-1 mt-2">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Signature Image (JPG only)</Label>
                    <div className="flex items-center gap-3">
                      {sig1Url ? (
                        <div className="relative h-12 w-28 border border-zinc-850 rounded bg-black/60 overflow-hidden flex items-center justify-center">
                          <img src={sig1Url} alt="Sig 1" className="h-full w-full object-contain" />
                          {isOrganizer && (
                            <button 
                              type="button"
                              onClick={() => removeSignature(1)}
                              className="absolute top-0 right-0 p-0.5 bg-black/80 hover:bg-black text-red-400 rounded-bl transition"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="text-[10px] text-zinc-650 border border-dashed border-zinc-850 rounded h-12 w-28 flex items-center justify-center bg-zinc-900/10">
                          No signature image
                        </div>
                      )}
                      {isOrganizer && (
                        <div>
                          <Button 
                            type="button"
                            size="sm" 
                            variant="outline" 
                            className="text-xs border-zinc-800 hover:bg-zinc-900"
                            onClick={() => sig1InputRef.current?.click()}
                            disabled={busy1}
                          >
                            {busy1 ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : 'Upload JPG'}
                          </Button>
                          <input 
                            type="file" 
                            ref={sig1InputRef} 
                            accept="image/jpeg,image/jpg" 
                            className="hidden" 
                            onChange={(e) => handleSignatureUpload(e, 1)} 
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 border border-zinc-900 bg-zinc-950/20 p-3.5 rounded-lg">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Signatory 2 (Right)</Label>
                  <Input 
                    value={signatory2} 
                    onChange={(e) => setSignatory2(e.target.value)} 
                    disabled={!isOrganizer}
                    className="bg-zinc-900/60 border-zinc-800 disabled:opacity-70 disabled:text-zinc-450 text-sm"
                    placeholder="Signatory Name (e.g. Chief Referee)"
                  />
                  <div className="space-y-1 mt-2">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Signature Image (JPG only)</Label>
                    <div className="flex items-center gap-3">
                      {sig2Url ? (
                        <div className="relative h-12 w-28 border border-zinc-850 rounded bg-black/60 overflow-hidden flex items-center justify-center">
                          <img src={sig2Url} alt="Sig 2" className="h-full w-full object-contain" />
                          {isOrganizer && (
                            <button 
                              type="button"
                              onClick={() => removeSignature(2)}
                              className="absolute top-0 right-0 p-0.5 bg-black/80 hover:bg-black text-red-400 rounded-bl transition"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="text-[10px] text-zinc-650 border border-dashed border-zinc-850 rounded h-12 w-28 flex items-center justify-center bg-zinc-900/10">
                          No signature image
                        </div>
                      )}
                      {isOrganizer && (
                        <div>
                          <Button 
                            type="button"
                            size="sm" 
                            variant="outline" 
                            className="text-xs border-zinc-800 hover:bg-zinc-900"
                            onClick={() => sig2InputRef.current?.click()}
                            disabled={busy2}
                          >
                            {busy2 ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : 'Upload JPG'}
                          </Button>
                          <input 
                            type="file" 
                            ref={sig2InputRef} 
                            accept="image/jpeg,image/jpg" 
                            className="hidden" 
                            onChange={(e) => handleSignatureUpload(e, 2)} 
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {isOrganizer && (
                <Button onClick={saveSignatories} disabled={busy || busy1 || busy2} className="bg-primary hover:bg-primary/90 mt-2 text-xs font-bold">
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                  Save Signatories & Signatures
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Auto-created Certificates list */}
          <Card className="border-border/60">
            <CardContent className="p-5 space-y-4">
              <h3 className="font-bold text-lg text-zinc-100">Auto-Created Certificates</h3>
              <p className="text-xs text-muted-foreground">
                These certificates were generated automatically based on finalized match brackets.
              </p>

              {visibleCerts.length === 0 ? (
                <div className="p-12 text-center text-sm text-muted-foreground border border-dashed border-zinc-850 rounded-lg">
                  No certificates generated yet. Placements will auto-create records upon bracket completions.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {visibleCerts.map((cert) => {
                    const isDojoAdmin = profile?.role === 'dojo_admin';
                    const hasDojoMatch = myDojoId && cert.dojoId === myDojoId;
                    const canDownload = !isDojoAdmin || hasDojoMatch;
                    const certMeta = CERT_TYPES.find((ct) => ct.value === cert.type) || { label: cert.type };

                    return (
                      <div key={cert.id} className="p-4 rounded-lg border border-zinc-850 bg-zinc-900/30 hover:border-zinc-800 transition flex items-center justify-between">
                        <div className="min-w-0 flex-1 pr-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-zinc-100 truncate">{cert.athleteName}</span>
                            <Badge variant="outline" className="capitalize text-[10px] bg-primary/5 text-primary border-primary/20">
                              {certMeta.label.split(' (')[0]}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1.5 flex-wrap">
                            <span>Dojo: <strong className="text-zinc-200">{cert.dojoName || '—'}</strong></span>
                            <span>•</span>
                            <span>Category: <strong className="text-zinc-200">{cert.categoryName || '—'}</strong></span>
                          </div>
                        </div>

                        <div className="flex gap-2 shrink-0">
                          {isOrganizer && (
                            <>
                              <Button size="sm" variant="outline" className="border-zinc-800 hover:bg-zinc-800" onClick={() => openEdit(cert)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-950/20" onClick={() => deleteCert(cert.id, cert.athleteName)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          <Button 
                            size="sm" 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                            onClick={() => exportPdf({
                              name: cert.athleteName,
                              dojoName: cert.dojoName,
                              categoryName: cert.categoryName,
                              type: cert.type,
                              eventType: cert.eventType,
                              tournamentName: cert.tournamentName,
                              logoUrl: cert.logoUrl,
                            })}
                            disabled={busy || !canDownload}
                            title={!canDownload ? 'You can only download certificates for your Dojo' : 'Download PDF'}
                          >
                            <Download className="h-3.5 w-3.5 mr-1" />
                            {!canDownload ? 'Locked' : 'Download'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Manual Certificate Form (Spectator & others fill) */}
        <div className="space-y-6">
          <Card className="border-border/60 bg-zinc-950/50">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Award className="h-4.5 w-4.5 text-primary" />
                Single Certificate Form
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Spectators and guests can fill this form to generate and export a custom participation certificate.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400">Kohai Name *</Label>
                <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white">
                    <SelectValue placeholder="Select Kohai..." />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueAthletes.length === 0 ? (
                      <SelectItem disabled value="none">No registered competitors found</SelectItem>
                    ) : (
                      uniqueAthletes.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-zinc-400">Dojo Name (Auto-populated)</Label>
                <Input 
                  value={manualForm.dojoName} 
                  readOnly
                  disabled
                  className="bg-zinc-900 border-zinc-850 text-zinc-300 disabled:opacity-75 disabled:cursor-not-allowed text-xs"
                  placeholder="Dojo name will auto-populate"
                />
              </div>

              {selectedAthleteId && registrations.filter(r => r.athleteId === selectedAthleteId).length > 1 ? (
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-400 flex items-center justify-between">
                    <span>Category / Division *</span>
                    <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-300 border-amber-500/20 px-1 py-0 h-4">
                      Multiple Events
                    </Badge>
                  </Label>
                  <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white">
                      <SelectValue placeholder="Select Category/Event..." />
                    </SelectTrigger>
                    <SelectContent>
                      {registrations
                        .filter(r => r.athleteId === selectedAthleteId)
                        .map((reg) => (
                          <SelectItem key={reg.categoryId} value={reg.categoryId}>
                            {reg.categoryName}
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-400">Category / Division (Auto-populated)</Label>
                  <Input 
                    value={manualForm.categoryName} 
                    readOnly
                    disabled
                    className="bg-zinc-900 border-zinc-850 text-zinc-300 disabled:opacity-75 disabled:cursor-not-allowed text-xs"
                    placeholder="Category will auto-populate"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-400">Event Type (Auto)</Label>
                  <Input 
                    value={manualForm.eventType} 
                    readOnly
                    disabled
                    className="bg-zinc-900 border-zinc-850 text-zinc-300 disabled:opacity-75 disabled:cursor-not-allowed text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-400">Certificate Type (Auto)</Label>
                  <Input 
                    value={
                      CERT_TYPES.find((c) => c.value === manualForm.type)?.label.split(' (')[0] || 
                      manualForm.type || 
                      'Participation'
                    } 
                    readOnly
                    disabled
                    className="bg-zinc-900 border-zinc-850 text-zinc-300 disabled:opacity-75 disabled:cursor-not-allowed text-xs capitalize"
                  />
                </div>
              </div>

              {uniqueAthletes.length === 0 && (
                <div className="p-3 rounded-lg border border-red-500/30 bg-red-950/20 text-[11px] text-red-300 flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                  <span>
                    {profile?.role === 'spectator' 
                      ? `No registered competitors found linked to your email (${user?.email}). Please ask your Dojo Admin to add your email to your child's emergency contact details.`
                      : 'No registered competitors found for this tournament.'
                    }
                  </span>
                </div>
              )}

              <Button 
                onClick={handleManualDownload} 
                disabled={busy || !selectedAthleteId || uniqueAthletes.length === 0} 
                className="w-full bg-primary hover:bg-primary/90 mt-2 font-bold text-xs"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
                Generate & Download PDF
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Organizer Editing Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">Edit Certificate Details</DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Only tournament organizers can modify auto-created certificate records.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs text-zinc-400">Athlete Name</Label>
              <Input 
                value={editForm.name} 
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                className="bg-zinc-900 border-zinc-800 text-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-zinc-400">Dojo Name</Label>
              <Input 
                value={editForm.dojoName} 
                onChange={(e) => setEditForm((f) => ({ ...f, dojoName: e.target.value }))}
                className="bg-zinc-900 border-zinc-800 text-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-zinc-400">Category Name</Label>
              <Input 
                value={editForm.categoryName} 
                onChange={(e) => setEditForm((f) => ({ ...f, categoryName: e.target.value }))}
                className="bg-zinc-900 border-zinc-800 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400">Event Type</Label>
                <Input 
                  value={editForm.eventType} 
                  onChange={(e) => setEditForm((f) => ({ ...f, eventType: e.target.value }))}
                  className="bg-zinc-900 border-zinc-800 text-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400">Placement Type</Label>
                <Select 
                  value={editForm.type} 
                  onValueChange={(v) => setEditForm((f) => ({ ...f, type: v }))}
                >
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CERT_TYPES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label.split(' (')[0]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="pt-4 border-t border-zinc-900">
            <Button variant="outline" className="border-zinc-800 hover:bg-zinc-900" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={busy} className="bg-primary hover:bg-primary/90 min-w-[100px]">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden certificate render canvas */}
      <div style={{ position: 'fixed', left: '-10000px', top: 0, width: '1240px', height: '877px' }}>
        {previewCert && (
          <CertificateTemplate 
            cert={previewCert} 
            signatory1={signatory1} 
            signatory2={signatory2} 
            signatory1Img={tournament?.signatory1Img}
            signatory2Img={tournament?.signatory2Img}
            containerRef={certRef} 
          />
        )}
      </div>
    </>
  );
}

function CertificateTemplate({ cert, signatory1, signatory2, signatory1Img, signatory2Img, containerRef }) {
  const meta = CERT_TYPES.find((c) => c.value === cert.type) || CERT_TYPES[3];
  const accentColor = meta.accent === 'gold' ? '#d4a017' : meta.accent === 'silver' ? '#c0c0c0' : meta.accent === 'bronze' ? '#cd7f32' : '#1e3a8a';
  return (
    <div ref={containerRef} style={{ width: '1240px', height: '877px', background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a0a 50%, #0a0a0a 100%)', color: '#fff', fontFamily: 'Inter, sans-serif', position: 'relative', padding: '60px', boxSizing: 'border-box', overflow: 'hidden' }}>
      {/* Decorative borders */}
      <div style={{ position: 'absolute', inset: '30px', border: `3px solid ${accentColor}`, borderRadius: '8px' }} />
      <div style={{ position: 'absolute', inset: '40px', border: `1px solid ${accentColor}66`, borderRadius: '4px' }} />
      {/* Corner ornaments */}
      {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => {
        const styles = { position: 'absolute', width: '40px', height: '40px', border: `3px solid ${accentColor}` };
        if (corner.includes('top')) styles.top = '50px'; else styles.bottom = '50px';
        if (corner.includes('left')) styles.left = '50px'; else styles.right = '50px';
        return <div key={corner} style={{ ...styles, borderRadius: '4px', background: `${accentColor}22` }} />;
      })}
      <div style={{ position: 'relative', textAlign: 'center', paddingTop: '40px' }}>
        {/* Logo */}
        {cert.logoUrl && <img src={cert.logoUrl} crossOrigin="anonymous" style={{ height: '80px', objectFit: 'contain', margin: '0 auto 16px' }} alt="" />}
        <div style={{ fontSize: '14px', letterSpacing: '8px', color: accentColor, textTransform: 'uppercase', fontWeight: 700, marginBottom: '8px' }}>{cert.tournamentName || 'TOURNAMENT'}</div>
        <div style={{ fontSize: '64px', fontWeight: 900, letterSpacing: '4px', color: '#fff', marginBottom: '8px', textTransform: 'uppercase' }}>Certificate</div>
        <div style={{ fontSize: '20px', color: accentColor, letterSpacing: '10px', textTransform: 'uppercase', marginBottom: '40px' }}>of {meta.label.split(' (')[0]}</div>
        <div style={{ fontSize: '18px', color: '#aaa', marginBottom: '12px' }}>This is to certify that</div>
        <div style={{ fontSize: '56px', fontWeight: 700, color: '#fff', borderBottom: `2px solid ${accentColor}`, paddingBottom: '12px', marginBottom: '20px', display: 'inline-block', padding: '0 40px 12px' }}>{cert.name}</div>
        <div style={{ fontSize: '16px', color: '#bbb', marginBottom: '24px' }}>{cert.dojoName ? `representing ${cert.dojoName}` : ''}</div>
        <div style={{ fontSize: '18px', color: '#ddd', maxWidth: '780px', margin: '0 auto 40px', lineHeight: 1.6 }}>
          has been awarded this certificate{cert.categoryName ? ` for participation in ` : ''}{cert.categoryName && <strong style={{ color: '#fff' }}>{cert.categoryName}</strong>} {cert.eventType ? `(${cert.eventType})` : ''}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '900px', margin: '30px auto 0', alignItems: 'flex-end' }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
              {signatory1Img ? (
                <img src={signatory1Img} crossOrigin="anonymous" style={{ maxHeight: '60px', maxWidth: '200px', objectFit: 'contain' }} alt="" />
              ) : (
                <div style={{ height: '60px' }} />
              )}
            </div>
            <div style={{ borderTop: `1px solid ${accentColor}88`, paddingTop: '8px', maxWidth: '240px', margin: '0 auto' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{signatory1}</div>
              <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>Signature</div>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: `3px solid ${accentColor}`, background: `${accentColor}33`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: accentColor, letterSpacing: '2px', marginBottom: '15px' }}>SEAL</div>
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
              {signatory2Img ? (
                <img src={signatory2Img} crossOrigin="anonymous" style={{ maxHeight: '60px', maxWidth: '200px', objectFit: 'contain' }} alt="" />
              ) : (
                <div style={{ height: '60px' }} />
              )}
            </div>
            <div style={{ borderTop: `1px solid ${accentColor}88`, paddingTop: '8px', maxWidth: '240px', margin: '0 auto' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{signatory2}</div>
              <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>Signature</div>
            </div>
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: '30px', left: 0, right: 0, fontSize: '10px', color: '#666', letterSpacing: '3px', textTransform: 'uppercase' }}>Tournament Hub · Global Competition Platform</div>
      </div>
    </div>
  );
}
