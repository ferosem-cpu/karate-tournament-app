import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { KUMITE_DEFAULT_DURATION, KATA_JUDGE_COUNT } from './constants';

/* ============== Helpers ============== */

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Fair seeding: try to ensure round-1 pairs are NOT from same dojo when possible.
// Approach: shuffle, then for each first-round pair (i, i+1) that shares dojoId,
// swap one of them with a downstream slot that resolves the conflict.
function fairSeed(athletes) {
  const arr = shuffle(athletes);
  for (let i = 0; i + 1 < arr.length; i += 2) {
    const a = arr[i], b = arr[i + 1];
    if (!a || !b) continue;
    if (a.dojoId && b.dojoId && a.dojoId === b.dojoId) {
      // search for a swap candidate j (paired with k) such that swapping b<->arr[j] resolves both pairs
      for (let j = i + 2; j < arr.length; j++) {
        const c = arr[j];
        if (!c) continue;
        const pairIdx = j % 2 === 0 ? j + 1 : j - 1;
        const pair = arr[pairIdx];
        if (c.dojoId === a.dojoId) continue; // would create same conflict
        if (pair && pair.dojoId && b.dojoId && pair.dojoId === b.dojoId) continue; // moving b would create new conflict
        // swap
        [arr[i + 1], arr[j]] = [arr[j], arr[i + 1]];
        break;
      }
    }
  }
  return arr;
}

function nextPow2(n) { let p = 1; while (p < n) p *= 2; return p; }

export function toAthleteRef(a) {
  if (!a) return null;
  return {
    athleteId: a.id || a.athleteId || null,
    name: a.fullName || a.name || '',
    dojoName: a.dojoName || '',
    dojoId: a.dojoId || null,
    belt: a.belt || '',
    photoUrl: a.photoUrl || '',
    gender: a.gender || '',
    weight: a.weight ?? null,
  };
}

/* ============== Kumite single-elimination ============== */

export function buildKumiteBracket(athletes) {
  if (!athletes || athletes.length < 2) {
    throw new Error('Need at least 2 athletes to generate a Kumite bracket');
  }
  const seeded = fairSeed(athletes);
  const size = nextPow2(seeded.length);
  const slots = [...seeded];
  while (slots.length < size) slots.push(null);

  const totalRounds = Math.log2(size);
  const rounds = [];

  // Round 1
  const r1 = [];
  for (let i = 0; i < size / 2; i++) {
    const aka = slots[i * 2];
    const ao = slots[i * 2 + 1];
    r1.push({
      tempId: `r1m${i}`, round: 1, matchInRound: i,
      aka: aka ? toAthleteRef(aka) : null,
      ao: ao ? toAthleteRef(ao) : null,
    });
  }
  rounds.push(r1);

  // Subsequent rounds
  for (let r = 2; r <= totalRounds; r++) {
    const prev = rounds[r - 2];
    const next = [];
    for (let i = 0; i < prev.length / 2; i++) {
      const m = { tempId: `r${r}m${i}`, round: r, matchInRound: i, aka: null, ao: null };
      prev[i * 2].nextMatchTempId = m.tempId; prev[i * 2].nextMatchSlot = 'aka';
      prev[i * 2 + 1].nextMatchTempId = m.tempId; prev[i * 2 + 1].nextMatchSlot = 'ao';
      next.push(m);
    }
    rounds.push(next);
  }

  // Process byes in round 1
  const all = rounds.flat();
  const byId = (id) => all.find((m) => m.tempId === id);
  for (const m of rounds[0]) {
    if (m.aka && !m.ao) {
      m.isBye = true; m.status = 'completed'; m.winnerSide = 'aka';
      const n = byId(m.nextMatchTempId); if (n) n[m.nextMatchSlot] = m.aka;
    } else if (!m.aka && m.ao) {
      m.isBye = true; m.status = 'completed'; m.winnerSide = 'ao';
      const n = byId(m.nextMatchTempId); if (n) n[m.nextMatchSlot] = m.ao;
    } else if (!m.aka && !m.ao) {
      m.isBye = true; m.status = 'archived';
    }
  }

  return { rounds, totalRounds, size };
}

export async function persistKumiteBracket({ tournament, category, rounds, totalRounds, userId }) {
  const batch = writeBatch(db);
  const all = rounds.flat();
  const refs = {};
  all.forEach((m) => { refs[m.tempId] = doc(collection(db, 'matches')); });

  all.forEach((m) => {
    const ref = refs[m.tempId];
    const nextRef = m.nextMatchTempId ? refs[m.nextMatchTempId] : null;
    batch.set(ref, {
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      categoryId: category.id,
      categoryName: category.name,
      eventType: 'Kumite',
      round: m.round,
      totalRounds,
      matchInRound: m.matchInRound,
      aka: m.aka || null,
      ao: m.ao || null,
      akaScore: 0,
      aoScore: 0,
      akaPenalties: [],
      aoPenalties: [],
      status: m.status || 'queued',
      isBye: m.isBye || false,
      winner: m.winnerSide ? {
        side: m.winnerSide,
        athleteId: m[m.winnerSide]?.athleteId,
        name: m[m.winnerSide]?.name,
        reason: 'walkover',
      } : null,
      tatamiId: null,
      tatamiName: null,
      refereeId: null,
      refereeName: null,
      timerDurationSeconds: KUMITE_DEFAULT_DURATION,
      timerAccumulatedSeconds: 0,
      timerStartedAt: null,
      isTimerRunning: false,
      nextMatchId: nextRef?.id || null,
      nextMatchSlot: m.nextMatchSlot || null,
      notes: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId,
      completedAt: m.status === 'completed' ? serverTimestamp() : null,
    });
  });
  await batch.commit();
  return all.length;
}

/* ============== Kata pool ============== */

export async function persistKataPool({ tournament, category, athletes, judgeCount = KATA_JUDGE_COUNT, userId }) {
  if (!athletes || athletes.length === 0) throw new Error('No athletes to register for Kata');
  const batch = writeBatch(db);
  athletes.forEach((a, idx) => {
    const ref = doc(collection(db, 'matches'));
    batch.set(ref, {
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      categoryId: category.id,
      categoryName: category.name,
      eventType: 'Kata',
      round: 1,
      totalRounds: 1,
      matchInRound: idx,
      aka: toAthleteRef(a),
      ao: null,
      kataScores: Array.from({ length: judgeCount }, (_, j) => ({ judgeNum: j + 1, score: null })),
      kataFinalScore: null,
      kataName: '',
      status: 'queued',
      isBye: false,
      judgeCount,
      tatamiId: null,
      tatamiName: null,
      refereeId: null,
      refereeName: null,
      winner: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId,
    });
  });
  await batch.commit();
  return athletes.length;
}

/* ============== Match operations ============== */

export async function deleteCategoryMatches(tournamentId, categoryId) {
  const q = query(collection(db, 'matches'), where('tournamentId', '==', tournamentId), where('categoryId', '==', categoryId));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}

export async function assignMatchToTatami(matchId, tatamiId, tatamiName) {
  await updateDoc(doc(db, 'matches', matchId), {
    tatamiId, tatamiName, status: 'called', calledAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
}

export async function callMatchOnTatami(matchId) {
  await updateDoc(doc(db, 'matches', matchId), {
    status: 'on_tatami', onTatamiAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
}

export async function startMatchTimer(matchId) {
  await updateDoc(doc(db, 'matches', matchId), {
    status: 'active', isTimerRunning: true, timerStartedAt: serverTimestamp(),
    startedAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
}

export async function pauseMatchTimer(matchId, accumulatedSeconds) {
  await updateDoc(doc(db, 'matches', matchId), {
    status: 'paused', isTimerRunning: false,
    timerAccumulatedSeconds: accumulatedSeconds,
    timerStartedAt: null, updatedAt: serverTimestamp(),
  });
}

export async function resumeMatchTimer(matchId) {
  await updateDoc(doc(db, 'matches', matchId), {
    status: 'active', isTimerRunning: true, timerStartedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateMatchScore(matchId, payload) {
  await updateDoc(doc(db, 'matches', matchId), { ...payload, updatedAt: serverTimestamp() });
}

export async function completeKumiteMatch(matchId, { winnerSide, reason = 'points', notes = '' }) {
  const matchSnap = await getDoc(doc(db, 'matches', matchId));
  if (!matchSnap.exists()) throw new Error('Match not found');
  const m = matchSnap.data();
  const winnerData = winnerSide === 'aka' ? m.aka : m.ao;
  if (!winnerData) throw new Error('Winner side has no athlete');

  await updateDoc(doc(db, 'matches', matchId), {
    status: 'completed',
    isTimerRunning: false,
    winner: { side: winnerSide, athleteId: winnerData.athleteId, name: winnerData.name, reason },
    notes,
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Auto-advance
  if (m.nextMatchId) {
    await updateDoc(doc(db, 'matches', m.nextMatchId), {
      [m.nextMatchSlot]: winnerData,
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await autoCreateCertificates(m.tournamentId, m.categoryId);
  } catch (err) {
    console.error('Failed to auto-create certificates:', err);
  }
}

export async function completeKataMatch(matchId, kataScores, kataName = '') {
  const matchSnap = await getDoc(doc(db, 'matches', matchId));
  if (!matchSnap.exists()) throw new Error('Match not found');
  const m = matchSnap.data();

  const validScores = kataScores.map((s) => Number(s.score)).filter((n) => !isNaN(n) && n > 0).sort((a, b) => a - b);
  let finalScore = 0;
  if (validScores.length >= 3) {
    // Drop highest + lowest, sum the middle
    const middle = validScores.slice(1, -1);
    finalScore = Number(middle.reduce((s, n) => s + n, 0).toFixed(2));
  } else {
    finalScore = Number(validScores.reduce((s, n) => s + n, 0).toFixed(2));
  }
  await updateDoc(doc(db, 'matches', matchId), {
    kataScores, kataFinalScore: finalScore, kataName,
    status: 'completed', completedAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });

  try {
    await autoCreateCertificates(m.tournamentId, m.categoryId);
  } catch (err) {
    console.error('Failed to auto-create certificates:', err);
  }

  return finalScore;
}

/* ============== Bracket placements (for certificates) ============== */

export async function getCategoryPlacements(tournamentId, categoryId) {
  const q = query(collection(db, 'matches'),
    where('tournamentId', '==', tournamentId),
    where('categoryId', '==', categoryId));
  const snap = await getDocs(q);
  const matches = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (matches.length === 0) return { winner: null, runnerUp: null, secondRunnersUp: [], participants: [], eventType: null };
  const eventType = matches[0].eventType;

  if (eventType === 'Kata') {
    const ranked = matches
      .filter((m) => m.kataFinalScore != null)
      .sort((a, b) => (b.kataFinalScore || 0) - (a.kataFinalScore || 0));
    return {
      eventType: 'Kata',
      winner: ranked[0]?.aka || null,
      runnerUp: ranked[1]?.aka || null,
      secondRunnersUp: ranked[2] ? [ranked[2].aka] : [],
      participants: matches.map((m) => m.aka).filter(Boolean),
    };
  }

  // Kumite
  const totalRounds = Math.max(...matches.map((m) => m.totalRounds || 1));
  const finalMatch = matches.find((m) => m.round === totalRounds);
  const semiMatches = matches.filter((m) => m.round === totalRounds - 1);
  const winnerSide = finalMatch?.winner?.side;
  const winner = winnerSide ? finalMatch[winnerSide] : null;
  const runnerUp = winnerSide ? (winnerSide === 'aka' ? finalMatch.ao : finalMatch.aka) : null;
  const secondRunnersUp = semiMatches.map((m) => {
    if (!m.winner) return null;
    return m.winner.side === 'aka' ? m.ao : m.aka;
  }).filter(Boolean);
  const participants = [];
  matches.filter((m) => m.round === 1).forEach((m) => { if (m.aka) participants.push(m.aka); if (m.ao) participants.push(m.ao); });

  return { eventType: 'Kumite', winner, runnerUp, secondRunnersUp, participants };
}

export async function autoCreateCertificates(tournamentId, categoryId) {
  const placements = await getCategoryPlacements(tournamentId, categoryId);
  if (!placements.winner && !placements.runnerUp && placements.secondRunnersUp.length === 0) {
    return; // placements not fully decided yet
  }

  const tSnap = await getDoc(doc(db, 'tournaments', tournamentId));
  if (!tSnap.exists()) return;
  const tournament = tSnap.data();

  const cSnap = await getDoc(doc(db, 'categories', categoryId));
  if (!cSnap.exists()) return;
  const category = cSnap.data();

  const certsToCreate = [];
  if (placements.winner) certsToCreate.push({ type: 'winner', athlete: placements.winner });
  if (placements.runnerUp) certsToCreate.push({ type: 'runner_up', athlete: placements.runnerUp });
  placements.secondRunnersUp.forEach((ath) => {
    if (ath) certsToCreate.push({ type: 'second_runner_up', athlete: ath });
  });

  const q = query(collection(db, 'certificates'),
    where('tournamentId', '==', tournamentId),
    where('categoryId', '==', categoryId)
  );
  const snap = await getDocs(q);
  const existing = snap.docs.map((d) => d.data());

  for (const item of certsToCreate) {
    const exists = existing.some((c) => c.type === item.type && c.athleteName === item.athlete.name);
    if (!exists) {
      let emergencyContactEmail = '';
      if (item.athlete.athleteId) {
        try {
          const athSnap = await getDoc(doc(db, 'athletes', item.athlete.athleteId));
          if (athSnap.exists()) {
            emergencyContactEmail = athSnap.data().emergencyContactEmail || '';
          }
        } catch (e) {
          console.error(`Error loading athlete emergency email: ${e.message}`);
        }
      }

      await addDoc(collection(db, 'certificates'), {
        tournamentId,
        tournamentName: tournament.name || '',
        categoryId,
        categoryName: category.name || '',
        athleteId: item.athlete.athleteId || '',
        athleteName: item.athlete.name || '',
        dojoName: item.athlete.dojoName || '',
        dojoId: item.athlete.dojoId || '',
        type: item.type,
        signatory1: tournament.signatory1 || 'Chief Organizer',
        signatory2: tournament.signatory2 || 'Chief Referee',
        logoUrl: tournament.logoUrl || '',
        eventType: placements.eventType || '',
        emergencyContactEmail,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ownerId: tournament.ownerId || '',
      });
    }
  }
}

/* ============== Auto-Assign & Batch commits ============== */

async function commitBatchInChunks(batchOps) {
  const chunkSize = 400;
  for (let i = 0; i < batchOps.length; i += chunkSize) {
    const chunk = batchOps.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const op of chunk) {
      if (op.type === 'set') {
        batch.set(op.ref, op.data);
      } else if (op.type === 'update') {
        batch.update(op.ref, op.data);
      } else if (op.type === 'delete') {
        batch.delete(op.ref);
      }
    }
    await batch.commit();
  }
}

export async function updateMatchTimerDuration(matchId, durationSeconds) {
  await updateDoc(doc(db, 'matches', matchId), {
    timerDurationSeconds: durationSeconds,
    updatedAt: serverTimestamp(),
  });
}

export function sortCategoriesForQueue(categories) {
  return [...categories].sort((a, b) => {
    // 1. Age Min (ascending)
    const ageMinA = a.ageMin !== null && a.ageMin !== '' ? Number(a.ageMin) : 99;
    const ageMinB = b.ageMin !== null && b.ageMin !== '' ? Number(b.ageMin) : 99;
    if (ageMinA !== ageMinB) return ageMinA - ageMinB;

    // 2. Age Max (ascending)
    const ageMaxA = a.ageMax !== null && a.ageMax !== '' ? Number(a.ageMax) : 99;
    const ageMaxB = b.ageMax !== null && b.ageMax !== '' ? Number(b.ageMax) : 99;
    if (ageMaxA !== ageMaxB) return ageMaxA - ageMaxB;

    // 3. Gender (Female first, Male second, Mixed/Other last)
    const genderRank = (g) => {
      if (!g) return 3;
      const lower = g.toLowerCase();
      if (lower === 'female') return 1;
      if (lower === 'male') return 2;
      return 3;
    };
    const genA = genderRank(a.gender);
    const genB = genderRank(b.gender);
    if (genA !== genB) return genA - genB;

    // 4. Open category last (byWeight: false or name contains "open")
    const isOpenA = a.byWeight === false || (a.weightMin === null && a.weightMax === null) || a.name.toLowerCase().includes('open');
    const isOpenB = b.byWeight === false || (b.weightMin === null && b.weightMax === null) || b.name.toLowerCase().includes('open');
    const openRankA = isOpenA ? 2 : 1;
    const openRankB = isOpenB ? 2 : 1;
    if (openRankA !== openRankB) return openRankA - openRankB;

    // 5. Weight Min (ascending)
    const wMinA = a.weightMin !== null && a.weightMin !== '' ? Number(a.weightMin) : 0;
    const wMinB = b.weightMin !== null && b.weightMin !== '' ? Number(b.weightMin) : 0;
    if (wMinA !== wMinB) return wMinA - wMinB;

    // 6. Weight Max (ascending)
    const wMaxA = a.weightMax !== null && a.weightMax !== '' ? Number(a.weightMax) : 0;
    const wMaxB = b.weightMax !== null && b.weightMax !== '' ? Number(b.weightMax) : 0;
    return wMaxA - wMaxB;
  });
}

export async function autoGenerateBracketsAndAssign({ tournamentId, userId }) {
  const tDoc = await getDoc(doc(db, 'tournaments', tournamentId));
  if (!tDoc.exists()) throw new Error('Tournament not found');
  const tournament = tDoc.data();

  const catSnap = await getDocs(query(collection(db, 'categories'), where('tournamentId', '==', tournamentId)));
  let categories = catSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  let hasOpenKumite = categories.some(c => c.name.toLowerCase().includes('open') && c.eventType === 'Kumite');
  let hasBlackBeltKumite = categories.some(c => c.name.toLowerCase().includes('black belt') && c.eventType === 'Kumite');

  const newCategoriesBatch = [];
  if (!hasOpenKumite) {
    const newCatRef = doc(collection(db, 'categories'));
    const newCat = {
      name: 'Open Mixed Kumite',
      tournamentId,
      tournamentName: tournament.name || '',
      eventType: 'Kumite',
      gender: 'Mixed',
      ageMin: null,
      ageMax: null,
      beltMin: '__any__',
      beltMax: '__any__',
      weightMin: null,
      weightMax: null,
      byAge: false,
      byWeight: false,
      description: 'Auto-created Open Category',
      isActive: true,
      isTeamEvent: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId,
      ownerId: userId,
    };
    newCategoriesBatch.push({ ref: newCatRef, data: newCat, type: 'set' });
    categories.push({ id: newCatRef.id, ...newCat });
  }

  if (!hasBlackBeltKumite) {
    const newCatRef = doc(collection(db, 'categories'));
    const newCat = {
      name: 'Black Belt Mixed Kumite',
      tournamentId,
      tournamentName: tournament.name || '',
      eventType: 'Kumite',
      gender: 'Mixed',
      ageMin: null,
      ageMax: null,
      beltMin: 'Black',
      beltMax: 'Black',
      weightMin: null,
      weightMax: null,
      byAge: false,
      byWeight: false,
      description: 'Auto-created Black Belt Category',
      isActive: true,
      isTeamEvent: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId,
      ownerId: userId,
    };
    newCategoriesBatch.push({ ref: newCatRef, data: newCat, type: 'set' });
    categories.push({ id: newCatRef.id, ...newCat });
  }

  if (newCategoriesBatch.length > 0) {
    await commitBatchInChunks(newCategoriesBatch);
  }

  const regSnap = await getDocs(query(
    collection(db, 'tournament_registrations'), 
    where('tournamentId', '==', tournamentId),
    where('status', '==', 'approved')
  ));
  const childRegs = regSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => r.categoryId);

  const tatamiSnap = await getDocs(query(collection(db, 'tatamis'), where('tournamentId', '==', tournamentId)));
  const tatamis = tatamiSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (tatamis.length === 0) {
    throw new Error('No Tatamis found. Please create at least one Tatami first.');
  }

  const refSnap = await getDocs(query(
    collection(db, 'referee_applications'),
    where('tournamentId', '==', tournamentId),
    where('status', '==', 'approved')
  ));
  let referees = refSnap.docs.map(d => ({
    id: d.data().userId,
    name: d.data().fullName || d.data().name || 'Sensei'
  }));

  if (referees.length === 0) {
    const userSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'referee')));
    referees = userSnap.docs.map(d => ({
      id: d.id,
      name: d.data().displayName || d.data().fullName || d.data().email || 'Sensei'
    }));
  }

  const shuffledRefs = shuffle(referees);
  const tatamiRefMap = {};
  const tatamiUpdates = [];

  tatamis.forEach((tat, idx) => {
    if (referees.length > 0) {
      const ref = shuffledRefs[idx % shuffledRefs.length];
      tatamiRefMap[tat.id] = { id: ref.id, name: ref.name };
      tatamiUpdates.push({
        ref: doc(db, 'tatamis', tat.id),
        type: 'update',
        data: {
          assignedRefereeId: ref.id,
          assignedRefereeName: ref.name,
          updatedAt: serverTimestamp(),
        }
      });
    } else {
      tatamiRefMap[tat.id] = { id: null, name: null };
    }
  });

  if (tatamiUpdates.length > 0) {
    await commitBatchInChunks(tatamiUpdates);
  }

  const matchQuerySnap = await getDocs(query(collection(db, 'matches'), where('tournamentId', '==', tournamentId)));
  const deleteMatchesOps = matchQuerySnap.docs.map(d => ({ ref: d.ref, type: 'delete' }));
  if (deleteMatchesOps.length > 0) {
    await commitBatchInChunks(deleteMatchesOps);
  }

  const categoryMatchListMap = {};
  const categoriesWithMatches = [];

  for (const cat of categories) {
    const catRegs = childRegs.filter(r => r.categoryId === cat.id);
    if (catRegs.length === 0) continue;

    const athletes = catRegs.map(r => ({
      id: r.athleteId,
      fullName: r.athleteName,
      dojoName: r.dojoName,
      dojoId: r.dojoId,
      belt: r.athleteBelt,
      photoUrl: r.athletePhotoUrl,
      gender: r.athleteGender,
      weight: r.athleteWeight,
    }));

    const format = cat.eventType?.includes('Kata') && !cat.eventType?.includes('Kumite') ? 'Kata' : 'Kumite';

    if (format === 'Kumite') {
      if (athletes.length < 2) continue;
      const { rounds, totalRounds } = buildKumiteBracket(athletes);
      const flatMatches = rounds.flat();
      categoryMatchListMap[cat.id] = flatMatches.map(m => ({
        round: m.round,
        totalRounds,
        matchInRound: m.matchInRound,
        aka: m.aka || null,
        ao: m.ao || null,
        status: m.status || 'queued',
        isBye: m.isBye || false,
        tempId: m.tempId,
        nextMatchTempId: m.nextMatchTempId || null,
        nextMatchSlot: m.nextMatchSlot || null,
        eventType: 'Kumite',
      }));
      categoriesWithMatches.push(cat);
    } else {
      categoryMatchListMap[cat.id] = athletes.map((a, idx) => ({
        round: 1,
        totalRounds: 1,
        matchInRound: idx,
        aka: toAthleteRef(a),
        ao: null,
        status: 'queued',
        isBye: false,
        eventType: 'Kata',
      }));
      categoriesWithMatches.push(cat);
    }
  }

  if (categoriesWithMatches.length === 0) {
    return 0;
  }

  const sortedCategories = sortCategoriesForQueue(categoriesWithMatches);

  const categoryTatamiMap = {};
  sortedCategories.forEach(cat => {
    const randomTatami = tatamis[Math.floor(Math.random() * tatamis.length)];
    categoryTatamiMap[cat.id] = randomTatami;
  });

  const tatamiMatchIndex = {};
  tatamis.forEach(t => { tatamiMatchIndex[t.id] = 1; });

  const persistedMatchRefs = {};
  for (const cat of sortedCategories) {
    const catMatches = categoryMatchListMap[cat.id];
    for (const m of catMatches) {
      m.docRef = doc(collection(db, 'matches'));
      if (m.tempId) {
        persistedMatchRefs[`${cat.id}_${m.tempId}`] = m.docRef.id;
      }
    }
  }

  const createMatchesOps = [];

  for (const cat of sortedCategories) {
    const catMatches = categoryMatchListMap[cat.id];
    const assignedTatami = categoryTatamiMap[cat.id];
    const refereeInfo = tatamiRefMap[assignedTatami.id] || { id: null, name: null };

    const orderedCatMatches = [...catMatches].sort((a, b) => (a.round - b.round) || (a.matchInRound - b.matchInRound));

    for (const m of orderedCatMatches) {
      const currentQueueOrder = tatamiMatchIndex[assignedTatami.id]++;
      const nextMatchId = m.nextMatchTempId ? persistedMatchRefs[`${cat.id}_${m.nextMatchTempId}`] : null;

      const matchDocData = {
        tournamentId,
        tournamentName: tournament.name || '',
        categoryId: cat.id,
        categoryName: cat.name || '',
        eventType: m.eventType,
        round: m.round,
        totalRounds: m.totalRounds,
        matchInRound: m.matchInRound,
        aka: m.aka,
        ao: m.ao,
        status: m.status,
        isBye: m.isBye,
        tatamiId: assignedTatami.id,
        tatamiName: assignedTatami.name,
        refereeId: refereeInfo.id,
        refereeName: refereeInfo.name,
        queueOrder: currentQueueOrder,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userId,
      };

      if (m.eventType === 'Kumite') {
        Object.assign(matchDocData, {
          akaScore: 0,
          aoScore: 0,
          akaPenalties: [],
          aoPenalties: [],
          winner: m.status === 'completed' && m.aka && !m.ao ? {
            side: 'aka',
            athleteId: m.aka.athleteId,
            name: m.aka.name,
            reason: 'walkover',
          } : m.status === 'completed' && !m.aka && m.ao ? {
            side: 'ao',
            athleteId: m.ao.athleteId,
            name: m.ao.name,
            reason: 'walkover',
          } : null,
          timerDurationSeconds: KUMITE_DEFAULT_DURATION,
          timerAccumulatedSeconds: 0,
          timerStartedAt: null,
          isTimerRunning: false,
          nextMatchId: nextMatchId || null,
          nextMatchSlot: m.nextMatchSlot || null,
          notes: '',
          completedAt: m.status === 'completed' ? serverTimestamp() : null,
        });
      } else {
        Object.assign(matchDocData, {
          kataScores: Array.from({ length: KATA_JUDGE_COUNT }, (_, j) => ({ judgeNum: j + 1, score: null })),
          kataFinalScore: null,
          kataName: '',
          judgeCount: KATA_JUDGE_COUNT,
          winner: null,
        });
      }

      createMatchesOps.push({
        ref: m.docRef,
        data: matchDocData,
        type: 'set',
      });
    }
  }

  if (createMatchesOps.length > 0) {
    await commitBatchInChunks(createMatchesOps);
  }

  return createMatchesOps.length;
}
