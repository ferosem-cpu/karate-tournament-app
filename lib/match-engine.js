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
  const seeded = shuffle(athletes);
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
}

export async function completeKataMatch(matchId, kataScores, kataName = '') {
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
