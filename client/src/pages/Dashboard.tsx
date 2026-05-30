import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import dashboardHTML from './dashboard.html?raw';

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  useEffect(() => {
    // Inject all global functions that the HTML expects
    (window as any).addToHotlist = (btn: HTMLElement, cardId: string) => {
      btn.textContent = '✓ Added';
      btn.classList.add('added');
      (btn as HTMLButtonElement).disabled = true;

      const addresses: Record<string, any> = {
        mc1: { addr: '14 Borehole St, Merewether NSW 2291', meta: '4 bed · 2 bath · Double garage + side access', price: '$1,050,000' },
        mc2: { addr: '7 Cowper St, Merewether NSW 2291', meta: '3 bed · 1 bath · Single garage', price: '$895,000' },
        mc3: { addr: '31 Pacific St, Bar Beach NSW 2300', meta: '4 bed · 2 bath · Double carport + workshop', price: '$1,099,000' },
        mc4: { addr: 'Off-market · Merewether area', meta: '4 bed · 2 bath · Details on request', price: 'POA' },
      };
      const p = addresses[cardId];
      const card = document.createElement('div');
      card.className = 'hotlist-card';
      card.style.animation = 'fadeUp 0.3s ease';
      card.innerHTML = `
        <div class="hotlist-main">
          <div class="hotlist-addr">${p.addr}</div>
          <div class="hotlist-meta">${p.meta} <span class="status-pill status-active">JUST ADDED</span></div>
          <button class="cma-run">Run AI CMA →</button>
        </div>
        <div class="hotlist-right">
          <div class="hotlist-price">${p.price}</div>
          <div class="hotlist-actions" style="flex-direction:column;gap:5px;">
            <button class="btn-proceed" onclick="openModal('proceed')">Wanna buy this one?</button>
            <button class="btn-cma" onclick="runCMA(null)">Run full CMA</button>
            <button class="btn-remove" onclick="this.closest('.hotlist-card').remove()">Remove</button>
          </div>
        </div>`;
      const hotlistCards = document.getElementById('hotlistCards');
      if (hotlistCards) hotlistCards.prepend(card);
    };

    (window as any).rejectMatch = (cardId: string) => {
      const card = document.getElementById(cardId);
      if (card) {
        card.classList.add('rejected');
        setTimeout(() => card.remove(), 350);
      }
    };

    (window as any).toggleInspect = (id: string) => {
      const panel = document.getElementById(id);
      if (panel) {
        const btn = panel.previousElementSibling;
        panel.classList.toggle('open');
        if (btn) {
          (btn as HTMLElement).style.color = panel.classList.contains('open') ? 'var(--sky)' : '';
        }
      }
    };

    (window as any).saveNote = (id: string, addr: string, price: string) => {
      const textEl = document.getElementById(id + '-text') as HTMLTextAreaElement;
      if (!textEl) return;
      const text = textEl.value.trim();
      if (!text) return;
      const savedText = document.getElementById(id + '-saved-text');
      if (savedText) savedText.textContent = text;
      const saved = document.getElementById(id + '-saved');
      if (saved) saved.classList.add('show');
      textEl.style.display = 'none';
      const actions = document.querySelector('#' + id + ' .inspect-actions');
      if (actions) (actions as HTMLElement).style.display = 'none';
      const suggestion = (window as any).liamAnalyse(text, price);
      const suggestText = document.getElementById(id + '-suggest-text');
      if (suggestText) suggestText.innerHTML = suggestion.text;
      const suggest = document.getElementById(id + '-suggest');
      if (suggest) {
        suggest.classList.add('show');
        suggest.dataset.price = suggestion.suggestedPrice;
        suggest.dataset.addr = addr;
      }
      const inspBtn = document.getElementById(id)?.previousElementSibling;
      if (inspBtn) {
        inspBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 2h8M1 5h6M1 8h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg> Inspection note saved';
        (inspBtn as HTMLElement).style.color = 'var(--green)';
      }
    };

    (window as any).liamAnalyse = (note: string, askingPrice: string) => {
      const noteLower = note.toLowerCase();
      const askNum = parseInt((askingPrice || '0').replace(/[^0-9]/g, '')) || 1000000;
      let issues: string[] = [];
      let deductions = 0;
      if (noteLower.includes('bathroom') || noteLower.includes('bath')) { issues.push('bathroom renovation ($20–30K)'); deductions += 25000; }
      if (noteLower.includes('kitchen')) { issues.push('kitchen update ($15–25K)'); deductions += 20000; }
      if (noteLower.includes('roof')) { issues.push('roof work ($8–15K)'); deductions += 12000; }
      if (noteLower.includes('carpet') || noteLower.includes('floor')) { issues.push('flooring ($6–12K)'); deductions += 8000; }
      if (noteLower.includes('paint')) { issues.push('painting ($4–8K)'); deductions += 6000; }
      if (noteLower.includes('noise') || noteLower.includes('loud') || noteLower.includes('traffic')) { issues.push('noise concern (risk factor)'); deductions += 10000; }
      if (noteLower.includes('damp') || noteLower.includes('mould') || noteLower.includes('rising')) { issues.push('moisture/damp issue ($10–20K)'); deductions += 15000; }
      const suggestedPrice = askNum - Math.max(deductions, 10000);
      const suggestedStr = '$' + suggestedPrice.toLocaleString();
      const deductStr = '$' + deductions.toLocaleString();
      let text = '';
      if (issues.length > 0) {
        text = `Based on your notes, I'm seeing <strong>${issues.join(', ')}</strong> as items to factor in. That's roughly <strong>${deductStr}</strong> in work. <em>My suggestion: go in at <strong>${suggestedStr}</strong> — that covers the work and gives you room to negotiate up if needed.</em>`;
      } else {
        const genericDeduct = Math.round(askNum * 0.025 / 1000) * 1000;
        const genericSuggested = askNum - genericDeduct;
        text = `Sounds like you liked it. Standard negotiating position would be <strong>$${genericSuggested.toLocaleString()}</strong> — leaves you room to move up to asking if needed without overpaying.`;
        return { text, suggestedPrice: genericSuggested };
      }
      return { text, suggestedPrice };
    };

    (window as any).editNote = (id: string) => {
      const saved = document.getElementById(id + '-saved');
      if (saved) saved.classList.remove('show');
      const suggest = document.getElementById(id + '-suggest');
      if (suggest) suggest.classList.remove('show');
      const textEl = document.getElementById(id + '-text');
      if (textEl) textEl.style.display = 'block';
      const actions = document.querySelector('#' + id + ' .inspect-actions');
      if (actions) (actions as HTMLElement).style.display = 'flex';
    };

    (window as any).useSuggestion = (id: string) => {
      const suggestion = document.getElementById(id + '-suggest');
      if (suggestion) {
        const price = suggestion.dataset.price || '';
        const addr = suggestion.dataset.addr || '';
        (window as any).openModal('proceed', addr, '$' + parseInt(price).toLocaleString(), id);
      }
    };

    (window as any).openModal = (type: string, addr?: string, price?: string, inspId?: string) => {
      const modal = document.getElementById('modalOverlay');
      if (modal) modal.classList.add('open');
      if (addr) {
        const addrEl = document.querySelector('.modal-prop-addr');
        if (addrEl) addrEl.textContent = addr;
      }
      if (price) {
        const metaEl = document.querySelector('.modal-prop-meta');
        if (metaEl) metaEl.textContent = (addr ? addr.split(',')[0] : '') + ' · Asking: ' + price;
      }
      if (inspId) {
        const suggest = document.getElementById(inspId + '-suggest');
        if (suggest && suggest.classList.contains('show') && suggest.dataset.price) {
          const maxInput = document.querySelector('.modal-input') as HTMLInputElement;
          if (maxInput) {
            maxInput.value = '$' + parseInt(suggest.dataset.price).toLocaleString();
            maxInput.style.borderColor = 'var(--rose)';
            const existing = document.getElementById('liam-modal-note');
            if (!existing) {
              const note = document.createElement('div');
              note.id = 'liam-modal-note';
              note.style.cssText = 'font-family:Figtree,sans-serif;font-size:11px;color:var(--rose);margin-top:6px;font-style:italic;';
              note.textContent = 'Pre-filled from Liam\'s suggestion based on your inspection notes';
              maxInput.parentNode?.appendChild(note);
            }
          }
        }
      }
    };

    (window as any).closeModal = () => {
      const modal = document.getElementById('modalOverlay');
      if (modal) modal.classList.remove('open');
    };

    (window as any).submitProceed = () => {
      (window as any).closeModal();
      const toast = document.createElement('div');
      toast.style.cssText = `position:fixed;bottom:28px;right:28px;z-index:300;
        background:#2A2A2A;border:1px solid rgba(232,180,184,0.3);border-radius:10px;
        padding:14px 20px;font-family:'Figtree',sans-serif;font-size:13px;color:#F4F1EC;
        box-shadow:0 8px 32px rgba(0,0,0,0.4);animation:fadeUp 0.3s ease;`;
      toast.innerHTML = `<strong style="color:#E8B4B8;">Request received.</strong><br>
        <span style="color:#7FA8D4;font-size:11px;">Liam's team will be in touch within one business day.</span>`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 4000);
    };

    const cmaSteps = [
      { msg: 'Checking property.com.au...', sub: 'Retrieving listing date and property history', step: 1, pct: 10 },
      { msg: 'Found listing timeline.', sub: 'Days on market and past sale history confirmed', step: 1, pct: 20 },
      { msg: 'Searching for comparable sales...', sub: 'Checking state portal — REIWA, Domain or REA depending on location', step: 2, pct: 32 },
      { msg: 'Scanning settled transactions...', sub: 'Filtering last 12 months · same property type · within 3km', step: 2, pct: 44 },
      { msg: 'Verifying comparables...', sub: 'Excluding asking prices and AVM estimates — settled sales only', step: 3, pct: 58 },
      { msg: 'Comps verified.', sub: 'Calculating median sale price and average $/m²', step: 4, pct: 72 },
      { msg: 'Building valuation range...', sub: 'Adjusting for land size, market trend and vendor discounting', step: 4, pct: 84 },
      { msg: 'Running self-review...', sub: 'Confirming data quality and no fabricated sales', step: 5, pct: 94 },
      { msg: 'Liam is writing his assessment.', sub: 'Almost ready...', step: 5, pct: 99 },
    ];

    (window as any).runCMA = (cmaUrl: string | null) => {
      const overlay = document.getElementById('cmaOverlay');
      if (!overlay) return;
      overlay.classList.add('show');

      let stepIdx = 0;
      const fill = document.getElementById('cmaProgressFill');
      const msgEl = document.getElementById('cmaLoadingMsg');
      const subEl = document.getElementById('cmaLoadingSub');

      for (let i = 1; i <= 5; i++) {
        const el = document.getElementById('cmaStep' + i);
        if (el) {
          el.classList.remove('active', 'done');
        }
      }
      const step1 = document.getElementById('cmaStep1');
      if (step1) step1.classList.add('active');
      if (fill) fill.style.width = '8%';

      const interval = setInterval(() => {
        if (stepIdx >= cmaSteps.length) {
          clearInterval(interval);
          setTimeout(() => {
            overlay.classList.remove('show');
            if (cmaUrl) window.open(cmaUrl, '_blank');
          }, 400);
          return;
        }

        const s = cmaSteps[stepIdx];

        if (msgEl && subEl) {
          msgEl.style.opacity = '0';
          subEl.style.opacity = '0';
          setTimeout(() => {
            msgEl.textContent = s.msg;
            subEl.textContent = s.sub;
            msgEl.style.opacity = '1';
            subEl.style.opacity = '1';
          }, 150);
        }

        if (fill) fill.style.width = s.pct + '%';

        for (let i = 1; i <= 5; i++) {
          const el = document.getElementById('cmaStep' + i);
          if (el) {
            el.classList.remove('active', 'done');
            if (i < s.step) el.classList.add('done');
            else if (i === s.step) el.classList.add('active');
          }
        }

        stepIdx++;
      }, 2800);
    };

    (window as any).openEditBrief = () => {
      const overlay = document.getElementById('editBriefOverlay');
      if (overlay) {
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
      }
    };

    (window as any).closeEditBrief = () => {
      const overlay = document.getElementById('editBriefOverlay');
      if (overlay) {
        overlay.classList.remove('open');
        document.body.style.overflow = '';
      }
    };

    (window as any).saveBrief = () => {
      const staleCount = 1;
      const msg = document.getElementById('briefUpdatedText');
      if (msg) {
        if (staleCount > 0) {
          msg.innerHTML = `You updated your brief. <em>${staleCount} propert${staleCount > 1 ? 'ies' : 'y'} on your hotlist no longer match${staleCount === 1 ? 'es' : ''} your new criteria — I've flagged ${staleCount === 1 ? 'it' : 'them'} below. Still on your list until you remove ${staleCount === 1 ? 'it' : 'them'}.</em>`;
        } else {
          msg.innerHTML = 'Your brief has been updated. <em>All hotlisted properties still match your new criteria.</em>';
        }
      }
      const briefUpdated = document.getElementById('briefUpdatedMsg');
      if (briefUpdated) briefUpdated.classList.add('show');
      (window as any).closeEditBrief();

      setTimeout(() => {
        const hotlist = document.querySelector('.hotlist-cards');
        if (hotlist) hotlist.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    };

    (window as any).removeEditTag = (btn: HTMLElement) => {
      btn.parentElement?.remove();
    };

    (window as any).setupEditTagInput = (inputId: string, wrapId: string) => {
      const input = document.getElementById(inputId) as HTMLInputElement;
      if (!input) return;
      input.addEventListener('keydown', function(e: KeyboardEvent) {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          const val = this.value.trim().replace(/,$/, '');
          if (!val) return;
          const wrap = document.getElementById(wrapId);
          if (!wrap) return;
          const classMap: Record<string, string> = {
            'edit-nn-wrap': 'tag-nn',
            'edit-need-wrap': 'tag-need',
            'edit-want-wrap': 'tag-want',
          };
          const cls = classMap[wrapId] || 'tag-need';
          const tag = document.createElement('span');
          tag.className = 'tag-item ' + cls;
          tag.innerHTML = val + '<button class="tag-remove" onclick="removeEditTag(this)" type="button">×</button>';
          wrap.insertBefore(tag, input);
          this.value = '';
        }
        if (e.key === 'Backspace' && !this.value) {
          const wrap = document.getElementById(wrapId);
          if (wrap) {
            const tags = wrap.querySelectorAll('.tag-item');
            if (tags.length) tags[tags.length - 1].remove();
          }
        }
      });
    };

    (window as any).saveAccountDetails = (event?: Event) => {
      const btn = event?.target ? (event.target as HTMLButtonElement) : document.querySelector('.btn-save-account') as HTMLButtonElement;
      if (!btn) return;
      btn.textContent = 'Saved ✓';
      btn.style.background = 'var(--green)';
      setTimeout(() => {
        btn.textContent = 'Save changes';
        btn.style.background = '';
      }, 2000);
    };

    (window as any).saveNotifPref = (key: string, value: any) => {
      console.log('Notif pref:', key, value);
    };

    (window as any).showCancelConfirm = () => {
      const confirm = document.getElementById('cancelConfirm');
      if (confirm) confirm.classList.add('show');
    };

    (window as any).hideCancelConfirm = () => {
      const confirm = document.getElementById('cancelConfirm');
      if (confirm) confirm.classList.remove('show');
    };

    (window as any).confirmCancel = () => {
      const confirm = document.getElementById('cancelConfirm');
      if (confirm) {
        confirm.innerHTML = `
          <div class="cancel-confirm-text" style="color:var(--steel);">
            Done. Liam runs your last search on <strong style="color:var(--offwhite);">29 June 2026</strong>.
            Your account stays open — everything is still here when you come back.
          </div>
          <div style="margin-top:12px;">
            <button class="btn-save-brief" onclick="resumeSubscription()" style="font-size:12px;padding:9px 18px;">
              Actually — keep my subscription
            </button>
          </div>`;
      }
    };

    (window as any).resumeSubscription = () => {
      const confirm = document.getElementById('cancelConfirm');
      if (confirm) confirm.classList.remove('show');
      const btn = document.querySelector('.btn-cancel-sub') as HTMLButtonElement;
      if (btn) {
        btn.textContent = 'Subscription active ✓';
        btn.style.color = 'var(--green)';
        btn.style.borderColor = 'rgba(76,175,125,0.3)';
        btn.disabled = true;
        setTimeout(() => {
          btn.textContent = 'Cancel my subscription';
          btn.style.color = '';
          btn.style.borderColor = '';
          btn.disabled = false;
        }, 2000);
      }
    };

    // Setup edit modal tag inputs
    (window as any).setupEditTagInput('edit-nn-input', 'edit-nn-wrap');
    (window as any).setupEditTagInput('edit-need-input', 'edit-need-wrap');
    (window as any).setupEditTagInput('edit-want-input', 'edit-want-wrap');

    // Close edit modal on overlay click
    const editOverlay = document.getElementById('editBriefOverlay');
    if (editOverlay) {
      editOverlay.addEventListener('click', function(e: Event) {
        if (e.target === this) (window as any).closeEditBrief();
      });
    }
  }, []);

  return (
    <div dangerouslySetInnerHTML={{ __html: dashboardHTML }} />
  );
}
