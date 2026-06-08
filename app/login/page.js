'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Trophy, Mail, UserPlus, ShieldAlert } from 'lucide-react';

export default function LoginPage() {
  const { user, profile, loading, signInEmail, signUpEmail, signInGoogle } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    if (!loading && user) {
      if (profile?.role === 'dojo_admin') {
        router.replace('/dashboard/dojos');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [user, profile, loading, router]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signInEmail(email, password);
      toast.success('Welcome back!');
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
    } catch (err) {
      toast.error(err.message || 'Google sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 relative bg-zinc-950 text-zinc-100">
      
      {/* Left Panel - Clean Dark Brand Layout */}
      <div className="hidden lg:flex relative z-10 bg-zinc-950 border-r border-zinc-900 justify-between p-12 flex-col w-full">
        <div className="flex items-center gap-3">
          <img
            src="https://customer-assets.emergentagent.com/job_kohai-platform/artifacts/kx7xfew2_platformlogo.png"
            alt="Logo"
            className="h-12 w-12 rounded-lg object-cover ring-1 ring-zinc-800"
          />
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-white leading-none">
              TOURNAMENT HUB
            </span>
            <span className="text-[9px] text-zinc-400 font-semibold tracking-wider uppercase mt-1">
              GLOBAL COMPETITION PLATFORM
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight text-white">
            Run world-class tournaments.
          </h1>
          <p className="text-base text-zinc-400 max-w-sm leading-relaxed">
            Manage registrations, dojo roster directories, competitors, categories, tatamis, and live bracket states in one integrated platform.
          </p>
          
          <div className="flex gap-6 pt-4 border-t border-zinc-900">
            <Stat label="Tournaments" value="Active" />
            <Stat label="Dojos" value="Registered" />
            <Stat label="Athletes" value="Verified" />
          </div>
        </div>

        <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
          © 2026 Tournament Hub • Global Competition Platform
        </div>
      </div>

      {/* Right Panel - Sleek Minimal Floating Login Card */}
      <div className="flex items-center justify-center p-6 lg:p-12 relative z-10 lg:col-start-2 bg-zinc-900">
        <Card className="w-full max-w-md border border-zinc-800 bg-zinc-950 shadow-2xl rounded-xl overflow-hidden">
          <CardContent className="p-8">
            
            {/* Mobile Header View */}
            <div className="flex lg:hidden items-center gap-3 mb-6 border-b border-zinc-900 pb-4">
              <img
                src="https://customer-assets.emergentagent.com/job_kohai-platform/artifacts/kx7xfew2_platformlogo.png"
                alt="Logo"
                className="h-10 w-10 rounded-md object-cover"
              />
              <div className="flex flex-col">
                <span className="font-bold text-sm text-white tracking-tight leading-none">
                  TOURNAMENT HUB
                </span>
                <span className="text-[8px] text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">
                  GLOBAL PLATFORM
                </span>
              </div>
            </div>

            <h2 className="text-2xl font-extrabold text-zinc-50 tracking-tight mb-1">
              Welcome
            </h2>
            <p className="text-xs text-zinc-400 mb-6 font-medium">
              Access your workspace portal.
            </p>

            <Button 
              variant="outline" 
              className="w-full mb-5 border-zinc-800 bg-zinc-900 hover:bg-zinc-850 text-zinc-100 transition-all font-semibold" 
              onClick={handleGoogle} 
              disabled={busy}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 mr-2" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Continue with Google</span>
            </Button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-zinc-950 px-3 text-zinc-500 font-semibold tracking-wider">or sign in with email</span>
              </div>
            </div>

            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-zinc-900 p-1 rounded-lg">
                <TabsTrigger 
                  value="signin" 
                  className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white font-semibold text-xs"
                >
                  <Mail className="w-3.5 h-3.5 mr-1.5" />
                  <span>Sign In</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="signup" 
                  className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white font-semibold text-xs"
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                  <span>Register</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-4">
                <form onSubmit={handleEmailLogin} className="space-y-3.5">
                  <div className="space-y-1">
                    <Label htmlFor="email" className="font-semibold text-zinc-400 text-xs">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required 
                      placeholder="sensei@dojo.com" 
                      className="border-zinc-800 focus:border-zinc-700 bg-zinc-950 text-white h-9 rounded-md outline-none" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="password" className="font-semibold text-zinc-400 text-xs">Password</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required 
                      placeholder="••••••••" 
                      className="border-zinc-800 focus:border-zinc-700 bg-zinc-950 text-white h-9 rounded-md outline-none" 
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold text-xs py-5 rounded-md transition-colors mt-2" 
                    disabled={busy}
                  >
                    {busy && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />} 
                    <span>Sign In</span>
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-4">
                <form onSubmit={handleEmailSignup} className="space-y-3.5">
                  <div className="space-y-1">
                    <Label htmlFor="name" className="font-semibold text-zinc-400 text-xs">Sensei / Full Name</Label>
                    <Input 
                      id="name" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      required 
                      placeholder="Sensei Tanaka" 
                      className="border-zinc-800 focus:border-zinc-700 bg-zinc-950 text-white h-9 rounded-md outline-none" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email2" className="font-semibold text-zinc-400 text-xs">Email Address</Label>
                    <Input 
                      id="email2" 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required 
                      placeholder="sensei@dojo.com" 
                      className="border-zinc-800 focus:border-zinc-700 bg-zinc-950 text-white h-9 rounded-md outline-none" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="password2" className="font-semibold text-zinc-400 text-xs">Secure Password</Label>
                    <Input 
                      id="password2" 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required 
                      placeholder="Minimum 6 characters" 
                      className="border-zinc-800 focus:border-zinc-700 bg-zinc-950 text-white h-9 rounded-md outline-none" 
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold text-xs py-5 rounded-md transition-colors mt-2" 
                    disabled={busy}
                  >
                    {busy && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />} 
                    <span>Register Account</span>
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
    <div className="space-y-0.5">
      <div className="text-lg font-bold text-white tracking-tight leading-none">{value}</div>
      <div className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">{label}</div>
    </div>
  );
}