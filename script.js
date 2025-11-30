// Christmas page script with optional shared backend (Supabase) support
(() => {
  const MS_KEY = 'idh_christmas_messages_v1';
  const IMG_KEY = 'idh_christmas_images_v1';
  const PENDING_KEY = 'idh_christmas_pending_posts_v1';

  // DOM
  const form = document.getElementById('message-form');
  const nameInput = document.getElementById('name');
  const msgInput = document.getElementById('message');
  const messagesList = document.getElementById('messages-list');
  const clearBtn = document.getElementById('clear-btn');

  const imageInput = document.getElementById('image-url');
  const addImageBtn = document.getElementById('add-image');
  const carousel = document.getElementById('image-carousel');

  const shareInput = document.getElementById('share-msg');
  const makeLinkBtn = document.getElementById('make-link');
  const shareLink = document.getElementById('share-link');

  const backendIndicator = document.getElementById('backend-indicator');

  // Utilities
  function loadJSON(key, fallback) { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch (e) { return fallback; } }
  function saveJSON(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch(e){} }

  function escapeHtml(s){ return (s+'').replace(/[&<>"/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

  // Shared backend detection (Supabase)
  const shared = (typeof window.SUPABASE_CONFIG !== 'undefined' && window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url && window.SUPABASE_CONFIG.anonKey);
  const SUPA = shared ? window.SUPABASE_CONFIG : null;
  if(shared){ backendIndicator.textContent = 'Enabled (Supabase)'; } else { backendIndicator.textContent = 'Local only'; }

  // Messages handling
  let messages = loadJSON(MS_KEY, []);
  function renderMessages(){
    messagesList.innerHTML = '';
    if(messages.length === 0){
      messagesList.innerHTML = '<div class="msg"><h3>No messages yet</h3><p>Be the first to share holiday cheer 🎁</p></div>';
      return;
    }
    messages.slice().reverse().forEach(m => {
      const el = document.createElement('div');
      el.className = 'msg';
      const who = m.name ? `${escapeHtml(m.name)} says:` : 'Anonymous';
      el.innerHTML = `<h3>${who}</h3><p>${escapeHtml(m.text)}</p><small style="color:var(--muted);display:block;margin-top:8px">${new Date(m.ts).toLocaleString()}</small>`;
      messagesList.appendChild(el);
    });
  }

  // Local-only functions
  function addLocalMessage(m){ messages.push(m); saveJSON(MS_KEY, messages); renderMessages(); }

  // Shared backend functions (Supabase REST)
  async function fetchSharedMessages(){
    if(!SUPA) return [];
    try{
      // Supabase REST: /rest/v1/messages?select=*&order=ts.desc
      const url = `${SUPA.url.replace(/\/+$,'')}/rest/v1/messages?select=*&order=ts.desc&limit=200`;
      const res = await fetch(url, { headers: { apikey: SUPA.anonKey, Authorization: `Bearer ${SUPA.anonKey}` } });
      if(!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      // normalize
      return data.map(d => ({ name: d.name||'', text: d.text||'', ts: d.ts || (new Date(d.created_at).getTime()) || Date.now() }));
    }catch(e){ console.warn('fetchSharedMessages failed', e); return []; }
  }

  async function postSharedMessage(m){
    if(!SUPA) throw new Error('No backend');
    try{
      const url = `${SUPA.url.replace(/\/+$,'')}/rest/v1/messages`;
      const body = { name: m.name || '', text: m.text, ts: m.ts };
      const res = await fetch(url, { method:'POST', headers: { 'Content-Type':'application/json', apikey: SUPA.anonKey, Authorization: `Bearer ${SUPA.anonKey}` }, body: JSON.stringify(body) });
      if(!res.ok){ const text = await res.text(); throw new Error(text||'post failed'); }
      return true;
    }catch(e){ console.warn('postSharedMessage failed', e); return false; }
  }

  // Pending queue for failed posts
  function enqueuePending(m){ const q = loadJSON(PENDING_KEY, []); q.push(m); saveJSON(PENDING_KEY, q); }
  async function flushPending(){ if(!SUPA) return; const q = loadJSON(PENDING_KEY, []); if(!q.length) return; const remaining = [];
    for(const m of q){ const ok = await postSharedMessage(m); if(!ok) remaining.push(m); }
    saveJSON(PENDING_KEY, remaining);
  }

  // Form submit
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const text = msgInput.value.trim(); if(!text) return;
    const m = { name: nameInput.value.trim(), text, ts: Date.now() };
    if(shared){
      // optimistically append locally
      addLocalMessage(m);
      const ok = await postSharedMessage(m);
      if(!ok){ enqueuePending(m); alert('Failed to post to shared backend — saved locally and queued.'); }
      // refresh from server
      const remote = await fetchSharedMessages(); if(remote.length) { messages = remote; saveJSON(MS_KEY, messages); renderMessages(); }
    } else {
      addLocalMessage(m);
    }
    msgInput.value = '';
  });

  clearBtn.addEventListener('click', ()=>{ if(!confirm('Clear all saved messages on this browser?')) return; messages = []; saveJSON(MS_KEY, messages); renderMessages(); });

  // Share URL handling
  function readQueryMessage(){ const p = new URLSearchParams(location.search); const m = p.get('message'); const n = p.get('name'); if(m){ const obj = { name: n || '', text: m, ts: Date.now() };
      if(shared){ postSharedMessage(obj).then(()=>{}).catch(()=>{}); }
      addLocalMessage(obj); history.replaceState(null,'',location.pathname); } }

  // Images
  let images = loadJSON(IMG_KEY, [
    'https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif',
    'https://media.giphy.com/media/l0MYB8Ory7Hqefo9a/giphy.gif',
    'https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif'
  ]);
  function renderCarousel(){ carousel.innerHTML = ''; images.forEach((src,i)=>{ const img = document.createElement('img'); img.src=src; img.alt=`animated ${i+1}`; img.loading='lazy'; img.title='Click to remove'; img.addEventListener('click', ()=>{ if(confirm('Remove this image?')){ images.splice(i,1); saveJSON(IMG_KEY, images); renderCarousel(); } }); carousel.appendChild(img); }); }
  addImageBtn.addEventListener('click', ()=>{ const url = imageInput.value.trim(); if(!url) return; images.push(url); saveJSON(IMG_KEY, images); imageInput.value=''; renderCarousel(); });

  // Share link generator
  makeLinkBtn.addEventListener('click', ()=>{ const t = shareInput.value.trim(); if(!t) return alert('Type a message to make a share link.'); const u = new URL(location.href); u.searchParams.set('message', t); const link = u.toString(); shareLink.href = link; shareLink.textContent = 'Open share link'; shareLink.classList.add('visible'); navigator.clipboard?.writeText(link).then(()=>{ makeLinkBtn.textContent='Copied!'; setTimeout(()=> makeLinkBtn.textContent='Make link',1200); }).catch(()=>{}); });

  // Snow canvas
  function startSnow(){ const canvas = document.getElementById('snow-canvas'); const ctx = canvas.getContext('2d'); let w=canvas.width=innerWidth; let h=canvas.height=innerHeight; const count = Math.max(60, Math.floor((w*h)/12000)); const flakes = Array.from({length:count}).map(()=>({ x:Math.random()*w, y:Math.random()*h, r:Math.random()*3+1, d:Math.random()*2, vx:(Math.random()*0.6)-0.3 })); window.addEventListener('resize', ()=>{ w=canvas.width=innerWidth; h=canvas.height=innerHeight; }); function draw(){ ctx.clearRect(0,0,w,h); ctx.fillStyle='rgba(255,255,255,0.85)'; flakes.forEach(f=>{ ctx.beginPath(); ctx.globalAlpha = 0.8 * Math.min(1, f.r/4); ctx.arc(f.x,f.y,f.r,0,Math.PI*2); ctx.fill(); f.y += f.d + 0.2; f.x += f.vx + Math.sin(f.d + performance.now()/500 + f.x/100) * 0.4; if(f.y > h + 10){ f.y = -10; f.x = Math.random()*w; } if(f.x > w + 10) f.x = -10; if(f.x < -10) f.x = w + 10; }); requestAnimationFrame(draw); } draw(); }

  // Initialization
  async function init(){ renderMessages(); renderCarousel(); readQueryMessage(); startSnow(); if(shared){ // try to fetch shared messages and flush pending
      const remote = await fetchSharedMessages(); if(remote.length){ messages = remote; saveJSON(MS_KEY,messages); renderMessages(); }
      await flushPending(); }
  }
  init();
})();