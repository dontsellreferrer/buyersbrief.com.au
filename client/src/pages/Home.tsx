import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { BBIcon } from "@/components/BBIcon";
import { Logo } from "@/components/Logo";

export default function Home() {
  const [, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [briefData, setBriefData] = useState({
    suburb: "",
    propertyType: "",
    beds: "",
    baths: "",
    parking: "",
    budget: "",
    intent: "live" as "live" | "invest" | "both",
  });

  const handleBriefSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (briefData.suburb) params.append("suburbs", briefData.suburb);
    if (briefData.propertyType) params.append("type", briefData.propertyType);
    if (briefData.beds) params.append("beds", briefData.beds);
    if (briefData.baths) params.append("baths", briefData.baths);
    if (briefData.parking) params.append("parking", briefData.parking);
    if (briefData.budget) params.append("budget", briefData.budget);
    params.append("intent", briefData.intent);
    navigate(`/brief?${params.toString()}`);
  };

  /* Scroll reveal */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.1 }
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ background: "#F4F1EC", color: "#1E1E1E" }}>
      {/* ════════════════════ NAV ════════════════════ */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 sm:px-8 lg:px-12"
        style={{
          height: 68,
          background: "rgba(244,241,236,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(232,180,184,0.2)",
        }}
      >
        <Logo size="nav" />

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6 lg:gap-8">
          {[
            { label: "How It Works", href: "#how" },
            { label: "Pricing", href: "#pricing" },
            { label: "Why Us", href: "#why" },
          ].map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="no-underline transition-colors"
              style={{ fontFamily: "'Figtree',sans-serif", fontSize: 14, fontWeight: 400, color: "#4A5568" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#4A90D9")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#4A5568")}
            >
              {l.label}
            </a>
          ))}
          <a
            href="/brief"
            className="flex items-center gap-2 no-underline text-white transition-all"
            style={{
              fontFamily: "'Outfit',sans-serif",
              fontSize: 13,
              fontWeight: 500,
              background: "#4A90D9",
              padding: "10px 22px",
              borderRadius: 24,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#3478C0"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#4A90D9"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <BBIcon docWidth={14} docHeight={18} pinSize={7} pinInnerSize={3} />
            Start Your Brief
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ background: "none", border: "none" }}
        >
          <span className="block w-5 h-0.5 rounded" style={{ background: "#1E1E1E" }} />
          <span className="block w-5 h-0.5 rounded" style={{ background: "#1E1E1E" }} />
          <span className="block w-5 h-0.5 rounded" style={{ background: "#1E1E1E" }} />
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-6"
          style={{ background: "rgba(244,241,236,0.98)", backdropFilter: "blur(12px)" }}
          onClick={() => setMobileMenuOpen(false)}
        >
          {["How It Works", "Pricing", "Why Us"].map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase().replace(/ /g, "")}`}
              className="no-underline"
              style={{ fontFamily: "'Outfit',sans-serif", fontSize: 24, fontWeight: 600, color: "#1E1E1E" }}
            >
              {l}
            </a>
          ))}
          <a
            href="/brief"
            className="flex items-center gap-2 no-underline text-white mt-4"
            style={{
              fontFamily: "'Outfit',sans-serif",
              fontSize: 16,
              fontWeight: 500,
              background: "#4A90D9",
              padding: "14px 32px",
              borderRadius: 24,
            }}
          >
            <BBIcon docWidth={14} docHeight={18} pinSize={7} pinInnerSize={3} />
            Start Your Brief
          </a>
        </div>
      )}

      {/* ════════════════════ HERO ════════════════════ */}
      <section
        className="min-h-screen grid grid-cols-1 lg:grid-cols-2 items-start relative overflow-hidden"
        style={{ paddingTop: 68 }}
      >
        {/* Background pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, rgba(74,144,217,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(232,180,184,0.08) 0%, transparent 40%)",
          }}
        />

        {/* Left */}
        <div className="flex flex-col justify-center relative z-10 px-5 sm:px-8 lg:px-[72px] py-12 sm:py-16 lg:py-20">
          {/* Eyebrow */}
          <div className="flex items-center gap-2.5 mb-6 animate-fadeUp" style={{ animationDelay: "0.1s" }}>
            <BBIcon docWidth={18} docHeight={23} pinSize={9} pinInnerSize={4} />
            <span
              style={{
                fontFamily: "'Figtree',sans-serif",
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "2px",
                textTransform: "uppercase",
                color: "#7FA8D4",
              }}
            >
              AI-Powered Property Matching
            </span>
          </div>

          {/* Headline */}
          <h1
            className="mb-3 animate-fadeUp"
            style={{
              fontFamily: "'Outfit',sans-serif",
              fontSize: "clamp(38px, 4.5vw, 58px)",
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: "-1.5px",
              animationDelay: "0.2s",
            }}
          >
            Your Brief.
            <br />
            <span style={{ fontWeight: 300, letterSpacing: "1px", color: "#4A90D9" }}>
              My Network.
            </span>
          </h1>

          {/* Sub */}
          <p
            className="mb-10 max-w-[460px] animate-fadeUp"
            style={{
              fontFamily: "'Figtree',sans-serif",
              fontSize: 18,
              fontWeight: 300,
              lineHeight: 1.6,
              color: "#4A5568",
              animationDelay: "0.3s",
            }}
          >
            Tell <strong style={{ fontWeight: 500, color: "#1E1E1E" }}>Liam</strong> what you're looking for.
            He'll search his network — on-market, off-market, and everything in between — and
            show you scored matches in minutes.
          </p>

          {/* Brief Card */}
          <form
            onSubmit={handleBriefSubmit}
            className="relative max-w-[500px] animate-fadeUp"
            style={{
              background: "white",
              borderRadius: 16,
              padding: "28px 32px",
              boxShadow: "0 4px 40px rgba(74,144,217,0.12), 0 1px 4px rgba(0,0,0,0.04)",
              border: "1px solid rgba(232,180,184,0.2)",
              animationDelay: "0.4s",
            }}
          >
            {/* Top gradient bar */}
            <div
              className="absolute top-0 left-0 right-0"
              style={{
                height: 3,
                background: "linear-gradient(90deg, #4A90D9, #E8B4B8)",
                borderRadius: "16px 16px 0 0",
              }}
            />

            {/* Card header */}
            <div className="flex items-center gap-2.5 mb-5">
              <BBIcon docWidth={20} docHeight={25} pinSize={10} pinInnerSize={4.5} />
              <div>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 600 }}>Start your brief</div>
                <div style={{ fontFamily: "'Figtree',sans-serif", fontSize: 11, fontWeight: 400, color: "#7FA8D4" }}>
                  Takes 2 minutes · Free instant results
                </div>
              </div>
            </div>

            {/* Fields */}
            <div className="flex flex-col gap-3 mb-4">
              <FieldLabel label="Suburb">
                <FieldInput
                  type="text"
                  placeholder="e.g. Morisset Park, NSW"
                  value={briefData.suburb}
                  onChange={(v) => setBriefData({ ...briefData, suburb: v })}
                />
              </FieldLabel>

              <FieldLabel label="Property Type">
                <FieldSelect
                  value={briefData.propertyType}
                  onChange={(v) => setBriefData({ ...briefData, propertyType: v })}
                  options={[
                    { value: "", label: "Select type..." },
                    { value: "house", label: "House" },
                    { value: "apartment", label: "Apartment" },
                    { value: "townhouse", label: "Townhouse" },
                    { value: "land", label: "Land" },
                    { value: "rural", label: "Rural" },
                  ]}
                />
              </FieldLabel>

              <div className="grid grid-cols-3 gap-2.5">
                {(["beds", "baths", "parking"] as const).map((field) => (
                  <FieldLabel key={field} label={field.charAt(0).toUpperCase() + field.slice(1)}>
                    <FieldSelect
                      value={briefData[field]}
                      onChange={(v) => setBriefData({ ...briefData, [field]: v })}
                      options={[
                        { value: "", label: "Any" },
                        ...([1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n}+` }))),
                      ]}
                    />
                  </FieldLabel>
                ))}
              </div>

              <FieldLabel label="Budget">
                <FieldInput
                  type="text"
                  placeholder="$ e.g. 850,000"
                  value={briefData.budget}
                  onChange={(v) => setBriefData({ ...briefData, budget: v })}
                />
              </FieldLabel>
            </div>

            {/* Purchase Intent Toggle */}
            <div className="mt-4 pt-4 border-t" style={{ borderColor: "rgba(232,180,184,0.2)" }}>
              <div style={{ fontFamily: "'Figtree',sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: "1px", textTransform: "uppercase", color: "#7FA8D4", marginBottom: 8 }}>Purchase Intent</div>
              <div className="flex gap-2">
                {(["live", "invest", "both"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setBriefData({ ...briefData, intent: opt })}
                    className="flex-1 px-3 py-2 rounded-8 text-center transition-all"
                    style={{
                      fontFamily: "'Figtree',sans-serif",
                      fontSize: 12,
                      fontWeight: 500,
                      background: briefData.intent === opt ? "#4A90D9" : "#F4F1EC",
                      color: briefData.intent === opt ? "white" : "#1E1E1E",
                      border: "1.5px solid",
                      borderColor: briefData.intent === opt ? "#4A90D9" : "rgba(232,180,184,0.2)",
                    }}
                  >
                    {opt === "live" && "🏠 Live in"}
                    {opt === "invest" && "📈 Invest"}
                    {opt === "both" && "Both"}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2.5 text-white transition-all mt-4"
              style={{
                fontFamily: "'Outfit',sans-serif",
                fontSize: 14,
                fontWeight: 600,
                background: "#4A90D9",
                padding: 14,
                borderRadius: 10,
                border: "none",
                letterSpacing: "0.3px",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#3478C0"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#4A90D9"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <BBIcon docWidth={14} docHeight={18} pinSize={7} pinInnerSize={3} />
              Find My Matches
            </button>

            {/* Note */}
            <div className="flex items-center justify-center gap-1.5 mt-2.5 flex-wrap">
              {["Powered by AI", "No sign-up required", "Instant results"].map((t, i) => (
                <span key={t} className="flex items-center gap-1.5">
                  {i > 0 && <span className="inline-block w-[3px] h-[3px] rounded-full" style={{ background: "#E8B4B8" }} />}
                  <span style={{ fontFamily: "'Figtree',sans-serif", fontSize: 11, color: "#7FA8D4" }}>{t}</span>
                </span>
              ))}
            </div>
          </form>
        </div>

        {/* Right — Liam */}
        <div
          className="relative hidden lg:flex items-end justify-center overflow-hidden min-h-screen"
          style={{ background: "linear-gradient(160deg, #EEF5FC 0%, #F4F1EC 60%)" }}
        >
          <div className="absolute bottom-0 left-0 right-0 h-[60%]" style={{ background: "linear-gradient(to top, rgba(74,144,217,0.08), transparent)" }} />
          <div className="absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 30px, rgba(74,144,217,0.03) 30px, rgba(74,144,217,0.03) 31px)" }} />

          {/* Liam placeholder */}
          <div
            className="relative z-10 w-[75%] max-w-[380px] flex flex-col items-center justify-end overflow-hidden"
            style={{
              aspectRatio: "3/4",
              background: "linear-gradient(160deg, #CBD8E8 0%, #A8BDD4 100%)",
              borderRadius: "24px 24px 0 0",
              boxShadow: "0 20px 60px rgba(74,144,217,0.2)",
            }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-[3]">
              <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 600, color: "white", marginBottom: 4 }}>Liam</p>
              <p style={{ fontFamily: "'Figtree',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Your AI Property Partner</p>
            </div>

            {/* Label overlay */}
            <div
              className="absolute bottom-0 left-0 right-0 flex items-end justify-between z-10"
              style={{ background: "linear-gradient(to top, rgba(30,30,30,0.7), transparent)", padding: "24px 20px 16px" }}
            >
              <div>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 600, color: "white" }}>Liam</div>
                <div style={{ fontFamily: "'Figtree',sans-serif", fontSize: 11, fontWeight: 300, color: "rgba(255,255,255,0.75)" }}>Your AI Buyer's Agent</div>
              </div>
              <span
                style={{
                  fontFamily: "'Figtree',sans-serif",
                  fontSize: 9,
                  fontWeight: 500,
                  letterSpacing: "1px",
                  background: "#E8B4B8",
                  color: "#1E1E1E",
                  padding: "4px 10px",
                  borderRadius: 20,
                }}
              >
                AI POWERED
              </span>
            </div>

            {/* Floating badges */}
            <FloatingBadge style={{ top: "24%", left: "-18%" }} className="animate-float1" title="Brief Matched" sub="92% score" />
            <FloatingBadge style={{ top: "52%", right: "-16%" }} className="animate-float2" title="New Match" sub="Off-market" />
            <FloatingBadge style={{ bottom: "18%", left: "-14%" }} className="animate-float3" title="CMA Ready" sub="3 comparable sales" />
          </div>
        </div>
      </section>

      {/* ════════════════════ HOW IT WORKS ════════════════════ */}
      <section id="how" className="py-12 sm:py-16 lg:py-[100px] px-5 sm:px-8 lg:px-[72px] reveal">
        <div className="flex items-center gap-2.5 mb-4">
          <BBIcon docWidth={14} docHeight={18} pinSize={7} pinInnerSize={3} />
          <span style={{ fontFamily: "'Figtree',sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: "2.5px", textTransform: "uppercase", color: "#7FA8D4" }}>
            The Process
          </span>
        </div>
        <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "clamp(28px, 3vw, 42px)", fontWeight: 700, letterSpacing: "-1px", marginBottom: 8 }}>
          How It Works
        </h2>
        <p className="max-w-[560px] mb-10 sm:mb-14" style={{ fontFamily: "'Figtree',sans-serif", fontSize: 16, fontWeight: 300, lineHeight: 1.6, color: "#4A5568" }}>
          From brief to keys — Liam handles the heavy lifting so you can focus on finding the right home.
        </p>

        <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-0">
          {/* Connecting line */}
          <div
            className="hidden lg:block absolute"
            style={{ top: 28, left: "10%", right: "10%", height: 1, background: "linear-gradient(90deg, transparent, #E8B4B8, #4A90D9, #E8B4B8, transparent)" }}
          />

          {[
            { title: "Tell Us What You Want", desc: "Fill out your property brief — suburb, beds, budget, and what matters most to you." },
            { title: "Liam Searches", desc: "Our AI scans listings, off-markets, and agent networks to find properties that match your brief." },
            { title: "See Your Matches", desc: "Get scored results with hit/miss breakdowns so you know exactly why each property was selected." },
            { title: "Refine & Save", desc: "Add properties to your hotlist, request CMA reports, and get Liam's offer suggestions." },
            { title: "Get Connected", desc: "Ready to move? Liam connects you with trusted agents and guides you through the process." },
          ].map((step, i) => (
            <div key={i} className="flex flex-col items-center text-center px-2 sm:px-4 relative">
              <div
                className="w-14 h-14 rounded-full bg-white flex items-center justify-center mb-4 relative z-10 flex-shrink-0"
                style={{ border: "2px solid #E8B4B8" }}
              >
                <BBIcon docWidth={18} docHeight={23} pinSize={9} pinInnerSize={4} />
              </div>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, color: "#1E1E1E", marginBottom: 6 }}>
                {step.title}
              </div>
              <div style={{ fontFamily: "'Figtree',sans-serif", fontSize: 11, fontWeight: 400, lineHeight: 1.6, color: "#4A5568" }}>
                {step.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════ PRICING ════════════════════ */}
      <section id="pricing" className="py-12 sm:py-16 lg:py-[100px] px-5 sm:px-8 lg:px-[72px] reveal" style={{ background: "#1E1E1E" }}>
        <div className="flex items-center gap-2.5 mb-4">
          <BBIcon docWidth={14} docHeight={18} pinSize={7} pinInnerSize={3} />
          <span style={{ fontFamily: "'Figtree',sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: "2.5px", textTransform: "uppercase", color: "#7FA8D4" }}>
            Plans
          </span>
        </div>
        <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "clamp(28px, 3vw, 42px)", fontWeight: 700, letterSpacing: "-1px", color: "#F4F1EC", marginBottom: 8 }}>
          Simple, Transparent Pricing
        </h2>
        <p className="max-w-[560px] mb-10 sm:mb-14" style={{ fontFamily: "'Figtree',sans-serif", fontSize: 16, fontWeight: 300, lineHeight: 1.6, color: "#7FA8D4" }}>
          Start free. Upgrade when you're ready to get serious about finding your next home.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-[960px] mx-auto">
          {/* Tier 1 */}
          <PricingCard
            tier="Tier 1"
            name="Quick Look"
            price="Free"
            priceNote=""
            desc="Try Liam with a single AI search — no sign-up required."
            features={["1 AI brief search", "5 scored results", "Hit/miss breakdown", "Basic property details"]}
            buttonText="Try Free"
            variant="light"
            onButtonClick={() => navigate("/brief")}
          />

          {/* Tier 2 */}
          <PricingCard
            tier="Tier 2"
            name="Active Buyer"
            price="$99"
            priceNote="/month"
            desc="Daily AI matching, unlimited results, and full access to Liam's tools."
            features={["Daily AI matching", "Unlimited scored results", "Personal hotlist", "CMA reports", "Offer suggestions", "Priority support"]}
            buttonText="Get Started"
            variant="featured"
            badge="MOST POPULAR"
            onButtonClick={() => navigate("/brief")}
          />

          {/* Tier 3 */}
          <PricingCard
            tier="Tier 3"
            name="Concierge"
            price="Contact"
            priceNote=""
            desc="Full-service buyer's agent experience with dedicated support."
            features={["Everything in Tier 2", "Dedicated buyer's agent", "Off-market access", "Negotiation support"]}
            buttonText="Join Waitlist"
            variant="dark"
            badge="COMING SOON"
          />
        </div>

        {/* Guarantee */}
        <div
          className="flex items-center gap-4 sm:gap-5 max-w-[960px] mx-auto mt-6 rounded-xl flex-wrap sm:flex-nowrap"
          style={{ background: "#F4F1EC", border: "1.5px solid rgba(232,180,184,0.4)", padding: "20px 28px" }}
        >
          <span className="text-[28px] flex-shrink-0">🛡️</span>
          <p style={{ fontFamily: "'Figtree',sans-serif", fontSize: 13, lineHeight: 1.6, color: "#4A5568" }}>
            <strong style={{ fontWeight: 600, color: "#1E1E1E" }}>30-day money-back guarantee.</strong>{" "}
            If Liam doesn't find you at least 5 quality matches in your first month, we'll refund your subscription — no questions asked.
          </p>
        </div>
      </section>

      {/* ════════════════════ WHY BUYERS BRIEF ════════════════════ */}
      <section id="why" className="py-12 sm:py-16 lg:py-[100px] px-5 sm:px-8 lg:px-[72px] reveal">
        <div className="flex items-center gap-2.5 mb-4">
          <BBIcon docWidth={14} docHeight={18} pinSize={7} pinInnerSize={3} />
          <span style={{ fontFamily: "'Figtree',sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: "2.5px", textTransform: "uppercase", color: "#7FA8D4" }}>
            The Difference
          </span>
        </div>
        <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "clamp(28px, 3vw, 42px)", fontWeight: 700, letterSpacing: "-1px", marginBottom: 8 }}>
          Why Buyers Brief
        </h2>
        <p className="max-w-[560px] mb-10 sm:mb-14" style={{ fontFamily: "'Figtree',sans-serif", fontSize: 16, fontWeight: 300, lineHeight: 1.6, color: "#4A5568" }}>
          We're not another property portal. We're your AI-powered advantage in the property market.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: "AI That Understands You", desc: "Not just keywords — Liam understands your lifestyle, priorities, and deal-breakers to find properties that actually fit." },
            { title: "Save Time, See More", desc: "Stop scrolling through hundreds of listings. Liam delivers scored, ranked matches daily — including off-market opportunities." },
            { title: "Confidence to Act", desc: "With CMA reports and offer suggestions powered by real market data, you'll know exactly what a property is worth and what to offer." },
          ].map((card, i) => (
            <div
              key={i}
              className="bg-white rounded-xl relative overflow-hidden"
              style={{ padding: "28px 24px", border: "1px solid rgba(127,168,212,0.15)" }}
            >
              <div className="absolute rounded-full opacity-50" style={{ bottom: -20, right: -20, width: 80, height: 80, background: "#EEF5FC" }} />
              <div className="w-11 h-11 rounded-[10px] flex items-center justify-center mb-4" style={{ background: "#EEF5FC" }}>
                <BBIcon docWidth={18} docHeight={22} pinSize={9} pinInnerSize={4} />
              </div>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 600, color: "#1E1E1E", marginBottom: 8 }}>
                {card.title}
              </div>
              <div style={{ fontFamily: "'Figtree',sans-serif", fontSize: 13, lineHeight: 1.6, color: "#4A5568" }}>
                {card.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════ LIAM QUOTE ════════════════════ */}
      <section className="relative overflow-hidden reveal" style={{ background: "#1E1E1E", padding: "60px 20px" }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 10% 50%, rgba(74,144,217,0.1), transparent 50%)" }} />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-8 lg:gap-[60px] items-center relative z-10 max-w-[1100px] mx-auto px-0 sm:px-8 lg:px-[52px]">
          {/* Photo */}
          <div
            className="w-full max-w-[220px] mx-auto lg:mx-0 relative overflow-hidden"
            style={{
              aspectRatio: "3/4",
              background: "linear-gradient(160deg, #4A6F8A 0%, #2E4A5F 100%)",
              borderRadius: 16,
              boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
            }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
              <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 600, color: "white" }}>Liam</p>
              <p style={{ fontFamily: "'Figtree',sans-serif", fontSize: 10, color: "rgba(255,255,255,0.6)" }}>Photo coming soon</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)", padding: "20px 16px 12px" }}>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 600, color: "white" }}>Liam</div>
              <div style={{ fontFamily: "'Figtree',sans-serif", fontSize: 10, color: "rgba(255,255,255,0.65)" }}>Founder, BuyersBrief.com.au</div>
            </div>
          </div>

          {/* Quote */}
          <div>
            <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 80, fontWeight: 700, lineHeight: "0.5", color: "#E8B4B8", opacity: 0.4, display: "block", marginBottom: 16 }}>
              "
            </span>
            <p className="mb-6" style={{ fontFamily: "'Outfit',sans-serif", fontSize: "clamp(20px, 2.5vw, 30px)", fontWeight: 300, lineHeight: 1.5, letterSpacing: "-0.3px", color: "#F4F1EC" }}>
              I built Buyers Brief because buying a home shouldn't feel like a second job.{" "}
              <strong style={{ fontWeight: 600, color: "#4A90D9" }}>You tell me what you want, and I'll find it.</strong>
            </p>
            <div className="flex flex-col gap-2.5">
              {["Every brief is personally reviewed", "My network includes off-market opportunities", "I'm here to help, not to sell"].map((b, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <BBIcon docWidth={12} docHeight={15} pinSize={6} pinInnerSize={2.5} />
                  <span style={{ fontFamily: "'Figtree',sans-serif", fontSize: 13, color: "#7FA8D4" }}>{b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════ FOOTER ════════════════════ */}
      <footer style={{ background: "#1E1E1E", borderTop: "1px solid rgba(232,180,184,0.15)", padding: "48px 20px 32px" }}>
        <div className="max-w-[1100px] mx-auto px-0 sm:px-8 lg:px-[52px]">
          <div className="flex flex-col lg:flex-row justify-between items-start mb-10 gap-8">
            <div>
              <Logo size="footer" />
              <p className="mt-1.5" style={{ fontFamily: "'Figtree',sans-serif", fontSize: 11, fontWeight: 300, letterSpacing: "1.5px", textTransform: "uppercase", color: "#7FA8D4" }}>
                Your Brief. My Network.
              </p>
            </div>
            <div className="flex gap-8 sm:gap-12">
              <div className="flex flex-col gap-3">
                <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase", color: "#7FA8D4", marginBottom: 4 }}>
                  Product
                </span>
                {[
                  { label: "How It Works", href: "#how" },
                  { label: "Pricing", href: "#pricing" },
                  { label: "Start Your Brief", href: "/brief" },
                ].map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    className="no-underline transition-colors"
                    style={{ fontFamily: "'Figtree',sans-serif", fontSize: 13, fontWeight: 300, color: "rgba(244,241,236,0.6)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#4A90D9")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(244,241,236,0.6)")}
                  >
                    {l.label}
                  </a>
                ))}
              </div>
              <div className="flex flex-col gap-3">
                <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase", color: "#7FA8D4", marginBottom: 4 }}>
                  Company
                </span>
                {["Privacy", "Terms", "Contact"].map((l) => (
                  <a
                    key={l}
                    href="#"
                    className="no-underline transition-colors"
                    style={{ fontFamily: "'Figtree',sans-serif", fontSize: 13, fontWeight: 300, color: "rgba(244,241,236,0.6)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#4A90D9")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(244,241,236,0.6)")}
                  >
                    {l}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ fontFamily: "'Figtree',sans-serif", fontSize: 11, fontWeight: 300, color: "rgba(244,241,236,0.35)" }}>
              © 2025 BuyersBrief.com.au — Your Brief. My Network.
            </span>
            <div className="flex gap-1.5 items-center">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#4A90D9" }} />
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#E8B4B8" }} />
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#7FA8D4" }} />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Reusable sub-components ── */

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        className="block mb-1"
        style={{
          fontFamily: "'Figtree',sans-serif",
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: "1px",
          textTransform: "uppercase",
          color: "#7FA8D4",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function FieldInput({
  type,
  placeholder,
  value,
  onChange,
}: {
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full outline-none transition-all"
      style={{
        fontFamily: "'Figtree',sans-serif",
        fontSize: 13,
        background: "#F4F1EC",
        border: "1.5px solid transparent",
        borderRadius: 8,
        padding: "10px 14px",
        color: "#1E1E1E",
      }}
      onFocus={(e) => { e.target.style.borderColor = "#4A90D9"; e.target.style.background = "white"; }}
      onBlur={(e) => { e.target.style.borderColor = "transparent"; e.target.style.background = "#F4F1EC"; }}
    />
  );
}

function FieldSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full outline-none appearance-none cursor-pointer transition-all"
      style={{
        fontFamily: "'Figtree',sans-serif",
        fontSize: 13,
        background: "#F4F1EC",
        border: "1.5px solid transparent",
        borderRadius: 8,
        padding: "10px 14px",
        color: "#1E1E1E",
      }}
      onFocus={(e) => (e.target.style.borderColor = "#4A90D9")}
      onBlur={(e) => (e.target.style.borderColor = "transparent")}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function FloatingBadge({
  title,
  sub,
  style,
  className = "",
}: {
  title: string;
  sub: string;
  style: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={`absolute z-10 bg-white rounded-xl shadow-lg flex items-center gap-2 ${className}`}
      style={{ padding: "10px 14px", ...style }}
    >
      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#EEF5FC" }}>
        <BBIcon docWidth={12} docHeight={15} pinSize={6} pinInnerSize={2.5} />
      </div>
      <div className="flex flex-col gap-px">
        <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, color: "#1E1E1E" }}>{title}</span>
        <span style={{ fontFamily: "'Figtree',sans-serif", fontSize: 9, color: "#7FA8D4" }}>{sub}</span>
      </div>
    </div>
  );
}

function PricingCard({
  tier,
  name,
  price,
  priceNote,
  desc,
  features,
  buttonText,
  variant,
  badge,
  onButtonClick,
}: {
  tier: string;
  name: string;
  price: string;
  priceNote: string;
  desc: string;
  features: string[];
  buttonText: string;
  variant: "light" | "featured" | "dark";
  badge?: string;
  onButtonClick?: () => void;
}) {
  const styles = {
    light: {
      bg: "white",
      border: "1.5px solid rgba(127,168,212,0.2)",
      tierColor: "#7FA8D4",
      nameColor: "#1E1E1E",
      priceColor: "#1E1E1E",
      noteColor: "#4A5568",
      descColor: "#4A5568",
      featureColor: "#4A5568",
      ruleColor: "rgba(127,168,212,0.2)",
      btnBg: "#4A90D9",
      btnColor: "white",
      transform: "",
    },
    featured: {
      bg: "#4A90D9",
      border: "1.5px solid #4A90D9",
      tierColor: "rgba(255,255,255,0.6)",
      nameColor: "white",
      priceColor: "white",
      noteColor: "rgba(255,255,255,0.7)",
      descColor: "rgba(255,255,255,0.75)",
      featureColor: "rgba(255,255,255,0.85)",
      ruleColor: "rgba(255,255,255,0.2)",
      btnBg: "white",
      btnColor: "#4A90D9",
      transform: "scale(1.03)",
    },
    dark: {
      bg: "#1E1E1E",
      border: "1.5px solid rgba(232,180,184,0.3)",
      tierColor: "rgba(255,255,255,0.6)",
      nameColor: "white",
      priceColor: "white",
      noteColor: "rgba(255,255,255,0.7)",
      descColor: "rgba(255,255,255,0.75)",
      featureColor: "rgba(255,255,255,0.85)",
      ruleColor: "rgba(255,255,255,0.2)",
      btnBg: "transparent",
      btnColor: "#E8B4B8",
      transform: "",
    },
  };
  const s = styles[variant];

  return (
    <div
      className="rounded-2xl relative transition-all hover:translate-y-[-4px]"
      style={{ background: s.bg, padding: "32px 28px", border: s.border, transform: s.transform }}
    >
      {badge && (
        <span
          className="absolute whitespace-nowrap"
          style={{
            top: -12,
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: "'Figtree',sans-serif",
            fontSize: 9,
            fontWeight: 500,
            letterSpacing: "1.5px",
            background: "#E8B4B8",
            color: "#1E1E1E",
            padding: "4px 14px",
            borderRadius: 20,
          }}
        >
          {badge}
        </span>
      )}
      <div style={{ fontFamily: "'Figtree',sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: "2px", textTransform: "uppercase", color: s.tierColor, marginBottom: 8 }}>
        {tier}
      </div>
      <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 700, color: s.nameColor, marginBottom: 4 }}>
        {name}
      </div>
      <div className="flex items-baseline gap-1 mb-1.5">
        <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 40, fontWeight: 700, letterSpacing: "-2px", color: s.priceColor }}>
          {price}
        </span>
        {priceNote && (
          <span style={{ fontFamily: "'Figtree',sans-serif", fontSize: 13, fontWeight: 300, color: s.noteColor }}>
            {priceNote}
          </span>
        )}
      </div>
      <p className="min-h-[36px] mb-6" style={{ fontFamily: "'Figtree',sans-serif", fontSize: 12, fontWeight: 300, lineHeight: 1.5, color: s.descColor }}>
        {desc}
      </p>
      <div className="mb-5" style={{ height: 1, background: s.ruleColor }} />
      <div className="flex flex-col gap-2.5 mb-7">
        {features.map((f, i) => (
          <div key={i} className="flex items-start gap-2">
            <BBIcon docWidth={10} docHeight={13} pinSize={5} pinInnerSize={2} />
            <span style={{ fontFamily: "'Figtree',sans-serif", fontSize: 12, lineHeight: 1.4, color: s.featureColor }}>{f}</span>
          </div>
        ))}
      </div>
      <button
        className="w-full transition-all"
        style={{
          fontFamily: "'Outfit',sans-serif",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.3px",
          background: s.btnBg,
          color: s.btnColor,
          padding: 13,
          borderRadius: 10,
          border: variant === "dark" ? "1.5px solid #E8B4B8" : "none",
        }}
        onClick={onButtonClick}
      >
        {buttonText}
      </button>
    </div>
  );
}
