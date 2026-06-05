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
  const raw = sessionStorage.getItem('briefData') || sessionStorage.getItem('briefBasics');
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredBriefData;
  } catch {
    return null;
  }
};

const hasUsableBrief = (brief: StoredBriefData | null): brief is StoredBriefData => {
  if (!brief) return false;
  return Boolean(
    brief.suburb?.trim() ||
    brief.budget?.trim() ||
    brief.budgetCeiling?.trim() ||
    brief.beds?.trim() ||
    brief.propertyType?.trim() ||
    (brief.nonNegotiables?.length ?? 0) > 0 ||
    (brief.needs?.length ?? 0) > 0 ||
    (brief.wants?.length ?? 0) > 0
  );
};

const escapeHtml = (value: string): string => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const titleCase = (value?: string): string => {
  if (!value) return '';
  return value
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const compactList = (items: Array<string | undefined | null>): string => items
  .map((item) => item?.trim())
  .filter(Boolean)
  .join(' · ');

const summarizeBrief = (brief: StoredBriefData): string => {
  const area = brief.suburb?.trim() || 'your selected area';
  const beds = brief.beds ? `${brief.beds}+ bed` : '';
  const type = titleCase(brief.propertyType) || 'property';
  const budget = brief.budgetCeiling || brief.budget || '';
  return compactList([area, beds, type, budget ? `to ${budget}` : '']);
};

const featureSummary = (brief: StoredBriefData): string => {
  const features = [
    ...(brief.nonNegotiables ?? []),
    ...(brief.needs ?? []),
    ...(brief.wants ?? []),
  ].map((item) => item.trim()).filter(Boolean);
  return features.length > 0 ? features.slice(0, 3).join(', ') : 'needs, wants, and watch-outs from your saved brief';
};

const hydrateSignupPreview = (navigate: (path: string) => void) => {
  const brief = getStoredBrief();
  const stepSub = document.querySelector<HTMLElement>('#step1 .step-left > .step-sub');
  const liamText = document.querySelector<HTMLElement>('#step1 .liam-text');
  const headerText = document.querySelector<HTMLElement>('#step1 .results-header-text');
  const headerSub = document.querySelector<HTMLElement>('#step1 .results-header-sub');
  const resultsCount = document.querySelector<HTMLElement>('#step1 .results-count');
  const resultsItems = document.querySelector<HTMLElement>('#step1 .results-items');
  const footerText = document.querySelector<HTMLElement>('#step1 .results-footer-text');
  const cta = document.querySelector<HTMLButtonElement>('#step1 .step-right button.btn-primary');
  const ctaNote = document.querySelector<HTMLElement>('#step1 .btn-note');

  if (!hasUsableBrief(brief)) {
    if (stepSub) stepSub.textContent = 'There is no saved buyer brief in this browser session yet. Create a brief first so Liam can run a real AI match search against your own criteria.';
    if (liamText) liamText.textContent = 'I won’t show sample properties here. Build your brief first, then I’ll save it to your account and run the real AI search for your dashboard.';
    if (headerText) headerText.textContent = 'No saved brief yet';
    if (headerSub) headerSub.textContent = 'Create a brief to start a real search';
    if (resultsCount) resultsCount.textContent = '0 found';
    if (resultsItems) {
      resultsItems.innerHTML = `
        <div class="results-item">
          <div class="results-item-rank">→</div>
          <div class="results-item-addr">Create your buyer brief to unlock real AI matches</div>
          <div class="results-item-badge">NO SAMPLE DATA</div>
          <div class="results-item-price">Pending</div>
        </div>
      `;
    }
    if (footerText) footerText.textContent = 'Sample properties have been removed. Your results will be generated from your own saved brief.';
    if (cta) {
      cta.textContent = 'Create my buyer brief';
      cta.onclick = () => navigate('/brief');
    }
    if (ctaNote) ctaNote.textContent = 'Takes 3 minutes · no demo properties shown';
    return;
  }

  const summary = summarizeBrief(brief);
  const escapedSummary = escapeHtml(summary);
  const escapedFeatures = escapeHtml(featureSummary(brief));
  const budget = escapeHtml(brief.budgetCeiling || brief.budget || 'Budget to be confirmed');
  const typeAndBeds = escapeHtml(compactList([brief.beds ? `${brief.beds}+ bed` : '', titleCase(brief.propertyType) || 'Property']) || 'Property criteria saved');

  if (stepSub) {
    stepSub.innerHTML = `Based on your saved brief — <strong>${escapedSummary}</strong> — Liam will run the real AI search after your account is created and send the saved matches to your dashboard.`;
  }
  if (liamText) {
    liamText.textContent = 'I have your brief saved. Create your account and I’ll run the AI search against this exact brief, then send you to your dashboard with the real saved matches.';
  }
  if (headerText) headerText.textContent = `Your brief · ${summary}`;
  if (headerSub) headerSub.textContent = 'Ready for live AI search after signup';
  if (resultsCount) resultsCount.textContent = 'Ready';
  if (resultsItems) {
    resultsItems.innerHTML = `
      <div class="results-item">
        <div class="results-item-rank">#1</div>
        <div class="results-item-addr">Search area: ${escapeHtml(brief.suburb || 'Saved area')}</div>
        <div class="results-item-badge">BRIEF READY</div>
        <div class="results-item-price">${budget}</div>
      </div>
      <div class="results-item">
        <div class="results-item-rank">#2</div>
        <div class="results-item-addr">Hard filters: ${escapedFeatures}</div>
        <div class="results-item-badge" style="background:rgba(76,175,125,0.12);color:var(--green);">CRITERIA</div>
        <div class="results-item-price">${typeAndBeds}</div>
      </div>
      <div class="results-item">
        <div class="results-item-rank">#3</div>
        <div class="results-item-addr">Dashboard matches will be generated and saved after signup</div>
        <div class="results-item-badge">AI SEARCH</div>
        <div class="results-item-price">Pending</div>
      </div>
    `;
  }
  if (footerText) footerText.textContent = 'No sample properties shown. Your dashboard will populate from the live AI search after account creation.';
  if (cta) {
    cta.innerHTML = 'Activate my brief <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    cta.onclick = () => (window as any).goStep(2);
  }
  if (ctaNote) ctaNote.textContent = 'Takes 2 minutes · real search runs after signup';
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
    if (!hasUsableBrief(briefData)) {
      navigate('/brief');
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

    setSignupBusy(true, 'Liam is preparing your dashboard…');
    try {
      await runSearch.mutateAsync({ briefId: saved.brief.id });
    } catch (error) {
      console.warn('[Signup] Search generation failed after brief save; continuing to dashboard', error);
    }
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
    hydrateSignupPreview(navigate);

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
  }, [signup, utils, navigate]);

  return (
    <div dangerouslySetInnerHTML={{ __html: signupHTML }} />
  );
}
