/* script.js
   - small card size: 50x75
   - 3 columns: open area, closed area, search/result
   - selecting from dropdown shows result card; clicking result (or clicking open card) moves that card to closed
   - undo & reset
   - state persisted in localStorage (not reset on reload/close)
*/

const SUITS = [
  { id:'spade', sym:'♠', color:'black' },
  { id:'heart', sym:'♥', color:'red' },
  { id:'diamond', sym:'♦', color:'red' },
  { id:'club', sym:'♣', color:'black' }
];
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

const openArea = document.getElementById('openArea');
const closedArea = document.getElementById('closedArea');
const closedCountLabel = document.getElementById('closedCountLabel');
const openCountEl = document.getElementById('openCount');
const closedCountEl = document.getElementById('closedCount');
const searchBtn = document.getElementById('searchBtn');
const searchPanel = document.getElementById('searchPanel');
const resultArea = document.getElementById('resultArea');
const resultCardPlaceholder = document.getElementById('resultCardPlaceholder');
const undoBtn = document.getElementById('undoBtn');
const resetBtn = document.getElementById('resetBtn');

let fullDeck = [];     // objects { id: 'A-spade', rank:'A', suit:'spade', sym:'♠', color:'red' }
let openPile = [];     // ids in order
let closedPile = [];   // ids in order (top is last)
let historyStack = []; // for undo [{action:'move', id, from:'open'|'closed'}]

// --- Helpers ----
function buildFullDeck(){
  fullDeck = [];
  for(const s of SUITS){
    for(const r of RANKS){
      fullDeck.push({ id: `${r}-${s.id}`, rank:r, suit:s.id, sym:s.sym, color:s.color });
    }
  }
}
function getCardObjById(id){ return fullDeck.find(c=>c.id===id); }

// --- Persistence ---
function saveState(){
  localStorage.setItem('openPile', JSON.stringify(openPile));
  localStorage.setItem('closedPile', JSON.stringify(closedPile));
  localStorage.setItem('historyStack', JSON.stringify(historyStack));
}
function loadState(){
  const o = localStorage.getItem('openPile');
  const c = localStorage.getItem('closedPile');
  const h = localStorage.getItem('historyStack');
  if(o && c){
    openPile = JSON.parse(o);
    closedPile = JSON.parse(c);
    historyStack = h ? JSON.parse(h) : [];
    return true;
  }
  return false;
}
function clearState(){
  localStorage.removeItem('openPile');
  localStorage.removeItem('closedPile');
  localStorage.removeItem('historyStack');
}

// --- Init ---
function initAll(){
  buildFullDeck();
  const loaded = loadState();
  if(!loaded){
    // default: all open, none closed
    openPile = fullDeck.map(c=>c.id);
    closedPile = [];
    historyStack = [];
    saveState();
  }
  renderAll();
}
initAll();

// --- Rendering ---
function renderAll(){
  renderOpenArea();
  renderClosedArea();
  buildSearchPanel();
  updateCounts();
  clearResult();
}

function renderOpenArea(){
  openArea.innerHTML = '';
  // show cards grid small: create face nodes in order
  for(let id of openPile){
    const card = getCardObjById(id);
    const node = makeFaceNode(card);
    openArea.appendChild(node);
  }
  if(openPile.length === 0){
    const ph = document.createElement('div'); ph.textContent='(Kosong)'; ph.style.color='#cfe9ff';
    openArea.appendChild(ph);
  }
}

function renderClosedArea(){
  closedCountLabel.textContent = closedPile.length;
  closedCountEl.textContent = closedPile.length;
  openCountEl.textContent = openPile.length;
}

function updateCounts(){
  openCountEl.textContent = openPile.length;
  closedCountEl.textContent = closedPile.length;
}

// --- DOM builders ---
function makeFaceNode(card){
  const el = document.createElement('div');
  el.className = 'card-face ' + (card.color === 'red' ? 'red':'black');
  el.dataset.id = card.id;
  el.innerHTML = `<div class="face-value">${card.rank}</div><div class="face-suit">${card.sym}</div>`;
  // click: move top allowed? we allow clicking any open card — behavior: move that specific card to closed
  el.addEventListener('click', async (e) => {
    await moveCardToClosed(card.id, true);
  });
  return el;
}

function createResultNode(card){
  const el = document.createElement('div');
  el.className = 'card-face ' + (card.color === 'red' ? 'red':'black');
  el.style.width = '240px';
  el.style.height = '90px';
  el.style.fontSize = '18px';
  el.dataset.id = card.id;
  el.innerHTML = `<div style="font-weight:700">${card.rank} ${card.sym}</div><div style="font-size:12px;color:#9fcfff">${card.suit}</div>`;
  // click result: same as clicking open -> move to closed
  el.addEventListener('click', async () => {
    await moveCardToClosed(card.id, true);
  });
  return el;
}

// --- Search panel build (only open cards) ---
function buildSearchPanel(){
  searchPanel.innerHTML = '';
  // list openPile reversed so top-most last appears first (but order not critical)
  const items = openPile.slice().reverse();
  for(const id of items){
    const c = getCardObjById(id);
    const row = document.createElement('div');
    row.className = 'item';
    row.dataset.id = id;
    row.innerHTML = `<div class="icon" style="color:${c.color==='red'?'#ff6b6b':'#eee'}">${c.sym}</div>
                     <div style="flex:1;color:#e9f7ff">${c.rank} ${c.sym}</div>`;
    row.addEventListener('click', () => {
      searchPanel.classList.remove('show');
      showResult(c.id);
    });
    searchPanel.appendChild(row);
  }
}

// --- Result area ---
function clearResult(){
  resultArea.innerHTML = '';
  resultArea.appendChild(resultCardPlaceholder);
}
function showResult(id){
  const cardObj = getCardObjById(id);
  if(!cardObj) return;
  resultArea.innerHTML = '';
  const node = createResultNode(cardObj);
  node.classList.add('highlight');
  resultArea.appendChild(node);
  setTimeout(()=> node.classList.remove('highlight'), 800);
}

// --- Move logic with animation (clone + flip) ---
async function moveCardToClosed(id, recordHistory){
  // only proceed if id is in openPile
  const idx = openPile.indexOf(id);
  if(idx === -1) return;

  // create clone at source position
  const srcEl = document.querySelector(`.card-face[data-id="${id}"]`);
  const dstEl = document.getElementById('closedBack');
  const cardObj = getCardObjById(id);

  const clone = createCloneElement(cardObj, true);
  document.body.appendChild(clone);

  // compute positions
  const srcRect = srcEl ? srcEl.getBoundingClientRect() : openArea.getBoundingClientRect();
  const dstRect = dstEl.getBoundingClientRect();

  // position clone
  clone.style.left = `${srcRect.left}px`;
  clone.style.top  = `${srcRect.top}px`;
  clone.style.transform = 'rotateY(0deg) scale(1.03)';
  await tick(20);

  // animate move + flip
  clone.style.transition = `left 420ms cubic-bezier(.2,.9,.22,1), top 420ms, transform 420ms`;
  clone.style.left = `${dstRect.left}px`;
  clone.style.top  = `${dstRect.top}px`;
  clone.style.transform = 'rotateY(180deg) translateX(-8px) scale(0.98)';

  await wait(460);
  clone.remove();

  // logical move
  const moved = openPile.splice(idx,1)[0];
  closedPile.push(moved);
  if(recordHistory) historyStack.push({ action:'move', id:moved, from:'open' });

  saveState();
  renderAll();
}

// --- Undo / Reset handlers ---
undoBtn.addEventListener('click', async () => {
  if(historyStack.length === 0) return;
  const last = historyStack.pop();
  if(last.action === 'move'){
    const id = last.id;
    // If last moved from open->closed, undo: move last closed back to open
    const idxClosed = closedPile.lastIndexOf(id);
    if(idxClosed !== -1){
      // animate reverse only if the card is top of closed pile
      const top = closedPile[closedPile.length-1];
      if(top === id){
        // animate closed->open
        await animateClosedToOpen(id);
        closedPile.splice(idxClosed,1);
        openPile.push(id);
      } else {
        // just array move
        closedPile.splice(idxClosed,1);
        openPile.push(id);
      }
    } else {
      // if last.from === 'closed' (not used here) handle accordingly
    }
    saveState();
    renderAll();
  }
});

resetBtn.addEventListener('click', () => {
  if(!confirm('Reset semua ke awal (52 terbuka)?')) return;
  clearState();
  buildFullDeck();
  openPile = fullDeck.map(c=>c.id);
  closedPile = [];
  historyStack = [];
  saveState();
  renderAll();
});

// animate closed -> open reverse
async function animateClosedToOpen(id){
  const dstEl = document.querySelector(`.card-face[data-id="${id}"]`) || openArea;
  const srcEl = document.getElementById('closedBack');
  const cardObj = getCardObjById(id);
  const clone = createCloneElement(cardObj, false);
  document.body.appendChild(clone);

  const srcRect = srcEl.getBoundingClientRect();
  const dstRect = dstEl.getBoundingClientRect();
  clone.style.left = `${srcRect.left}px`;
  clone.style.top  = `${srcRect.top}px`;
  clone.style.transform = 'rotateY(180deg) scale(1.03)';
  await tick(20);

  clone.style.transition = `left 420ms cubic-bezier(.2,.9,.22,1), top 420ms, transform 420ms`;
  clone.style.left = `${dstRect.left}px`;
  clone.style.top  = `${dstRect.top}px`;
  clone.style.transform = 'rotateY(0deg) translateX(8px) scale(1)';
  await wait(460);
  clone.remove();
}

// clone creator: if fromOpen true create front clone, else create back clone
function createCloneElement(cardObj, fromOpen){
  const el = document.createElement('div');
  el.style.position = 'fixed';
  el.style.width = `${parseInt(getComputedStyle(document.documentElement).getPropertyValue('--card-w'))}px` || '50px';
  el.style.height = `${parseInt(getComputedStyle(document.documentElement).getPropertyValue('--card-h'))}px` || '75px';
  el.style.borderRadius = '10px';
  el.style.overflow = 'hidden';
  el.style.zIndex = 9999;
  el.style.boxShadow = '0 28px 80px rgba(0,0,0,0.6)';
  if(fromOpen){
    el.innerHTML = `<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:700;background:linear-gradient(180deg,#fff,#f7f8fa);">
                      <div style="font-size:13px">${cardObj.rank}</div><div style="font-size:12px;margin-top:4px">${cardObj.sym}</div>
                    </div>`;
  } else {
    el.innerHTML = `<div style="width:100%;height:100%;display:grid;place-items:center;background:linear-gradient(180deg,#f5f6f8,#eef1f4);">
                      <div style="width:36px;height:26px;border-radius:6px;background:linear-gradient(180deg,#ff6f61,#d94444);color:#fff;display:grid;place-items:center;font-weight:700">${cardObj.sym}</div>
                    </div>`;
  }
  el.style.left = '0px'; el.style.top = '0px';
  return el;
}

// utilities
function wait(ms){ return new Promise(r=>setTimeout(r, ms)); }
function tick(ms){ return new Promise(r=>setTimeout(r, ms)); }

// toggle search panel
searchBtn.addEventListener('click', ()=>{
  searchPanel.classList.toggle('show');
  if(searchPanel.classList.contains('show')) buildSearchPanel();
});
document.addEventListener('click', (e)=>{
  if(!document.querySelector('.search-row').contains(e.target)) searchPanel.classList.remove('show');
});

// show result when pick from panel
function showResultFromPanel(id){
  const obj = getCardObjById(id);
  if(!obj) return;
  showResult(id);
}

// initial render done in initAll()
