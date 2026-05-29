import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Logo } from '@/components/Logo';

interface BriefData {
  suburb: string;
  propertyType: string;
  beds: string;
  baths: string;
  parking: string;
  budget: string;
  nonNegotiables: string[];
  needs: string[];
  wants: string[];
  niceToHaves: string[];
  buyerStory: string;
  budgetCeiling: string;
  timeline: string;
  financeStatus: string;
}

/* ── Tag Input ── */
function TagInput({
  tags,
  onTagsChange,
  tagType = 'need',
  placeholder = 'Add and press Enter',
}: {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  tagType?: 'nn' | 'need' | 'want' | 'nth';
  placeholder?: string;
}) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      onTagsChange([...tags, input.trim()]);
      setInput('');
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      onTagsChange(tags.slice(0, -1));
    }
  };

  return (
    <div className="tag-input-wrap" onClick={() => inputRef.current?.focus()}>
      {tags.map((tag, idx) => (
        <span key={idx} className={`tag-item tag-${tagType}`}>
          {tag}
          <button
            type="button"
            className="tag-remove"
            onClick={(e) => {
              e.stopPropagation();
              onTagsChange(tags.filter((_, i) => i !== idx));
            }}
          >
            ×
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        className="tag-text-input"
        placeholder={tags.length === 0 ? placeholder : ''}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}

/* ── Step Card ── */
function StepCard({
  stepNum,
  title,
  subtitle,
  isActive,
  isCompleted,
  isLocked,
  summary,
  children,
  onToggle,
}: {
  stepNum: number;
  title: string;
  subtitle: string;
  isActive: boolean;
  isCompleted: boolean;
  isLocked: boolean;
  summary?: string;
  children: React.ReactNode;
  onToggle: () => void;
}) {
  const cls = [
    'step-card',
    isActive && 'active',
    isCompleted && 'completed',
    isLocked && 'locked',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <div className={cls}>
        <div className="step-header" onClick={isLocked ? undefined : onToggle}>
          <div className="step-num">{isCompleted ? '✓' : stepNum}</div>
          <div className="step-header-text">
            <div className="step-title">{title}</div>
            <div className="step-subtitle">{subtitle}</div>
          </div>
          {summary && <div className="step-summary">{summary}</div>}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#7FA8D4"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transition: 'transform 0.2s',
              transform: isActive ? 'rotate(180deg)' : 'rotate(0)',
              flexShrink: 0,
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
        <div className="step-body">{children}</div>
      </div>
      {/* Progress line between cards */}
      <div className={`progress-line ${isCompleted ? 'done' : ''}`} />
    </>
  );
}

/* ── Main Component ── */
export default function BriefIntake() {
  const [, navigate] = useLocation();
  const [stepStates, setStepStates] = useState<Record<number, boolean>>({
    1: true, 2: false, 3: false, 4: false, 5: false, 6: false,
  });

  const [briefData, setBriefData] = useState<BriefData>({
    suburb: '', propertyType: '', beds: '', baths: '', parking: '', budget: '',
    nonNegotiables: [], needs: [], wants: [], niceToHaves: [],
    buyerStory: '', budgetCeiling: '', timeline: '', financeStatus: '',
  });

  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [budgetValue, setBudgetValue] = useState(850000);

  // Load brief basics from sessionStorage (from homepage card)
  useEffect(() => {
    const saved = sessionStorage.getItem('briefBasics');
    if (saved) {
      try {
        const basics = JSON.parse(saved);
        setBriefData((prev) => ({ ...prev, ...basics }));
      } catch { /* ignore */ }
    }
  }, []);

  const toggleStep = (num: number) => {
    setStepStates((prev) => {
      const next = { ...prev };
      // Close all others, toggle this one
      Object.keys(next).forEach((k) => (next[Number(k)] = false));
      next[num] = !prev[num];
      return next;
    });
  };

  const markComplete = (num: number) =>
    setCompletedSteps((prev) => new Set(prev).add(num));

  const summary = (num: number): string => {
    switch (num) {
      case 1: return briefData.nonNegotiables.length > 0 ? `${briefData.nonNegotiables.length} item${briefData.nonNegotiables.length !== 1 ? 's' : ''}` : '';
      case 2: return briefData.needs.length > 0 ? `${briefData.needs.length} item${briefData.needs.length !== 1 ? 's' : ''}` : '';
      case 3: return briefData.wants.length > 0 ? `${briefData.wants.length} item${briefData.wants.length !== 1 ? 's' : ''}` : '';
      case 4: return briefData.niceToHaves.length > 0 ? `${briefData.niceToHaves.length} item${briefData.niceToHaves.length !== 1 ? 's' : ''}` : '';
      case 5: return briefData.buyerStory ? 'Complete' : '';
      case 6: return briefData.budgetCeiling && briefData.timeline ? 'Complete' : '';
      default: return '';
    }
  };

  const formatBudget = (v: number) => {
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    return `$${(v / 1000).toFixed(0)}K`;
  };

  const sliderPercent = ((budgetValue - 200000) / (3000000 - 200000)) * 100;

  const handleSubmit = () => {
    // Save brief data to sessionStorage for signup page
    sessionStorage.setItem('briefData', JSON.stringify(briefData));
    navigate('/signup');
  };

  return (
    <div className="brief-page">
      {/* Nav */}
      <nav className="brief-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Logo size="nav" variant="dark" />
        </div>
        <div className="brief-nav-right">
          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', color: '#7FA8D4', cursor: 'pointer', fontFamily: "'Figtree', sans-serif", fontSize: 12 }}
          >
            Back to home
          </button>
        </div>
      </nav>

      {/* Main */}
      <div className="brief-main">
        {/* Liam Header */}
        <div className="liam-header">
          <div className="liam-av">L</div>
          <div className="liam-bubble">
            <div className="liam-bubble-name">LIAM</div>
            <div className="liam-bubble-text">
              Tell me what you're looking for. I'll search through our network — <em>on-market, off-market, and everything in between</em> — and find your <strong>perfect match</strong>.
            </div>
          </div>
        </div>

        {/* Step Cards */}
        <div>
          {/* Step 1: Non-negotiables */}
          <StepCard
            stepNum={1}
            title="Non-negotiables"
            subtitle="What must the property have?"
            isActive={stepStates[1]}
            isCompleted={completedSteps.has(1)}
            isLocked={false}
            summary={summary(1)}
            onToggle={() => toggleStep(1)}
          >
            <div className="field-group">
              <label className="field-label">DEAL-BREAKERS</label>
              <TagInput
                tags={briefData.nonNegotiables}
                onTagsChange={(tags) => {
                  setBriefData({ ...briefData, nonNegotiables: tags });
                  if (tags.length > 0) markComplete(1);
                }}
                tagType="nn"
                placeholder="e.g. 4 bedrooms, Double garage, North-facing"
              />
              <div className="field-hint">These are absolute requirements — no exceptions</div>
            </div>
            <div className="field-group">
              <label className="field-label">ADDITIONAL NOTES</label>
              <textarea
                className="field-textarea"
                placeholder="Any other must-haves or context..."
                value={briefData.suburb ? '' : ''}
                onChange={() => {}}
              />
            </div>
            <div className="tier-labels">
              <div className="tier-label">
                <div className="tier-dot" style={{ background: '#E8614A' }} />
                <span>All tiers</span>
              </div>
            </div>
          </StepCard>

          {/* Step 2: Needs */}
          <StepCard
            stepNum={2}
            title="Needs (40% weight)"
            subtitle="What do you really need?"
            isActive={stepStates[2]}
            isCompleted={completedSteps.has(2)}
            isLocked={false}
            summary={summary(2)}
            onToggle={() => toggleStep(2)}
          >
            <div className="field-group">
              <label className="field-label">IMPORTANT FEATURES</label>
              <TagInput
                tags={briefData.needs}
                onTagsChange={(tags) => {
                  setBriefData({ ...briefData, needs: tags });
                  if (tags.length > 0) markComplete(2);
                }}
                tagType="need"
                placeholder="e.g. Close to schools, Modern kitchen, Flat block"
              />
              <div className="field-hint">Strongly preferred — weighted 40% in matching</div>
            </div>
            <div className="tier-labels">
              <div className="tier-label">
                <div className="tier-dot" style={{ background: '#4A90D9' }} />
                <span>Tier 1+</span>
              </div>
            </div>
          </StepCard>

          {/* Step 3: Wants */}
          <StepCard
            stepNum={3}
            title="Wants (35% weight)"
            subtitle="What would be nice to have?"
            isActive={stepStates[3]}
            isCompleted={completedSteps.has(3)}
            isLocked={false}
            summary={summary(3)}
            onToggle={() => toggleStep(3)}
          >
            <div className="field-group">
              <label className="field-label">DESIRED FEATURES</label>
              <TagInput
                tags={briefData.wants}
                onTagsChange={(tags) => {
                  setBriefData({ ...briefData, wants: tags });
                  if (tags.length > 0) markComplete(3);
                }}
                tagType="want"
                placeholder="e.g. Pool, Ensuite, Walk-in wardrobe"
              />
              <div className="field-hint">Would love to have — weighted 35% in matching</div>
            </div>
            <div className="tier-labels">
              <div className="tier-label">
                <div className="tier-dot" style={{ background: '#E8B4B8' }} />
                <span>Tier 2+</span>
              </div>
            </div>
          </StepCard>

          {/* Step 4: Nice-to-haves */}
          <StepCard
            stepNum={4}
            title="Nice-to-haves (25% weight)"
            subtitle="What would make it perfect?"
            isActive={stepStates[4]}
            isCompleted={completedSteps.has(4)}
            isLocked={false}
            summary={summary(4)}
            onToggle={() => toggleStep(4)}
          >
            <div className="field-group">
              <label className="field-label">BONUS FEATURES</label>
              <TagInput
                tags={briefData.niceToHaves}
                onTagsChange={(tags) => {
                  setBriefData({ ...briefData, niceToHaves: tags });
                  if (tags.length > 0) markComplete(4);
                }}
                tagType="nth"
                placeholder="e.g. Smart home, Wine cellar, Tennis court"
              />
              <div className="field-hint">The cherry on top — weighted 25% in matching</div>
            </div>
            <div className="tier-labels">
              <div className="tier-label">
                <div className="tier-dot" style={{ background: '#4CAF7D' }} />
                <span>Tier 2+</span>
              </div>
            </div>
          </StepCard>

          {/* Step 5: Buyer Story */}
          <StepCard
            stepNum={5}
            title="Your story"
            subtitle="Tell us about yourself"
            isActive={stepStates[5]}
            isCompleted={completedSteps.has(5)}
            isLocked={false}
            summary={summary(5)}
            onToggle={() => toggleStep(5)}
          >
            <div className="field-group">
              <label className="field-label">WHY ARE YOU BUYING?</label>
              <textarea
                className="field-textarea"
                value={briefData.buyerStory}
                onChange={(e) => {
                  setBriefData({ ...briefData, buyerStory: e.target.value });
                  if (e.target.value.length > 10) markComplete(5);
                }}
                placeholder="e.g. Growing family, need more space. First home buyers looking for investment potential..."
              />
              <div className="field-hint">Help Liam understand your situation and priorities</div>
            </div>
          </StepCard>

          {/* Step 6: Budget & Timeline */}
          <StepCard
            stepNum={6}
            title="Budget & timeline"
            subtitle="When and how much?"
            isActive={stepStates[6]}
            isCompleted={completedSteps.has(6)}
            isLocked={false}
            summary={summary(6)}
            onToggle={() => toggleStep(6)}
          >
            <div className="field-group">
              <label className="field-label">BUDGET CEILING</label>
              <div className="budget-display">
                <span>$</span>{formatBudget(budgetValue).replace('$', '')}
              </div>
              <input
                type="range"
                min={200000}
                max={3000000}
                step={25000}
                value={budgetValue}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setBudgetValue(val);
                  setBriefData({ ...briefData, budgetCeiling: formatBudget(val) });
                }}
                style={{
                  background: `linear-gradient(to right, #4A90D9 0%, #4A90D9 ${sliderPercent}%, rgba(127,168,212,0.2) ${sliderPercent}%)`,
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span className="field-hint">$200K</span>
                <span className="field-hint">$3M+</span>
              </div>
            </div>

            <div className="field-row">
              <div className="field-group">
                <label className="field-label">TIMELINE</label>
                <select
                  className="field-select"
                  value={briefData.timeline}
                  onChange={(e) => {
                    setBriefData({ ...briefData, timeline: e.target.value });
                    if (e.target.value && briefData.budgetCeiling) markComplete(6);
                  }}
                >
                  <option value="">Select...</option>
                  <option value="immediate">Immediate (0-3 months)</option>
                  <option value="soon">Soon (3-6 months)</option>
                  <option value="flexible">Flexible (6-12 months)</option>
                  <option value="exploring">Just exploring</option>
                </select>
              </div>

              <div className="field-group">
                <label className="field-label">FINANCE STATUS</label>
                <select
                  className="field-select"
                  value={briefData.financeStatus}
                  onChange={(e) => setBriefData({ ...briefData, financeStatus: e.target.value })}
                >
                  <option value="">Select...</option>
                  <option value="preapproved">Pre-approved</option>
                  <option value="inprocess">In process</option>
                  <option value="cash">Cash buyer</option>
                  <option value="exploring">Still exploring</option>
                </select>
              </div>
            </div>

            <div className="tier-labels">
              <div className="tier-label">
                <div className="tier-dot" style={{ background: '#4A90D9' }} />
                <span>All tiers</span>
              </div>
            </div>
          </StepCard>
        </div>

        {/* Submit Button */}
        <button className="step-cta" onClick={handleSubmit} style={{ marginTop: 16 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          Find my matches
        </button>
      </div>
    </div>
  );
}
