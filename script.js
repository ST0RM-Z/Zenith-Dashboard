let state = {
  theme: {
    menuBg: 'rgba(18, 18, 18, 0.8)',
    wallpaper: null,
    workspaceName: 'My Workspace',
    workspaceIcon: '🎯'
  },
  cards: []
};

let activeIntervals = []; 
let activeDragCard = null;
let dragStartX, dragStartY, initialCardX, initialCardY;

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  bindGlobalEvents();
});

function loadData() {
  chrome.storage.local.get(['workspaceState'], (result) => {
    if (result.workspaceState) {
      state = result.workspaceState;
      state.cards.forEach(c => { 
        if(!c.type) c.type = 'shortcuts'; 
        if(!c.scroll) c.scroll = 'enable'; 
        if(!c.iconSize) c.iconSize = 48;   
        if(!c.fontSize) c.fontSize = 14;
      }); 
      applyGlobalStyles();
      renderWorkspace();
    } else {
      state.cards = [
        {
          id: 'card-' + Date.now(),
          title: 'Google Applications',
          type: 'shortcuts',
          dockMode: 'floating',
          tint: '#ffffff',
          blur: 16,
          radius: 16,
          depth: 2,
          scroll: 'enable',
          iconSize: 48,
          fontSize: 14,
          width: 300,
          height: 180,
          left: '50px',
          top: '50px',
          shortcuts: [
            { name: 'Search', url: 'https://google.com' },
            { name: 'Gmail', url: 'https://mail.google.com' }
          ]
        }
      ];
      saveData();
      renderWorkspace();
      applyGlobalStyles();
    }
  });
}

function saveData() {
  chrome.storage.local.set({ workspaceState: state });
}

function applyGlobalStyles() {
  if (state.theme.menuBg) {
    document.documentElement.style.setProperty('--menu-bg', state.theme.menuBg);
    document.getElementById('menu-bg-color').value = rgbToHex(state.theme.menuBg);
    const metaTheme = document.getElementById('theme-color-meta');
    if (metaTheme) metaTheme.setAttribute('content', rgbToHex(state.theme.menuBg));
  }
  if (state.theme.wallpaper) {
    document.documentElement.style.setProperty('--body-bg-img', `url("${state.theme.wallpaper}")`);
  }
  document.getElementById('workspace-logo-text').innerText = state.theme.workspaceName || 'My Workspace';
  document.getElementById('workspace-logo-icon').innerText = state.theme.workspaceIcon || '🎯';
  document.getElementById('settings-workspace-name').value = state.theme.workspaceName || '';
  document.getElementById('settings-workspace-icon').value = state.theme.workspaceIcon || '';
}

function bindGlobalEvents() {
  document.getElementById('btn-trigger-global-settings').addEventListener('click', () => openModal('global-settings-modal'));
  document.getElementById('btn-close-global-settings').addEventListener('click', () => closeModal('global-settings-modal'));

  document.getElementById('btn-open-create-card').addEventListener('click', () => {
    closeModal('global-settings-modal');
    openModal('card-modal');
  });

  document.getElementById('btn-cancel-card').addEventListener('click', () => closeModal('card-modal'));
  document.getElementById('btn-submit-card').addEventListener('click', saveNewCard);
  
  document.getElementById('new-card-type').addEventListener('change', (e) => {
    const rssInput = document.getElementById('new-card-rss-url');
    rssInput.style.display = e.target.value === 'rss' ? 'block' : 'none';
  });

  document.getElementById('btn-cancel-link').addEventListener('click', () => closeModal('link-modal'));
  document.getElementById('btn-submit-link').addEventListener('click', saveNewLink);
  document.getElementById('btn-close-sidebar').addEventListener('click', closeSidebar);
  document.getElementById('btn-delete-card').addEventListener('click', deleteCurrentCard);
  document.getElementById('btn-sidebar-add-link').addEventListener('click', () => {
    openAddLinkModal(document.getElementById('settings-card-id').value);
  });

  const styleInputs = [
    'style-title', 'style-dock-mode', 'style-tint-color', 'style-blur', 
    'style-radius', 'style-depth', 'style-scroll', 'style-icon-size', 'style-font-size',
    'style-weather-key', 'style-city', 'style-sports-league', 'style-sports-status', 'style-event-name', 'style-event-date'
  ];
  styleInputs.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.addEventListener('input', applyGUIChanges);
  });

  document.getElementById('settings-workspace-name').addEventListener('input', (e) => { state.theme.workspaceName = e.target.value; saveData(); applyGlobalStyles(); });
  document.getElementById('settings-workspace-icon').addEventListener('input', (e) => { state.theme.workspaceIcon = e.target.value; saveData(); applyGlobalStyles(); });
  document.getElementById('menu-bg-color').addEventListener('input', (e) => { state.theme.menuBg = hexToRgba(e.target.value, 0.8); saveData(); applyGlobalStyles(); });
  
  document.getElementById('wallpaper-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 1920 / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        state.theme.wallpaper = canvas.toDataURL('image/jpeg', 0.85); 
        saveData(); applyGlobalStyles();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('btn-export-data').addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "workspace_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  });

  document.getElementById('btn-import-data').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedState = JSON.parse(event.target.result);
        if (importedState && importedState.cards) {
          state = importedState;
          saveData(); applyGlobalStyles(); renderWorkspace();
          closeModal('global-settings-modal');
        } else {
          alert("Invalid backup file structure.");
        }
      } catch (err) {
        alert("Error parsing backup file.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  });

  document.getElementById('btn-reset-data').addEventListener('click', () => {
    if (confirm("Are you sure? This will delete all custom cards and reset your workspace.")) {
      chrome.storage.local.clear(() => location.reload());
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (!activeDragCard) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    activeDragCard.element.style.left = `${initialCardX + dx}px`;
    activeDragCard.element.style.top = `${initialCardY + dy}px`;
  });

  document.addEventListener('mouseup', () => {
    if (activeDragCard) {
      activeDragCard.cardData.left = activeDragCard.element.style.left;
      activeDragCard.cardData.top = activeDragCard.element.style.top;
      activeDragCard.element.style.zIndex = '';
      activeDragCard = null;
      document.body.style.userSelect = '';
      saveData();
    }
  });
}

function renderWorkspace() {
  const workspace = document.getElementById('workspace');
  workspace.innerHTML = '';
  activeIntervals.forEach(clearInterval);
  activeIntervals = [];

  state.cards.forEach((card) => {
    const cardEl = document.createElement('div');
    cardEl.className = `card ${card.dockMode}`;
    cardEl.id = card.id;

    cardEl.style.setProperty('--card-bg', hexToRgba(card.tint || '#ffffff', 0.08));
    cardEl.style.setProperty('--card-blur', `${card.blur || 16}px`);
    cardEl.style.setProperty('--card-radius', `${card.radius || 16}px`);
    cardEl.style.setProperty('--card-width', typeof card.width === 'number' ? `${card.width}px` : card.width);
    cardEl.style.setProperty('--card-font-size', `${card.fontSize || 14}px`);
    
    if (card.scroll === 'disable') {
      cardEl.style.setProperty('--card-height', 'auto');
      cardEl.style.setProperty('--card-scroll', 'hidden');
    } else {
      cardEl.style.setProperty('--card-height', typeof card.height === 'number' ? `${card.height}px` : card.height || 'auto');
      cardEl.style.setProperty('--card-scroll', 'auto');
    }
    
    cardEl.style.setProperty('--icon-width', `${card.iconSize || 48}px`);

    if (card.dockMode === 'floating') {
      cardEl.style.left = card.left || '50px';
      cardEl.style.top = card.top || '50px';
    }

    const depth = card.depth !== undefined ? card.depth : 2;
    cardEl.style.setProperty('--card-shadow', getShadowForDepth(depth));

    let resizeTimeout;
    const resizeObserver = new ResizeObserver(() => {
      const newWidth = cardEl.offsetWidth;
      const newHeight = cardEl.offsetHeight;
      let changed = false;
      if (Math.abs(newWidth - (parseInt(card.width) || 0)) > 5 && newWidth > 100) { card.width = newWidth; changed = true; }
      if (card.scroll !== 'disable' && Math.abs(newHeight - (parseInt(card.height) || 0)) > 5 && newHeight > 50) { card.height = newHeight; changed = true; }
      if (changed) {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => { saveData(); }, 500);
      }
    });
    setTimeout(() => { try { resizeObserver.observe(cardEl); } catch (e) {} }, 200);

    const header = document.createElement('div');
    const isTitleEmpty = !card.title || card.title.trim() === '';
    header.className = `card-header ${isTitleEmpty ? 'empty-title' : ''}`;
    header.innerHTML = `
      <div style="display: flex; align-items: center;">
        <div class="drag-handle" title="Drag to freely position">⠿</div>
        <h4 class="card-title">${isTitleEmpty ? '' : card.title}</h4>
      </div>
      <div class="card-actions">
        <button class="btn-card-action settings-trigger" title="Settings">⚙️</button>
      </div>
    `;

    const dragHandle = header.querySelector('.drag-handle');
    dragHandle.addEventListener('mousedown', (e) => {
      if (card.dockMode !== 'floating') return;
      activeDragCard = { element: cardEl, cardData: card };
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      initialCardX = cardEl.offsetLeft;
      initialCardY = cardEl.offsetTop;
      cardEl.style.zIndex = '1000';
      document.body.style.userSelect = 'none';
    });

    header.querySelector('.settings-trigger').addEventListener('click', () => openSidebar(card.id));
    cardEl.appendChild(header);

    const contentArea = document.createElement('div');
    contentArea.className = 'widget-content';

    if (card.type === 'clock') {
      contentArea.className += ' clock-widget';
      const timeDiv = document.createElement('div'); timeDiv.className = 'clock-time';
      const dateDiv = document.createElement('div'); dateDiv.className = 'clock-date';
      const weatherDiv = document.createElement('div'); weatherDiv.className = 'weather-box';
      weatherDiv.style.marginTop = '10px';
      weatherDiv.style.textAlign = 'center';
      
      contentArea.appendChild(timeDiv); 
      contentArea.appendChild(dateDiv);
      contentArea.appendChild(weatherDiv);

      const updateTime = () => {
        const now = new Date();
        timeDiv.innerText = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        dateDiv.innerText = now.toLocaleDateString([], {weekday: 'long', month: 'short', day: 'numeric'});
      };

      const updateWeather = async () => {
        if (card.weatherKey && card.city) {
          try {
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(card.city)}&appid=${card.weatherKey}&units=metric`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.main && data.weather) {
              weatherDiv.innerHTML = `
                <div class="temp" style="font-size: 1.5rem; font-weight: bold;">${Math.round(data.main.temp)}°C</div>
                <div class="feels-like" style="font-size: 0.85rem; opacity: 0.8;">Feels like ${Math.round(data.main.feels_like)}°C, ${data.weather[0].description}</div>
              `;
            } else {
              weatherDiv.innerHTML = `<div style="font-size: 0.8rem; opacity: 0.5;">City not found</div>`;
            }
          } catch (e) {
            weatherDiv.innerHTML = `<div style="font-size: 0.8rem; opacity: 0.5;">Weather Error</div>`;
          }
        } else {
            weatherDiv.innerHTML = `<div style="font-size: 0.8rem; opacity: 0.5;">Add API Key & City in Settings</div>`;
        }
      };

      updateTime();
      updateWeather();
      activeIntervals.push(setInterval(updateTime, 1000));
      activeIntervals.push(setInterval(updateWeather, 600000)); 
      
    } else if (card.type === 'rss') {
      contentArea.className += ' rss-widget';
      if(card.rssUrl) {
        contentArea.innerHTML = '<div style="font-size:0.8rem; opacity:0.6;">Loading feed...</div>';
        fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(card.rssUrl)}`)
          .then(res => res.json())
          .then(data => {
            if(data.status === 'ok') {
              contentArea.innerHTML = '';
              data.items.slice(0, 5).forEach(item => {
                const a = document.createElement('a'); a.className = 'rss-item'; a.href = item.link; a.target = '_blank';
                a.innerHTML = `<div class="rss-title">${item.title}</div><div class="rss-date">${new Date(item.pubDate).toLocaleDateString()}</div>`;
                contentArea.appendChild(a);
              });
            } else { contentArea.innerHTML = '<div style="font-size:0.8rem; color: #ff3b30;">Failed to load feed.</div>'; }
          }).catch(() => { contentArea.innerHTML = '<div style="font-size:0.8rem; color: #ff3b30;">Network Error.</div>'; });
      }

    } else if (card.type === 'sports') {
      contentArea.className += ' sports-widget';
      const wrapperDiv = document.createElement('div');
      wrapperDiv.style.overflowY = 'auto';
      wrapperDiv.style.height = '100%';
      wrapperDiv.style.paddingRight = '5px';
      contentArea.appendChild(wrapperDiv);

      const updateSports = async () => {
        const leagueMap = { 
          'fifa': 'soccer/fifa.world',
          'nba': 'basketball/nba', 
          'nfl': 'football/nfl', 
          'nhl': 'hockey/nhl', 
          'epl': 'soccer/eng.1',
          'cricket/8039': 'cricket/8039',
          'cricket/10438': 'cricket/10438',
          'racing/f1': 'racing/f1'
        };
        
        const selection = card.sportsLeague || 'fifa';
        const endpoint = leagueMap[selection] || selection;
        const statusFilter = card.sportsStatus || 'all';
        
        try {
          const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${endpoint}/scoreboard`);
          const data = await res.json();
          
          let html = '';
          let validEvents = data.events || [];
          
          if (statusFilter !== 'all') {
            validEvents = validEvents.filter(e => e.status?.type?.state === statusFilter);
          }
          
          if (validEvents.length === 0) {
            html += `<div style="font-size:0.8rem; opacity:0.6; text-align:center; padding-top: 10px;">No games match this filter right now.</div>`;
          } else {
            // Racing Logic (F1)
            if (endpoint.includes('racing')) {
              validEvents.slice(0, 5).forEach(event => {
                const comp = event.competitions?.[0] || {};
                const topDrivers = (comp.competitors || []).slice(0, 5); 
                const status = event.status?.type?.shortDetail || 'Upcoming';
                
                html += `<div style="background:rgba(0,0,0,0.2); border-radius:8px; padding:10px; margin-bottom:10px; font-size:0.85rem; border:1px solid rgba(255,255,255,0.05);">
                           <div style="font-weight:bold; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:5px;">${event.name || 'Racing Event'}</div>`;
                
                if (topDrivers.length === 0) {
                   html += `<div style="font-size:0.75rem; opacity:0.6; padding: 4px 0;">No live timing/grid data available yet.</div>`;
                } else {
                  topDrivers.forEach((driver, idx) => {
                    const athlete = driver.athlete || {};
                    const pos = driver.status?.position || (idx + 1);
                    const athleteImg = athlete.headshot?.href || athlete.flag?.href || '';
                    
                    html += `
                      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                        <span style="display:flex; align-items:center; gap:8px;">
                           <span style="opacity:0.7; width:15px; text-align:right; font-size: 0.75rem;">${pos}.</span>
                           <img src="${athleteImg}" style="width:16px; height:16px; object-fit:contain; border-radius:50%; display:${athleteImg ? 'block' : 'none'};">
                           <span style="font-weight:600;">${athlete.shortName || athlete.displayName || 'Driver'}</span>
                        </span>
                        <span>${driver.score || driver.time || ''}</span>
                      </div>
                    `;
                  });
                }
                html += `<div style="font-size:0.7rem; color:#aaa; text-align:right; margin-top:6px;">${status}</div></div>`;
              });
            } else {
              // Standard Team Logic (FIFA, Cricket, NBA, etc.)
              validEvents.slice(0, 5).forEach(event => {
                const comp = event.competitions?.[0] || {};
                const home = (comp.competitors || []).find(c => c.homeAway === 'home') || (comp.competitors || [])[0] || {};
                const away = (comp.competitors || []).find(c => c.homeAway === 'away') || (comp.competitors || [])[1] || {};
                
                const homeTeam = home.team || {};
                const awayTeam = away.team || {};
                
                // Smart logo parsing: checks for simple string or nested array
                const homeLogo = homeTeam.logo || (homeTeam.logos?.[0]?.href) || '';
                const awayLogo = awayTeam.logo || (awayTeam.logos?.[0]?.href) || '';
                
                const status = event.status?.type?.shortDetail || 'Upcoming';

                html += `
                  <div style="background:rgba(0,0,0,0.2); border-radius:8px; padding:10px; margin-bottom:10px; font-size:0.85rem; border:1px solid rgba(255,255,255,0.05);">
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                      <span style="display:flex; align-items:center; gap:8px;">
                         <img src="${awayLogo}" style="width:16px; height:16px; object-fit:contain; display:${awayLogo ? 'block' : 'none'};">
                         ${awayTeam.abbreviation || awayTeam.name || 'TBD'}
                      </span>
                      <span style="font-weight:bold;">${away.score !== undefined ? away.score : '-'}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                      <span style="display:flex; align-items:center; gap:8px;">
                         <img src="${homeLogo}" style="width:16px; height:16px; object-fit:contain; display:${homeLogo ? 'block' : 'none'};">
                         ${homeTeam.abbreviation || homeTeam.name || 'TBD'}
                      </span>
                      <span style="font-weight:bold;">${home.score !== undefined ? home.score : '-'}</span>
                    </div>
                    <div style="font-size:0.7rem; color:#aaa; text-align:right;">${status}</div>
                  </div>
                `;
              });
            }
          }
          wrapperDiv.innerHTML = html;
        } catch(e) {
          wrapperDiv.innerHTML = `<div style="font-size:0.8rem; opacity:0.6; color:#ff3b30;">Data Error: Format mismatch</div>`;
        }
      };
      updateSports();
      activeIntervals.push(setInterval(updateSports, 60000));

    } else if (card.type === 'countdown') {
      contentArea.className += ' countdown-widget';
      const wrapperDiv = document.createElement('div');
      wrapperDiv.style.display = 'flex';
      wrapperDiv.style.flexDirection = 'column';
      wrapperDiv.style.justifyContent = 'center';
      wrapperDiv.style.height = '100%';
      contentArea.appendChild(wrapperDiv);

      const updateCountdown = () => {
        if (!card.eventDate || !card.eventName) {
          wrapperDiv.innerHTML = '<div style="font-size:0.8rem; opacity:0.6; text-align:center;">Set Event Name & Date in Settings</div>';
          return;
        }
        
        const target = new Date(card.eventDate).getTime();
        const now = new Date().getTime();
        const distance = target - now;

        if (distance < 0) {
          wrapperDiv.innerHTML = `
            <div style="text-align:center; font-weight:bold; font-size:1.1rem; margin-bottom:10px;">${card.eventName}</div>
            <div style="text-align:center; color:#ff3b30; font-size:1.5rem; font-weight:bold;">Event Reached!</div>
          `;
          return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        wrapperDiv.innerHTML = `
          <div style="text-align:center; font-weight:bold; font-size:1.1rem; margin-bottom:15px;">${card.eventName}</div>
          <div style="display:flex; justify-content:space-around; text-align:center;">
            <div><div style="font-size:1.8rem; font-weight:bold;">${days}</div><div style="font-size:0.7rem; opacity:0.7; text-transform:uppercase;">Days</div></div>
            <div><div style="font-size:1.8rem; font-weight:bold;">${hours}</div><div style="font-size:0.7rem; opacity:0.7; text-transform:uppercase;">Hrs</div></div>
            <div><div style="font-size:1.8rem; font-weight:bold;">${minutes}</div><div style="font-size:0.7rem; opacity:0.7; text-transform:uppercase;">Min</div></div>
            <div><div style="font-size:1.8rem; font-weight:bold;">${seconds}</div><div style="font-size:0.7rem; opacity:0.7; text-transform:uppercase;">Sec</div></div>
          </div>
        `;
      };
      updateCountdown();
      activeIntervals.push(setInterval(updateCountdown, 1000));
    
    } else {
      contentArea.className += ' app-grid';
      (card.shortcuts || []).forEach((sc, scIdx) => {
        const fallbackLetter = sc.name ? sc.name.charAt(0) : 'W';
        const appLink = document.createElement('a'); appLink.href = sc.url; appLink.className = 'app-icon'; appLink.target = '_blank';
        
        const wrapper = document.createElement('div'); wrapper.className = 'icon-wrapper';
        const img = document.createElement('img'); img.src = getHighResIcon(sc.url);
        const fallback = document.createElement('div'); fallback.className = 'icon-letter-fallback';
        fallback.style.display = 'none'; fallback.style.color = getRandomColor(fallbackLetter); fallback.innerText = fallbackLetter;

        img.addEventListener('error', () => { img.style.display = 'none'; fallback.style.display = 'flex'; });

        wrapper.appendChild(img); wrapper.appendChild(fallback);
        const label = document.createElement('span'); label.className = 'app-label'; label.innerText = sc.name;

        const deleteBadge = document.createElement('button'); deleteBadge.className = 'btn-delete-shortcut'; deleteBadge.innerHTML = '&times;';
        deleteBadge.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); card.shortcuts.splice(scIdx, 1); saveData(); renderWorkspace(); });
        
        appLink.appendChild(deleteBadge); appLink.appendChild(wrapper); appLink.appendChild(label); contentArea.appendChild(appLink);
      });
    }
    cardEl.appendChild(contentArea);
    workspace.appendChild(cardEl);
  });
}

function getHighResIcon(targetUrl) {
  try {
    const url = new URL(chrome.runtime.getURL("/_favicon/"));
    url.searchParams.set("pageUrl", targetUrl); url.searchParams.set("size", "128"); 
    return url.toString();
  } catch (e) {
    return `https://icons.duckduckgo.com/ip3/${new URL(targetUrl).hostname}.ico`;
  }
}

function openModal(modalId) { document.getElementById(modalId).style.display = 'flex'; }
function closeModal(modalId) { document.getElementById(modalId).style.display = 'none'; }

function saveNewCard() {
  const title = document.getElementById('new-card-title').value;
  const type = document.getElementById('new-card-type').value;
  const rssUrl = document.getElementById('new-card-rss-url').value;

  state.cards.push({
    id: 'card-' + Date.now(), title, type, dockMode: 'floating', tint: '#ffffff', blur: 16, 
    radius: 16, depth: 2, scroll: 'enable', iconSize: 48, fontSize: 14, width: 300, height: 180, 
    left: '100px', top: '150px', shortcuts: [], rssUrl
  });

  saveData(); renderWorkspace();
  document.getElementById('new-card-title').value = ''; closeModal('card-modal');
}

function openAddLinkModal(cardId) { document.getElementById('target-card-id').value = cardId; openModal('link-modal'); }

function saveNewLink() {
  const card = state.cards.find(c => c.id === document.getElementById('target-card-id').value);
  if (card && card.shortcuts) {
    card.shortcuts.push({ name: document.getElementById('new-link-name').value, url: document.getElementById('new-link-url').value });
    saveData(); renderWorkspace();
  }
  document.getElementById('new-link-name').value = ''; document.getElementById('new-link-url').value = '';
  closeModal('link-modal');
}

function openSidebar(cardId) {
  const card = state.cards.find(c => c.id === cardId);
  if (!card) return;

  document.getElementById('settings-card-id').value = cardId;
  document.getElementById('style-title').value = card.title || '';
  document.getElementById('style-dock-mode').value = card.dockMode || 'floating';
  document.getElementById('style-tint-color').value = card.tint || '#ffffff';
  document.getElementById('style-blur').value = card.blur !== undefined ? card.blur : 16;
  document.getElementById('style-radius').value = card.radius !== undefined ? card.radius : 16;
  document.getElementById('style-depth').value = card.depth !== undefined ? card.depth : 2;
  document.getElementById('style-scroll').value = card.scroll || 'enable';
  document.getElementById('style-icon-size').value = card.iconSize || 48;
  document.getElementById('style-font-size').value = card.fontSize || 14;

  document.getElementById('style-weather-key').value = card.weatherKey || '';
  document.getElementById('style-city').value = card.city || '';
  
  const sportsLeagueEl = document.getElementById('style-sports-league');
  if(sportsLeagueEl) sportsLeagueEl.value = card.sportsLeague || 'fifa';
  
  const sportsStatusEl = document.getElementById('style-sports-status');
  if(sportsStatusEl) sportsStatusEl.value = card.sportsStatus || 'all';

  document.getElementById('style-event-name').value = card.eventName || '';
  document.getElementById('style-event-date').value = card.eventDate || '';

  // Dynamic Sidebar Toggles
  document.getElementById('btn-sidebar-add-link').style.display = card.type === 'shortcuts' ? 'block' : 'none';
  document.getElementById('settings-weather').style.display = card.type === 'clock' ? 'block' : 'none';
  document.getElementById('settings-sports').style.display = card.type === 'sports' ? 'block' : 'none';
  document.getElementById('settings-countdown').style.display = card.type === 'countdown' ? 'block' : 'none';

  document.getElementById('settings-sidebar').classList.add('active');
}

function closeSidebar() { document.getElementById('settings-sidebar').classList.remove('active'); }

function applyGUIChanges() {
  const card = state.cards.find(c => c.id === document.getElementById('settings-card-id').value);
  if (!card) return;

  const oldScroll = card.scroll;

  card.title = document.getElementById('style-title').value;
  card.dockMode = document.getElementById('style-dock-mode').value;
  card.tint = document.getElementById('style-tint-color').value;
  card.blur = parseInt(document.getElementById('style-blur').value);
  card.radius = parseInt(document.getElementById('style-radius').value);
  card.depth = parseInt(document.getElementById('style-depth').value);
  card.scroll = document.getElementById('style-scroll').value;
  card.iconSize = parseInt(document.getElementById('style-icon-size').value);
  card.fontSize = parseInt(document.getElementById('style-font-size').value);
  
  card.weatherKey = document.getElementById('style-weather-key').value;
  card.city = document.getElementById('style-city').value;
  
  const sportsEl = document.getElementById('style-sports-league');
  if(sportsEl) card.sportsLeague = sportsEl.value;

  const statusEl = document.getElementById('style-sports-status');
  if(statusEl) card.sportsStatus = statusEl.value;

  const eventNameEl = document.getElementById('style-event-name');
  if(eventNameEl) card.eventName = eventNameEl.value;
  
  const eventDateEl = document.getElementById('style-event-date');
  if(eventDateEl) card.eventDate = eventDateEl.value;

  if (card.scroll === 'disable' && oldScroll !== 'disable') card.height = 'auto';

  saveData(); renderWorkspace();
}

function deleteCurrentCard() {
  state.cards = state.cards.filter(c => c.id !== document.getElementById('settings-card-id').value);
  saveData(); renderWorkspace(); closeSidebar();
}

function getShadowForDepth(level) {
  const shadows = { 1: '0 1px 3px rgba(0,0,0,0.12)', 2: '0 3px 6px rgba(0,0,0,0.16)', 3: '0 10px 20px rgba(0,0,0,0.19)', 4: '0 14px 28px rgba(0,0,0,0.25)', 5: '0 19px 38px rgba(0,0,0,0.30)' };
  return shadows[level] || shadows[2];
}
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
function rgbToHex(rgba) {
  if (!rgba.startsWith('rgba')) return '#ffffff';
  const parts = rgba.match(/\d+/g);
  return `#${parseInt(parts[0]).toString(16).padStart(2,'0')}${parseInt(parts[1]).toString(16).padStart(2,'0')}${parseInt(parts[2]).toString(16).padStart(2,'0')}`;
}
function getRandomColor(str) {
  let hash = 0; for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['#34c759', '#007aff', '#af52de', '#ff9500', '#ff3b30', '#5ac8fa'];
  return colors[Math.abs(hash) % colors.length];
}