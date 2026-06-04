import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';

type MatchCard = {
  id: number;
  address: string;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  propertyType: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: string | null;
  priceDisplay: string | null;
  price: number | null;
  score: number;
  daysOnMarket: number | null;
  listingStatus: string | null;
  listingUrl: string | null;
  liamNote: string | null;
  scoreBreakdown: unknown;
};

function money(value: number | null | undefined, fallback = 'POA') {
  if (!value) return fallback;
  return `$${value.toLocaleString('en-AU')}`;
}

function asList(value: unknown, key: string): string[] {
  if (!value || typeof value !== 'object') return [];
  const candidate = (value as Record<string, unknown>)[key];
  return Array.isArray(candidate) ? candidate.map(String).filter(Boolean) : [];
}

function parseJsonList(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    // Stored free text is also valid brief context.
  }
  return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
}

function statusLabel(status: string | null | undefined) {
  if (!status) return 'Active';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

function MatchCardView({
  match,
  isHotlisted,
  onHotlist,
  hotlisting,
}: {
  match: MatchCard;
  isHotlisted: boolean;
  onHotlist: () => void;
  hotlisting: boolean;
}) {
  const needsMet = asList(match.scoreBreakdown, 'needsMet');
  const wantsMet = asList(match.scoreBreakdown, 'wantsMet');
  const flags = asList(match.scoreBreakdown, 'nnFlags');

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">{statusLabel(match.listingStatus)}</span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{match.score}% match</span>
            {typeof match.daysOnMarket === 'number' && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{match.daysOnMarket} days listed</span>
            )}
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">{match.address}</h2>
          <p className="mt-1 text-sm text-slate-500">{[match.suburb, match.state, match.postcode].filter(Boolean).join(' ')}</p>
          <p className="mt-3 text-sm text-slate-700">
            {[match.bedrooms ? `${match.bedrooms} bed` : null, match.bathrooms ? `${match.bathrooms} bath` : null, match.parking ? `${match.parking} parking` : null, match.propertyType].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="min-w-[180px] text-left lg:text-right">
          <div className="text-2xl font-bold text-slate-950">{match.priceDisplay || money(match.price)}</div>
          <div className="mt-3 flex flex-wrap gap-2 lg:justify-end">
            {match.listingUrl && (
              <a className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-sky-400 hover:text-sky-700" href={match.listingUrl} target="_blank" rel="noreferrer">View listing</a>
            )}
            <button
              className="rounded-full bg-slate-950 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              onClick={onHotlist}
              disabled={isHotlisted || hotlisting}
            >
              {isHotlisted ? 'Hotlisted' : hotlisting ? 'Adding…' : 'Add to hotlist'}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
        <strong className="text-slate-950">Liam’s note:</strong> {match.liamNote || 'This property has been matched against your saved buyer brief.'}
      </div>

      {(needsMet.length > 0 || wantsMet.length > 0 || flags.length > 0) && (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <FeatureList title="Needs met" items={needsMet} tone="emerald" />
          <FeatureList title="Wants met" items={wantsMet} tone="sky" />
          <FeatureList title="Watch-outs" items={flags} tone="rose" />
        </div>
      )}
    </article>
  );
}

function FeatureList({ title, items, tone }: { title: string; items: string[]; tone: 'emerald' | 'sky' | 'rose' }) {
  const toneClasses = {
    emerald: 'bg-emerald-50 text-emerald-800',
    sky: 'bg-sky-50 text-sky-800',
    rose: 'bg-rose-50 text-rose-800',
  }[tone];

  return (
    <div className={`rounded-2xl p-3 ${toneClasses}`}>
      <div className="text-xs font-bold uppercase tracking-wide opacity-75">{title}</div>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-1 text-sm">
          {items.slice(0, 4).map((item) => <li key={item}>• {item}</li>)}
        </ul>
      ) : (
        <div className="mt-2 text-sm opacity-75">None flagged.</div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const [actionError, setActionError] = useState<string | null>(null);

  const dashboard = trpc.dashboard.get.useQuery(undefined, {
    enabled: !!user,
    retry: false,
  });
  const runSearch = trpc.search.run.useMutation({
    onSuccess: async () => {
      await utils.dashboard.get.invalidate();
      setActionError(null);
    },
    onError: (error) => setActionError(error.message),
  });
  const addHotlist = trpc.hotlist.add.useMutation({
    onSuccess: async () => {
      await utils.dashboard.get.invalidate();
      setActionError(null);
    },
    onError: (error) => setActionError(error.message),
  });

  const data = dashboard.data;
  const hotlistedIds = useMemo(() => new Set((data?.hotlist || []).map((row) => row.hotlist.matchId)), [data?.hotlist]);
  const briefNeeds = parseJsonList(data?.activeBrief?.needs);
  const briefWants = parseJsonList(data?.activeBrief?.wants);
  const briefNns = parseJsonList(data?.activeBrief?.nonNegotiables);

  if (loading) {
    return <div className="min-h-screen bg-slate-50 p-8 text-slate-600">Loading your dashboard…</div>;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-950">Sign in to view your matches</h1>
          <p className="mt-3 text-slate-600">Your buyer dashboard is protected so your brief, matches, and hotlist remain private.</p>
          <button className="mt-6 rounded-full bg-slate-950 px-5 py-3 font-semibold text-white" onClick={() => navigate('/login')}>Go to login</button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f4ef] px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 rounded-3xl bg-slate-950 p-6 text-white shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">BuyersBrief Dashboard</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Welcome back{user.firstName ? `, ${user.firstName}` : ''}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              This dashboard now reflects your saved buyer brief, AI-generated property matches, and live hotlist state from the backend.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10" onClick={() => navigate('/brief')}>Edit / create brief</button>
            <button
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={runSearch.isPending || !data?.activeBrief}
              onClick={() => data?.activeBrief && runSearch.mutate({ briefId: data.activeBrief.id })}
            >
              {runSearch.isPending ? 'Refreshing matches…' : 'Run AI search'}
            </button>
          </div>
        </header>

        {(dashboard.error || actionError) && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {actionError || dashboard.error?.message}
          </div>
        )}

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <Metric label="Active brief" value={data?.activeBrief ? 'Saved' : 'None'} />
          <Metric label="AI matches" value={String(data?.matches?.length || 0)} />
          <Metric label="Hotlist" value={String(data?.hotlist?.length || 0)} />
          <Metric label="Tier" value={user.tier || 'free'} />
        </section>

        <section className="mb-6 grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Current buyer brief</h2>
                <p className="text-sm text-slate-500">The backend record Liam is matching against.</p>
              </div>
              {data?.activeBrief && <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{data.activeBrief.status}</span>}
            </div>
            {data?.activeBrief ? (
              <div className="grid gap-4 md:grid-cols-2">
                <BriefLine label="Location" value={data.activeBrief.suburbs || 'Not specified'} />
                <BriefLine label="Property" value={[data.activeBrief.type, data.activeBrief.beds ? `${data.activeBrief.beds} bed` : null, data.activeBrief.baths ? `${data.activeBrief.baths} bath` : null].filter(Boolean).join(' · ') || 'Not specified'} />
                <BriefLine label="Budget" value={data.activeBrief.budgetDisplay || money(data.activeBrief.budget, 'Not specified')} />
                <BriefLine label="Timeline" value={data.activeBrief.timeline || 'Not specified'} />
                <BriefTagGroup title="Non-negotiables" items={briefNns} />
                <BriefTagGroup title="Needs" items={briefNeeds} />
                <BriefTagGroup title="Wants" items={briefWants} />
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
                No saved buyer brief yet. Create one to unlock AI-generated matches.
              </div>
            )}
          </div>

          <aside className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Hotlist</h2>
            <p className="mt-1 text-sm text-slate-500">Properties you have shortlisted for deeper review.</p>
            <div className="mt-4 space-y-3">
              {(data?.hotlist || []).length > 0 ? data?.hotlist.map((row) => (
                <div key={row.hotlist.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="font-semibold text-slate-950">{row.match?.address || `Match #${row.hotlist.matchId}`}</div>
                  <div className="mt-1 text-sm text-slate-500">{row.match?.priceDisplay || money(row.match?.price)}</div>
                </div>
              )) : (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No hotlisted properties yet.</div>
              )}
            </div>
          </aside>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">Liam’s matches</h2>
              <p className="text-sm text-slate-600">Ranked by how closely each property fits the saved brief.</p>
            </div>
          </div>

          {dashboard.isPending ? (
            <div className="rounded-3xl bg-white p-8 text-slate-600 shadow-sm">Loading live matches…</div>
          ) : (data?.matches || []).length > 0 ? (
            data?.matches.map((match) => (
              <MatchCardView
                key={match.id}
                match={match as MatchCard}
                isHotlisted={hotlistedIds.has(match.id)}
                hotlisting={addHotlist.isPending && addHotlist.variables?.matchId === match.id}
                onHotlist={() => addHotlist.mutate({ matchId: match.id })}
              />
            ))
          ) : (
            <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
              <h3 className="text-xl font-bold text-slate-950">No matches yet</h3>
              <p className="mx-auto mt-2 max-w-xl text-slate-600">Create a buyer brief, then run the AI search to generate the first match set into your dashboard.</p>
              <button className="mt-5 rounded-full bg-slate-950 px-5 py-3 font-semibold text-white" onClick={() => navigate('/brief')}>Create buyer brief</button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="text-sm font-semibold text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-950">{value}</div>
    </div>
  );
}

function BriefLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function BriefTagGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{title}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.length > 0 ? items.map((item) => (
          <span key={item} className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-700">{item}</span>
        )) : <span className="text-sm text-slate-500">Not specified</span>}
      </div>
    </div>
  );
}
