'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PageHeader from '@/components/page-header';
import { CERT_TYPES } from '@/lib/constants';
import { getCategoryPlacements } from '@/lib/match-engine';
import { Download, FileDown, Award, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CertificatesPage() {
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [categories, setCategories] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [signatory1, setSignatory1] = useState('Chief Organizer');
  const [signatory2, setSignatory2] = useState('Chief Referee');
  const [busy, setBusy] = useState(false);
  const [previewCert, setPreviewCert] = useState(null);
  const certRef = useRef();

  useEffect(() => {
    const u1 = onSnapshot(doc(db, 'tournaments', id), (s) => setTournament(s.exists() ? { id: s.id, ...s.data() } : null));
    const u2 = onSnapshot(query(collection(db, 'categories'), where('tournamentId', '==', id)), (s) => setCategories(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const u3 = onSnapshot(query(collection(db, 'tournament_registrations'), where('tournamentId', '==', id)), (s) => setRegistrations(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); u3(); };
  }, [id]);

  const exportPdf = async (cert) => {
    setPreviewCert(cert);
    setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 300));
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const canvas = await html2canvas(certRef.current, { scale: 2, backgroundColor: '#0a0a0a', useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
      const safe = `${cert.name}_${cert.type}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');
      pdf.save(safe);
      toast.success('Certificate downloaded');
    } catch (e) { toast.error(e.message); } finally { setBusy(false); setPreviewCert(null); }
  };

  const generateBatch = async (categoryId, certType) => {
    setBusy(true);
    try {
      const cat = categories.find((c) => c.id === categoryId);
      if (!cat) return;
      const placements = await getCategoryPlacements(id, categoryId);
      let kohaiList = [];
      if (certType === 'winner' && placements.winner) kohaiList = [placements.winner];
      else if (certType === 'runner_up' && placements.runnerUp) kohaiList = [placements.runnerUp];
      else if (certType === 'second_runner_up') kohaiList = placements.secondRunnersUp;
      else if (certType === 'participation') kohaiList = placements.participants;
      if (kohaiList.length === 0) { toast.error('No eligible kohai for this certificate type'); return; }
      for (const k of kohaiList) {
        await exportPdf({
          name: k.name, dojoName: k.dojoName, categoryName: cat.name, type: certType,
          tournamentName: tournament?.name, logoUrl: tournament?.logoUrl,
          eventType: placements.eventType,
        });
      }
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  const generateSingleManual = async () => {
    const c = manualForm;
    if (!c.name || !c.type) return toast.error('Name and type required');
    await exportPdf({ ...c, tournamentName: tournament?.name, logoUrl: tournament?.logoUrl });
  };

  const [manualForm, setManualForm] = useState({ name: '', dojoName: '', categoryName: '', type: 'participation', eventType: 'Kumite' });
  const set = (k, v) => setManualForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <PageHeader
        title="Certificate Generation"
        description="Auto-generate and download winner/runner-up/participation certificates as PDF."
        breadcrumb={[{ label: 'Tournaments', href: '/dashboard/tournaments' }, { label: tournament?.name || '…', href: `/dashboard/tournaments/${id}` }, { label: 'Certificates' }]}
      />

      {/* Signatories */}
      <Card className="border-border/60 mb-6"><CardContent className="p-5">
        <h3 className="font-semibold mb-3">Signatories</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Signature 1 (Left)</Label><Input value={signatory1} onChange={(e) => setSignatory1(e.target.value)} /></div>
          <div><Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Signature 2 (Right)</Label><Input value={signatory2} onChange={(e) => setSignatory2(e.target.value)} /></div>
        </div>
      </CardContent></Card>

      {/* Batch by category */}
      <Card className="border-border/60 mb-6"><CardContent className="p-5">
        <h3 className="font-semibold mb-1">Batch Generation by Category</h3>
        <p className="text-xs text-muted-foreground mb-4">Click a button below to generate and download all certificates of that type for that category.</p>
        {categories.length === 0 ? <div className="text-sm text-muted-foreground py-6 text-center">No categories. Create some first.</div> :
          <div className="space-y-3">
            {categories.map((c) => (
              <div key={c.id} className="p-3 rounded-md border border-border bg-secondary/30">
                <div className="font-medium mb-2">{c.name} <span className="text-xs text-muted-foreground">· {c.eventType}</span></div>
                <div className="flex flex-wrap gap-2">
                  {CERT_TYPES.map((ct) => (
                    <Button key={ct.value} size="sm" variant="outline" disabled={busy} onClick={() => generateBatch(c.id, ct.value)}>
                      <FileDown className="h-3.5 w-3.5 mr-1" /> {ct.label.split(' (')[0]}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>}
      </CardContent></Card>

      {/* Manual single */}
      <Card className="border-border/60 mb-6"><CardContent className="p-5">
        <h3 className="font-semibold mb-3">Single Certificate (Manual)</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Kohai Name *</Label><Input value={manualForm.name} onChange={(e) => set('name', e.target.value)} /></div>
          <div><Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Dojo</Label><Input value={manualForm.dojoName} onChange={(e) => set('dojoName', e.target.value)} /></div>
          <div><Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Category</Label><Input value={manualForm.categoryName} onChange={(e) => set('categoryName', e.target.value)} /></div>
          <div><Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Type *</Label>
            <Select value={manualForm.type} onValueChange={(v) => set('type', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CERT_TYPES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select>
          </div>
        </div>
        <Button onClick={generateSingleManual} disabled={busy} className="mt-4 bg-primary hover:bg-primary/90">{busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />} Download PDF</Button>
      </CardContent></Card>

      {/* Hidden certificate render canvas */}
      <div style={{ position: 'fixed', left: '-10000px', top: 0, width: '1240px', height: '877px' }}>
        {previewCert && <CertificateTemplate cert={previewCert} signatory1={signatory1} signatory2={signatory2} containerRef={certRef} />}
      </div>
    </>
  );
}

function CertificateTemplate({ cert, signatory1, signatory2, containerRef }) {
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
        <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '900px', margin: '60px auto 0', alignItems: 'flex-end' }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ borderTop: `1px solid ${accentColor}88`, paddingTop: '8px', maxWidth: '240px', margin: '0 auto' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{signatory1}</div>
              <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>Signature</div>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: `3px solid ${accentColor}`, background: `${accentColor}33`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: accentColor, letterSpacing: '2px' }}>SEAL</div>
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
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
