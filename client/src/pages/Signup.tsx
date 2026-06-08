import { useEffect, useLayoutEffect, useRef } from 'react';
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

type PreviewMatch = {
  address: string;
  suburb?: string | null;
  state?: string | null;
  postcode?: string | null;
  propertyType?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parking?: string | null;
  landSizeM2?: number | null;
  price?: number | null;
  priceDisplay?: string | null;
  daysOnMarket?: number | null;
  listingStatus?: 'active' | 'price_drop' | 'under_offer' | 'off_market' | 'sold';
  listingUrl?: string | null;
  score?: number;
  scoreBreakdown?: Record<string, unknown> | null;
  liamNote?: string | null;
  rawJson?: Record<string, unknown> | null;
  status?: 'new' | 'hotlisted' | 'rejected' | 'purchased';
};

const PREVIEW_MATCHES_KEY = 'briefPreviewMatches';

const getStoredBrief = (): StoredBriefData | null => {
  const raw = sessionStorage.getItem('briefData') || sessionStorage.getItem('briefBasics');
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredBriefData;
  } catch {
    return null;
  }
};

const isTrustedPreviewMatch = (item: unknown): item is PreviewMatch => {
  if (!item || typeof item !== 'object' || !('address' in item)) return false;
  const rawJson = (item as PreviewMatch).rawJson;
  return Boolean(
    rawJson &&
    rawJson._buyersbriefSource === 'gpt4o_web_search_preview' &&
    rawJson._buyersbriefProvider === 'openai' &&
    rawJson._verifiedRenderedListingSearch === true
  );
};

const getStoredPreviewMatches = (): PreviewMatch[] => {
  const raw = sessionStorage.getItem(PREVIEW_MATCHES_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const trusted = parsed.filter(isTrustedPreviewMatch);
    if (trusted.length !== parsed.length) {
      sessionStorage.removeItem(PREVIEW_MATCHES_KEY);
      return [];
    }
    return trusted;
  } catch {
    sessionStorage.removeItem(PREVIEW_MATCHES_KEY);
    return [];
  }
};

const setStoredPreviewMatches = (matches: PreviewMatch[]) => {
  const trusted = matches.filter(isTrustedPreviewMatch);
  if (trusted.length === 0) {
    sessionStorage.removeItem(PREVIEW_MATCHES_KEY);
    return;
  }
  sessionStorage.setItem(PREVIEW_MATCHES_KEY, JSON.stringify(trusted));
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

const safeExternalUrl = (value?: string | null): string | null => {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:') return url.toString();
  } catch {
    return null;
  }
  return null;
};

const linkedAddressHtml = (match: PreviewMatch): string => {
  const label = escapeHtml(matchAddress(match));
  const href = safeExternalUrl(match.listingUrl);
  if (!href) return label;
  return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" title="Open the verified property listing" style="color:inherit;text-decoration-color:rgba(127,168,212,0.55);text-underline-offset:3px;">${label}</a>`;
};

const titleCase = (value?: string | null): string => {
  if (!value) return '';
  return value
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const compactList = (items: Array<string | undefined | null>): string => items
  .map((item) => item?.trim())
  .filter(Boolean)
  .join(' · ');

const formatBudget = (brief: StoredBriefData): string => brief.budgetCeiling || brief.budget || '';

const summarizeBrief = (brief: StoredBriefData): string => {
  const area = brief.suburb?.trim() || 'your selected area';
  const beds = brief.beds ? `${brief.beds}+ bed` : '';
  const type = titleCase(brief.propertyType) || 'property';
  const budget = formatBudget(brief);
  return compactList([area, beds, type, budget ? `to ${budget}` : '']);
};

const normalizeIntent = (intent?: string): 'live' | 'invest' | 'both' => {
  if (intent === 'invest' || intent === 'both') return intent;
  return 'live';
};

const makeBriefPayload = (brief: StoredBriefData) => ({
  suburb: brief.suburb ?? '',
  propertyType: brief.propertyType ?? '',
  beds: brief.beds ?? '',
  baths: brief.baths ?? '',
  parking: brief.parking ?? '',
  budget: brief.budgetCeiling || brief.budget || '',
  budgetDisplay: brief.budgetCeiling || brief.budget || '',
  intent: normalizeIntent(brief.intent),
  nonNegotiables: brief.nonNegotiables ?? [],
  needs: brief.needs ?? [],
  wants: brief.wants ?? [],
  niceToHaves: brief.niceToHaves ?? [],
  buyerStory: brief.buyerStory ?? '',
  timeline: brief.timeline ?? '',
  financeStatus: brief.financeStatus ?? '',
});

const renderNoBriefState = (navigate: (path: string) => void) => {
  const stepSub = document.querySelector<HTMLElement>('#step1 .step-left > .step-sub');
  const liamText = document.querySelector<HTMLElement>('#step1 .liam-text');
  const headerText = document.querySelector<HTMLElement>('#step1 .results-header-text');
  const headerSub = document.querySelector<HTMLElement>('#step1 .results-header-sub');
  const resultsCount = document.querySelector<HTMLElement>('#step1 .results-count');
  const resultsItems = document.querySelector<HTMLElement>('#step1 .results-items');
  const footerText = document.querySelector<HTMLElement>('#step1 .results-footer-text');
  const cta = document.querySelector<HTMLButtonElement>('#step1 .step-right button.btn-primary');
  const ctaNote = document.querySelector<HTMLElement>('#step1 .btn-note');

  if (stepSub) stepSub.textContent = 'Create a buyer brief first and Liam will run the free search here before you choose whether to activate your account.';
  if (liamText) liamText.textContent = 'I need your buyer brief before I can search. No signup is required for the free search results.';
  if (headerText) headerText.textContent = 'No buyer brief found';
  if (headerSub) headerSub.textContent = 'Start with your criteria to run a free search';
  if (resultsCount) resultsCount.textContent = '0 found';
  if (resultsItems) {
    resultsItems.innerHTML = `
      <div class="results-item">
        <div class="results-item-rank">→</div>
        <div class="results-item-addr">Create your buyer brief to run Liam's free search</div>
        <div class="results-item-badge">START BRIEF</div>
        <div class="results-item-price">Free</div>
      </div>
    `;
  }
  if (footerText) footerText.textContent = 'Your free search results will appear on this page before signup.';
  if (cta) {
    cta.textContent = 'Create my buyer brief';
    cta.onclick = () => navigate('/brief');
  }
  if (ctaNote) ctaNote.textContent = 'Free search first · signup only if you want the dashboard';
};

const renderPreviewLoading = (brief: StoredBriefData) => {
  const summary = summarizeBrief(brief);
  const stepSub = document.querySelector<HTMLElement>('#step1 .step-left > .step-sub');
  const liamText = document.querySelector<HTMLElement>('#step1 .liam-text');
  const headerText = document.querySelector<HTMLElement>('#step1 .results-header-text');
  const headerSub = document.querySelector<HTMLElement>('#step1 .results-header-sub');
  const resultsCount = document.querySelector<HTMLElement>('#step1 .results-count');
  const resultsItems = document.querySelector<HTMLElement>('#step1 .results-items');
  const footerText = document.querySelector<HTMLElement>('#step1 .results-footer-text');

  if (stepSub) stepSub.innerHTML = `Based on your brief — <strong>${escapeHtml(summary)}</strong> — Liam is running your free search now.`;
  if (liamText) liamText.textContent = 'Searching against your buyer criteria now. You do not need to sign up to see these results.';
  if (headerText) headerText.textContent = `Your brief · ${summary}`;
  if (headerSub) headerSub.textContent = 'Running free API search now';
  if (resultsCount) resultsCount.textContent = 'Searching';
  if (resultsItems) {
    resultsItems.innerHTML = [1, 2, 3].map((rank) => `
      <div class="results-item">
        <div class="results-item-rank">#${rank}</div>
        <div class="results-item-addr">Searching for a real match…</div>
        <div class="results-item-badge">API SEARCH</div>
        <div class="results-item-price">Loading</div>
      </div>
    `).join('');
  }
  if (footerText) footerText.textContent = 'Live search in progress · results will be saved to your dashboard only if you sign up.';
};

const renderPreviewError = (brief: StoredBriefData, message: string) => {
  const liamText = document.querySelector<HTMLElement>('#step1 .liam-text');
  const headerSub = document.querySelector<HTMLElement>('#step1 .results-header-sub');
  const resultsCount = document.querySelector<HTMLElement>('#step1 .results-count');
  const resultsItems = document.querySelector<HTMLElement>('#step1 .results-items');
  const footerText = document.querySelector<HTMLElement>('#step1 .results-footer-text');

  if (liamText) liamText.textContent = 'I could not complete the free search just now. Please try again in a moment.';
  if (headerSub) headerSub.textContent = 'Free search failed';
  if (resultsCount) resultsCount.textContent = '0 found';
  if (resultsItems) {
    resultsItems.innerHTML = `
      <div class="results-item">
        <div class="results-item-rank">!</div>
        <div class="results-item-addr">${escapeHtml(message || `Could not search ${summarizeBrief(brief)}`)}</div>
        <div class="results-item-badge">RETRY</div>
        <div class="results-item-price">—</div>
      </div>
    `;
  }
  if (footerText) footerText.textContent = 'No sample results are shown. Refresh to retry the free API search.';
};

const matchAddress = (match: PreviewMatch): string => {
  return compactList([
    match.address,
    match.suburb || undefined,
    match.state || undefined,
  ]) || 'Matched property';
};

const matchBadge = (match: PreviewMatch, index: number): string => {
  if (index === 0) return 'BEST MATCH';
  if (match.listingStatus === 'price_drop') return '↓ PRICE DROP';
  if (match.listingStatus === 'off_market') return 'OFF MARKET';
  if ((match.score ?? 0) >= 85) return 'STRONG MATCH';
  return 'MATCH';
};

const renderPreviewMatches = (brief: StoredBriefData, matches: PreviewMatch[]) => {
  const summary = summarizeBrief(brief);
  const count = matches.length;
  const visibleMatches = matches.slice(0, 3);
  const hiddenCount = Math.max(0, count - visibleMatches.length);
  const stepSub = document.querySelector<HTMLElement>('#step1 .step-left > .step-sub');
  const liamText = document.querySelector<HTMLElement>('#step1 .liam-text');
  const headerText = document.querySelector<HTMLElement>('#step1 .results-header-text');
  const headerSub = document.querySelector<HTMLElement>('#step1 .results-header-sub');
  const resultsCount = document.querySelector<HTMLElement>('#step1 .results-count');
  const resultsItems = document.querySelector<HTMLElement>('#step1 .results-items');
  const footerText = document.querySelector<HTMLElement>('#step1 .results-footer-text');
  const ctaNote = document.querySelector<HTMLElement>('#step1 .btn-note');

  if (stepSub) stepSub.innerHTML = `Based on your brief — <strong>${escapeHtml(summary)}</strong> — here are Liam's free API search results.`;
  if (liamText) {
    liamText.innerHTML = `Found <strong>${count} ${count === 1 ? 'property' : 'properties'}</strong> matching your brief. You can inspect these for free now. Activate your brief only if you want them saved into your dashboard and monitored daily.`;
  }
  if (headerText) headerText.textContent = `Your brief · ${summary}`;
  if (headerSub) headerSub.textContent = `Searched today · ${count} ${count === 1 ? 'match' : 'matches'} found`;
  if (resultsCount) resultsCount.textContent = `${count} found`;
  if (resultsItems) {
    const cards = visibleMatches.map((match, index) => `
      <div class="results-item">
        <div class="results-item-rank">#${index + 1}</div>
        <div class="results-item-addr">${linkedAddressHtml(match)}</div>
        <div class="results-item-badge"${match.listingStatus === 'price_drop' ? ' style="background:rgba(76,175,125,0.12);color:var(--green);"' : ''}>${escapeHtml(matchBadge(match, index))}</div>
        <div class="results-item-price">${escapeHtml(match.priceDisplay || (match.price ? `$${Math.round(match.price).toLocaleString('en-AU')}` : 'POA'))}</div>
      </div>
    `);

    const blurred = Array.from({ length: Math.min(2, hiddenCount) }).map((_, index) => `
      <div class="results-blur">
        <div class="results-item-rank">#${visibleMatches.length + index + 1}</div>
        <div class="results-item-addr">████████████████████</div>
        <div class="results-item-price">$███,000</div>
      </div>
    `);

    resultsItems.innerHTML = [...cards, ...blurred].join('');
  }
  if (footerText) {
    footerText.textContent = hiddenCount > 0
      ? `+ ${hiddenCount} more ${hiddenCount === 1 ? 'match' : 'matches'} · activate your brief to save all results to your dashboard`
      : 'Activate your brief to save these results to your dashboard and monitor them daily';
  }
  if (ctaNote) ctaNote.textContent = 'Free results shown · signup only saves them to your dashboard';
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
  const previewSearch = trpc.search.preview.useMutation();
  const savePreview = trpc.search.savePreview.useMutation();
  const runSearch = trpc.search.run.useMutation();
  const utils = trpc.useUtils();
  const signupStarted = useRef(false);
  const previewStarted = useRef(false);
  const previewPromise = useRef<Promise<PreviewMatch[]> | null>(null);

  useLayoutEffect(() => {
    const briefData = getStoredBrief();
    if (!hasUsableBrief(briefData)) {
      renderNoBriefState(navigate);
      return;
    }

    const existing = getStoredPreviewMatches();
    if (existing.length > 0) {
      renderPreviewMatches(briefData, existing);
      return;
    }

    if (previewStarted.current) {
      renderPreviewLoading(briefData);
    }
  });

  const runFreePreviewSearch = async (): Promise<PreviewMatch[]> => {
    const briefData = getStoredBrief();
    if (!hasUsableBrief(briefData)) {
      renderNoBriefState(navigate);
      return [];
    }

    const existing = getStoredPreviewMatches();
    if (existing.length > 0) {
      renderPreviewMatches(briefData, existing);
      return existing;
    }

    renderPreviewLoading(briefData);
    const response = await previewSearch.mutateAsync(makeBriefPayload(briefData));
    const matches = (response.matches as PreviewMatch[]).filter(isTrustedPreviewMatch);
    setStoredPreviewMatches(matches);
    if (matches.length === 0) {
      throw new Error('No verified GPT-4o property matches were returned. Synthetic preview results are blocked.');
    }
    renderPreviewMatches(briefData, matches);
    return matches;
  };

  const replayStoredBrief = async () => {
    const briefData = getStoredBrief();
    if (!hasUsableBrief(briefData)) {
      navigate('/brief');
      return;
    }

    const saved = await createBrief.mutateAsync(makeBriefPayload(briefData));
    const previewMatches = getStoredPreviewMatches();

    setSignupBusy(true, previewMatches.length > 0 ? 'Saving your free search results…' : 'Liam is preparing your dashboard…');
    try {
      if (previewMatches.length > 0) {
        await savePreview.mutateAsync({ briefId: saved.brief.id, matches: previewMatches });
      } else {
        await runSearch.mutateAsync({ briefId: saved.brief.id });
      }
    } catch (error) {
      console.warn('[Signup] Search result persistence failed after brief save; continuing to dashboard', error);
    }
    sessionStorage.removeItem('briefData');
    sessionStorage.removeItem('briefBasics');
    sessionStorage.removeItem(PREVIEW_MATCHES_KEY);
    await utils.auth.me.invalidate();
    navigate('/dashboard');
  };

  useEffect(() => {
    if (!previewStarted.current) {
      previewStarted.current = true;
      previewPromise.current = runFreePreviewSearch().catch((error) => {
        const briefData = getStoredBrief();
        if (hasUsableBrief(briefData)) {
          renderPreviewError(briefData, error instanceof Error ? error.message : 'Free search failed');
        }
        throw error;
      });
    }

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
      if (signupStarted.current) return;
      showSignupError(null);

      try {
        signupStarted.current = true;
        await previewPromise.current?.catch(() => []);

        if (!user) {
          const form = extractSignupForm();
          setSignupBusy(true, 'Creating account…');
          const signupResult = await signup.mutateAsync(form);
          utils.auth.me.setData(undefined, signupResult.user as any);
          await utils.auth.me.invalidate();
        }

        setSignupBusy(true, 'Saving your brief and results…');
        await replayStoredBrief();
      } catch (error) {
        console.error('[Signup] Failed to complete signup handoff', error);
        showSignupError(error instanceof Error ? error.message : 'We could not finish signup. Please check your details and try again.');
        setSignupBusy(false);
        signupStarted.current = false;
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
  }, [signup, utils, navigate, user]);

  return (
    <div dangerouslySetInnerHTML={{ __html: signupHTML }} />
  );
}
