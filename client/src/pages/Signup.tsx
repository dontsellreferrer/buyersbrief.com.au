import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import signupHTML from './signup.html?raw';

type StoredBriefData = {
  suburb?: string;
  propertyType?: string;
  beds?: string;
  baths?: string;
  parking?: string;
  budget?: string;
  budgetCeiling?: string;
  intent?: string;
  nonNegotiables?: string[];
  needs?: string[];
  wants?: string[];
  niceToHaves?: string[];
  buyerStory?: string;
  timeline?: string;
  financeStatus?: string;
};

type SignupFormData = {
  firstName: string;
  lastName?: string;
  email: string;
  mobile?: string;
  password: string;
};

const getStoredBrief = (): StoredBriefData | null => {
  const raw = sessionStorage.getItem('briefData');
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredBriefData;
  } catch {
    return null;
  }
};

const normalizeIntent = (intent?: string): 'live' | 'invest' | 'both' => {
  if (intent === 'invest' || intent === 'both') return intent;
  return 'live';
};

const extractSignupForm = (): SignupFormData => {
  const activeStep = document.querySelector('#step3pay.active, #step3afford.active') as HTMLElement | null;
  if (!activeStep) {
    throw new Error('Choose your account option before continuing.');
  }

  const inputs = Array.from(activeStep.querySelectorAll<HTMLInputElement>('input.field-input'));
  const firstName = inputs[0]?.value.trim() ?? '';
  const lastName = inputs[1]?.value.trim() || undefined;
  const email = inputs[2]?.value.trim().toLowerCase() ?? '';
  const mobile = inputs[3]?.value.trim() || undefined;
  const password = inputs[4]?.value ?? '';

  if (!firstName) throw new Error('First name is required.');
  if (!email || !email.includes('@')) throw new Error('A valid email address is required.');
  if (password.length < 8) throw new Error('Password must be at least 8 characters.');

  return { firstName, lastName, email, mobile, password };
};

const setSignupBusy = (busy: boolean, message?: string) => {
  const activeStep = document.querySelector('#step3pay.active, #step3afford.active') as HTMLElement | null;
  if (!activeStep) return;

  const button = activeStep.querySelector<HTMLButtonElement>('button.btn-primary');
  if (button) {
    if (!button.dataset.originalLabel) button.dataset.originalLabel = button.innerHTML;
    button.disabled = busy;
    button.style.opacity = busy ? '0.7' : '1';
    button.style.cursor = busy ? 'wait' : 'pointer';
    button.innerHTML = busy ? (message ?? 'Creating account…') : (button.dataset.originalLabel ?? button.innerHTML);
  }
};

const showSignupError = (message: string | null) => {
  document.getElementById('signup-error')?.remove();
  if (!message) return;

  const activeStep = document.querySelector('#step3pay.active, #step3afford.active') as HTMLElement | null;
  const button = activeStep?.querySelector<HTMLButtonElement>('button.btn-primary');
  if (!activeStep || !button) return;

  const error = document.createElement('div');
  error.id = 'signup-error';
  error.style.marginTop = '12px';
  error.style.padding = '12px 14px';
  error.style.border = '1px solid rgba(232, 180, 184, 0.45)';
  error.style.borderRadius = '9px';
  error.style.background = 'rgba(232, 180, 184, 0.1)';
  error.style.color = '#E8B4B8';
  error.style.fontFamily = "'Figtree', sans-serif";
  error.style.fontSize = '12px';
  error.textContent = message;
  button.insertAdjacentElement('afterend', error);
};

export default function Signup() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const signup = trpc.auth.signup.useMutation();
  const createBrief = trpc.brief.create.useMutation();
  const runSearch = trpc.search.run.useMutation();
  const utils = trpc.useUtils();
  const replayStarted = useRef(false);

  const replayStoredBrief = async () => {
    const briefData = getStoredBrief();
    if (!briefData) {
      navigate('/dashboard');
      return;
    }

    const saved = await createBrief.mutateAsync({
      suburb: briefData.suburb ?? '',
      propertyType: briefData.propertyType ?? '',
      beds: briefData.beds ?? '',
      baths: briefData.baths ?? '',
      parking: briefData.parking ?? '',
      budget: briefData.budgetCeiling || briefData.budget || '',
      budgetDisplay: briefData.budgetCeiling || briefData.budget || '',
      intent: normalizeIntent(briefData.intent),
      nonNegotiables: briefData.nonNegotiables ?? [],
      needs: briefData.needs ?? [],
      wants: briefData.wants ?? [],
      niceToHaves: briefData.niceToHaves ?? [],
      buyerStory: briefData.buyerStory ?? '',
      timeline: briefData.timeline ?? '',
      financeStatus: briefData.financeStatus ?? '',
    });

    setSignupBusy(true, 'Liam is finding your matches…');
    await runSearch.mutateAsync({ briefId: saved.brief.id });
    sessionStorage.removeItem('briefData');
    sessionStorage.removeItem('briefBasics');
    await utils.auth.me.invalidate();
    navigate('/dashboard');
  };

  useEffect(() => {
    if (!user || replayStarted.current) return;
    replayStarted.current = true;

    replayStoredBrief().catch((error) => {
      console.error('[Signup] Failed to replay stored brief for signed-in user', error);
      showSignupError(error instanceof Error ? error.message : 'We could not create your match report. Please try again.');
      replayStarted.current = false;
    });
  }, [user]);

  useEffect(() => {
    const showStep = (n: number) => {
      document.querySelectorAll('.step-page').forEach(p => p.classList.remove('active'));

      if (n === 3) {
        if ((window as any).selectedPathType === 'pay') {
          document.getElementById('step3pay')?.classList.add('active');
        } else {
          document.getElementById('step3afford')?.classList.add('active');
          const brokerNextItem = document.getElementById('brokerNextItem');
          if (brokerNextItem) brokerNextItem.style.display = 'flex';
        }
      } else {
        document.getElementById('step' + n)?.classList.add('active');
      }

      (window as any).currentStep = n;
      (window as any).updateNav(n);
      window.scrollTo(0, 0);
    };

    const completeSignupAndBrief = async () => {
      if (replayStarted.current) return;
      showSignupError(null);

      try {
        replayStarted.current = true;
        const form = extractSignupForm();
        setSignupBusy(true, 'Creating account…');
        await signup.mutateAsync(form);
        await utils.auth.me.invalidate();
        setSignupBusy(true, 'Saving your brief…');
        await replayStoredBrief();
      } catch (error) {
        console.error('[Signup] Failed to complete signup handoff', error);
        showSignupError(error instanceof Error ? error.message : 'We could not finish signup. Please check your details and try again.');
        setSignupBusy(false);
        replayStarted.current = false;
      }
    };

    (window as any).goStep = (n: number) => {
      if (n === 4) {
        void completeSignupAndBrief();
        return;
      }
      showStep(n);
    };

    (window as any).updateNav = (n: number) => {
      const steps = [1, 2, 3, 4];
      steps.forEach(s => {
        const el = document.getElementById('ns' + s);
        const num = document.getElementById('nsn' + s);
        if (el && num) {
          el.classList.remove('active', 'done');
          if (s < n) {
            el.classList.add('done');
            num.textContent = '✓';
          } else if (s === n) {
            el.classList.add('active');
            num.textContent = String(s);
          } else {
            num.textContent = String(s);
          }
        }
      });
    };

    (window as any).selectPath = (type: string) => {
      (window as any).selectedPathType = type;
      document.querySelectorAll('.path-card').forEach(c => c.classList.remove('selected-path'));
      const card = document.querySelector('.path-card.' + type);
      if (card) card.classList.add('selected-path');

      const btn = document.getElementById('pathBtn') as HTMLButtonElement;
      const note = document.getElementById('pathNote');
      if (btn && note) {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';

        if (type === 'pay') {
          btn.innerHTML = 'Continue to payment <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="display:inline;vertical-align:middle;margin-left:8px;"><path d="M3 8h10M9 4l4 4-4 4" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
          btn.style.background = 'var(--sky)';
          btn.style.color = 'white';
          note.textContent = '$99/month · cancel anytime from your dashboard';
        } else {
          btn.innerHTML = 'Continue to book my call <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="display:inline;vertical-align:middle;margin-left:8px;"><path d="M3 8h10M9 4l4 4-4 4" stroke="var(--charcoal)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
          btn.style.background = 'var(--rose)';
          btn.style.color = 'var(--charcoal)';
          note.textContent = 'Brief Active free · one 30-min broker call · no obligation';
        }
      }
    };

    (window as any).selectSlot = (el: HTMLElement) => {
      document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected-slot'));
      el.classList.add('selected-slot');
    };

    (window as any).currentStep = 1;
    (window as any).selectedPathType = null;
  }, [signup, utils]);

  return (
    <div dangerouslySetInnerHTML={{ __html: signupHTML }} />
  );
}
