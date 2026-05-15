'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Calculator } from 'lucide-react';
import { completeKataMatch } from '@/lib/match-engine';
import { toast } from 'sonner';
import { beltClass } from '@/lib/constants';

export default function KataScoreboard({ match }) {
  const [scores, setScores] = useState([]);
  const [kataName, setKataName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setScores(match.kataScores || Array.from({ length: match.judgeCount || 5 }, (_, i) => ({ judgeNum: i + 1, score: '' })));
    setKataName(match.kataName || '');
  }, [match.id]);

  const isFinished = match.status === 'completed';

  const updateScore = (idx, val) => {
    const arr = [...scores];
    arr[idx] = { ...arr[idx], score: val };
    setScores(arr);
  };

  const computePreview = () => {
    const nums = scores.map((s) => Number(s.score)).filter((n) => !isNaN(n) && n > 0).sort((a, b) => a - b);
    if (nums.length === 0) return { drops: [], kept: [], total: 0 };
    if (nums.length >= 3) {
      const low = nums[0], high = nums[nums.length - 1];
      const kept = nums.slice(1, -1);
      return { drops: [low, high], kept, total: Number(kept.reduce((s, n) => s + n, 0).toFixed(2)) };
    }
    return { drops: [], kept: nums, total: Number(nums.reduce((s, n) => s + n, 0).toFixed(2)) };
  };
  const preview = computePreview();

  const submit = async () => {
    const valid = scores.filter((s) => s.score !== '' && !isNaN(Number(s.score)) && Number(s.score) > 0);
    if (valid.length < scores.length) { if (!confirm(`Only ${valid.length}/${scores.length} judges scored. Submit anyway?`)) return; }
    setBusy(true);
    try {
      const final = await completeKataMatch(match.id, scores.map((s) => ({ judgeNum: s.judgeNum, score: s.score === '' ? null : Number(s.score) })), kataName);
      toast.success(`Kata complete · Final score ${final.toFixed(2)}`);
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-gradient-to-br from-red-900/30 via-card to-amber-900/10">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 ring-4 ring-primary/30">
              <AvatarImage src={match.aka?.photoUrl} />
              <AvatarFallback className="bg-primary/20 text-primary text-2xl">{(match.aka?.name || '?').slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Kata Performer</div>
              <h2 className="text-2xl font-bold">{match.aka?.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">{match.aka?.dojoName || '—'}</span>
                {match.aka?.belt && <Badge variant="outline" className={`${beltClass(match.aka.belt)} text-[10px]`}>{match.aka.belt}</Badge>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Final</div>
              <div className="text-5xl font-black text-gold tabular-nums">{(match.kataFinalScore != null ? match.kataFinalScore : preview.total).toFixed(2)}</div>
            </div>
          </div>
          <div className="mt-4">
            <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-1.5">Kata Performed (optional)</label>
            <Input value={kataName} onChange={(e) => setKataName(e.target.value)} placeholder="e.g. Heian Shodan, Bassai Dai…" disabled={isFinished} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Calculator className="h-4 w-4 text-primary" /> Judge Panel · {scores.length} judges</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {scores.map((s, i) => {
              const num = Number(s.score);
              const isHigh = preview.drops.includes(num) && preview.drops.indexOf(num) === 1;
              const isLow = preview.drops.includes(num) && preview.drops.indexOf(num) === 0;
              return (
                <div key={i} className={`rounded-lg border p-3 ${isHigh ? 'border-red-500/50 bg-red-500/5' : isLow ? 'border-blue-500/50 bg-blue-500/5' : 'border-border bg-secondary/30'}`}>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Judge {s.judgeNum}</div>
                  <Input
                    type="number" step="0.1" min="0" max="10"
                    value={s.score} onChange={(e) => updateScore(i, e.target.value)}
                    disabled={isFinished}
                    className="h-14 text-center text-2xl font-bold tabular-nums bg-background"
                    placeholder="0.0"
                  />
                  {isHigh && <div className="text-[10px] text-red-300 text-center mt-1">Dropped (high)</div>}
                  {isLow && <div className="text-[10px] text-blue-300 text-center mt-1">Dropped (low)</div>}
                </div>
              );
            })}
          </div>
          {!isFinished && (
            <div className="mt-5 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {scores.length >= 3 ? 'Highest & lowest dropped · sum of middle ' + (scores.length - 2) + ' scores' : 'Sum of all scores'}
                {preview.kept.length > 0 && <span> · Kept: {preview.kept.join(' + ')} = <span className="text-foreground font-semibold">{preview.total}</span></span>}
              </div>
              <Button onClick={submit} disabled={busy} className="bg-primary hover:bg-primary/90 min-w-[180px] h-11"><Trophy className="h-4 w-4 mr-2" /> Save & Complete</Button>
            </div>
          )}
          {isFinished && (
            <div className="mt-5 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-center">
              <Trophy className="h-6 w-6 mx-auto text-emerald-400 mb-1" />
              <div className="font-semibold text-emerald-300">Kata Complete · Final {(match.kataFinalScore || 0).toFixed(2)}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
