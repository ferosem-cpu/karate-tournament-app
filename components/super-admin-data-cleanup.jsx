'use client';

import { useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  writeBatch, 
  doc 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertCircle, 
  Trash2, 
  AlertTriangle, 
  Loader2, 
  CheckCircle, 
  Download, 
  Eye, 
  RefreshCw,
  Database
} from 'lucide-react';
import { toast } from 'sonner';

export default function SuperAdminDataCleanupUtility() {
  const { profile } = useAuth();
  
  // Data sets
  const [dojos, setDojos] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  
  // Selection references
  const [selectedDojo, setSelectedDojo] = useState('');
  const [selectedTournament, setSelectedTournament] = useState('');
  
  // Inspection content
  const [counts, setCounts] = useState({});
  const [inspectedData, setInspectedData] = useState(null);
  const [loadingInspection, setLoadingInspection] = useState(false);
  
  // Execution processing
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);

  // Orphan Resolver state
  const [orphans, setOrphans] = useState([]);
  const [scanningOrphans, setScanningOrphans] = useState(false);
  const [selectedOrphanDojoId, setSelectedOrphanDojoId] = useState('');

  // 1. Authorization Access Shield
  if (profile?.role !== 'super_admin') {
    return (
      <Alert className="border-red-500/40 bg-red-500/5 max-w-xl mx-auto mt-8">
        <AlertTriangle className="h-4 w-4 text-red-400" />
        <AlertDescription className="text-red-300">
          This utility is strictly restricted to Super Admins. Current role: {profile?.role || 'Spectator'}
        </AlertDescription>
      </Alert>
    );
  }

  // Load parent listings
  const loadBaseData = async () => {
    try {
      const dojosSnap = await getDocs(collection(db, 'dojos'));
      setDojos(dojosSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const tournamentsSnap = await getDocs(collection(db, 'tournaments'));
      setTournaments(tournamentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      toast.error('Failed to load initial dataset');
    }
  };

  useEffect(() => {
    loadBaseData();
  }, []);

  // Trigger counts recalculation when selection transitions
  useEffect(() => {
    setInspectedData(null);
    if (selectedTournament) {
      loadTournamentRelatedCounts(selectedTournament);
    } else {
      setCounts((prev) => ({ ...prev, categories: 0, tatamis: 0, registrations: 0, media: 0 }));
    }
  }, [selectedTournament]);

  useEffect(() => {
    setInspectedData(null);
    if (selectedDojo) {
      loadDojoRelatedCounts(selectedDojo);
    } else {
      setCounts((prev) => ({ ...prev, athletes: 0, media: 0 }));
    }
  }, [selectedDojo]);


  /* ==========================================================================
     SECTION 1: ASSOCIATED DATA FETCH & PREVIEW LOGIC
     ========================================================================== */
  
  const loadTournamentRelatedCounts = async (tournamentId) => {
    try {
      const catSnap = await getDocs(query(collection(db, 'categories'), where('tournamentId', '==', tournamentId)));
      const tatSnap = await getDocs(query(collection(db, 'tatamis'), where('tournamentId', '==', tournamentId)));
      const regSnap = await getDocs(query(collection(db, 'tournament_registrations'), where('tournamentId', '==', tournamentId)));
      const mediaSnap = await getDocs(query(collection(db, 'media'), where('tournamentId', '==', tournamentId)));

      setCounts((prev) => ({
        ...prev,
        categories: catSnap.size,
        tatamis: tatSnap.size,
        registrations: regSnap.size,
        media: mediaSnap.size
      }));
    } catch (err) {
      toast.error("Failed to query metadata counts");
    }
  };

  const loadDojoRelatedCounts = async (dojoId) => {
    try {
      const athleteSnap = await getDocs(query(collection(db, 'athletes'), where('dojoId', '==', dojoId)));
      const mediaSnap = await getDocs(query(collection(db, 'media'), where('dojoId', '==', dojoId)));

      setCounts((prev) => ({
        ...prev,
        athletes: athleteSnap.size,
        media: mediaSnap.size
      }));
    } catch (err) {
      toast.error("Failed to query dojo metadata counts");
    }
  };

  const inspectRelation = async (type) => {
    setLoadingInspection(true);
    try {
      let snap;
      if (type === 'athletes') {
        snap = await getDocs(query(collection(db, 'athletes'), where('dojoId', '==', selectedDojo)));
      } else {
        const targetId = ['media'].includes(type) && selectedDojo ? selectedDojo : selectedTournament;
        const searchField = ['media'].includes(type) && selectedDojo ? 'dojoId' : 'tournamentId';
        snap = await getDocs(query(collection(db, type), where(searchField, '==', targetId)));
      }

      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInspectedData({ type, items });
    } catch (err) {
      toast.error(`Could not query details: ${err.message}`);
    } finally {
      setLoadingInspection(false);
    }
  };


  /* ==========================================================================
     SECTION 2: MANDATORY LOCAL SNAPSHOT BACKUP GENERATOR
     ========================================================================== */

  const downloadBackup = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generateAndDownloadTournamentBackup = async (tournamentId, name) => {
    toast.info("Generating security local backup snapshot...");
    const catSnap = await getDocs(query(collection(db, 'categories'), where('tournamentId', '==', tournamentId)));
    const tatSnap = await getDocs(query(collection(db, 'tatamis'), where('tournamentId', '==', tournamentId)));
    const regSnap = await getDocs(query(collection(db, 'tournament_registrations'), where('tournamentId', '==', tournamentId)));
    const mediaSnap = await getDocs(query(collection(db, 'media'), where('tournamentId', '==', tournamentId)));

    const backupObject = {
      backupType: 'tournament_cascade',
      timestamp: new Date().toISOString(),
      targetTournament: { id: tournamentId, name },
      categories: catSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      tatamis: tatSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      registrations: regSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      media: mediaSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    };

    const formattedDate = new Date().toISOString().replace(/[:.]/g, '-');
    downloadBackup(backupObject, `backup_tournament_${name.replace(/\s+/g, '_')}_${formattedDate}.json`);
    toast.success("Security local backup generated and downloaded successfully.");
  };

  const generateAndDownloadDojoBackup = async (dojoId, name) => {
    toast.info("Generating security local backup snapshot...");
    const athleteSnap = await getDocs(query(collection(db, 'athletes'), where('dojoId', '==', dojoId)));
    const mediaSnap = await getDocs(query(collection(db, 'media'), where('dojoId', '==', dojoId)));

    const backupObject = {
      backupType: 'dojo_cascade',
      timestamp: new Date().toISOString(),
      targetDojo: { id: dojoId, name },
      athletes: athleteSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      media: mediaSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    };

    const formattedDate = new Date().toISOString().replace(/[:.]/g, '-');
    downloadBackup(backupObject, `backup_dojo_${name.replace(/\s+/g, '_')}_${formattedDate}.json`);
    toast.success("Security local backup generated and downloaded successfully.");
  };


  /* ==========================================================================
     SECTION 3: CASCADING RELATIONAL DELETION OPERATIONS
     ========================================================================== */

  const processCascadingTournamentDelete = async () => {
    if (!selectedTournament) return;
    const tournamentObj = tournaments.find(t => t.id === selectedTournament);

    const firstCheck = window.confirm(
      `CRITICAL DESTRUCTIVE WARNING: This executes cascading deletions across tournaments, categories, tatamis, registrations, and related media schemas. All associated child rows will be purged. Proceed?`
    );
    if (!firstCheck) return;

    setProcessing(true);

    try {
      // 1. Mandatory Local Backup Download Trigger
      await generateAndDownloadTournamentBackup(selectedTournament, tournamentObj?.name || 'Unknown');

      // 2. Query target documents for cascading deletion
      const catSnap = await getDocs(query(collection(db, 'categories'), where('tournamentId', '==', selectedTournament)));
      const tatSnap = await getDocs(query(collection(db, 'tatamis'), where('tournamentId', '==', selectedTournament)));
      const regSnap = await getDocs(query(collection(db, 'tournament_registrations'), where('tournamentId', '==', selectedTournament)));
      const mediaSnap = await getDocs(query(collection(db, 'media'), where('tournamentId', '==', selectedTournament)));

      const totalDeletedItems = 1 + catSnap.size + tatSnap.size + regSnap.size + mediaSnap.size;

      // Group all deletion reference targets
      const deletionTargets = [
        doc(db, 'tournaments', selectedTournament),
        ...catSnap.docs.map(d => d.ref),
        ...tatSnap.docs.map(d => d.ref),
        ...regSnap.docs.map(d => d.ref),
        ...mediaSnap.docs.map(d => d.ref)
      ];

      // Divide targets into 500-sized write chunks to meet Firestore limits
      const chunks = [];
      for (let i = 0; i < deletionTargets.length; i += 500) {
        chunks.push(deletionTargets.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(ref => batch.delete(ref));
        await batch.commit();
      }

      setResults({
        success: true,
        action: 'Cascading Delete Tournament',
        count: totalDeletedItems,
        meta: `Tournament: ${tournamentObj?.name || 'Unknown'}`
      });
      toast.success("Cascading relational deletion completed.");
      setSelectedTournament('');
      loadBaseData();
    } catch (err) {
      toast.error(err.message || "Failed execution loop.");
      setResults({ success: false, action: 'Cascading Delete Tournament', error: err.message });
    } finally {
      setProcessing(false);
    }
  };

  const processCascadingDojoDelete = async () => {
    if (!selectedDojo) return;
    const dojoObj = dojos.find(d => d.id === selectedDojo);

    const firstCheck = window.confirm(
      `CRITICAL DESTRUCTIVE WARNING: This will permanently delete the Dojo document AND find and wipe out all registered competitors (athletes) and media rows tied to dojoId: "${dojoObj?.name}". Proceed?`
    );
    if (!firstCheck) return;

    setProcessing(true);

    try {
      // 1. Mandatory Local Backup Trigger
      await generateAndDownloadDojoBackup(selectedDojo, dojoObj?.name || 'Unknown');

      // 2. Retrieve child target keys
      const athleteSnap = await getDocs(query(collection(db, 'athletes'), where('dojoId', '==', selectedDojo)));
      const mediaSnap = await getDocs(query(collection(db, 'media'), where('dojoId', '==', selectedDojo)));

      const totalDeletedItems = 1 + athleteSnap.size + mediaSnap.size;

      const deletionTargets = [
        doc(db, 'dojos', selectedDojo),
        ...athleteSnap.docs.map(d => d.ref),
        ...mediaSnap.docs.map(d => d.ref)
      ];

      const chunks = [];
      for (let i = 0; i < deletionTargets.length; i += 500) {
        chunks.push(deletionTargets.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(ref => batch.delete(ref));
        await batch.commit();
      }

      setResults({
        success: true,
        action: 'Cascading Delete Dojo',
        count: totalDeletedItems,
        meta: `Dojo: ${dojoObj?.name || 'Unknown'}`
      });
      toast.success("Cascading dojo and athlete deletion completed.");
      setSelectedDojo('');
      loadBaseData();
    } catch (err) {
      toast.error(err.message || "Failed execution loop.");
      setResults({ success: false, action: 'Cascading Delete Dojo', error: err.message });
    } finally {
      setProcessing(false);
    }
  };


  /* ==========================================================================
     SECTION 4: ANTI-ORPHAN COMPETITOR RESOLVER
     ========================================================================== */

  const scanForOrphanedAthletes = async () => {
    setScanningOrphans(true);
    try {
      const athleteSnap = await getDocs(collection(db, 'athletes'));
      const activeDojoIds = new Set(dojos.map(d => d.id));
      const list = [];

      athleteSnap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        // Check if dojoId refers to a missing/deleted Dojo
        if (!data.dojoId || !activeDojoIds.has(data.dojoId)) {
          list.push({ id: docSnap.id, ...data });
        }
      });

      setOrphans(list);
      toast.success(`Orphan query resolved. Discovered ${list.length} orphaned competitor records.`);
    } catch (err) {
      toast.error(`Scanning error: ${err.message}`);
    } finally {
      setScanningOrphans(false);
    }
  };

  const bulkPurgeAllOrphans = async () => {
    if (orphans.length === 0) return;
    const confirmWipe = window.confirm(
      `Are you sure you want to permanently delete all ${orphans.length} orphaned athletes from the database?`
    );
    if (!confirmWipe) return;

    setProcessing(true);
    try {
      const batch = writeBatch(db);
      orphans.forEach(o => {
        batch.delete(doc(db, 'athletes', o.id));
      });
      await batch.commit();

      toast.success(`Successfully purged ${orphans.length} orphaned athletes.`);
      setOrphans([]);
    } catch (err) {
      toast.error(`Purging failed: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const reassignOrphansToActiveDojo = async () => {
    if (orphans.length === 0 || !selectedOrphanDojoId) {
      toast.error("Please ensure you have selected a valid dojo target.");
      return;
    }

    const targetDojo = dojos.find(d => d.id === selectedOrphanDojoId);
    const confirmReassignment = window.confirm(
      `Reassign ${orphans.length} orphaned competitors to "${targetDojo?.name}"?`
    );
    if (!confirmReassignment) return;

    setProcessing(true);
    try {
      const batch = writeBatch(db);
      orphans.forEach(o => {
        batch.update(doc(db, 'athletes', o.id), {
          dojoId: selectedOrphanDojoId,
          dojoName: targetDojo?.name || 'Reassigned Dojo'
        });
      });
      await batch.commit();

      toast.success(`Successfully reassigned ${orphans.length} athletes.`);
      setOrphans([]);
      setSelectedOrphanDojoId('');
    } catch (err) {
      toast.error(`Reassignment failed: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Alert className="border-amber-500/40 bg-amber-500/5">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <AlertDescription className="text-amber-300">
          <strong>Relational Cleanup Environment:</strong> Operations here will trigger automatic JSON data backup downloads before performing cascading deletions on related collections.
        </AlertDescription>
      </Alert>

      {/* Dynamic Results Status Panel */}
      {results && (
        <Card className={results.success ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-red-500/40 bg-red-500/5'}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {results.success ? (
                <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className={results.success ? 'text-emerald-300 font-semibold' : 'text-red-300 font-semibold'}>
                  {results.action} Executed Successfully
                </p>
                {results.success ? (
                  <p className="text-sm text-emerald-300/80 mt-1">
                    Backup generated and downloaded. Permanently deleted <strong>{results.count}</strong> linked records. {results.meta}
                  </p>
                ) : (
                  <p className="text-sm text-red-300/80 mt-1">{results.error}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Primary Workspace Navigation Tabs */}
      <Tabs defaultValue="tournaments" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-secondary/50">
          <TabsTrigger value="tournaments">Tournaments Workspace</TabsTrigger>
          <TabsTrigger value="dojos">Dojos Workspace</TabsTrigger>
        </TabsList>

        {/* Tournament Management Workspace Panel */}
        <TabsContent value="tournaments" className="space-y-4">
          <Card className="border-red-500/20 bg-red-500/5">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-red-300">
                <Trash2 className="h-5 w-5" /> Cascading Tournament Puree
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Deleting a tournament triggers a cascade to purge associated categories, tatamis, registrations, and related media objects.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-2 font-bold">
                    Select Target Tournament *
                  </label>
                  <Select value={selectedTournament} onValueChange={setSelectedTournament}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a tournament..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tournaments.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.title || t.name} ({t.city || 'Unknown Location'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Inspect Content area with interactive toggles */}
                {selectedTournament && (
                  <div className="p-4 border border-zinc-200/50 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 space-y-4">
                    <h4 className="text-xs font-bold uppercase text-zinc-400">Linked Tournament Metadata Statistics</h4>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-md">
                        <span className="block text-xl font-bold">{counts.categories || 0}</span>
                        <span className="text-[10px] text-zinc-400 uppercase font-semibold">Categories</span>
                      </div>
                      <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-md">
                        <span className="block text-xl font-bold">{counts.tatamis || 0}</span>
                        <span className="text-[10px] text-zinc-400 uppercase font-semibold">Tatamis</span>
                      </div>
                      <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-md">
                        <span className="block text-xl font-bold">{counts.registrations || 0}</span>
                        <span className="text-[10px] text-zinc-400 uppercase font-semibold">Registrations</span>
                      </div>
                      <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-md">
                        <span className="block text-xl font-bold">{counts.media || 0}</span>
                        <span className="text-[10px] text-zinc-400 uppercase font-semibold">Media Docs</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => inspectRelation('categories')} className="text-xs">
                        <Eye className="w-3.5 h-3.5 mr-1" /> See Related Categories
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => inspectRelation('tatamis')} className="text-xs">
                        <Eye className="w-3.5 h-3.5 mr-1" /> See Related Tatamis
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => inspectRelation('registrations')} className="text-xs">
                        <Eye className="w-3.5 h-3.5 mr-1" /> See Related Registrations
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => inspectRelation('media')} className="text-xs">
                        <Eye className="w-3.5 h-3.5 mr-1" /> See Related Media
                      </Button>
                    </div>
                  </div>
                )}

                {/* Micro-table Preview Interface */}
                {inspectedData && (
                  <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 max-h-60 overflow-y-auto">
                    <h4 className="text-xs font-bold uppercase text-zinc-500 mb-2 flex items-center justify-between">
                      <span>Previewing Child Content Array: {inspectedData.type}</span>
                      <Badge variant="secondary">{inspectedData.items.length} records</Badge>
                    </h4>
                    {inspectedData.items.length === 0 ? (
                      <p className="text-xs text-zinc-400">No matching child elements found for this query.</p>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400">
                            <th className="py-1">Document ID</th>
                            <th className="py-1">Meta Label Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                          {inspectedData.items.map((item) => (
                            <tr key={item.id}>
                              <td className="py-1 font-mono text-[10px] text-zinc-500">{item.id}</td>
                              <td className="py-1 text-zinc-700 dark:text-zinc-300">
                                {item.name || item.title || item.fileName || JSON.stringify(item.athletes || item)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                <Button
                  onClick={processCascadingTournamentDelete}
                  disabled={processing || !selectedTournament}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Executing relational deletion cascade...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" /> Download Backup & Cascading Delete Tournament
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dojo Management Workspace Panel */}
        <TabsContent value="dojos" className="space-y-4">
          <Card className="border-red-500/20 bg-red-500/5">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-red-300">
                <Trash2 className="h-5 w-5" /> Cascading Dojo Purge
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Deleting a dojo triggers an automatic batch clean of all mapped competitor profiles (athletes/kohais) and tied media files.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-2 font-bold">
                    Select Target Dojo *
                  </label>
                  <Select value={selectedDojo} onValueChange={setSelectedDojo}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a dojo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {dojos.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name} ({d.city || 'Unknown Location'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Dojo stats and preview inspection panel */}
                {selectedDojo && (
                  <div className="p-4 border border-zinc-200/50 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 space-y-4">
                    <h4 className="text-xs font-bold uppercase text-zinc-400">Linked Dojo Metadata Statistics</h4>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-md">
                        <span className="block text-xl font-bold">{counts.athletes || 0}</span>
                        <span className="text-[10px] text-zinc-400 uppercase font-semibold">Athletes (Kohai)</span>
                      </div>
                      <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-md">
                        <span className="block text-xl font-bold">{counts.media || 0}</span>
                        <span className="text-[10px] text-zinc-400 uppercase font-semibold">Media Documents</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => inspectRelation('athletes')} className="text-xs">
                        <Eye className="w-3.5 h-3.5 mr-1" /> See Related Kohais
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => inspectRelation('media')} className="text-xs">
                        <Eye className="w-3.5 h-3.5 mr-1" /> See Related Media
                      </Button>
                    </div>
                  </div>
                )}

                {/* Dojo Micro-table Preview Interface */}
                {inspectedData && (
                  <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 max-h-60 overflow-y-auto">
                    <h4 className="text-xs font-bold uppercase text-zinc-500 mb-2 flex items-center justify-between">
                      <span>Previewing Child Content Array: {inspectedData.type}</span>
                      <Badge variant="secondary">{inspectedData.items.length} records</Badge>
                    </h4>
                    {inspectedData.items.length === 0 ? (
                      <p className="text-xs text-zinc-400">No matching child elements found for this query.</p>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400">
                            <th className="py-1">Document ID</th>
                            <th className="py-1">Competitor / Item Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                          {inspectedData.items.map((item) => (
                            <tr key={item.id}>
                              <td className="py-1 font-mono text-[10px] text-zinc-500">{item.id}</td>
                              <td className="py-1 text-zinc-700 dark:text-zinc-300">
                                {item.name || item.fileName || item.belt || JSON.stringify(item)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                <Button
                  onClick={processCascadingDojoDelete}
                  disabled={processing || !selectedDojo}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Executing relational deletion cascade...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" /> Download Backup & Cascading Delete Dojo
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ==========================================================================
         SECTION 5: INTEGRATED ANTI-ORPHAN COMPETITOR RESOLVER
         ========================================================================== */}
      
      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-900 pb-4">
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <Database className="w-5 h-5 text-zinc-500" />
                <span>🔧 Orphaned Athlete Data Resolver</span>
              </h3>
              <p className="text-xs text-zinc-500">
                Identify and heal orphaned competitor profiles whose registered `dojoId` properties point to deleted dojos.
              </p>
            </div>
            
            <Button variant="outline" size="sm" onClick={scanForOrphanedAthletes} disabled={scanningOrphans}>
              {scanningOrphans ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Scanning database...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Scan Database
                </>
              )}
            </Button>
          </div>

          {orphans.length > 0 ? (
            <div className="space-y-4">
              <Alert className="border-red-500/20 bg-red-500/5">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-400 text-xs">
                  Discovered <strong>{orphans.length}</strong> orphaned athlete records in the database.
                </AlertDescription>
              </Alert>

              <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg max-h-48 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/10">
                {orphans.map(o => (
                  <div key={o.id} className="p-3 text-xs flex justify-between items-center hover:bg-zinc-50 dark:hover:bg-zinc-900">
                    <div>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{o.name}</span>
                      <span className="text-zinc-400 block font-mono text-[9px]">ID: {o.id} | Bad Dojo Reference ID: {o.dojoId || 'null'}</span>
                    </div>
                    <Badge variant="destructive" className="text-[10px] uppercase tracking-wide">Orphaned</Badge>
                  </div>
                ))}
              </div>

              {/* Action Panels */}
              <div className="grid md:grid-cols-2 gap-4 border-t border-zinc-100 dark:border-zinc-900 pt-4">
                <div className="p-4 border border-red-200 dark:border-red-900/30 rounded-lg bg-red-50/10 space-y-2">
                  <h4 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">Option A: Database Purge</h4>
                  <p className="text-xs text-zinc-500">Wipe out these detached nodes permanently from the database index.</p>
                  <Button variant="destructive" size="sm" className="w-full mt-2" onClick={bulkPurgeAllOrphans} disabled={processing}>
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Bulk Purge All Orphans
                  </Button>
                </div>

                <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-2">
                  <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">Option B: Relocate and Reassign</h4>
                  <p className="text-xs text-zinc-500">Reassign these records to an active Dojo in your system.</p>
                  
                  <div className="flex gap-2 pt-1">
                    <Select value={selectedOrphanDojoId} onValueChange={setSelectedOrphanDojoId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Target Dojo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {dojos.map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button variant="outline" size="sm" onClick={reassignOrphansToActiveDojo} disabled={processing || !selectedOrphanDojoId}>
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-zinc-500 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
              No scan executed yet or database is clean of orphaned athlete profiles. Click "Scan Database" to audit the record indexes.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}