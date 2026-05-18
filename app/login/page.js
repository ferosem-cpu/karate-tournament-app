'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Trophy, Swords } from 'lucide-react';

export default function LoginPage() {
  const { user, loading, signInEmail, signUpEmail, signInGoogle } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signInEmail(email, password);
      toast.success('Welcome back!');
      router.replace('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signUpEmail(email, password, name);
      toast.success('Account created!');
      router.replace('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Signup failed');
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    try {
      await signInGoogle();
      toast.success('Signed in with Google');
      router.replace('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Google sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 relative overflow-hidden">
      {/* Background watermark logo (whole screen) */}
      <img
        src="https://customer-assets.emergentagent.com/job_kohai-platform/artifacts/kx7xfew2_platformlogo.png"
        alt=""
        aria-hidden
        className="pointer-events-none select-none absolute -right-32 top-1/2 -translate-y-1/2 w-[900px] max-w-none opacity-[0.04] blur-sm"
      />
      <img
        src="https://customer-assets.emergentagent.com/job_kohai-platform/artifacts/kx7xfew2_platformlogo.png"
        alt=""
        aria-hidden
        className="pointer-events-none select-none absolute -left-48 -bottom-48 w-[600px] max-w-none opacity-[0.06] rotate-12"
      />

      {/* Left brand panel */}
      <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-black via-zinc-950 to-red-950">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-accent/10 blur-3xl" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-4">
            <img
              src="https://customer-assets.emergentagent.com/job_kohai-platform/artifacts/kx7xfew2_platformlogo.png"
              alt="Tournament Hub"
              className="h-16 w-16 rounded-xl object-cover ring-1 ring-border/60 shadow-xl shadow-primary/40"
            />
            <div>
              <div className="text-3xl font-extrabold tracking-tight leading-none">TOURNAMENT HUB</div>
              <div className="text-sm text-muted-foreground mt-1.5">Global Competition Platform</div>
            </div>
          </div>
          <div className="space-y-6">
            <h1 className="text-5xl font-extrabold leading-tight tracking-tight">
              Run world-class <span className="text-gold">tournaments</span>.
            </h1>
            <p className="text-lg text-muted-foreground max-w-md">
              From karate to global competitions — manage registrations, dojos, athletes, categories, tatamis and live brackets in one place.
            </p>
            <div className="flex gap-6 pt-4">
              <Stat label="Tournaments" value="∞" />
              <Stat label="Dojos" value="∞" />
              <Stat label="Athletes" value="∞" />
            </div>
          </div>
          <div className="text-xs text-muted-foreground">© 2025 Tournament Hub · Built for India, ready for the world.</div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 lg:p-12 relative z-10 lg:col-start-2">
        <Card className="w-full max-w-md border-border/60 bg-card/70 backdrop-blur-md shadow-2xl">
          <CardContent className="p-8">
            <div className="flex lg:hidden items-center gap-3 mb-6">
              <img
                src="https://customer-assets.emergentagent.com/job_kohai-platform/artifacts/kx7xfew2_platformlogo.png"
                alt="Tournament Hub"
                className="h-14 w-14 rounded-lg object-cover shadow-lg shadow-primary/30"
              />
              <div>
                <div className="font-extrabold text-xl tracking-tight">TOURNAMENT HUB</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Global Competition</div>
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-1">Welcome</h2>
            <p className="text-sm text-muted-foreground mb-6">Sign in to manage your tournaments.</p>

            <Button variant="outline" className="w-full mb-5" onClick={handleGoogle} disabled={busy}>
              <GoogleIcon /> Continue with Google
            </Button>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or with email</span>
              </div>
            </div>

            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Create Account</TabsTrigger>
              </TabsList>
              <TabsContent value="signin" className="mt-4">
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@dojo.com" />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
                  </div>
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={busy}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup" className="mt-4">
                <form onSubmit={handleEmailSignup} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Sensei Tanaka" />
                  </div>
                  <div>
                    <Label htmlFor="email2">Email</Label>
                    <Input id="email2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@dojo.com" />
                  </div>
                  <div>
                    <Label htmlFor="password2">Password</Label>
                    <Input id="password2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Min 6 chars" />
                  </div>
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={busy}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-3xl font-bold text-gold">{value}</div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 mr-2">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.3 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.4 1 7.4 2.8l5.7-5.7C33.5 6.3 28.9 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.5-8 19.5-20 0-1.2-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c2.8 0 5.4 1 7.4 2.8l5.7-5.7C33.5 6.3 28.9 4 24 4 16.5 4 9.9 8.4 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.1 0 9.7-2 13.1-5.1l-6-5.1C29.2 35.3 26.7 36 24 36c-5.3 0-9.7-2.7-11.3-7l-6.5 5C9.7 39.6 16.3 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.4 4.3-4.5 5.6l6 5.1C40.7 35.1 44 30 44 24c0-1.2-.1-2.4-.4-3.5z" />
    </svg>
  );
}
