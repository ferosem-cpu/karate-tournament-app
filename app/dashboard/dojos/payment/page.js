'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createOrganizerLicense } from '@/lib/organizer-license-service';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, CreditCard, ShieldCheck, Trophy, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function PaymentPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [cardName, setCardName] = useState(profile?.displayName || user?.displayName || '');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [billingAddress, setBillingAddress] = useState('');

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!cardNumber || !cardExpiry || !cardCvc) {
      return toast.error('Please complete all card payment details');
    }

    setBusy(true);
    // Simulate payment processing with a sleek micro-animation / loader
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        role: 'tournament_organizer',
        updatedAt: serverTimestamp(),
      });

      // Create organizer license using the service helper (basic plan, 1 month)
      await createOrganizerLicense(user.uid, 'basic', 1);

      toast.success('Payment processed successfully! Profile upgraded to Tournament Organizer.');
      
      // Delay redirect slightly for the toast to sink in, then reload
      setTimeout(() => {
        window.location.href = '/dashboard/tournaments/new';
      }, 1000);
    } catch (err) {
      toast.error(`Payment failed: ${err.message}`);
      setBusy(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/dashboard/dojos" className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white transition">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Dojos
        </Link>
      </div>

      <div className="grid md:grid-cols-[1fr_380px] gap-8 items-start">
        {/* Checkout Form */}
        <Card className="border-zinc-800 bg-zinc-950/80 shadow-xl backdrop-blur-sm">
          <CardHeader className="border-b border-zinc-900 pb-5">
            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-gold-primary" />
              Secure Checkout
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Provide your billing credentials to activate your competition organization license.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-5">
            <form onSubmit={handlePayment} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400">Cardholder Name</Label>
                <Input
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="Sensei Tanaka"
                  className="bg-zinc-900 border-zinc-800 text-white placeholder-zinc-600 focus:border-zinc-700 h-10"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-zinc-400">Card Number</Label>
                <div className="relative">
                  <Input
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                    placeholder="4111 2222 3333 4444"
                    className="bg-zinc-900 border-zinc-800 text-white placeholder-zinc-600 focus:border-zinc-700 h-10 pl-10"
                    required
                  />
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-650" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-400">Expiry (MM/YY)</Label>
                  <Input
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value.slice(0, 5))}
                    placeholder="12/28"
                    className="bg-zinc-900 border-zinc-800 text-white placeholder-zinc-600 focus:border-zinc-700 h-10"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-400">CVC</Label>
                  <Input
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    placeholder="123"
                    className="bg-zinc-900 border-zinc-800 text-white placeholder-zinc-600 focus:border-zinc-700 h-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-zinc-400">Billing Address</Label>
                <Input
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="Dojo 5th Street, Landmark Area"
                  className="bg-zinc-900 border-zinc-800 text-white placeholder-zinc-600 focus:border-zinc-700 h-10"
                  required
                />
              </div>

              <div className="pt-4 border-t border-zinc-900 flex items-center justify-between text-xs text-zinc-500">
                <span className="flex items-center gap-1"><ShieldCheck className="h-4 w-4 text-emerald-500" /> SSL Encrypted Checkout</span>
                <span>Powered by Stripe Sandbox</span>
              </div>

              <Button
                type="submit"
                disabled={busy}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-zinc-950 font-extrabold h-11 transition-all flex items-center justify-center gap-1.5 shadow-lg border-none"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <Trophy className="h-4.5 w-4.5" />
                    <span>Pay $99.00 & Upgrade Profile</span>
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* License Details */}
        <div className="space-y-6">
          <Card className="border-zinc-800 bg-zinc-950 shadow-xl overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-amber-500 to-yellow-600" />
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Badge className="bg-amber-500/10 text-gold-primary border-amber-500/20 text-[10px] font-extrabold uppercase">
                  Premium Tier
                </Badge>
                <h3 className="text-2xl font-black text-white tracking-tight">Organizer License</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Unlock tournament operations. Gain full capabilities to coordinate categories, schedule tatamis, build live brackets, and register athletes.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-zinc-900">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">License Subtotal</span>
                  <span className="font-bold text-white">$99.00</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">Taxes & Fees</span>
                  <span className="font-bold text-emerald-400">Free (Trial)</span>
                </div>
                <div className="flex justify-between items-center text-base pt-3 border-t border-dashed border-zinc-800">
                  <span className="font-bold text-white">Total Amount</span>
                  <span className="font-extrabold text-gold-primary text-lg">$99.00</span>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-zinc-900">
                <div className="flex items-start gap-2 text-xs text-zinc-400">
                  <CheckCircle2 className="h-4.5 w-4.5 text-gold-primary shrink-0 mt-0.5" />
                  <span>Unlimited tournament creation & bracket structures</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-zinc-400">
                  <CheckCircle2 className="h-4.5 w-4.5 text-gold-primary shrink-0 mt-0.5" />
                  <span>Live scoring dashboards & Tatami management</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-zinc-400">
                  <CheckCircle2 className="h-4.5 w-4.5 text-gold-primary shrink-0 mt-0.5" />
                  <span>Bulk registration tools & athlete reporting</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
