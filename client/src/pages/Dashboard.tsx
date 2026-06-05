import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import dashboardHtml from './dashboard.html?raw';

type TemplateCache = {
  matchCard?: HTMLElement;
  hotlistCard?: HTMLElement;
};

const dashboardRenderableHtml = extractRenderableDashboardHtml(dashboardHtml);

function extractRenderableDashboardHtml(sourceHtml: string) {
  const styleBlocks = sourceHtml.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi)?.join('\n') ?? '';
  const bodyMatch = sourceHtml.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : sourceHtml;
  const bodyWithoutScripts = bodyHtml.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

  return `${styleBlocks}\n${bodyWithoutScripts}`;
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function textValue(value: unknown, fallback = '') {
  const valueAsString = String(value ?? '').trim();
  return valueAsString || fallback;
}

function numberValue(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number.parseInt(String(value ?? '').replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function money(value: unknown, fallback = 'POA') {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value).replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(parsed) ? `$${parsed.toLocaleString('en-AU')}` : textValue(value, fallback);
}

function setText(scope: ParentNode, selector: string, value: unknown) {
  const element = scope.querySelector<HTMLElement>(selector);
  if (element) element.textContent = textValue(value);
}

function setHtml(scope: ParentNode, selector: string, value: string) {
  const element = scope.querySelector<HTMLElement>(selector);
  if (element) element.innerHTML = value;
}

function setDisplayed(element: Element | null | undefined, shouldDisplay: boolean, displayValue = '') {
  if (element instanceof HTMLElement) {
    element.style.display = shouldDisplay ? displayValue : 'none';
  }
}

function removeInlineHandlers(scope: ParentNode) {
  scope.querySelectorAll<HTMLElement>('[onclick]').forEach((element) => element.removeAttribute('onclick'));
}

function formatMeta(match: any) {
  const bedrooms = textValue(match?.bedrooms, '—');
  const bathrooms = textValue(match?.bathrooms, '—');
  const parking = textValue(match?.parking, match?.parkingSpaces ? `${match.parkingSpaces} car` : 'Parking TBC');
  return `${escapeHtml(bedrooms)} bed <span class="meta-dot"></span> ${escapeHtml(bathrooms)} bath <span class="meta-dot"></span> ${escapeHtml(parking)}`;
}

function scoreColour(score: number) {
  if (score >= 85) return '#4CAF7D';
  if (score >= 70) return '#E8A44A';
  return '#E8614A';
}

function cmaPath(cma: any) {
  if (cma?.suburbSlug && cma?.addressSlug) return `/cma/${cma.suburbSlug}/${cma.addressSlug}`;
  if (cma?.id) return `/cma/${cma.id}`;
  return null;
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user, loading, logout, refresh } = useAuth();
  const utils = trpc.useUtils();
  const containerRef = useRef<HTMLDivElement>(null);
  const templatesRef = useRef<TemplateCache>({});

  const dashboardQuery = trpc.dashboard.get.useQuery(undefined, {
    enabled: !!user,
    retry: false,
  });

  const addHotlist = trpc.hotlist.add.useMutation({
    onSuccess: async () => {
      await utils.dashboard.get.invalidate();
    },
  });

  const updateHotlist = trpc.hotlist.update.useMutation({
    onSuccess: async () => {
      await utils.dashboard.get.invalidate();
    },
  });

  const removeHotlist = trpc.hotlist.remove.useMutation({
    onSuccess: async () => {
      await utils.dashboard.get.invalidate();
    },
  });

  const generateCma = trpc.cma.generate.useMutation({
    onSuccess: async (result) => {
      await utils.dashboard.get.invalidate();
      if (result.url) navigate(result.url);
    },
  });

  const updateNotifications = trpc.user.updateNotifications.useMutation({
    onSuccess: async () => {
      await refresh();
      await utils.dashboard.get.invalidate();
    },
  });

  useEffect(() => {
    if (loading || user) return;
    navigate('/login');
  }, [loading, user, navigate]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root || !dashboardQuery.data || !user) return;

    const data = dashboardQuery.data;
    const activeBrief = data.activeBrief;
    const matches = data.matches || [];
    const hotlist = (data.hotlist || []).filter((row: any) => row.hotlist?.status !== 'removed');
    const hotlistedIds = new Set(hotlist.map((row: any) => row.hotlist?.matchId));
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Buyer';
    const firstName = textValue(user.firstName, fullName.split(' ')[0] || 'Buyer');

    if (!templatesRef.current.matchCard) {
      const matchTemplate = root.querySelector<HTMLElement>('.match-card');
      if (matchTemplate) templatesRef.current.matchCard = matchTemplate.cloneNode(true) as HTMLElement;
    }
    if (!templatesRef.current.hotlistCard) {
      const hotlistTemplate = root.querySelector<HTMLElement>('.hotlist-card');
      if (hotlistTemplate) templatesRef.current.hotlistCard = hotlistTemplate.cloneNode(true) as HTMLElement;
    }

    removeInlineHandlers(root);

    setText(root, '.topbar-title', `Good morning, ${firstName}.`);
    setText(root, '.user-name', fullName);
    setText(root, '.user-plan', textValue(user.tier, 'Buyer account'));
    setText(root, '.user-avatar', firstName.charAt(0).toUpperCase() || 'B');

    const briefLocation = textValue(activeBrief?.suburbs, 'Location pending');
    const briefBudget = textValue(activeBrief?.budgetDisplay, 'Budget pending');
    const briefDetail = activeBrief
      ? `${textValue(activeBrief.beds, '—')} bed · ${textValue(activeBrief.baths, '—')} bath · ${briefBudget}`
      : 'Brief details pending';

    setText(root, '.brief-location', briefLocation);
    setText(root, '.brief-detail', briefDetail);
    setText(root, '.mobile-brief-loc', briefLocation);
    setText(root, '.section-count', matches.length ? `${matches.length} today` : '0 today');

    const hotlistCount = root.querySelectorAll<HTMLElement>('.section-count-rose');
    hotlistCount.forEach((element) => {
      element.textContent = `${hotlist.length} ${hotlist.length === 1 ? 'property' : 'properties'}`;
    });

    const logoutButton = root.querySelector<HTMLElement>('.user-logout');
    if (logoutButton) {
      logoutButton.onclick = async () => {
        await logout();
        navigate('/login');
      };
    }

    const refreshButton = root.querySelector<HTMLElement>('.topbar-refresh');
    if (refreshButton) {
      refreshButton.onclick = () => utils.dashboard.get.invalidate();
    }

    const sidebar = root.querySelector<HTMLElement>('.sidebar');
    const sidebarOverlay = root.querySelector<HTMLElement>('#sidebarOverlay, .sidebar-overlay');
    const mobileHeader = root.querySelector<HTMLElement>('#mobileHeader, .mobile-header');
    const closeMobileMenu = () => {
      sidebar?.classList.remove('open');
      sidebarOverlay?.classList.remove('show');
    };
    if (mobileHeader) {
      mobileHeader.onclick = () => {
        sidebar?.classList.toggle('open');
        sidebarOverlay?.classList.toggle('show');
      };
    }
    if (sidebarOverlay) sidebarOverlay.onclick = closeMobileMenu;

    const matchSection = root.querySelector<HTMLElement>('.match-cards')?.closest<HTMLElement>('.section-gap');
    const hotlistSection = root.querySelector<HTMLElement>('.hotlist-cards')?.closest<HTMLElement>('.section-gap');
    const accountSection = root.querySelector<HTMLElement>('#section-account, .account-grid')?.closest<HTMLElement>('.section-gap');
    const editBriefOverlay = root.querySelector<HTMLElement>('#editBriefOverlay');

    root.querySelectorAll<HTMLElement>('.nav-item').forEach((item) => {
      item.onclick = () => {
        const label = item.textContent?.toLowerCase() || '';
        root.querySelectorAll<HTMLElement>('.nav-item').forEach((navItem) => navItem.classList.remove('active'));
        item.classList.add('active');

        if (label.includes('hotlist')) hotlistSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        else if (label.includes('account') || label.includes('alert')) accountSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        else if (label.includes('brief')) editBriefOverlay?.classList.add('open');
        else matchSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });

        closeMobileMenu();
      };
    });

    const matchCardsContainer = root.querySelector<HTMLElement>('.match-cards');
    const matchTemplate = templatesRef.current.matchCard;
    if (matchCardsContainer && matchTemplate) {
      matchCardsContainer.innerHTML = '';

      if (matches.length === 0) {
        const emptyCard = matchTemplate.cloneNode(true) as HTMLElement;
        removeInlineHandlers(emptyCard);
        emptyCard.className = 'match-card';
        setText(emptyCard, '.match-rank', '—');
        setText(emptyCard, '.match-addr', 'No new matches yet');
        setHtml(emptyCard, '.match-meta', `Your brief is still running <span class="meta-dot"></span> We will add fresh matches here`);
        setText(emptyCard, '.score-text', '0%');
        setText(emptyCard, '.score-pct', 'Search running');
        setHtml(emptyCard, '.score-missing', '<span class="hit">Liam is monitoring the market for your brief.</span>');
        setText(emptyCard, '.match-price', '—');
        setDisplayed(emptyCard.querySelector('.btn-add'), false);
        setDisplayed(emptyCard.querySelector('.btn-reject'), false);
        matchCardsContainer.appendChild(emptyCard);
      } else {
        matches.forEach((match: any, index: number) => {
          const card = matchTemplate.cloneNode(true) as HTMLElement;
          const score = numberValue(match.score, index === 0 ? 96 : 80);
          const colour = scoreColour(score);
          const isHotlisted = hotlistedIds.has(match.id);
          removeInlineHandlers(card);

          card.className = `match-card${index < 2 ? ' new-match' : ''}`;
          setText(card, '.match-rank', `#${index + 1}`);
          setText(card, '.match-addr', textValue(match.address, 'Address pending'));
          setHtml(card, '.match-meta', `${formatMeta(match)} <span class="meta-dot"></span> <span class="match-badge badge-new">${index < 2 ? 'NEW TODAY' : 'MATCH'}</span>`);
          setText(card, '.score-text', `${score}%`);
          setText(card, '.score-pct', `${score}% match`);
          setHtml(
            card,
            '.score-missing',
            `<span class="hit">${escapeHtml(match.liamNote || 'Matched against your buyer brief.')}</span><br><span class="miss">${escapeHtml(match.tradeoffNote || 'Review details before inspection.')}</span>`,
          );
          setText(card, '.match-price', textValue(match.priceDisplay, money(match.price)));

          const scoreText = card.querySelector<HTMLElement>('.score-text');
          if (scoreText) scoreText.style.color = colour;
          const scoreCircle = card.querySelector<SVGCircleElement>('.score-ring svg circle:nth-of-type(2)');
          if (scoreCircle) {
            scoreCircle.setAttribute('stroke', colour);
            scoreCircle.setAttribute('stroke-dasharray', `${Math.max(0, Math.min(100, score))} 100.5`);
          }

          const addButton = card.querySelector<HTMLButtonElement>('.btn-add');
          if (addButton) {
            addButton.textContent = isHotlisted ? '✓ Added' : '+ Hotlist';
            addButton.disabled = isHotlisted;
            addButton.classList.toggle('added', isHotlisted);
            addButton.onclick = () => addHotlist.mutate({ matchId: match.id });
          }

          const rejectButton = card.querySelector<HTMLButtonElement>('.btn-reject');
          if (rejectButton) {
            rejectButton.textContent = 'Not for me';
            rejectButton.onclick = () => {
              card.style.display = 'none';
            };
          }

          matchCardsContainer.appendChild(card);
        });
      }
    }

    const hotlistCardsContainer = root.querySelector<HTMLElement>('.hotlist-cards');
    const hotlistTemplate = templatesRef.current.hotlistCard;
    if (hotlistCardsContainer && hotlistTemplate) {
      hotlistCardsContainer.innerHTML = '';

      if (hotlist.length === 0) {
        const emptyCard = hotlistTemplate.cloneNode(true) as HTMLElement;
        removeInlineHandlers(emptyCard);
        emptyCard.className = 'hotlist-card';
        setText(emptyCard, '.hotlist-addr', 'No properties in your hotlist yet');
        setHtml(emptyCard, '.hotlist-meta', `Add a match from above <span class="meta-dot"></span> Liam will track it here`);
        setText(emptyCard, '.hotlist-change', 'Your shortlist is ready when you are.');
        setText(emptyCard, '.hotlist-price', '—');
        setDisplayed(emptyCard.querySelector('.inspect-btn'), false);
        setDisplayed(emptyCard.querySelector('.btn-proceed'), false);
        setDisplayed(emptyCard.querySelector('.btn-cma'), false);
        setDisplayed(emptyCard.querySelector('.btn-remove'), false);
        hotlistCardsContainer.appendChild(emptyCard);
      } else {
        hotlist.forEach((row: any, index: number) => {
          const card = hotlistTemplate.cloneNode(true) as HTMLElement;
          const match = row.match || {};
          const hotlistEntry = row.hotlist || {};
          const inspectId = `inspect-${hotlistEntry.id || index}`;
          removeInlineHandlers(card);

          card.className = `hotlist-card${hotlistEntry.status === 'stale' ? ' status-stale' : ''}${hotlistEntry.status === 'under_offer' ? ' status-offer' : ''}${hotlistEntry.status === 'sold' ? ' status-sold' : ''}`;
          setText(card, '.hotlist-addr', textValue(match.address, 'Property address pending'));
          setHtml(card, '.hotlist-meta', `${formatMeta(match)} <span class="status-pill ${hotlistEntry.status === 'active' ? 'status-active' : 'status-drop'}">${textValue(hotlistEntry.status, 'ACTIVE').replace('_', ' ').toUpperCase()}</span>`);
          setHtml(card, '.hotlist-change', `<span class="change-down">${escapeHtml(row.cma ? 'CMA ready' : 'Monitoring')}</span> <span style="color:rgba(127,168,212,0.4);">— added to your hotlist</span>`);
          setText(card, '.hotlist-price', textValue(match.priceDisplay, money(match.price)));
          setText(card, '.hotlist-orig', textValue(match.originalPriceDisplay, ''));

          const cmaValues = card.querySelectorAll<HTMLElement>('.cma-item-value');
          if (cmaValues[0]) cmaValues[0].textContent = `${numberValue(match.score, 0)}%`;
          if (cmaValues[1]) cmaValues[1].textContent = textValue(match.priceDisplay, money(match.price));
          if (cmaValues[2]) cmaValues[2].textContent = row.cma ? 'Ready' : 'Pending';

          const inspectPanel = card.querySelector<HTMLElement>('.inspect-panel');
          const inspectTextarea = card.querySelector<HTMLTextAreaElement>('.inspect-textarea');
          const suggestion = card.querySelector<HTMLElement>('.liam-suggestion');
          const suggestionText = card.querySelector<HTMLElement>('.liam-suggestion-text');
          const savedNote = card.querySelector<HTMLElement>('.inspect-saved');
          const savedNoteText = card.querySelector<HTMLElement>('.inspect-saved-text');

          if (inspectPanel) inspectPanel.id = inspectId;
          if (inspectTextarea) {
            inspectTextarea.id = `${inspectId}-text`;
            inspectTextarea.value = textValue(hotlistEntry.inspectionNote, '');
          }
          if (suggestion) suggestion.id = `${inspectId}-suggest`;
          if (suggestionText) suggestionText.id = `${inspectId}-suggest-text`;
          if (savedNote) savedNote.id = `${inspectId}-saved`;
          if (savedNoteText) {
            savedNoteText.id = `${inspectId}-saved-text`;
            savedNoteText.textContent = textValue(hotlistEntry.inspectionNote, '');
            savedNote?.classList.toggle('show', !!hotlistEntry.inspectionNote);
          }

          const inspectButton = card.querySelector<HTMLButtonElement>('.inspect-btn');
          if (inspectButton) inspectButton.onclick = () => inspectPanel?.classList.toggle('open');

          const saveNoteButton = card.querySelector<HTMLButtonElement>('.inspect-save');
          if (saveNoteButton) {
            saveNoteButton.onclick = () => {
              const note = inspectTextarea?.value.trim() || '';
              updateHotlist.mutate({ id: hotlistEntry.id, inspectionNote: note });
              if (savedNoteText) savedNoteText.textContent = note;
              savedNote?.classList.add('show');
              if (suggestionText) {
                suggestionText.innerHTML = `<strong>Suggested next step:</strong> keep this note attached to your Tier 3 request so Liam can factor it into the negotiation ceiling.`;
              }
              suggestion?.classList.add('show');
            };
          }

          const editNoteButton = card.querySelector<HTMLButtonElement>('.inspect-edit');
          if (editNoteButton) editNoteButton.onclick = () => inspectPanel?.classList.add('open');

          const useSuggestionButton = card.querySelector<HTMLButtonElement>('.suggest-use');
          if (useSuggestionButton) useSuggestionButton.onclick = () => openProceedModal(root, row, updateHotlist.mutate);

          const proceedButton = card.querySelector<HTMLButtonElement>('.btn-proceed');
          if (proceedButton) proceedButton.onclick = () => openProceedModal(root, row, updateHotlist.mutate);

          const cmaButton = card.querySelector<HTMLButtonElement>('.btn-cma, .cma-run');
          if (cmaButton) {
            cmaButton.textContent = row.cma ? 'View CMA →' : 'Run full CMA';
            cmaButton.onclick = () => {
              const path = cmaPath(row.cma);
              if (path) navigate(path);
              else generateCma.mutate({ hotlistId: hotlistEntry.id, address: match.address, suburb: match.suburb });
            };
          }

          const removeButton = card.querySelector<HTMLButtonElement>('.btn-remove');
          if (removeButton) removeButton.onclick = () => removeHotlist.mutate({ id: hotlistEntry.id });

          hotlistCardsContainer.appendChild(card);
        });
      }
    }

    const accountFields = root.querySelectorAll<HTMLInputElement>('.account-field-input');
    if (accountFields.length >= 4) {
      accountFields[0].value = textValue(user.firstName, '');
      accountFields[1].value = textValue(user.lastName, '');
      accountFields[2].value = textValue(user.email, '');
      accountFields[3].value = textValue(user.mobile, '');
    }

    const notificationKeys = ['dailyEmail', 'hotSms', 'priceDrop', 'statusChange', 'weeklyDigest'];
    root.querySelectorAll<HTMLInputElement>('.toggle-switch input').forEach((checkbox, index) => {
      const key = notificationKeys[index];
      checkbox.checked = !!(user.notifications as any)?.[key];
      checkbox.onchange = (event) => {
        if (!key) return;
        updateNotifications.mutate({ [key]: (event.currentTarget as HTMLInputElement).checked });
      };
    });

    const saveAccountButton = root.querySelector<HTMLButtonElement>('.btn-save-account');
    if (saveAccountButton) {
      saveAccountButton.onclick = () => {
        saveAccountButton.textContent = 'Saved';
        window.setTimeout(() => {
          saveAccountButton.textContent = 'Save changes';
        }, 1600);
      };
    }

    const editBriefButton = root.querySelector<HTMLElement>('.edit-brief');
    if (editBriefButton) editBriefButton.onclick = () => editBriefOverlay?.classList.add('open');

    const closeBriefButton = root.querySelector<HTMLElement>('.edit-modal-close, .btn-cancel-edit');
    if (closeBriefButton) closeBriefButton.onclick = () => editBriefOverlay?.classList.remove('open');

    const saveBriefButton = root.querySelector<HTMLElement>('.btn-save-brief');
    if (saveBriefButton) saveBriefButton.onclick = () => navigate('/brief');

    const modalOverlay = root.querySelector<HTMLElement>('#modalOverlay');
    root.querySelectorAll<HTMLElement>('.modal-close, .modal-cancel, .modal-done').forEach((button) => {
      button.onclick = () => modalOverlay?.classList.remove('open');
    });
    const modalNext = root.querySelector<HTMLElement>('.modal-next');
    if (modalNext) modalNext.onclick = () => modalOverlay?.querySelectorAll<HTMLElement>('.modal-step').forEach((step, index) => {
      step.style.display = index === 1 ? '' : 'none';
    });
    const modalBack = root.querySelector<HTMLElement>('.modal-back');
    if (modalBack) modalBack.onclick = () => modalOverlay?.querySelectorAll<HTMLElement>('.modal-step').forEach((step, index) => {
      step.style.display = index === 0 ? '' : 'none';
    });

    const cancelSubscriptionButton = root.querySelector<HTMLElement>('.btn-cancel-sub');
    const cancelConfirm = root.querySelector<HTMLElement>('.cancel-confirm');
    if (cancelSubscriptionButton) cancelSubscriptionButton.onclick = () => cancelConfirm?.classList.add('show');
    const keepSubscriptionButton = root.querySelector<HTMLElement>('.btn-keep-sub');
    if (keepSubscriptionButton) keepSubscriptionButton.onclick = () => cancelConfirm?.classList.remove('show');
  }, [
    dashboardQuery.data,
    user,
    loading,
    logout,
    navigate,
    refresh,
    addHotlist,
    updateHotlist,
    removeHotlist,
    generateCma,
    updateNotifications,
    utils.dashboard.get,
  ]);

  if (loading || !user) {
    return <div className="loading-screen">Loading dashboard...</div>;
  }

  return <div ref={containerRef} dangerouslySetInnerHTML={{ __html: dashboardRenderableHtml }} />;
}

function openProceedModal(root: HTMLElement, row: any, updateHotlist: (input: { id: number; tier3Requested?: boolean; tier3MaxPrice?: number | null; inspectionNote?: string | null }) => void) {
  const modalOverlay = root.querySelector<HTMLElement>('#modalOverlay');
  if (!modalOverlay) return;

  const match = row.match || {};
  const hotlistEntry = row.hotlist || {};
  setText(modalOverlay, '.modal-prop-addr', textValue(match.address, 'Selected property'));
  setText(modalOverlay, '.modal-prop-meta', `${textValue(match.bedrooms, '—')} bed · ${textValue(match.bathrooms, '—')} bath · ${textValue(match.parking, 'Parking TBC')}`);

  const firstStep = modalOverlay.querySelectorAll<HTMLElement>('.modal-step')[0];
  const secondStep = modalOverlay.querySelectorAll<HTMLElement>('.modal-step')[1];
  if (firstStep) firstStep.style.display = '';
  if (secondStep) secondStep.style.display = 'none';

  const submitButton = modalOverlay.querySelector<HTMLButtonElement>('.modal-submit');
  if (submitButton) {
    submitButton.onclick = () => {
      const maxInput = modalOverlay.querySelector<HTMLInputElement>('.modal-input');
      const tier3MaxPrice = maxInput?.value ? numberValue(maxInput.value, 0) : null;
      updateHotlist({ id: hotlistEntry.id, tier3Requested: true, tier3MaxPrice });
      modalOverlay.querySelectorAll<HTMLElement>('.modal-step').forEach((step) => {
        step.style.display = 'none';
      });
      const confirmation = modalOverlay.querySelector<HTMLElement>('.modal-confirm-screen');
      if (confirmation) confirmation.style.display = '';
    };
  }

  modalOverlay.classList.add('open');
}
