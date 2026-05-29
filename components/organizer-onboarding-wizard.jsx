'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';

// Step components
import Step1Welcome from './onboarding-steps/step-1-welcome';
import Step2TournamentInfo from './onboarding-steps/step-2-tournament-info';
import Step3Categories from './onboarding-steps/step-3-categories';
import Step4Tatamis from './onboarding-steps/step-4-tatamis';
import Step5Referees from './onboarding-steps/step-5-referees';
import Step6RegistrationRules from './onboarding-steps/step-6-registration-rules';
import Step7Publish from './onboarding-steps/step-7-publish';

const STEPS = [
  { number: 1, title: 'Welcome & Overview', description: 'Get started' },
  { number: 2, title: 'Tournament Info', description: 'Basic details' },
  { number: 3, title: 'Divisions & Categories', description: 'Define categories' },
  { number: 4, title: 'Ring / Tatami Setup', description: 'Configure rings' },
  { number: 5, title: 'Assign Referees', description: 'Assign to rings' },
  { number: 6, title: 'Registration Rules', description: 'Set rules' },
  { number: 7, title: 'Publish & Go Live', description: 'Launch' },
];

const STEP_COMPONENTS = [
  Step1Welcome,
  Step2TournamentInfo,
  Step3Categories,
  Step4Tatamis,
  Step5Referees,
  Step6RegistrationRules,
  Step7Publish,
];

export default function OrganizerOnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    tournamentInfo: {},
    categories: [],
    tatamis: [],
    referees: [],
    registrationRules: {},
  });
  const [skippedSteps, setSkippedSteps] = useState(new Set());

  const progress = (currentStep / STEPS.length) * 100;
  const CurrentStepComponent = STEP_COMPONENTS[currentStep - 1];

  const handleNext = (stepData) => {
    setWizardData((prev) => ({
      ...prev,
      ...stepData,
    }));
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    setSkippedSteps((prev) => new Set([...prev, currentStep]));
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const canSkip = currentStep !== 2; // Can't skip tournament info

  return (
    <div className="min-h-screen bg-gradient-to-b from-card to-background py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Tournament Setup Wizard</h1>
          <p className="text-muted-foreground">
            Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].title}
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-3 gap-2">
            {STEPS.map((step) => (
              <button
                key={step.number}
                onClick={() => setCurrentStep(step.number)}
                className={`flex-1 p-2 rounded-lg text-xs font-medium transition ${
                  currentStep === step.number
                    ? 'bg-primary text-white'
                    : currentStep > step.number
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-secondary/40 text-muted-foreground hover:bg-secondary/60'
                }`}
              >
                <div className="hidden sm:block">{step.title}</div>
                <div className="sm:hidden">Step {step.number}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <Card className="border-border/60 mb-8">
          <CardContent className="p-8">
            {CurrentStepComponent && (
              <CurrentStepComponent wizardData={wizardData} onNext={handleNext} />
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex gap-3 justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {canSkip && (
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="text-muted-foreground hover:text-foreground"
              >
                <SkipForward className="h-4 w-4 mr-2" />
                Skip
              </Button>
            )}
          </div>

          <Button
            className="bg-primary hover:bg-primary/90 min-w-[160px]"
            onClick={() => {
              if (currentStep === STEPS.length) {
                // Final step - publish
              } else {
                handleNext({});
              }
            }}
          >
            {currentStep === STEPS.length ? 'Launch Tournament' : 'Next'}
            {currentStep < STEPS.length && <ChevronRight className="h-4 w-4 ml-2" />}
          </Button>
        </div>

        {/* Skip Summary */}
        {skippedSteps.size > 0 && (
          <div className="mt-6 text-xs text-muted-foreground text-center">
            Skipped {skippedSteps.size} step(s). You can edit these anytime from your tournament dashboard.
          </div>
        )}
      </div>
    </div>
  );
}
