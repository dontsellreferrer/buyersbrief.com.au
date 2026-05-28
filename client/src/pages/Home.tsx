import { useState } from 'react';
import { useLocation } from 'wouter';
import { Input } from '@/components/ui/input';

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

export default function Home() {
  const [, navigate] = useLocation();
  const [briefData, setBriefData] = useState({
    suburb: '',
    propertyType: '',
    beds: '',
    baths: '',
    parking: '',
    budget: '',
  });

  const handleBriefSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sessionStorage.setItem('briefBasics', JSON.stringify(briefData));
    navigate('/brief');
  };

  return (
    <div className="bg-offwhite text-charcoal">
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

        <div className="hidden md:flex items-center gap-6 lg:gap-8">
          <a href="#how" className="text-sm font-normal text-mid no-underline hover:text-sky transition-colors">
            How it works
          </a>
          <a href="#pricing" className="text-sm font-normal text-mid no-underline hover:text-sky transition-colors">
            Pricing
          </a>
          <a href="#why" className="text-sm font-normal text-mid no-underline hover:text-sky transition-colors">
            Why us
          </a>
          <button
            onClick={() => navigate('/brief')}
            className="font-outfit text-xs font-medium bg-sky text-white px-5.5 py-2.5 rounded-full no-underline flex items-center gap-2 hover:bg-sky-dark transition-all hover:-translate-y-0.5"
          >
            Get started
          </button>
        </div>

        {/* Mobile CTA */}
        <button
          onClick={() => navigate('/brief')}
          className="md:hidden font-outfit text-xs font-medium bg-sky text-white px-3 sm:px-4 py-2 rounded-full no-underline flex items-center gap-2 hover:bg-sky-dark transition-all"
        >
          Start
        </button>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen grid grid-cols-1 md:grid-cols-2 gap-0 items-start pt-16 sm:pt-17 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sky from-6% via-offwhite via-60% to-offwhite pointer-events-none" />

        {/* Hero Left */}
        <div className="flex flex-col justify-center px-4 sm:px-8 md:px-12 lg:px-18 py-12 sm:py-16 md:py-20 relative z-10">
          <div className="flex items-center gap-2.5 mb-4 sm:mb-6">
            <BBIcon size="sm" />
            <span className="font-figtree text-2xs sm:text-xs font-medium text-steel tracking-widest uppercase">Your brief</span>
          </div>

          <h1 className="font-outfit text-3xl sm:text-4xl md:text-5xl font-bold text-charcoal leading-tight tracking-tighter mb-2 sm:mb-3">
            Your <span className="text-sky font-light tracking-wider">Brief</span>. My Network.
          </h1>

          <p className="font-figtree text-base sm:text-lg font-light text-mid leading-relaxed mb-6 sm:mb-10 max-w-md">
            Tell us what you're looking for. <strong>Liam</strong> finds your perfect match from our network of premium properties.
          </p>

          {/* Brief Card */}
          <form onSubmit={handleBriefSubmit} className="bg-white rounded-2xl border border-rose border-opacity-10 p-4 sm:p-6 md:p-8 shadow-lg max-w-md w-full">
            <div className="mb-4 sm:mb-6">
              <h3 className="font-figtree text-sm sm:text-base font-medium text-charcoal mb-1">Your brief</h3>
              <p className="font-figtree text-xs text-mid">5 minutes to your match</p>
            </div>

            <div className="space-y-4 sm:space-y-5">
              {/* Suburb */}
              <div>
                <label className="font-figtree text-2xs font-medium text-steel tracking-wider uppercase mb-1 block">Suburb</label>
                <Input
                  type="text"
                  placeholder="e.g. Morisset"
                  value={briefData.suburb}
                  onChange={(e) => setBriefData({ ...briefData, suburb: e.target.value })}
                  className="w-full font-figtree text-sm font-normal text-charcoal bg-offwhite border border-transparent rounded-lg p-2.5 outline-none transition-all focus:border-sky focus:bg-white"
                />
              </div>

              {/* Property Type & Beds */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="font-figtree text-2xs font-medium text-steel tracking-wider uppercase mb-1 block">Property type</label>
                  <select
                    value={briefData.propertyType}
                    onChange={(e) => setBriefData({ ...briefData, propertyType: e.target.value })}
                    className="w-full font-figtree text-sm font-normal text-charcoal bg-offwhite border border-transparent rounded-lg p-2.5 outline-none transition-all focus:border-sky focus:bg-white"
                  >
                    <option value="">Select...</option>
                    <option value="house">House</option>
                    <option value="apartment">Apartment</option>
                    <option value="townhouse">Townhouse</option>
                    <option value="land">Land</option>
                  </select>
                </div>
                <div>
                  <label className="font-figtree text-2xs font-medium text-steel tracking-wider uppercase mb-1 block">Beds</label>
                  <Input
                    type="number"
                    placeholder="e.g. 3"
                    value={briefData.beds}
                    onChange={(e) => setBriefData({ ...briefData, beds: e.target.value })}
                    className="w-full font-figtree text-sm font-normal text-charcoal bg-offwhite border border-transparent rounded-lg p-2.5 outline-none transition-all focus:border-sky focus:bg-white"
                  />
                </div>
              </div>

              {/* Baths & Parking */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="font-figtree text-2xs font-medium text-steel tracking-wider uppercase mb-1 block">Baths</label>
                  <Input
                    type="number"
                    placeholder="e.g. 2"
                    value={briefData.baths}
                    onChange={(e) => setBriefData({ ...briefData, baths: e.target.value })}
                    className="w-full font-figtree text-sm font-normal text-charcoal bg-offwhite border border-transparent rounded-lg p-2.5 outline-none transition-all focus:border-sky focus:bg-white"
                  />
                </div>
                <div>
                  <label className="font-figtree text-2xs font-medium text-steel tracking-wider uppercase mb-1 block">Parking</label>
                  <Input
                    type="number"
                    placeholder="e.g. 2"
                    value={briefData.parking}
                    onChange={(e) => setBriefData({ ...briefData, parking: e.target.value })}
                    className="w-full font-figtree text-sm font-normal text-charcoal bg-offwhite border border-transparent rounded-lg p-2.5 outline-none transition-all focus:border-sky focus:bg-white"
                  />
                </div>
              </div>

              {/* Budget */}
              <div>
                <label className="font-figtree text-2xs font-medium text-steel tracking-wider uppercase mb-1 block">Budget</label>
                <Input
                  type="text"
                  placeholder="e.g. $500k"
                  value={briefData.budget}
                  onChange={(e) => setBriefData({ ...briefData, budget: e.target.value })}
                  className="w-full font-figtree text-sm font-normal text-charcoal bg-offwhite border border-transparent rounded-lg p-2.5 outline-none transition-all focus:border-sky focus:bg-white"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-sky text-white font-outfit text-sm font-medium py-3 rounded-lg hover:bg-sky-dark transition-all hover:-translate-y-0.5 mt-2"
              >
                Find my matches
              </button>

              <p className="font-figtree text-2xs text-mid text-center">• Takes 5 minutes</p>
            </div>
          </form>
        </div>

        {/* Hero Right - Liam Card */}
        <div className="hidden md:flex flex-col justify-center items-center px-4 sm:px-8 md:px-12 py-12 sm:py-16 md:py-20 relative z-10">
          <div className="w-full max-w-xs aspect-square bg-gradient-to-br from-sky to-sky-dark rounded-3xl flex flex-col items-center justify-end p-6 text-white relative overflow-hidden">
            {/* Liam Silhouette */}
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <div className="w-32 h-32 bg-white rounded-full" />
            </div>
            <div className="relative z-10 text-center">
              <h3 className="font-outfit text-2xl font-bold mb-1">Liam</h3>
              <p className="font-figtree text-sm font-light">Your AI agent</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how" className="py-12 sm:py-16 md:py-24 px-4 sm:px-8 md:px-12 lg:px-18 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="font-outfit text-3xl sm:text-4xl md:text-5xl font-bold text-charcoal mb-3 sm:mb-4">How it works</h2>
            <p className="font-figtree text-base sm:text-lg text-mid max-w-2xl mx-auto">
              From your brief to your perfect property in five simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 md:gap-8">
            {[
              { num: '1', title: 'Your brief', desc: 'Tell us what you want' },
              { num: '2', title: 'AI search', desc: 'Liam searches the network' },
              { num: '3', title: 'Score & notes', desc: 'Get scored matches' },
              { num: '4', title: 'Inspect', desc: 'View and inspect' },
              { num: '5', title: 'Offer', desc: 'Make your offer' },
            ].map((step, idx) => (
              <div key={idx} className="text-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-sky text-white rounded-full flex items-center justify-center font-outfit font-bold text-lg sm:text-xl mx-auto mb-3 sm:mb-4">
                  {step.num}
                </div>
                <h3 className="font-outfit font-bold text-charcoal text-base sm:text-lg mb-1 sm:mb-2">{step.title}</h3>
                <p className="font-figtree text-sm text-mid">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-12 sm:py-16 md:py-24 px-4 sm:px-8 md:px-12 lg:px-18 bg-offwhite">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="font-outfit text-3xl sm:text-4xl md:text-5xl font-bold text-charcoal mb-3 sm:mb-4">Pricing</h2>
            <p className="font-figtree text-base sm:text-lg text-mid max-w-2xl mx-auto">
              Choose the plan that's right for you
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              { name: 'Tier 1', price: 'Free', features: ['5 matches/week', 'Basic scoring', 'Email alerts'] },
              { name: 'Tier 2', price: '$99/mo', features: ['Unlimited matches', 'Daily search', 'Priority support', 'SMS alerts'], featured: true },
              { name: 'Tier 3', price: 'Custom', features: ['Concierge service', 'Offer negotiation', 'Legal support'] },
            ].map((tier, idx) => (
              <div
                key={idx}
                className={`rounded-2xl p-6 sm:p-8 transition-all ${
                  tier.featured
                    ? 'bg-sky text-white shadow-xl scale-105'
                    : 'bg-white border border-rose border-opacity-10 text-charcoal hover:border-opacity-30'
                }`}
              >
                <h3 className="font-outfit text-xl sm:text-2xl font-bold mb-2">{tier.name}</h3>
                <div className="font-outfit text-3xl sm:text-4xl font-bold mb-6">{tier.price}</div>
                <ul className="space-y-3 sm:space-y-4">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="font-figtree text-sm sm:text-base flex items-start gap-3">
                      <span className="text-rose flex-shrink-0 mt-1">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full mt-8 py-3 rounded-lg font-outfit font-medium text-sm sm:text-base transition-all ${
                    tier.featured
                      ? 'bg-white text-sky hover:bg-offwhite'
                      : 'bg-sky text-white hover:bg-sky-dark'
                  }`}
                >
                  Get started
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Us Section */}
      <section id="why" className="py-12 sm:py-16 md:py-24 px-4 sm:px-8 md:px-12 lg:px-18 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="font-outfit text-3xl sm:text-4xl md:text-5xl font-bold text-charcoal mb-3 sm:mb-4">Why Buyers Brief</h2>
            <p className="font-figtree text-base sm:text-lg text-mid max-w-2xl mx-auto">
              We're different because we put you first
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[
              { title: 'AI-Powered', desc: 'Liam uses AI to find your perfect match' },
              { title: 'Network Access', desc: 'Access to premium properties before market' },
              { title: 'Expert Support', desc: 'Dedicated support from property experts' },
            ].map((item, idx) => (
              <div key={idx} className="bg-offwhite rounded-2xl p-6 sm:p-8 border border-rose border-opacity-10 hover:border-opacity-30 transition-all">
                <h3 className="font-outfit text-lg sm:text-xl font-bold text-charcoal mb-3 sm:mb-4">{item.title}</h3>
                <p className="font-figtree text-sm sm:text-base text-mid">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Liam Quote Section */}
      <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-8 md:px-12 lg:px-18 bg-sky text-white">
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-figtree text-lg sm:text-xl md:text-2xl font-light mb-6 sm:mb-8 italic">
            "Finding your perfect property shouldn't be a chore. Let me do the heavy lifting while you focus on what matters."
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-full flex-shrink-0" />
            <div className="text-left">
              <p className="font-outfit font-bold text-base sm:text-lg">Liam</p>
              <p className="font-figtree text-sm opacity-90">Your AI agent</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-charcoal text-offwhite py-12 sm:py-16 px-4 sm:px-8 md:px-12 lg:px-18">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 mb-8 sm:mb-12">
            <div>
              <a href="/" className="flex items-center gap-2 no-underline mb-4">
                <BBIcon size="md" />
                <span className="font-outfit font-bold text-white">Buyers Brief</span>
              </a>
              <p className="font-figtree text-sm text-mid">Your brief. My network.</p>
            </div>
            <div>
              <h4 className="font-outfit font-bold text-white mb-4">Product</h4>
              <ul className="space-y-2 font-figtree text-sm">
                <li><a href="#how" className="text-mid hover:text-white transition-colors no-underline">How it works</a></li>
                <li><a href="#pricing" className="text-mid hover:text-white transition-colors no-underline">Pricing</a></li>
                <li><a href="#why" className="text-mid hover:text-white transition-colors no-underline">Why us</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-outfit font-bold text-white mb-4">Company</h4>
              <ul className="space-y-2 font-figtree text-sm">
                <li><a href="/partners" className="text-mid hover:text-white transition-colors no-underline">Partners</a></li>
                <li><a href="#" className="text-mid hover:text-white transition-colors no-underline">Blog</a></li>
                <li><a href="#" className="text-mid hover:text-white transition-colors no-underline">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-outfit font-bold text-white mb-4">Legal</h4>
              <ul className="space-y-2 font-figtree text-sm">
                <li><a href="#" className="text-mid hover:text-white transition-colors no-underline">Privacy</a></li>
                <li><a href="#" className="text-mid hover:text-white transition-colors no-underline">Terms</a></li>
                <li><a href="#" className="text-mid hover:text-white transition-colors no-underline">Disclaimer</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-mid border-opacity-20 pt-8 sm:pt-12 text-center">
            <p className="font-figtree text-sm text-mid">© 2026 Buyers Brief. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
