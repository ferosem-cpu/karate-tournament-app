'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/page-header';
import { Pencil, ExternalLink, Calendar, MapPin, FileText, Trophy, Copy, Grid3x3, Users } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, statusColor, statusLabel } from '@/lib/utils';

export default function TournamentDetailPage() {
  const { id } = useParams();
  const [t, setT] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'tournaments', id), (s) => {
      if (s.exists()) setT({ id: s.id, ...s.data() });
      else setT(null);
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/t/${id}` : '';

  const copy = () => { navigator.clipboard.writeText(publicUrl); toast.success('Public link copied'); };

  if (loading) return <div className="text-muted-foreground text-sm">Loading…</div>;
  if (!t) return <div className="text-muted-foreground text-sm">Tournament not found.</div>;

  return (
    <>
      <PageHeader
        title={t.name}
        breadcrumb={[{ label: 'Tournaments', href: '/dashboard/tournaments' }, { label: t.name }]}
        actions={
          <>
            <Button variant="outline" onClick={copy}><Copy className="h-4 w-4 mr-2" /> Copy public link</Button>
            <Button asChild variant="outline"><Link href={`/t/${id}`} target="_blank"><ExternalLink className="h-4 w-4 mr-2" /> Public Page</Link></Button>
            <Button asChild className="bg-primary hover:bg-primary/90"><Link href={`/dashboard/tournaments/${id}/edit`}><Pencil className="h-4 w-4 mr-2" /> Edit</Link></Button>
          </>
        }
      />

      {/* Hero card */}
      <Card className="border-border/60 overflow-hidden mb-6">
        <div className="relative h-56 md:h-72 bg-gradient-to-br from-zinc-900 to-zinc-950">
          {t.bannerUrl ? (
            <img src={t.bannerUrl} alt="" className="h-full w-full object-cover" />
          ) : <div className="h-full w-full bg-grid opacity-30" />}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
          <Badge variant="outline" className={`absolute top-4 right-4 ${statusColor(t.status)}`}>{statusLabel(t.status)}</Badge>
        </div>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-5 -mt-16 relative z-10">
            {t.logoUrl ? (
              <img src={t.logoUrl} alt="" className="h-24 w-24 rounded-lg object-cover ring-4 ring-card shadow-2xl shrink-0" />
            ) : (
              <div className="h-24 w-24 rounded-lg gradient-red-gold flex items-center justify-center ring-4 ring-card shrink-0">
                <Trophy className="h-12 w-12 text-white" />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-bold">{t.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t.organizerName}</p>
              <div className="flex flex-wrap gap-4 mt-4 text-sm">
                <InfoItem icon={Calendar} text={`${formatDate(t.startDate)} → ${formatDate(t.endDate)}`} />
                <InfoItem icon={MapPin} text={`${t.venue || '—'}, ${t.city || '—'}, ${t.country || '—'}`} />
                <InfoItem icon={Grid3x3} text={`${t.numberOfTatamis || 1} Tatamis`} />
              </div>
            </div>
          </div>
          {t.description && <p className="text-sm text-foreground/80 mt-6 leading-relaxed">{t.description}</p>}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card className="border-border/60"><CardContent className="p-5">
          <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center"><Users className="h-5 w-5 text-primary" /></div>
            <div><div className="text-2xl font-bold">0</div><div className="text-xs text-muted-foreground uppercase tracking-wider">Registrations</div></div>
          </div>
        </CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-5">
          <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center"><Grid3x3 className="h-5 w-5 text-primary" /></div>
            <div><div className="text-2xl font-bold">{t.numberOfTatamis || 1}</div><div className="text-xs text-muted-foreground uppercase tracking-wider">Tatamis</div></div>
          </div>
        </CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-5">
          <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center"><Calendar className="h-5 w-5 text-primary" /></div>
            <div><div className="text-sm font-bold">{formatDate(t.registrationDeadline)}</div><div className="text-xs text-muted-foreground uppercase tracking-wider">Reg. Deadline</div></div>
          </div>
        </CardContent></Card>
      </div>

      {/* Branding assets */}
      <Card className="border-border/60 mb-6">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Branding & Media</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <AssetCard label="Logo" url={t.logoUrl} type="image" />
            <AssetCard label="Banner" url={t.bannerUrl} type="image" />
            <AssetCard label="Brochure" url={t.brochureUrl} type="pdf" name={t.brochureName} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-2">Public Tournament Page</h3>
          <p className="text-sm text-muted-foreground mb-4">Share this URL with dojos, kohai, and spectators.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <code className="flex-1 px-3 py-2 rounded-md bg-background border border-border text-xs sm:text-sm break-all">{publicUrl}</code>
            <Button variant="outline" onClick={copy}><Copy className="h-4 w-4 mr-2" /> Copy</Button>
            <Button asChild className="bg-primary hover:bg-primary/90"><Link href={`/t/${id}`} target="_blank"><ExternalLink className="h-4 w-4 mr-2" /> Open</Link></Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function InfoItem({ icon: Icon, text }) {
  return <div className="flex items-center gap-1.5 text-muted-foreground"><Icon className="h-4 w-4" /> <span className="text-foreground/90">{text}</span></div>;
}

function AssetCard({ label, url, type, name }) {
  return (
    <div className="rounded-md border border-border bg-secondary/30 overflow-hidden">
      <div className="aspect-video bg-zinc-950 flex items-center justify-center">
        {!url ? (
          <div className="text-xs text-muted-foreground">Not uploaded</div>
        ) : type === 'image' ? (
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 p-4"><FileText className="h-8 w-8 text-primary" /><div className="text-xs truncate max-w-[160px]">{name || 'Brochure.pdf'}</div></div>
        )}
      </div>
      <div className="p-3 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        {url && <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Open</a>}
      </div>
    </div>
  );
}
