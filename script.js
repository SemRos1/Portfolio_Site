/**
 * =========================================================================
 * SEM ROS PORTFOLIO // CORE APPLICATION SCRIPT
 * Sfeer: The Last of Us / Overgrown, Vervreemding, Aards & Verweerd
 * Volledige ondersteuning voor:
 * - Voorwaartse & achterwaartse video-transities tussen alle 4 schermen
 * - Google browser geschiedenis (popstate) & visuele terugknoppen
 * - Projectenweergave met scrollbare beeldenfeed strictly binnen TV
 * - Mediahiërarchie (Hoofdafbeelding -> Standaard -> Proces)
 * =========================================================================
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // 1. DOM Elements
  // ---------------------------------------------------------------------------
  const app = document.getElementById('app');

  // Screens
  const screenStart = document.getElementById('screenStart');
  const screenHoofdmenu = document.getElementById('screenHoofdmenu');
  const screenProjects = document.getElementById('screenProjects');
  const screenOverMij = document.getElementById('screenOverMij');

  // Transition Videos
  const videos = {
    startForward: document.getElementById('videoStartForward'),
    startReverse: document.getElementById('videoStartReverse'),
    projectsForward: document.getElementById('videoProjectsForward'),
    projectsReverse: document.getElementById('videoProjectsReverse'),
    overMijForward: document.getElementById('videoOverMijForward'),
    overMijReverse: document.getElementById('videoOverMijReverse'),
  };

  // Hoofdmenu Buttons
  const btnGoProjects = document.getElementById('btnGoProjects');
  const btnGoAbout = document.getElementById('btnGoAbout');
  const btnHoofdmenuBack = document.getElementById('btnHoofdmenuBack');

  // Projects View Elements
  const projectsListView = document.getElementById('projectsListView');
  const projectsDetailView = document.getElementById('projectsDetailView');
  const projectsScrollList = document.getElementById('projectsScrollList');
  const btnProjectsBack = document.getElementById('btnProjectsBack');
  const btnProjectsBackText = document.getElementById('btnProjectsBackText');
  const btnBackToOverview = document.getElementById('btnBackToOverview');

  // Detail View Elements
  const detailProjectNumber = document.getElementById('detailProjectNumber');
  const detailProjectTitle = document.getElementById('detailProjectTitle');
  const detailProjectSubtitle = document.getElementById('detailProjectSubtitle');
  const detailProjectDescription = document.getElementById('detailProjectDescription');
  const detailBodyScroll = document.getElementById('detailBodyScroll');

  // TV Screen Elements (kept for OSD overlays)
  const tvScreenPortal = document.getElementById('tvScreenPortal');
  const tvMediaScrollFeed = document.getElementById('tvMediaScrollFeed');
  const tvStaticLayer = document.getElementById('tvStaticLayer');
  const tvChannelTag = document.getElementById('tvChannelTag');
  const tvStatusTag = document.getElementById('tvStatusTag');
  const tvScrollHint = document.getElementById('tvScrollHint');

  // Right image panel (new scrollable window in grid)
  const projectsImageFeed = document.getElementById('projectsImageFeed');

  // Over Mij Elements
  const btnOverMijBack = document.getElementById('btnOverMijBack');
  const btnOverMijReturn = document.getElementById('btnOverMijReturn');

  // Spore Canvas
  const sporeCanvas = document.getElementById('sporeCanvas');

  // ---------------------------------------------------------------------------
  // 2. State & History Management
  // ---------------------------------------------------------------------------
  let currentState = 'start'; // 'start' | 'hoofdmenu' | 'projects' | 'overmij'
  let currentProjectSubView = 'list'; // 'list' | 'detail'
  let activeProjectId = null;
  let isTransitioning = false;

  // ---------------------------------------------------------------------------
  // 3. Spore & Dust Particle Animation
  // ---------------------------------------------------------------------------
  const ctx = sporeCanvas.getContext('2d');
  let spores = [];
  const SPORE_COUNT = 48;

  function resizeSporeCanvas() {
    sporeCanvas.width = window.innerWidth;
    sporeCanvas.height = window.innerHeight;
  }

  function initSpores() {
    spores = [];
    for (let i = 0; i < SPORE_COUNT; i++) {
      spores.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius: Math.random() * 2.2 + 0.6,
        baseAlpha: Math.random() * 0.45 + 0.15,
        alpha: 0,
        vx: (Math.random() - 0.5) * 0.22,
        vy: -(Math.random() * 0.35 + 0.1),
        wobbleSpeed: Math.random() * 0.015 + 0.005,
        wobblePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  function renderSpores() {
    ctx.clearRect(0, 0, sporeCanvas.width, sporeCanvas.height);

    for (let i = 0; i < spores.length; i++) {
      const s = spores[i];
      s.wobblePhase += s.wobbleSpeed;
      s.x += s.vx + Math.sin(s.wobblePhase) * 0.28;
      s.y += s.vy;

      if (s.y < -10) {
        s.y = sporeCanvas.height + 10;
        s.x = Math.random() * sporeCanvas.width;
      }
      if (s.x < -10) s.x = sporeCanvas.width + 10;
      if (s.x > sporeCanvas.width + 10) s.x = -10;

      s.alpha = s.baseAlpha + Math.sin(s.wobblePhase * 2) * 0.1;
      if (s.alpha < 0.05) s.alpha = 0.05;

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(239, 234, 215, ${s.alpha})`;
      ctx.shadowColor = 'rgba(239, 234, 215, 0.4)';
      ctx.shadowBlur = 4;
      ctx.fill();
    }

    requestAnimationFrame(renderSpores);
  }

  window.addEventListener('resize', resizeSporeCanvas);
  resizeSporeCanvas();
  initSpores();
  renderSpores();

  // ---------------------------------------------------------------------------
  // 4. Video Transition Controller (Seamless, No Flashing, Timed UI Fade)
  // ---------------------------------------------------------------------------
  function playVideoTransition(videoEl, targetState, onComplete) {
    if (!videoEl) {
      setAppStage(targetState);
      if (onComplete) onComplete();
      return;
    }

    isTransitioning = true;
    app.classList.add('is-transitioning');
    app.classList.add('ui-fade-out');

    // Blur active element so buttons don't hold hover or focus states
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }

    // Step 1: Wait 180ms so ALL UI overlays (text, cards, TV portal, portrait) fade out completely
    setTimeout(() => {
      // Hide any other playing videos
      Object.values(videos).forEach((v) => {
        if (v && v !== videoEl) {
          v.pause();
          v.classList.remove('playing');
          v.style.display = 'none';
          v.style.opacity = '0';
        }
      });

      // Prepare video
      videoEl.currentTime = 0;
      videoEl.style.display = 'block';
      videoEl.style.opacity = '0'; // Keep hidden until first frame is ready

      let hasCompleted = false;

      const finishTransition = () => {
        if (hasCompleted) return;
        hasCompleted = true;

        // Switch to target static screenshot immediately underneath video
        setAppStage(targetState);

        // Wait 1 animation frame so the browser draws the static screenshot before removing the video
        requestAnimationFrame(() => {
          videoEl.classList.remove('playing');
          videoEl.style.display = 'none';
          videoEl.style.opacity = '0';
          videoEl.pause();
          isTransitioning = false;
          app.classList.remove('is-transitioning');

          if (onComplete) onComplete();

          // Smoothly fade the new incoming UI overlay in
          requestAnimationFrame(() => {
            app.classList.remove('ui-fade-out');
          });
        });
      };

      videoEl.onended = finishTransition;

      // Safety timeout in case video ends slightly differently
      const maxDuration = (videoEl.duration && !isNaN(videoEl.duration) ? videoEl.duration * 1000 : 2600) + 350;
      setTimeout(finishTransition, maxDuration);

      // Reveal video only when actual frames are decoding to eliminate black flash
      const onFrameReady = () => {
        videoEl.classList.add('playing');
        videoEl.style.opacity = '1';
        videoEl.removeEventListener('playing', onFrameReady);
        videoEl.removeEventListener('timeupdate', onFrameReady);
      };
      videoEl.addEventListener('playing', onFrameReady);
      videoEl.addEventListener('timeupdate', onFrameReady);

      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Transition video play interrupted or failed:', err);
          finishTransition();
        });
      }
    }, 180);
  }

  // Set Stage Class on #app
  function setAppStage(stageName) {
    app.classList.remove('stage-start', 'stage-hoofdmenu', 'stage-projects', 'stage-overmij');
    app.classList.add(`stage-${stageName}`);
    currentState = stageName;

    // Screen aria-hidden states
    screenStart.setAttribute('aria-hidden', stageName === 'start' ? 'false' : 'true');
    screenHoofdmenu.setAttribute('aria-hidden', stageName === 'hoofdmenu' ? 'false' : 'true');
    screenProjects.setAttribute('aria-hidden', stageName === 'projects' ? 'false' : 'true');
    screenOverMij.setAttribute('aria-hidden', stageName === 'overmij' ? 'false' : 'true');
  }

  // ---------------------------------------------------------------------------
  // 5. Navigation Router & Transitions
  // ---------------------------------------------------------------------------
  function navigateTo(targetState, options = {}) {
    if (isTransitioning) return;
    const { skipVideo = false, isPopState = false, projectId = null } = options;

    const fromState = currentState;
    if (fromState === targetState && targetState !== 'projects') return;

    // Push browser history if not triggered by browser popstate
    if (!isPopState) {
      const url = new URL(window.location);
      url.searchParams.set('page', targetState);
      if (projectId) {
        url.searchParams.set('project', projectId);
      } else {
        url.searchParams.delete('project');
      }
      window.history.pushState({ page: targetState, project: projectId }, '', url);
    }

    // Determine appropriate transition video
    let transitionVideo = null;

    if (!skipVideo) {
      if (fromState === 'start' && targetState === 'hoofdmenu') {
        transitionVideo = videos.startForward;
      } else if (fromState === 'hoofdmenu' && targetState === 'start') {
        transitionVideo = videos.startReverse;
      } else if (fromState === 'hoofdmenu' && targetState === 'projects') {
        transitionVideo = videos.projectsForward;
      } else if (fromState === 'projects' && targetState === 'hoofdmenu') {
        transitionVideo = videos.projectsReverse;
      } else if (fromState === 'hoofdmenu' && targetState === 'overmij') {
        transitionVideo = videos.overMijForward;
      } else if (fromState === 'overmij' && targetState === 'hoofdmenu') {
        transitionVideo = videos.overMijReverse;
      }
    }

    if (transitionVideo) {
      playVideoTransition(transitionVideo, targetState, () => {
        onEnterState(targetState, projectId);
      });
    } else {
      setAppStage(targetState);
      onEnterState(targetState, projectId);
      app.classList.remove('ui-fade-out');
    }
  }

  function onEnterState(stage, projectId) {
    if (stage === 'projects') {
      if (projectId) {
        openProjectDetail(projectId);
      } else {
        showProjectsOverview();
      }
    }
    // Note: Removed programmatic autofocus on buttons so main menu buttons load in clean resting state
  }

  // ---------------------------------------------------------------------------
  // 6. Projects & TV Screen Logic (with Verbatim .txt File Loaders)
  // ---------------------------------------------------------------------------
  const projectsData = window.PORTFOLIO_PROJECTS || [];

  const PROJECT_TEXT_CONFIG = {
    'discursive': {
      title: ['Foreground/Projecten/Discursive/Tekst/Titel project.txt', 'Foreground/Projecten/Discursive/Titel project.txt'],
      subtitle: ['Foreground/Projecten/Discursive/Tekst/Ondertitel.txt', 'Foreground/Projecten/Discursive/Ondertitel.txt'],
      description: ['Foreground/Projecten/Discursive/Tekst/Lopende tekst.txt', 'Foreground/Projecten/Discursive/Lopende tekst.txt']
    },
    'graphic-matters': {
      title: ['Foreground/Projecten/Graphic matters/Tekst/Titel.txt', 'Foreground/Projecten/Graphic matters/Titel.txt'],
      subtitle: ['Foreground/Projecten/Graphic matters/Tekst/Ondertitel.txt', 'Foreground/Projecten/Graphic matters/Ondertitel.txt'],
      description: ['Foreground/Projecten/Graphic matters/Tekst/Lopende tekst.txt', 'Foreground/Projecten/Graphic matters/Lopende tekst.txt']
    },
    'hierarchie': {
      title: ['Foreground/Projecten/Hierarchie/Tekst/Titel.txt', 'Foreground/Projecten/Hierarchie/Titel.txt'],
      subtitle: ['Foreground/Projecten/Hierarchie/Tekst/Ondertitel.txt', 'Foreground/Projecten/Hierarchie/Ondertitel.txt'],
      description: ['Foreground/Projecten/Hierarchie/Tekst/Lopende tekst.txt', 'Foreground/Projecten/Hierarchie/Lopende tekst.txt']
    },
    'narratief': {
      title: ['Foreground/Projecten/Narratief/Titel.txt', 'Foreground/Projecten/Narratief/Tekst/Titel.txt'],
      subtitle: ['Foreground/Projecten/Narratief/Ondertitel.txt', 'Foreground/Projecten/Narratief/Tekst/Ondertitel.txt'],
      description: ['Foreground/Projecten/Narratief/Lopende tekst.txt', 'Foreground/Projecten/Narratief/Tekst/Lopende tekst.txt']
    },
    'spatial-sensorial': {
      title: ['Foreground/Projecten/Spatial and sensorial/Titel.txt', 'Foreground/Projecten/Spatial and sensorial/Tekst/Titel.txt'],
      subtitle: ['Foreground/Projecten/Spatial and sensorial/Ondertitel.txt', 'Foreground/Projecten/Spatial and sensorial/Tekst/Ondertitel.txt'],
      description: ['Foreground/Projecten/Spatial and sensorial/Lopende tekst.txt', 'Foreground/Projecten/Spatial and sensorial/Tekst/Lopende tekst.txt']
    }
  };

  const OVERMIJ_TEXT_CONFIG = {
    title: 'Foreground/Over mij/Titel.txt',
    description: 'Foreground/Over mij/Lopende tekst.txt'
  };

  async function fetchTextContent(paths, fallback = '') {
    const list = Array.isArray(paths) ? paths : [paths];
    for (const p of list) {
      try {
        const response = await fetch(p, { cache: 'no-store' });
        if (response.ok) {
          const text = (await response.text()).trim();
          if (text.length > 0) {
            return text;
          }
        }
      } catch (e) {
        // continue to next path
      }
    }
    return fallback;
  }

  async function getVideoStillDataUrl(videoSrc) {
    if (!videoSrc) return null;

    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.playsInline = true;
      video.muted = true;
      video.crossOrigin = 'anonymous';
      video.src = videoSrc;
      video.load();

      const fail = () => resolve(null);
      video.addEventListener('error', fail);
      video.addEventListener('loadeddata', () => {
        try {
          const canvas = document.createElement('canvas');
          const width = Math.min(480, Math.max(160, video.videoWidth || 480));
          const height = Math.min(270, Math.max(90, video.videoHeight || 270));
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, width, height);
          resolve(canvas.toDataURL('image/png'));
        } catch (e) {
          resolve(null);
        }
      });
    });
  }

  async function loadAllProjectAndOverMijTexts() {
    // 1. Projects texts from dedicated folders
    for (let i = 0; i < projectsData.length; i++) {
      const proj = projectsData[i];
      const cfg = PROJECT_TEXT_CONFIG[proj.id];
      if (cfg) {
        proj.title = await fetchTextContent(cfg.title, proj.title);
        proj.subtitle = await fetchTextContent(cfg.subtitle, proj.subtitle);
        proj.description = await fetchTextContent(cfg.description, proj.description);
      }
    }

    // Build the project overview cards only after the text loading loop has finished.
    if (projectsScrollList) {
      await renderProjectsOverviewList();
    }

    // If currently on detail view, update detail texts
    if (activeProjectId) {
      const activeProj = projectsData.find((p) => p.id === activeProjectId);
      if (activeProj) {
        if (detailProjectTitle) detailProjectTitle.textContent = activeProj.title;
        if (detailProjectSubtitle) detailProjectSubtitle.textContent = activeProj.subtitle || activeProj.category || '';
        if (detailProjectDescription) detailProjectDescription.textContent = activeProj.description;
      }
    }

    // 2. Over mij texts verbatim from Foreground/Over mij/*.txt
    const overMijTitleEl = document.querySelector('.overmij-title');
    const overMijBodyEl = document.querySelector('.overmij-body');

    if (overMijTitleEl) {
      const title = await fetchTextContent(OVERMIJ_TEXT_CONFIG.title, overMijTitleEl.textContent.trim());
      if (title) overMijTitleEl.textContent = title;
    }

    if (overMijBodyEl) {
      const desc = await fetchTextContent(OVERMIJ_TEXT_CONFIG.description, '');
      if (desc) {
        const paragraphs = desc.split(/\r?\n\s*\r?\n/).filter((p) => p.trim().length > 0);
        if (paragraphs.length > 0) {
          overMijBodyEl.innerHTML = paragraphs.map((p, idx) => `<p class="${idx === 0 ? 'lead-text' : ''}">${p}</p>`).join('');
        } else {
          overMijBodyEl.innerHTML = `<p class="lead-text">${desc}</p>`;
        }
      }
    }
  }

  async function renderProjectsOverviewList() {
    if (!projectsScrollList) return;
    projectsScrollList.innerHTML = '';

    for (const proj of projectsData) {
      const card = document.createElement('div');
      card.className = `project-card ${proj.id === activeProjectId ? 'active' : ''}`;
      card.tabIndex = 0;
      card.dataset.id = proj.id;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `Project ${proj.title} openen`);

      const mainMedia = (proj.media || []).find((m) => m.tier === 'hoofd');
      if (mainMedia?.type === 'image' && mainMedia.src) {
        card.style.setProperty('--project-preview-image', `url("${mainMedia.src}")`);
      } else if (mainMedia?.type === 'video' && mainMedia.src) {
        const still = await getVideoStillDataUrl(mainMedia.src);
        if (still) {
          card.style.setProperty('--project-preview-image', `url("${still}")`);
        } else {
          card.style.setProperty('--project-preview-image', 'none');
        }
      } else {
        const mainImage = (proj.media || []).find((m) => m.tier === 'hoofd' && m.type === 'image');
        if (mainImage?.src) {
          card.style.setProperty('--project-preview-image', `url("${mainImage.src}")`);
        } else {
          card.style.setProperty('--project-preview-image', 'none');
        }
      }

      const contentText = `${proj.title || ''} ${proj.subtitle || proj.category || ''}`.trim();
      const contentLength = contentText.length;
      const dynamicCardHeight = Math.max(84, Math.min(180, 84 + Math.ceil(contentLength / 34) * 20));
      card.style.minHeight = `${dynamicCardHeight}px`;
      card.style.height = `${dynamicCardHeight}px`;

      card.innerHTML = `
        <h3 class="card-title">${proj.title}</h3>
        <p class="card-subtitle-line">${proj.subtitle || proj.category || ''}</p>
      `;

      card.addEventListener('click', () => {
        openProjectDetail(proj.id);
        const url = new URL(window.location);
        url.searchParams.set('page', 'projects');
        url.searchParams.set('project', proj.id);
        window.history.pushState({ page: 'projects', project: proj.id }, '', url);
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });

      projectsScrollList.appendChild(card);
    }
  }

  function showProjectsOverview() {
    activeProjectId = null;
    currentProjectSubView = 'list';
    projectsListView.classList.add('active');
    projectsDetailView.classList.remove('active');
    btnProjectsBackText.textContent = 'HOOFDMENU';

    // Clear active cards
    const cards = projectsScrollList.querySelectorAll('.project-card');
    cards.forEach((c) => {
      c.classList.remove('active');
    });

    // In project selection menu, show standby state in right image panel
    if (projectsImageFeed) {
      projectsImageFeed.innerHTML = `
        <div class="tv-standby-placeholder">
          <p class="tv-standby-text">SELECTEER EEN PROJECT OM BEELDEN TE LADEN</p>
        </div>
      `;
    }
    if (tvChannelTag) {
      tvChannelTag.textContent = 'CH -- // STANDBY';
    }
    if (tvStatusTag) {
      tvStatusTag.textContent = 'STANDBY';
    }
    if (tvScrollHint) {
      tvScrollHint.style.display = 'none';
    }
  }

  function openProjectDetail(projectId) {
    const proj = projectsData.find((p) => p.id === projectId) || projectsData[0];
    if (!proj) return;

    activeProjectId = proj.id;
    currentProjectSubView = 'detail';

    projectsListView.classList.remove('active');
    projectsDetailView.classList.add('active');
    btnProjectsBackText.textContent = 'PROJECTEN';

    // Populate Left Column with exact Title and Lopende tekst
    detailProjectNumber.textContent = `PROJECT ${proj.index || '01'}`;
    detailProjectTitle.textContent = proj.title;
    detailProjectSubtitle.textContent = proj.subtitle || proj.category || '';
    detailProjectDescription.textContent = proj.description;

    // Load Project Media on TV in Strict Hierarchy (Hoofd -> Standaard -> Proces)
    loadProjectMediaOnTV(proj, true);

    if (tvScrollHint) {
      tvScrollHint.style.display = 'flex';
    }

    // Scroll left detail text to top
    if (detailBodyScroll) {
      detailBodyScroll.scrollTop = 0;
    }
  }

  /**
   * Sorts and renders media into the right scrollable image panel.
   * Hierarchy: Hoofdafbeelding → Standaard → Proces
   */
  function loadProjectMediaOnTV(proj, triggerStatic = true) {
    if (!projectsImageFeed) return;

    // Trigger authentic CRT switch static flicker (visual only on TV portal)
    if (triggerStatic && tvStaticLayer) {
      tvStaticLayer.classList.remove('flicker');
      void tvStaticLayer.offsetWidth; // reflow
      tvStaticLayer.classList.add('flicker');
    }

    // Update OSD tags on TV portal (decorative)
    if (tvChannelTag) {
      tvChannelTag.textContent = `CH ${proj.index || '01'} // ${proj.title.toUpperCase()}`;
    }
    if (tvStatusTag) {
      tvStatusTag.innerHTML = 'BROADCAST &#9654;';
    }

    // Sort media strictly: hoofd -> standaard -> proces
    const mediaItems = [...(proj.media || [])].sort((a, b) => {
      const order = { hoofd: 1, standaard: 2, proces: 3 };
      const valA = order[a.tier] || 2;
      const valB = order[b.tier] || 2;
      return valA - valB;
    });

    projectsImageFeed.innerHTML = '';

    mediaItems.forEach((m, idx) => {
      const itemEl = document.createElement('div');
      itemEl.className = `tv-media-item item-tier-${m.tier}`;
      itemEl.id = `imgFeedItem_${idx}`;

      let badgeLabel = 'STANDAARD';
      let badgeClass = 'badge-standaard';
      if (m.tier === 'hoofd') {
        badgeLabel = 'HOOFDAFBEELDING';
        badgeClass = 'badge-hoofd';
      } else if (m.tier === 'proces') {
        badgeLabel = 'PROCES';
        badgeClass = 'badge-proces';
      }

      let elementHtml = '';
      if (m.type === 'video') {
        const videoMarkup = `
          <video class="tv-media-element" playsinline muted loop autoplay preload="auto">
            <source src="${m.src}" type="video/mp4">
          </video>
        `;

        if (m.link) {
          elementHtml = `
            <a class="tv-media-link" href="${m.link}" target="_blank" rel="noopener noreferrer" aria-label="Open ${m.label || proj.title}">
              <span class="tv-video-frame">
                ${videoMarkup}
                <span class="tv-video-hint">Voor geluid klik op de video</span>
              </span>
            </a>
          `;
        } else {
          elementHtml = `
            <span class="tv-video-frame">
              ${videoMarkup}
            </span>
          `;
        }
      } else {
        elementHtml = `
          <img class="tv-media-element" src="${m.src}" alt="${m.caption || proj.title}" loading="lazy">
        `;
      }

      itemEl.innerHTML = `
        <span class="tv-media-badge ${badgeClass}">${badgeLabel}</span>
        ${elementHtml}
        <p class="tv-media-caption">${m.caption || m.label || ''}</p>
      `;

      projectsImageFeed.appendChild(itemEl);
    });

    // Reset image feed scroll to top
    projectsImageFeed.scrollTop = 0;
  }

  // ---------------------------------------------------------------------------
  // 7. Event Handlers & History Listener
  // ---------------------------------------------------------------------------
  // Start screen click / keypress
  screenStart.addEventListener('click', () => {
    navigateTo('hoofdmenu');
  });

  // Hoofdmenu buttons
  btnGoProjects.addEventListener('click', () => {
    navigateTo('projects');
  });

  btnGoAbout.addEventListener('click', () => {
    navigateTo('overmij');
  });

  btnHoofdmenuBack.addEventListener('click', () => {
    navigateTo('start');
  });

  // Projects navigation
  btnProjectsBack.addEventListener('click', () => {
    if (currentProjectSubView === 'detail') {
      showProjectsOverview();
      const url = new URL(window.location);
      url.searchParams.set('page', 'projects');
      url.searchParams.delete('project');
      window.history.pushState({ page: 'projects' }, '', url);
    } else {
      navigateTo('hoofdmenu');
    }
  });

  btnBackToOverview.addEventListener('click', () => {
    showProjectsOverview();
    const url = new URL(window.location);
    url.searchParams.set('page', 'projects');
    url.searchParams.delete('project');
    window.history.pushState({ page: 'projects' }, '', url);
  });

  // Over Mij navigation
  btnOverMijBack.addEventListener('click', () => {
    navigateTo('hoofdmenu');
  });

  btnOverMijReturn.addEventListener('click', () => {
    navigateTo('hoofdmenu');
  });

  // Browser Back / Forward Integration (popstate)
  window.addEventListener('popstate', (e) => {
    const state = e.state;
    if (state && state.page) {
      if (state.page === 'projects' && !state.project && currentProjectSubView === 'detail') {
        showProjectsOverview();
      } else {
        navigateTo(state.page, { isPopState: true, projectId: state.project || null });
      }
    } else {
      // Fallback from query params or start screen
      const urlParams = new URLSearchParams(window.location.search);
      const page = urlParams.get('page') || 'start';
      const project = urlParams.get('project') || null;
      navigateTo(page, { isPopState: true, projectId: project });
    }
  });

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    if (isTransitioning) return;

    if (currentState === 'start') {
      navigateTo('hoofdmenu');
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      if (currentState === 'projects') {
        if (currentProjectSubView === 'detail') {
          showProjectsOverview();
        } else {
          navigateTo('hoofdmenu');
        }
      } else if (currentState === 'overmij') {
        navigateTo('hoofdmenu');
      } else if (currentState === 'hoofdmenu') {
        navigateTo('start');
      }
    }
  });

  // ---------------------------------------------------------------------------
  // 8. Initialization & URL Routing
  // ---------------------------------------------------------------------------
  loadAllProjectAndOverMijTexts();

  // Parse initial URL
  const urlParams = new URLSearchParams(window.location.search);
  const initialPage = urlParams.get('page') || 'start';
  const initialProject = urlParams.get('project') || null;

  if (initialPage !== 'start') {
    navigateTo(initialPage, { skipVideo: true, projectId: initialProject });
  } else {
    setAppStage('start');
    window.history.replaceState({ page: 'start' }, '', window.location.href);
  }
})();
