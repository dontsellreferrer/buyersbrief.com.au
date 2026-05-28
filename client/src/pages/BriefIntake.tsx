import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, X, Plus } from 'lucide-react';

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

interface MatchResult {
  address: string;
  suburb: string;
  price: string;
  bedrooms: number;
  bathrooms: number;
  parking: number;
  score: number;
  hits: string[];
  misses: string[];
  liamNote: string;
}

const BBIcon = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeMap = {
    sm: { doc: 'w-3 h-4', pin: 'w-1.5 h-1.5', inner: 'w-1 h-1' },
    md: { doc: 'w-5 h-6', pin: 'w-2.5 h-2.5', inner: 'w-1 h-1' },
    lg: { doc: 'w-6 h-7', pin: 'w-3 h-3', inner: 'w-1.5 h-1.5' },
  };
  const s = sizeMap[size];
  return (
    <div className="inline-block flex-shrink-0">
      <div className={`${s.doc} bg-sky relative`}>
        <div className="absolute top-1/3 left-1/4 flex flex-col gap-1">
          <div className="bg-offwhite bg-opacity-75 rounded h-0.5" style={{ width: '68%' }} />
          <div className="bg-offwhite bg-opacity-75 rounded h-0.5" style={{ width: '73%' }} />
          <div className="bg-offwhite bg-opacity-75 rounded h-0.5" style={{ width: '85%' }} />
          <div className="bg-offwhite bg-opacity-75 rounded h-0.5" style={{ width: '60%' }} />
        </div>
        <div className={`${s.pin} bg-rose rounded-full absolute -top-1/3 -right-1/3`}>
          <div className={`${s.inner} bg-offwhite rounded-full`} />
        </div>
      </div>
    </div>
  );
};

const ScoreRing = ({ score }: { score: number }) => {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;
  
  return (
    <div className="relative w-24 h-24">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#f0f0f0" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#0ea5e9"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="font-outfit text-2xl font-bold text-charcoal">{score}%</div>
          <div className="font-figtree text-xs text-mid">Match</div>
        </div>
      </div>
    </div>
  );
};

const TagInput = ({ tags, onTagsChange, placeholder = 'Add tag and press Enter' }: { tags: string[]; onTagsChange: (tags: string[]) => void; placeholder?: string }) => {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      onTagsChange([...tags, input.trim()]);
      setInput('');
    }
  };

  const removeTag = (index: number) => {
    onTagsChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag, idx) => (
          <div key={idx} className="bg-sky text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(idx)}
              className="hover:opacity-70 transition-opacity"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <Input
        type="text"
        placeholder={placeholder}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full font-figtree text-sm font-normal text-charcoal bg-offwhite border border-transparent rounded-lg p-2.5 outline-none transition-all focus:border-sky focus:bg-white"
      />
    </div>
  );
};

export default function BriefIntake() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [briefData, setBriefData] = useState<BriefData>({
    suburb: '',
    propertyType: '',
    beds: '',
    baths: '',
    parking: '',
    budget: '',
    nonNegotiables: [],
    needs: [],
    wants: [],
    niceToHaves: [],
    buyerStory: '',
    budgetCeiling: '',
    timeline: '',
    financeStatus: '',
  });

  // Load brief basics from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('briefBasics');
    if (saved) {
      const basics = JSON.parse(saved);
      setBriefData((prev) => ({ ...prev, ...basics }));
    }
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Call the backend API to search with Claude
      const response = await fetch('/api/trpc/briefs.search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ briefData }),
      });

      if (!response.ok) throw new Error('Search failed');

      const result = await response.json();
      setMatches(result.matches || []);
      setStep(7); // Show results
    } catch (error) {
      console.error('Search error:', error);
      // Show demo results if API fails
      setMatches(getDemoMatches());
      setStep(7);
    } finally {
      setLoading(false);
    }
  };

  const getDemoMatches = (): MatchResult[] => [
    {
      address: '2 Havilah Street',
      suburb: 'Morisset Park',
      price: '$850,000',
      bedrooms: 4,
      bathrooms: 2,
      parking: 2,
      score: 92,
      hits: ['4 bedrooms', 'Modern kitchen', 'Large backyard', 'Close to schools'],
      misses: ['No pool'],
      liamNote: 'Excellent match with modern finishes and great family appeal.',
    },
    {
      address: '15 Oak Avenue',
      suburb: 'Morisset',
      price: '$795,000',
      bedrooms: 3,
      bathrooms: 2,
      parking: 2,
      score: 78,
      hits: ['3 bedrooms', 'Good location', 'Updated bathrooms'],
      misses: ['Smaller block', 'Older kitchen'],
      liamNote: 'Solid option with good bones and potential for updates.',
    },
    {
      address: '42 Riverside Drive',
      suburb: 'Morisset Park',
      price: '$920,000',
      bedrooms: 4,
      bathrooms: 3,
      parking: 3,
      score: 88,
      hits: ['4 bedrooms', 'Water views', 'Luxury finishes', 'Large garage'],
      misses: ['Higher price point'],
      liamNote: 'Premium option with exceptional views and modern amenities.',
    },
  ];

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="font-outfit text-2xl font-bold text-charcoal mb-2">Non-negotiables</h3>
              <p className="font-figtree text-mid mb-4">What must the property have?</p>
              <TagInput
                tags={briefData.nonNegotiables}
                onTagsChange={(tags) => setBriefData({ ...briefData, nonNegotiables: tags })}
                placeholder="e.g. 4 bedrooms, Modern kitchen, Pool"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="font-outfit text-2xl font-bold text-charcoal mb-2">Needs (40% weight)</h3>
              <p className="font-figtree text-mid mb-4">What do you really want?</p>
              <TagInput
                tags={briefData.needs}
                onTagsChange={(tags) => setBriefData({ ...briefData, needs: tags })}
                placeholder="e.g. Large backyard, Close to schools, Modern finishes"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="font-outfit text-2xl font-bold text-charcoal mb-2">Wants (35% weight)</h3>
              <p className="font-figtree text-mid mb-4">What would be nice to have?</p>
              <TagInput
                tags={briefData.wants}
                onTagsChange={(tags) => setBriefData({ ...briefData, wants: tags })}
                placeholder="e.g. Pool, Gym, Home office, Outdoor entertaining"
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="font-outfit text-2xl font-bold text-charcoal mb-2">Nice-to-haves (25% weight)</h3>
              <p className="font-figtree text-mid mb-4">What would make it perfect?</p>
              <TagInput
                tags={briefData.niceToHaves}
                onTagsChange={(tags) => setBriefData({ ...briefData, niceToHaves: tags })}
                placeholder="e.g. Smart home, Wine cellar, Tennis court"
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="font-outfit text-2xl font-bold text-charcoal mb-2">Your story</h3>
              <p className="font-figtree text-mid mb-4">Tell us about yourself and why you're buying</p>
              <textarea
                value={briefData.buyerStory}
                onChange={(e) => setBriefData({ ...briefData, buyerStory: e.target.value })}
                placeholder="e.g. Growing family, need more space. First home buyers looking for investment potential..."
                className="w-full font-figtree text-sm font-normal text-charcoal bg-offwhite border border-transparent rounded-lg p-3 outline-none transition-all focus:border-sky focus:bg-white min-h-32 resize-none"
              />
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="font-outfit text-2xl font-bold text-charcoal mb-4">Budget & Timeline</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="font-figtree text-sm font-medium text-charcoal mb-2 block">Budget ceiling</label>
                  <Input
                    type="text"
                    placeholder="e.g. $850,000"
                    value={briefData.budgetCeiling}
                    onChange={(e) => setBriefData({ ...briefData, budgetCeiling: e.target.value })}
                    className="w-full font-figtree text-sm font-normal text-charcoal bg-offwhite border border-transparent rounded-lg p-2.5 outline-none transition-all focus:border-sky focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-figtree text-sm font-medium text-charcoal mb-2 block">Timeline</label>
                  <select
                    value={briefData.timeline}
                    onChange={(e) => setBriefData({ ...briefData, timeline: e.target.value })}
                    className="w-full font-figtree text-sm font-normal text-charcoal bg-offwhite border border-transparent rounded-lg p-2.5 outline-none transition-all focus:border-sky focus:bg-white"
                  >
                    <option value="">Select...</option>
                    <option value="immediate">Immediate (0-3 months)</option>
                    <option value="soon">Soon (3-6 months)</option>
                    <option value="flexible">Flexible (6-12 months)</option>
                    <option value="exploring">Just exploring</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-figtree text-sm font-medium text-charcoal mb-2 block">Finance status</label>
                <select
                  value={briefData.financeStatus}
                  onChange={(e) => setBriefData({ ...briefData, financeStatus: e.target.value })}
                  className="w-full font-figtree text-sm font-normal text-charcoal bg-offwhite border border-transparent rounded-lg p-2.5 outline-none transition-all focus:border-sky focus:bg-white"
                >
                  <option value="">Select...</option>
                  <option value="preapproved">Pre-approved</option>
                  <option value="inprocess">In process</option>
                  <option value="cash">Cash buyer</option>
                  <option value="exploring">Still exploring</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="font-outfit text-2xl font-bold text-charcoal mb-2">Your matches</h3>
              <p className="font-figtree text-mid mb-6">Liam found {matches.length} properties that match your brief</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {matches.map((match, idx) => (
                  <Card key={idx} className="p-6 border border-rose border-opacity-10 hover:border-opacity-30 transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-outfit font-bold text-charcoal text-lg">{match.address}</h4>
                        <p className="font-figtree text-sm text-mid">{match.suburb}</p>
                      </div>
                      <ScoreRing score={match.score} />
                    </div>

                    <div className="mb-4">
                      <p className="font-outfit font-bold text-sky text-xl">{match.price}</p>
                      <p className="font-figtree text-sm text-mid">
                        {match.bedrooms} bed • {match.bathrooms} bath • {match.parking} car
                      </p>
                    </div>

                    <div className="mb-4 space-y-2">
                      <div>
                        <p className="font-figtree text-xs font-medium text-green-600 mb-1">✓ Hits</p>
                        <div className="flex flex-wrap gap-2">
                          {match.hits.map((hit, i) => (
                            <span key={i} className="bg-green-50 text-green-700 text-xs px-2 py-1 rounded">
                              {hit}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="font-figtree text-xs font-medium text-rose mb-1">✗ Misses</p>
                        <div className="flex flex-wrap gap-2">
                          {match.misses.map((miss, i) => (
                            <span key={i} className="bg-rose bg-opacity-10 text-rose text-xs px-2 py-1 rounded">
                              {miss}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="bg-offwhite p-3 rounded-lg mb-4">
                      <p className="font-figtree text-sm text-charcoal italic">"{match.liamNote}"</p>
                      <p className="font-figtree text-xs text-mid mt-2">— Liam</p>
                    </div>

                    <Button className="w-full bg-sky text-white hover:bg-sky-dark">
                      Add to hotlist
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-offwhite text-charcoal min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-offwhite bg-opacity-95 backdrop-blur-md border-b border-rose border-opacity-20 px-4 sm:px-8 md:px-12 h-16 sm:h-17 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 sm:gap-3 no-underline">
          <BBIcon size="md" />
          <div className="flex flex-col leading-none">
            <div className="font-outfit text-lg sm:text-xl font-bold text-charcoal tracking-tighter">Buyers</div>
            <div className="flex items-baseline gap-0">
              <div className="font-outfit text-lg sm:text-xl font-light text-sky tracking-wider">Brief</div>
              <div className="font-outfit text-2xs font-light text-sky tracking-wider ml-0.5 mb-0.5">.COM.AU</div>
            </div>
          </div>
        </a>

        <button
          onClick={() => navigate('/')}
          className="font-figtree text-sm text-mid hover:text-charcoal transition-colors"
        >
          Back
        </button>
      </nav>

      {/* Main Content */}
      <div className="pt-20 pb-12 px-4 sm:px-8 md:px-12 lg:px-18">
        <div className="max-w-2xl mx-auto">
          {/* Progress */}
          {step < 7 && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-outfit text-2xl sm:text-3xl font-bold text-charcoal">Your brief</h2>
                <p className="font-figtree text-sm text-mid">Step {step} of 6</p>
              </div>
              <div className="w-full bg-offwhite rounded-full h-2">
                <div
                  className="bg-sky h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(step / 6) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Step Content */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-rose border-opacity-10 mb-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-sky animate-spin mb-4" />
                <p className="font-figtree text-mid">Liam is searching for your perfect matches...</p>
              </div>
            ) : (
              renderStep()
            )}
          </div>

          {/* Navigation Buttons */}
          {step < 7 && !loading && (
            <div className="flex gap-4">
              <Button
                onClick={() => setStep(Math.max(1, step - 1))}
                disabled={step === 1}
                className="flex-1 bg-offwhite text-charcoal border border-rose border-opacity-20 hover:border-opacity-50 disabled:opacity-50"
              >
                Back
              </Button>
              <Button
                onClick={() => {
                  if (step === 6) {
                    handleSubmit();
                  } else {
                    setStep(step + 1);
                  }
                }}
                className="flex-1 bg-sky text-white hover:bg-sky-dark"
              >
                {step === 6 ? 'Find matches' : 'Next'}
              </Button>
            </div>
          )}

          {/* Results Navigation */}
          {step === 7 && (
            <div className="flex gap-4">
              <Button
                onClick={() => navigate('/signup')}
                className="flex-1 bg-sky text-white hover:bg-sky-dark"
              >
                Continue to signup
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
