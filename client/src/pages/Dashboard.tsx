import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import dashboardHtml from './dashboard.html?raw';
import './Dashboard.css';

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user, loading, logout, refresh } = useAuth();
  const utils = trpc.useUtils();
  const containerRef = useRef<HTMLDivElement>(null);

  // Data fetching
  const dashboardQuery = trpc.dashboard.get.useQuery(undefined, { 
    enabled: !!user,
    retry: false 
  });

  const addHotlist = trpc.hotlist.add.useMutation({
    onSuccess: async () => {
      await utils.dashboard.get.invalidate();
    }
  });

  const removeHotlist = trpc.hotlist.remove.useMutation({
    onSuccess: async () => {
      await utils.dashboard.get.invalidate();
    }
  });

  const generateCma = trpc.cma.generate.useMutation({
    onSuccess: async (result) => {
      await utils.dashboard.get.invalidate();
      if (result.url) navigate(result.url);
    }
  });

  const updateNotifications = trpc.user.updateNotifications.useMutation({
    onSuccess: async () => {
      await refresh();
      await utils.dashboard.get.invalidate();
    }
  });

  // Auth redirect
  useEffect(() => {
    if (loading || user) return;
    navigate('/login');
  }, [loading, user, navigate]);

  // Hydration effect
  useEffect(() => {
    if (!containerRef.current || !dashboardQuery.data || !user) return;

    const data = dashboardQuery.data;
    const activeBrief = data.activeBrief;
    const matches = data.matches || [];
    const hotlist = (data.hotlist || []).filter((h: any) => h.hotlist.status !== 'removed');
    const hotlistedIds = new Set(hotlist.map((h: any) => h.hotlist.matchId));

    const root = containerRef.current;

    // Helper to format money
    const money = (val: number | string | null | undefined) => {
      if (!val) return 'POA';
      const num = typeof val === 'string' ? parseInt(val.replace(/[^0-9]/g, '')) : val;
      return isNaN(num) ? 'POA' : `$${num.toLocaleString('en-AU')}`;
    };

    // 1. Sidebar Hydration
    const sidebarLogo = root.querySelector('.sidebar-logo');
    if (sidebarLogo) {
      // Preserve the original logo exactly as requested
    }

    if (activeBrief) {
      const briefLoc = root.querySelector('.brief-location');
      if (briefLoc) briefLoc.textContent = activeBrief.suburbs || 'Location pending';
      
      const briefDetail = root.querySelector('.brief-detail');
      if (briefDetail) briefDetail.textContent = `${activeBrief.beds} bed · ${activeBrief.baths} bath · ${activeBrief.budgetDisplay || 'Budget pending'}`;
    }

    const userName = root.querySelector('.user-name');
    if (userName) userName.textContent = `${user.firstName} ${user.lastName}`;
    
    const userAvatar = root.querySelector('.user-avatar');
    if (userAvatar) userAvatar.textContent = user.firstName?.[0] || 'U';

    const logoutBtn = root.querySelector('.user-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await logout();
        navigate('/login');
      });
    }

    // 2. Tab Navigation
    const navItems = root.querySelectorAll('.nav-item');
    const sections = {
      matches: root.querySelector('.content > div:nth-child(1)'), // Matches section
      hotlist: root.querySelector('.content > div:nth-child(3)'), // Hotlist section
      brief: root.querySelector('.edit-modal-overlay'), // Brief modal
      account: root.querySelector('.account-grid'), // Account section
    };

    // Note: The original HTML has a specific structure. Let's find sections by title or content.
    const matchSection = root.querySelector('.match-cards')?.parentElement;
    const hotlistSection = root.querySelector('.hotlist-cards')?.parentElement;
    const accountSection = root.querySelector('.account-grid')?.parentElement;

    const showTab = (tab: string) => {
      if (matchSection) (matchSection as HTMLElement).style.display = tab === 'matches' ? 'block' : 'none';
      if (hotlistSection) (hotlistSection as HTMLElement).style.display = tab === 'hotlist' ? 'block' : 'none';
      if (accountSection) (accountSection as HTMLElement).style.display = tab === 'account' ? 'block' : 'none';
      
      navItems.forEach(item => {
        item.classList.toggle('active', item.textContent?.trim().toLowerCase() === tab);
      });
    };

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const text = item.textContent?.trim().toLowerCase();
        if (text === 'matches' || text === 'hotlist' || text === 'account') {
          showTab(text);
        } else if (text === 'my brief') {
          // Open brief modal
          const overlay = root.querySelector('#editBriefOverlay');
          if (overlay) overlay.classList.add('open');
        }
      });
    });

    // Default tab
    showTab('matches');

    // 3. Matches Hydration
    const matchCardsContainer = root.querySelector('.match-cards');
    if (matchCardsContainer) {
      matchCardsContainer.innerHTML = '';
      matches.forEach((match: any, idx: number) => {
        const isHot = hotlistedIds.has(match.id);
        const card = document.createElement('div');
        card.className = 'match-card';
        card.innerHTML = `
          <div class="match-rank">#${idx + 1}</div>
          <div class="match-info">
            <div class="match-addr">${match.address}</div>
            <div class="match-meta">
              ${match.bedrooms} bed · ${match.bathrooms} bath · ${match.parking} car · ${match.propertyType}
            </div>
            <div class="match-reason">${match.liamNote || 'Matched against your buyer brief.'}</div>
          </div>
          <div class="match-right">
            <div class="match-price">${match.priceDisplay || money(match.price)}</div>
            <div class="match-actions">
              ${match.listingUrl ? `<a href="${match.listingUrl}" target="_blank" class="btn-reject" style="text-decoration:none">View Listing</a>` : ''}
              <button class="btn-add ${isHot ? 'added' : ''}" ${isHot ? 'disabled' : ''}>
                ${isHot ? '✓ Added' : 'Add to hotlist'}
              </button>
            </div>
          </div>
        `;
        const addBtn = card.querySelector('.btn-add');
        if (addBtn && !isHot) {
          addBtn.addEventListener('click', () => {
            addHotlist.mutate({ matchId: match.id });
          });
        }
        matchCardsContainer.appendChild(card);
      });
    }

    // 4. Hotlist Hydration
    const hotlistCardsContainer = root.querySelector('.hotlist-cards');
    if (hotlistCardsContainer) {
      hotlistCardsContainer.innerHTML = '';
      hotlist.forEach((row: any) => {
        const card = document.createElement('div');
        card.className = 'hotlist-card';
        card.innerHTML = `
          <div class="hotlist-main">
            <div class="hotlist-addr">${row.match?.address || 'Property Address'}</div>
            <div class="hotlist-meta">
              ${row.match?.bedrooms} bed · ${row.match?.bathrooms} bath · ${row.match?.parking} car
            </div>
            <div class="cma-mini">
              <div class="cma-item">
                <div class="cma-item-label">MATCH</div>
                <div className="cma-item-value">${row.match?.score || 0}%</div>
              </div>
              <div class="cma-item">
                <div class="cma-item-label">PRICE</div>
                <div class="cma-item-value">${row.match?.priceDisplay || money(row.match?.price)}</div>
              </div>
            </div>
          </div>
          <div class="hotlist-right">
            <div class="match-actions" style="flex-direction:column; gap:5px;">
              <button class="btn-cma">${row.cma ? 'View CMA' : 'Run Full CMA'}</button>
              <button class="btn-remove">Remove</button>
            </div>
          </div>
        `;
        
        card.querySelector('.btn-cma')?.addEventListener('click', () => {
          if (row.cma) navigate(`/cma/${row.cma.id}`);
          else generateCma.mutate({ matchId: row.hotlist.matchId });
        });

        card.querySelector('.btn-remove')?.addEventListener('click', () => {
          removeHotlist.mutate({ id: row.hotlist.id });
        });

        hotlistCardsContainer.appendChild(card);
      });
    }

    // 5. Account Hydration
    const accountFields = root.querySelectorAll('.account-field-input');
    if (accountFields.length >= 4) {
      (accountFields[0] as HTMLInputElement).value = user.firstName || '';
      (accountFields[1] as HTMLInputElement).value = user.lastName || '';
      (accountFields[2] as HTMLInputElement).value = user.email || '';
      (accountFields[3] as HTMLInputElement).value = user.mobile || '';
    }

    const notifCheckboxes = root.querySelectorAll('.toggle-switch input');
    const notifKeys = ['dailyEmail', 'hotSms', 'priceDrop', 'statusChange', 'weeklyDigest'];
    notifCheckboxes.forEach((cb, idx) => {
      const key = notifKeys[idx];
      if (key) {
        (cb as HTMLInputElement).checked = !!(user.notifications as any)?.[key];
        cb.addEventListener('change', (e) => {
          updateNotifications.mutate({ [key]: (e.target as HTMLInputElement).checked });
        });
      }
    });

    // 6. Brief Modal wiring
    const editBriefBtn = root.querySelector('.edit-brief');
    const editBriefOverlay = root.querySelector('#editBriefOverlay');
    const closeBriefBtn = root.querySelector('.edit-modal-close');
    
    if (editBriefBtn && editBriefOverlay) {
      editBriefBtn.addEventListener('click', () => editBriefOverlay.classList.add('open'));
    }
    if (closeBriefBtn && editBriefOverlay) {
      closeBriefBtn.addEventListener('click', () => editBriefOverlay.classList.remove('open'));
    }
    
    const modifyBriefBtn = root.querySelector('.btn-save-brief');
    if (modifyBriefBtn) {
      modifyBriefBtn.addEventListener('click', () => navigate('/brief'));
    }

  }, [dashboardQuery.data, user, loading, logout, navigate, addHotlist, removeHotlist, generateCma, updateNotifications]);

  if (loading || !user) {
    return <div className="loading-screen">Loading dashboard...</div>;
  }

  return (
    <div ref={containerRef} dangerouslySetInnerHTML={{ __html: dashboardHtml }} />
  );
}
