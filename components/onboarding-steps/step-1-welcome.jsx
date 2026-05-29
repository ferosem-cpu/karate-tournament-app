'use client';

import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

export default function Step1Welcome({ onNext }) {
  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center mb-6">
        <CheckCircle className="h-16 w-16 text-primary" />
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-2">Welcome to Tournament Setup!</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          This guided wizard will help you set up your first tournament from scratch in just 7 easy steps.
        </p>
      </div>

      <div className="bg-secondary/30 rounded-lg p-6 max-w-md mx-auto text-left space-y-3">
        <h3 className="font-semibold">What you'll set up:</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span>Tournament details (name, dates, location)</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span>Divisions & categories (age, belt, weight)</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span>Rings/Tatamis for competition</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span>Referee assignments</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span>Registration rules</span>
          </li>
        </ul>
      </div>

      <p className="text-xs text-muted-foreground">
        Estimated time: 10-15 minutes
      </p>

      <Button
        onClick={() => onNext({})}
        className="bg-primary hover:bg-primary/90"
      >
        Get Started
      </Button>
    </div>
  );
}
