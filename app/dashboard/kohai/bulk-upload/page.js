'use client';

import { useEffect, useState, useRef } from 'react';
import { collection, onSnapshot, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import PageHeader from '@/components/page-header';
import { Upload, FileDown, FileSpreadsheet, CheckCircle2, AlertCircle, Trash2, Loader2, Sheet } from 'lucide-react';
import { toast } from 'sonner';
import { BELTS, GENDERS } from '@/lib/constants';
import AccessDenied from '@/components/access-denied';

const TEMPLATE_HEADERS = ['fullName', 'gender', 'dateOfBirth', 'belt', 'weight', 'dojo', 'eventType', 'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelation', 'emergencyContactEmail'];
const TEMPLATE_SAMPLE = [
  { fullName: 'Hiro Tanaka', gender: 'Male', dateOfBirth: '2005-04-12', belt: 'Brown', weight: 68, dojo: 'Tanaka Karate Dojo', eventType: 'Kumite', emergencyContactName: 'Akira Tanaka', emergencyContactPhone: '+91 9876543210', emergencyContactRelation: 'Father', emergencyContactEmail: 'parent@example.com' },
  { fullName: 'Sara Khan', gender: 'Female', dateOfBirth: '2010-09-23', belt: 'Green', weight: 42, dojo: 'Tanaka Karate Dojo', eventType: 'Kata', emergencyContactName: 'Imran Khan', emergencyContactPhone: '+91 9876500000', emergencyContactRelation: 'Father', emergencyContactEmail: 'parent@example.com' },
];

export default function BulkUploadPage() {
  const { user, profile, loading } = useAuth();
  const fileRef = useRef();
  const [rows, setRows] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [completed, setCompleted] = useState(null);
  const [dojos, setDojos] = useState([]);
  const [existingNames, setExistingNames] = useState(new Set());
  const [dragOver, setDragOver] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (profile?.role === 'spectator') {
    return <AccessDenied resource="Bulk Upload" />;
  }

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'dojos'), (s) => setDojos(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(collection(db, 'athletes'), (s) => {
      const set = new Set();
      s.docs.forEach((d) => {
        const a = d.data();
        if (a.fullName) set.add(`${a.fullName.toLowerCase().trim()}|${a.dateOfBirth || ''}`);
      });
      setExistingNames(set);
    });
    return () => { u1(); u2(); };
  }, []);

  const downloadTemplate = (format = 'csv') => {
    if (format === 'csv') {
      const csv = Papa.unparse({ fields: TEMPLATE_HEADERS, data: TEMPLATE_SAMPLE });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      triggerDownload(blob, 'kohai_template.csv');
    } else {
      const ws = XLSX.utils.json_to_sheet(TEMPLATE_SAMPLE, { header: TEMPLATE_HEADERS });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Kohai');
      const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      triggerDownload(new Blob([buf]), 'kohai_template.xlsx');
    }
  };

  const triggerDownload = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  const openInGoogleSheets = async () => {
    // Build TSV (tab-separated) for clean paste into Google Sheets
    const headerLine = TEMPLATE_HEADERS.join('\t');
    const dataLines = TEMPLATE_SAMPLE.map((r) => TEMPLATE_HEADERS.map((h) => r[h] ?? '').join('\t'));
    const tsv = [headerLine, ...dataLines].join('\n');
    try {
      await navigator.clipboard.writeText(tsv);
      toast.success('Template copied! Paste with Ctrl+V (Cmd+V on Mac) into the new Sheet.', { duration: 6000 });
    } catch {
      toast.message('Open the new Google Sheet and paste the template manually.');
    }
    window.open('https://sheets.new', '_blank', 'noopener,noreferrer');
  };

  const validateRow = (r) => {
    const errors = [];
    if (!r.fullName || !r.fullName.toString().trim()) errors.push('fullName required');
    if (r.gender && !GENDERS.map((g) => g.toLowerCase()).includes(r.gender.toString().toLowerCase())) errors.push('invalid gender');
    if (r.belt && !BELTS.map((b) => b.toLowerCase()).includes(r.belt.toString().toLowerCase())) errors.push('invalid belt');
    if (!r.weight || r.weight.toString().trim() === '') {
      errors.push('weight required');
    } else if (isNaN(Number(r.weight))) {
      errors.push('weight not a number');
    }
    if (r.dateOfBirth) {
      const d = new Date(r.dateOfBirth);
      if (isNaN(d.getTime())) errors.push('invalid dob');
    }
    const dupKey = `${(r.fullName || '').toString().toLowerCase().trim()}|${r.dateOfBirth || ''}`;
    const isDuplicate = existingNames.has(dupKey);
    return { errors, isDuplicate };
  };

  const handleFiles = async (file) => {
    setParsing(true);
    setCompleted(null);
    try {
      const ext = file.name.toLowerCase().split('.').pop();
      let data = [];
      if (ext === 'csv') {
        const text = await file.text();
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        data = parsed.data;
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(ws, { defval: '' });
      } else { toast.error('Unsupported file. Use .csv, .xlsx or .xls'); setParsing(false); return; }

      const myDojo = dojos.find((d) => d.ownerId === user?.uid);
      const isDojoAdmin = profile?.role === 'dojo_admin';

      const enriched = data.map((r, i) => {
        const v = validateRow(r);
        const dojoMatch = isDojoAdmin ? myDojo : dojos.find((d) => (d.name || '').toLowerCase() === (r.dojo || '').toString().toLowerCase());
        return {
          ...r,
          dojo: isDojoAdmin ? (myDojo?.name || '') : r.dojo,
          _idx: i,
          _errors: v.errors,
          _duplicate: v.isDuplicate,
          _dojoId: dojoMatch?.id || null,
          _dojoMatched: !!dojoMatch
        };
      });
      setRows(enriched);
      toast.success(`Parsed ${enriched.length} rows`);
    } catch (err) {
      toast.error('Parse failed: ' + err.message);
    } finally { setParsing(false); }
  };

  const upload = async () => {
    const valid = rows.filter((r) => r._errors.length === 0 && !r._duplicate);
    if (valid.length === 0) return toast.error('No valid rows to upload');
    setUploading(true);
    setUploadProgress(0);
    try {
      const CHUNK = 400;
      for (let i = 0; i < valid.length; i += CHUNK) {
        const chunk = valid.slice(i, i + CHUNK);
        const batch = writeBatch(db);
        chunk.forEach((r) => {
          const ref = doc(collection(db, 'athletes'));
          batch.set(ref, {
            fullName: (r.fullName || '').toString().trim(),
            gender: r.gender || '',
            dateOfBirth: r.dateOfBirth || '',
            belt: r.belt || '',
            weight: r.weight === '' || r.weight == null ? null : Number(r.weight),
            dojoId: r._dojoId,
            dojoName: r.dojo || '',
            eventType: r.eventType || '',
            emergencyContactName: r.emergencyContactName || '',
            emergencyContactPhone: r.emergencyContactPhone || '',
            emergencyContactRelation: r.emergencyContactRelation || '',
            emergencyContactEmail: r.emergencyContactEmail || '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: user.uid,
            ownerId: user.uid,
            source: 'bulk_upload',
          });
        });
        await batch.commit();
        setUploadProgress(Math.round(((i + chunk.length) / valid.length) * 100));
      }
      setCompleted({ inserted: valid.length, skipped: rows.length - valid.length });
      setRows([]);
      toast.success(`Imported ${valid.length} kohai`);
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    } finally { setUploading(false); }
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0]; if (file) handleFiles(file);
  };

  const validCount = rows.filter((r) => r._errors.length === 0 && !r._duplicate).length;
  const errorCount = rows.filter((r) => r._errors.length > 0).length;
  const duplicateCount = rows.filter((r) => r._duplicate).length;

  return (
    <>
      <PageHeader
        title="Bulk Kohai Upload"
        description="Import many athletes at once via CSV or Excel. Duplicate detection by name+DOB."
        breadcrumb={[{ label: 'Kohai', href: '/dashboard/kohai' }, { label: 'Bulk Upload' }]}
        actions={
          <>
            <Button variant="outline" onClick={() => downloadTemplate('csv')}><FileDown className="h-4 w-4 mr-2" /> CSV Template</Button>
            <Button variant="outline" onClick={() => downloadTemplate('xlsx')}><FileDown className="h-4 w-4 mr-2" /> Excel Template</Button>
            <Button variant="outline" onClick={openInGoogleSheets} className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200"><Sheet className="h-4 w-4 mr-2" /> Google Sheets</Button>
          </>
        }
      />

      {/* Dropzone */}
      <Card className="border-border/60 mb-6"><CardContent className="p-6">
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition ${dragOver ? 'border-primary bg-primary/5' : 'border-border bg-secondary/30 hover:border-primary/50'}`}
        >
          <FileSpreadsheet className="h-12 w-12 mx-auto text-primary mb-3" />
          <h3 className="font-semibold text-lg">{parsing ? 'Parsing…' : 'Drag & drop CSV / Excel here'}</h3>
          <p className="text-sm text-muted-foreground mt-1">or click to browse · .csv, .xlsx, .xls</p>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && handleFiles(e.target.files[0])} />
        </div>
        <div className="mt-4 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Required columns:</span> {TEMPLATE_HEADERS.join(', ')}
        </div>
      </CardContent></Card>

      {completed && (
        <Card className="border-emerald-500/40 bg-emerald-500/5 mb-6"><CardContent className="p-5 flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          <div>
            <div className="font-semibold">Upload complete</div>
            <div className="text-sm text-muted-foreground">{completed.inserted} kohai imported, {completed.skipped} skipped.</div>
          </div>
        </CardContent></Card>
      )}

      {rows.length > 0 && (
        <Card className="border-border/60"><CardContent className="p-0">
          <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/40" variant="outline">{validCount} valid</Badge>
              <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/40" variant="outline">{duplicateCount} duplicates</Badge>
              <Badge className="bg-red-500/15 text-red-300 border-red-500/40" variant="outline">{errorCount} errors</Badge>
              <Badge variant="outline">Total: {rows.length}</Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRows([])}><Trash2 className="h-4 w-4 mr-2" /> Clear</Button>
              <Button className="bg-primary hover:bg-primary/90" onClick={upload} disabled={uploading || validCount === 0}>
                {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…</> : <><Upload className="h-4 w-4 mr-2" /> Import {validCount} Kohai</>}
              </Button>
            </div>
          </div>
          {uploading && <div className="px-5 py-3 border-b border-border"><Progress value={uploadProgress} /></div>}
          <div className="overflow-x-auto max-h-[520px]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>DOB</TableHead>
                  <TableHead>Belt</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Dojo</TableHead>
                  <TableHead>Issues</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => {
                  const ok = r._errors.length === 0 && !r._duplicate;
                  return (
                    <TableRow key={i} className={!ok ? 'bg-red-500/5' : ''}>
                      <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell>
                        {r._errors.length > 0 ? (
                          <Badge variant="outline" className="bg-red-500/15 text-red-300 border-red-500/40"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>
                        ) : r._duplicate ? (
                          <Badge variant="outline" className="bg-amber-500/15 text-amber-300 border-amber-500/40">Duplicate</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-300 border-emerald-500/40"><CheckCircle2 className="h-3 w-3 mr-1" />Ready</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{r.fullName || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-muted-foreground">{r.gender || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{r.dateOfBirth || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{r.belt || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{r.weight || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.dojo || '—'} {r._dojoMatched && <span className="text-emerald-400 text-[10px] ml-1">✓ matched</span>}
                      </TableCell>
                      <TableCell className="text-xs text-red-300">{r._errors.join(', ') || (r._duplicate ? 'Already exists' : '')}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent></Card>
      )}
    </>
  );
}
