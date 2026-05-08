let balance = 100;
let goal = 300;
let timeLeft = 120;
let currentRound = 1;
let gameStarted = false;
let runEnded = false;
let goalPopupOpen = false;
let leaderboard = [];
let highestBalance = 100;
let balanceHistory = [100];
let coinFlipUses = 0;
let coinFlipOpen = false;
const maxCoinFlips = 3;

const $ = (id) => document.getElementById(id);
const titleScreen = $("title-screen");
const gameWrapper = $("game-wrapper");
const playBtn = $("play-btn");
const balanceText = $("balance");
const goalText = $("goal");
const timerText = $("timer");
const dangerFlash = $("danger-flash");
const toastMessage = $("toast-message");
let moneyPopupLayer = $("money-popup-layer");
if (!moneyPopupLayer) {
  moneyPopupLayer = document.createElement("div");
  moneyPopupLayer.id = "money-popup-layer";
  moneyPopupLayer.className = "money-popup-layer hidden";
  document.body.appendChild(moneyPopupLayer);
}
let toastTimeout = null;

function showToast(message) {
  toastMessage.textContent = message;
  toastMessage.classList.remove("hidden");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toastMessage.classList.add("hidden"), 2200);
}

let audioContext = null;
function getAudioContext() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  return audioContext;
}
function playTone(frequency, duration, type = "sine", volume = 0.08) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
}
const playButtonClickSound = () => playTone(560, 0.04, "square", 0.05);
const playCashSound = () => { playTone(720,.08); setTimeout(()=>playTone(980,.09),80); setTimeout(()=>playTone(1240,.12),170); };
const playLoseSound = () => { playTone(240,.12,"sawtooth",.07); setTimeout(()=>playTone(150,.18,"sawtooth",.06),110); };
const playPegHitSound = () => playTone(650 + Math.random() * 350, 0.045, "triangle", 0.06);
const playGameOverSound = () => { playTone(220,.14,"sawtooth",.09); setTimeout(()=>playTone(90,.35,"sawtooth",.08),250); };

document.addEventListener("pointerdown", (e) => { if (e.target.tagName === "BUTTON") playButtonClickSound(); });

function recordBalancePoint() {
  highestBalance = Math.max(highestBalance, balance);
  balanceHistory.push(Math.max(0, balance));
}
function animateBalanceChange(type) {
  balanceText.classList.remove("balance-gain", "balance-loss");
  void balanceText.offsetWidth;
  balanceText.classList.add(type === "gain" ? "balance-gain" : "balance-loss");
  setTimeout(() => balanceText.classList.remove("balance-gain", "balance-loss"), 750);
}
function showMoneyGainPopup(amount, lines = []) {
  if (amount <= 0) return;
  moneyPopupLayer.classList.remove("hidden");
  moneyPopupLayer.innerHTML = "";
  const card = document.createElement("div");
  card.className = "money-popup-card";
  card.innerHTML = `<div class="money-popup-main">+$${amount.toFixed(2)}</div>`;
  if (lines.length) {
    const wrap = document.createElement("div");
    wrap.className = "money-popup-lines";
    lines.forEach((line) => {
      const el = document.createElement("div");
      el.className = `money-popup-line ${line.type === "base" ? "base-win" : "item-bonus"}`;
      el.textContent = line.text;
      wrap.appendChild(el);
    });
    card.appendChild(wrap);
  }
  moneyPopupLayer.appendChild(card);
  const bal = balanceText.getBoundingClientRect();
  const cardBox = card.getBoundingClientRect();
  const moveX = bal.left + bal.width / 2 - (cardBox.left + cardBox.width / 2);
  const moveY = bal.top + bal.height / 2 - (cardBox.top + cardBox.height / 2);
  card.animate([
    { transform: "scale(1.45)", opacity: 0 },
    { transform: "scale(1.08)", opacity: 1, offset: 0.18 },
    { transform: "scale(1)", opacity: 1, offset: 0.55 },
    { transform: `translate(${moveX}px, ${moveY}px) scale(0.12)`, opacity: 0 }
  ], { duration: 1350, easing: "cubic-bezier(0.16, 0.9, 0.22, 1)", fill: "forwards" });
  setTimeout(() => {
    moneyPopupLayer.classList.add("hidden");
    moneyPopupLayer.innerHTML = "";
    animateBalanceChange("gain");
  }, 1380);
}
function changeBalance(amount, lines = []) {
  balance += amount;
  if (balance < 0) balance = 0;
  recordBalancePoint();
  if (amount > 0) { showMoneyGainPopup(amount, lines); playCashSound(); }
  if (amount < 0) { animateBalanceChange("loss"); playLoseSound(); }
  updateUI();
}
function updateUI() {
  balanceText.textContent = `Balance: $${balance.toFixed(2)}`;
  goalText.textContent = `Goal: $${goal}`;
  timerText.textContent = `Time: ${timeLeft}`;
  updateBetSliders();
  dangerFlash.classList.toggle("hidden", !(balance <= 10 && balance > 0 && gameStarted && !runEnded && !coinFlipOpen));
}
function shakeWinBoard() {
  const active = document.querySelector(".active-screen");
  if (!active) return;
  const target = active.querySelector("#board,#wheel-container,.crash-card,#blackjack-board,#frog-board,#horse-board,.shop-card") || active;
  target.classList.remove("win-shake");
  void target.offsetWidth;
  target.classList.add("win-shake");
  setTimeout(() => target.classList.remove("win-shake"), 500);
}

const sliders = [
  ["plinko"], ["roulette"], ["crash"], ["blackjack"], ["frog"], ["horse"]
].map(([name]) => ({
  slider: $(`${name}-bet-slider`), display: $(`${name}-bet-display`), maxDisplay: $(`${name}-max-display`)
}));
function updateBetSliders() {
  const max = Math.max(1, Math.floor(balance));
  sliders.forEach(({slider, display, maxDisplay}) => {
    slider.max = max;
    if (+slider.value > max) slider.value = max;
    display.textContent = `$${(+slider.value).toFixed(0)}`;
    maxDisplay.textContent = `Max: $${max}`;
  });
}
function resetBetSliderToOne(slider) { slider.value = 1; updateBetSliders(); }
sliders.forEach((item) => item.slider.addEventListener("input", () => updateBetSliders()));

const navButtons = document.querySelectorAll(".nav-btn");
const screens = document.querySelectorAll(".screen");
navButtons.forEach((button) => button.addEventListener("click", () => {
  navButtons.forEach((b) => b.classList.remove("active"));
  screens.forEach((s) => s.classList.remove("active-screen"));
  button.classList.add("active");
  $(button.dataset.screen).classList.add("active-screen");
  if (button.dataset.screen === "plinko-screen") requestAnimationFrame(createPegs);
}));

/* SHOP */
const shopItemsContainer = $("shop-items");
const inventoryIcons = $("inventory-icons");
const activeItemTimers = $("active-item-timers");
const itemPopup = $("item-popup");
let selectedInventoryItemId = null;
let inventory = [];
let currentShopSlots = [];
let activeRouletteMagnet = false, activeFrogSneakers = 0, activeGoldenHorseshoe = 0, activeWeightedBall = 0;
let cashbackActiveUntil = 0, activeJesterHatUntil = 0, roseKatPlinkoBoosts = 0, activeFreeRouletteMaxSpin = 0;
const horseNames = ["Dingo", "Vas", "HisterBlue", "The Horse"];
const shopItemData = [
  {id:"doubleHeadedCoin",icon:"🪙",name:"Double-Headed Coin",type:"Trigger",price:75,description:"Guarantees your next emergency coin flip will be a win."},
  {id:"luckyHulaGirl",icon:"🌺",name:"Lucky Hula Girl",type:"Passive",price:100,description:"Adds +10% extra profit to every winning bet. This stacks."},
  {id:"timeBottle",icon:"⏳",name:"Time in a Bottle",type:"Consumable",price:45,description:"Use it to add 30 seconds to the timer."},
  {id:"rouletteMagnet",icon:"🧲",name:"Roulette Magnet",type:"Consumable",price:60,description:"Use it before Roulette to improve your next spin odds."},
  {id:"frogSneakers",icon:"🛟",name:"Pool Floaties",type:"Consumable",price:55,description:"Use it to lower danger for Elephant River. This stacks."},
  {id:"insuranceTicket",icon:"🎟️",name:"Insurance Ticket",type:"Trigger",price:70,description:"Refunds 50% of a fully lost bet. Up to 2 can trigger at once."},
  {id:"secondWindSoda",icon:"🥤",name:"Second Wind Soda",type:"Trigger",price:85,description:"If your balance hits $0, restores you to $25 once."},
  {id:"goalCutter",icon:"🎯",name:"Goal Cutter",type:"Consumable",price:90,description:"Use it to lower your current money goal by 10%."},
  {id:"dealerPeek",icon:"👀",name:"Dealer’s Peek Card",type:"Consumable",price:40,description:"Use it during Blackjack to reveal the dealer’s hidden card."},
  {id:"goldenHorseshoe",icon:"🐎",name:"Golden Horseshoe",type:"Consumable",price:50,description:"Use it before Horse Race. Each one adds +0.5x payout."},
  {id:"weightedBall",icon:"⚪",name:"Weighted Ball",type:"Consumable",price:55,description:"Use it before Plinko to improve your next ball result. This stacks."},
  {id:"cashbackCoupon",icon:"💸",name:"Cashback Coupon",type:"Timed",price:80,description:"5% cashback on full losses for 60 seconds. Extra coupons add time."},
  {id:"thottiesJesterHat",icon:"🎭",name:"Thottie’s Jester Hat",type:"Timed",price:95,description:"Blocks the dealer from getting 21 for 60 seconds. Extra hats add time."},
  {id:"roseKatMagnumOpus",icon:"🖼️",name:"RoseKat’s Magnum Opus",type:"Consumable",price:110,description:"Next 2 winning Plinko drops add 4x the profit as bonus money."},
  {id:"ejmRecordVinyl",icon:"💿",name:"EJM’s Record Vinyl",type:"Consumable",price:125,description:"One free Roulette spin at max bet. Extra vinyls add free spins."}
];
function getItemData(id) { return shopItemData.find((i) => i.id === id); }
function countItem(id) { return inventory.filter((x) => x === id).length; }
function hasItem(id) { return inventory.includes(id); }
function getRoundPrice(base) { return Math.ceil((base * (1 + (currentRound - 1) * 0.18)) / 5) * 5; }
function addItemToInventory(id) { inventory.push(id); renderInventory(); }
function removeItemFromInventory(id) { const i = inventory.indexOf(id); if (i >= 0) inventory.splice(i, 1); renderInventory(); }
function generateShopRotation() {
  const eggIds = ["thottiesJesterHat", "roseKatMagnumOpus", "ejmRecordVinyl"];
  const eggs = shopItemData.filter((i) => eggIds.includes(i.id));
  const normal = shopItemData.filter((i) => !eggIds.includes(i.id)).sort(() => Math.random() - 0.5);
  currentShopSlots = [eggs[Math.floor(Math.random()*eggs.length)], ...normal.slice(0,3)].sort(() => Math.random()-0.5).map((item) => ({itemId:item.id,sold:false}));
}
function renderShop() {
  shopItemsContainer.innerHTML = "";
  currentShopSlots.forEach((slot, idx) => {
    const item = getItemData(slot.itemId), price = getRoundPrice(item.price);
    const card = document.createElement("div");
    card.className = `shop-item ${slot.sold ? "sold" : ""}`;
    card.innerHTML = `<div class="shop-item-top"><div class="shop-item-icon">${item.icon}</div><div><h3>${item.name}</h3><p class="shop-item-type">${item.type} • $${price}</p></div></div><p class="shop-item-desc">${item.description}</p><button class="shop-buy-btn" ${slot.sold ? "disabled" : ""}>${slot.sold ? "SOLD OUT" : `BUY FOR $${price}`}</button>`;
    card.querySelector("button").addEventListener("click", () => buyShopItem(idx));
    shopItemsContainer.appendChild(card);
  });
}
function buyShopItem(idx) {
  const slot = currentShopSlots[idx]; if (!slot || slot.sold) return;
  const item = getItemData(slot.itemId); const price = getRoundPrice(item.price);
  if (balance < price) return showToast("Not enough money.");
  changeBalance(-price); slot.sold = true; addItemToInventory(item.id); renderShop(); checkGameState();
}
function renderInventory() {
  inventoryIcons.innerHTML = "";
  [...new Set(inventory)].forEach((id) => {
    const item = getItemData(id), count = countItem(id);
    const wrap = document.createElement("div");
    wrap.innerHTML = `<button class="inventory-item-icon" title="${item.name}">${item.icon}</button>${count > 1 ? `<span class="inventory-count">${count}</span>` : ""}`;
    wrap.querySelector("button").addEventListener("click", () => openItemPopup(id));
    inventoryIcons.appendChild(wrap);
  });
}
function openItemPopup(id) {
  const item = getItemData(id); selectedInventoryItemId = id;
  $("item-popup-icon").textContent = item.icon; $("item-popup-name").textContent = item.name;
  $("item-popup-type").textContent = `Type: ${item.type}`; $("item-popup-description").textContent = item.description;
  $("use-item-btn").classList.toggle("hidden", !["timeBottle","rouletteMagnet","frogSneakers","goalCutter","dealerPeek","goldenHorseshoe","weightedBall","cashbackCoupon","thottiesJesterHat","roseKatMagnumOpus","ejmRecordVinyl"].includes(id));
  itemPopup.classList.remove("hidden");
}
function closeItemPopup(){ selectedInventoryItemId = null; itemPopup.classList.add("hidden"); }
$("close-item-popup-btn").addEventListener("click", closeItemPopup);
$("use-item-btn").addEventListener("click", () => selectedInventoryItemId && useInventoryItem(selectedInventoryItemId));
function useInventoryItem(id) {
  if (!hasItem(id)) return;
  if (id === "timeBottle") { timeLeft += 30; removeItemFromInventory(id); showToast("+30 seconds!"); }
  if (id === "rouletteMagnet") { activeRouletteMagnet = true; removeItemFromInventory(id); showToast("Roulette Magnet ready."); }
  if (id === "frogSneakers") { activeFrogSneakers++; removeItemFromInventory(id); showToast(`Pool Floaties stacked: ${activeFrogSneakers}`); }
  if (id === "goalCutter") { goal = Math.max(50, Math.ceil(goal * .9)); removeItemFromInventory(id); showToast("Goal lowered by 10%."); }
  if (id === "dealerPeek") { if (!blackjackRoundActive || !blackjackDealerHidden) return showToast("Use this during Blackjack while dealer has hidden card."); blackjackDealerHidden = false; renderBlackjackHands(); removeItemFromInventory(id); }
  if (id === "goldenHorseshoe") { activeGoldenHorseshoe++; removeItemFromInventory(id); showToast(`Horseshoes stacked: ${activeGoldenHorseshoe}`); }
  if (id === "weightedBall") { activeWeightedBall++; removeItemFromInventory(id); showToast(`Weighted Balls stacked: ${activeWeightedBall}`); }
  if (id === "cashbackCoupon") { cashbackActiveUntil = Math.max(Date.now(), cashbackActiveUntil) + 60000; removeItemFromInventory(id); showToast("Cashback +60 seconds."); }
  if (id === "thottiesJesterHat") { activeJesterHatUntil = Math.max(Date.now(), activeJesterHatUntil) + 60000; removeItemFromInventory(id); showToast("Jester Hat +60 seconds."); }
  if (id === "roseKatMagnumOpus") { roseKatPlinkoBoosts += 2; removeItemFromInventory(id); showToast(`RoseKat boosts: ${roseKatPlinkoBoosts}`); }
  if (id === "ejmRecordVinyl") { activeFreeRouletteMaxSpin++; removeItemFromInventory(id); showToast(`Free max spins: ${activeFreeRouletteMaxSpin}`); }
  closeItemPopup(); updateUI();
}
function renderActiveItemTimers(){
  activeItemTimers.innerHTML = "";
  const add = (icon, until) => { const s = Math.max(0, Math.ceil((until-Date.now())/1000)); if(s>0){ const d=document.createElement("div"); d.className="active-item-timer"; d.textContent=`${icon} ${s}s`; activeItemTimers.appendChild(d);} };
  add("🎭", activeJesterHatUntil); add("💸", cashbackActiveUntil);
}
setInterval(renderActiveItemTimers, 250);
function applyWinBonus(payout, bet, lines=[]) {
  const n = countItem("luckyHulaGirl");
  if (n <= 0) return {payout, lines};
  const bonus = Math.max(0, payout - bet) * 0.1 * n;
  if (bonus > 0) lines.push({type:"bonus", text:`+$${bonus.toFixed(2)} Lucky Hula Girl Bonus`});
  return {payout: payout + bonus, lines};
}
function processFullLoss(bet){
  let refund=0, parts=[];
  const tickets=Math.min(countItem("insuranceTicket"),2);
  if(tickets){ refund += bet*.5*tickets; for(let i=0;i<tickets;i++) removeItemFromInventory("insuranceTicket"); parts.push(`${tickets} Insurance Ticket${tickets>1?"s":""} refunded $${(bet*.5*tickets).toFixed(2)}.`); }
  if(Date.now()<cashbackActiveUntil){ refund += bet*.05; parts.push(`Cashback returned $${(bet*.05).toFixed(2)}.`); }
  if(refund>0) changeBalance(refund, [{type:"bonus", text:`+$${refund.toFixed(2)} Refund Bonus`}]); else updateUI();
  return parts.join(" ");
}
function tryUseSecondWindSoda(){ if(balance<=0 && hasItem("secondWindSoda")){ removeItemFromInventory("secondWindSoda"); balance=25; recordBalancePoint(); showMoneyGainPopup(25,[{type:"bonus",text:"+$25.00 Second Wind Soda"}]); updateUI(); return true;} return false; }

/* PLINKO */
const board=$("board"), pegsContainer=document.querySelector(".pegs"), plinkoBtn=$("plinko-btn");
let pegs=[], activePlinkoBalls=0; const plinkoMultipliers=[0,.5,1,2,5];
function createPegs(){ if(!board||board.clientWidth<100)return; pegsContainer.innerHTML=""; pegs=[]; const rows=8,cols=6,w=board.clientWidth,left=45,right=45,top=70,sx=(w-left-right)/(cols-1),sy=40; for(let r=0;r<rows;r++){ const off=r%2?sx/2:0; for(let c=0;c<cols;c++){ const x=left+c*sx+off,y=top+r*sy; if(x>w-right+8)continue; const el=document.createElement("div"); el.className="peg"; el.style.left=`${x}px`; el.style.top=`${y}px`; pegsContainer.appendChild(el); pegs.push({x,y,radius:6.5,element:el}); } } }
window.addEventListener("resize", createPegs);
plinkoBtn.addEventListener("click",()=>{ if(!canPlay())return; createPegs(); const bet=+$("plinko-bet-slider").value; if(bet>balance)return showToast("Not enough money."); changeBalance(-bet); activePlinkoBalls++; dropPlinkoBall(bet); });
function dropPlinkoBall(bet){ const ball=document.createElement("div"); ball.className="ball"; board.appendChild(ball); const br=9; let x=board.clientWidth/2+(Math.random()-.5)*10,y=26,vx=(Math.random()-.5)*1.8,vy=0; const floor=board.clientHeight-42-br; function step(){ vy+=.22; x+=vx; y+=vy; if(x-br<0){x=br;vx=Math.abs(vx)*.8} if(x+br>board.clientWidth){x=board.clientWidth-br;vx=-Math.abs(vx)*.8} pegs.forEach(p=>{ const dx=x-p.x,dy=y-p.y,d=Math.sqrt(dx*dx+dy*dy),min=br+p.radius; if(d<min&&d>.001){ const nx=dx/d,ny=dy/d,over=min-d; x+=nx*over; y+=ny*over; const dot=vx*nx+vy*ny; if(dot<0){vx-=(1+.72)*dot*nx; vy-=(1+.72)*dot*ny;} vx+=nx*.45+(Math.random()-.5)*.45; vy+=ny*.25; playPegHitSound(); p.element.classList.add("hit"); setTimeout(()=>p.element.classList.remove("hit"),90); } }); vx*=.995; ball.style.left=`${x-br}px`; ball.style.top=`${y-br}px`; if(y>=floor) return finishPlinkoBall(ball,x,bet); requestAnimationFrame(step);} requestAnimationFrame(step); }
function finishPlinkoBall(ball,x,bet){ let idx=Math.floor(x/(board.clientWidth/plinkoMultipliers.length)); idx=Math.max(0,Math.min(idx,plinkoMultipliers.length-1)); if(activeWeightedBall>0){ idx=Math.min(idx+activeWeightedBall+Math.floor(Math.random()*2),plinkoMultipliers.length-1); activeWeightedBall=0; } const mult=plinkoMultipliers[idx]; let normal=bet*mult, winnings=normal; const lines=[]; if(normal>0) lines.push({type:"base",text:`+$${normal.toFixed(2)} Plinko ${mult}x Payout`}); const profit=Math.max(0,normal-bet); if(profit>0 && roseKatPlinkoBoosts>0){ const bonus=profit*4; winnings+=bonus; roseKatPlinkoBoosts--; lines.push({type:"bonus",text:`+$${bonus.toFixed(2)} RoseKat’s Magnum Opus Bonus`}); } if(winnings>bet){ const res=applyWinBonus(winnings,bet,lines); winnings=res.payout; } if(winnings>0) changeBalance(winnings,lines); else { const t=processFullLoss(bet); resetBetSliderToOne($("plinko-bet-slider")); if(t)showToast(t); } if(winnings>bet) shakeWinBoard(); ball.remove(); activePlinkoBalls--; if(activePlinkoBalls===0)checkGameState(); }

/* ROULETTE */
const rouletteCanvas=$("roulette-canvas"), rouletteCtx=rouletteCanvas.getContext("2d"); let selectedRouletteBet=null, rouletteSpinning=false, rouletteSpinCount=0; const redNumbers=new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
function getRouletteColor(n){return n===0?"green":redNumbers.has(n)?"red":"black"} function drawRouletteWheel(){ const c=150,r=146,step=Math.PI*2/37; rouletteCtx.clearRect(0,0,300,300); for(let n=0;n<37;n++){ const col=getRouletteColor(n),a=-Math.PI/2-step/2+n*step; rouletteCtx.beginPath(); rouletteCtx.moveTo(c,c); rouletteCtx.arc(c,c,r,a,a+step); rouletteCtx.closePath(); rouletteCtx.fillStyle=col==="green"?"#06d6a0":col==="red"?"#ef476f":"#073b4c"; rouletteCtx.fill(); rouletteCtx.strokeStyle="#ffd166"; rouletteCtx.stroke(); const tx=c+Math.cos(a+step/2)*108,ty=c+Math.sin(a+step/2)*108; rouletteCtx.save(); rouletteCtx.translate(tx,ty); rouletteCtx.rotate(a+step/2+Math.PI/2); rouletteCtx.fillStyle="white"; rouletteCtx.font="bold 10px Arial"; rouletteCtx.textAlign="center"; rouletteCtx.fillText(n,0,0); rouletteCtx.restore(); } rouletteCtx.beginPath(); rouletteCtx.arc(c,c,38,0,Math.PI*2); rouletteCtx.fillStyle="#073b4c"; rouletteCtx.fill(); rouletteCtx.strokeStyle="#ffd166"; rouletteCtx.lineWidth=3; rouletteCtx.stroke(); }
drawRouletteWheel();
["red","black","green"].forEach(color=>$("bet-"+color).addEventListener("click",()=>{selectedRouletteBet=color; ["red","black","green"].forEach(c=>$("bet-"+c).classList.remove("selected")); $("bet-"+color).classList.add("selected");}));
$("spin-btn").addEventListener("click",()=>{ if(!canPlay()||rouletteSpinning)return; if(!selectedRouletteBet)return showToast("Pick Red, Black, or Green first."); let bet=+$("roulette-bet-slider").value, free=false; if(activeFreeRouletteMaxSpin>0){bet=Math.max(1,Math.floor(balance));free=true;activeFreeRouletteMaxSpin--;} if(!free&&bet>balance)return showToast("Not enough money."); if(!free)changeBalance(-bet); else showToast(`EJM free max spin: $${bet}`); rouletteSpinning=true; let result=(activeRouletteMagnet&&Math.random()<.55)?randomForColor(selectedRouletteBet):Math.floor(Math.random()*37); activeRouletteMagnet=false; rouletteSpinCount++; rouletteCanvas.style.transform=`rotate(${rouletteSpinCount*360*6+(360-result*(360/37))}deg)`; setTimeout(()=>{rouletteSpinning=false; finishRouletteSpin(result,bet,free);},4100); });
function randomForColor(color){ const arr=[]; for(let i=0;i<=36;i++) if(getRouletteColor(i)===color) arr.push(i); return arr[Math.floor(Math.random()*arr.length)]; }
function finishRouletteSpin(num,bet,free){ const color=getRouletteColor(num); let winnings=0,lines=[]; if(selectedRouletteBet===color){ winnings=bet*(color==="green"?14:2); lines.push({type:"base",text:`+$${winnings.toFixed(2)} Roulette Payout`}); winnings=applyWinBonus(winnings,bet,lines).payout; } if(winnings>0){ changeBalance(winnings,lines); shakeWinBoard(); } else if(!free){ const t=processFullLoss(bet); resetBetSliderToOne($("roulette-bet-slider")); if(t)showToast(t); } $("roulette-result").textContent=`Result: ${num} (${color})${free&&winnings<=0?" — free spin lost, paid $0":""}`; checkGameState(); }

/* CRASH */
const crashCanvas=$("crash-canvas"), crashCtx=crashCanvas.getContext("2d"); let crashRunning=false,crashBet=0,crashMultiplier=1,crashPoint=0,crashStart=0,crashFrame=null;
function drawCrashGraph(mult=1,crashed=false){ const w=360,h=220; crashCtx.clearRect(0,0,w,h); crashCtx.fillStyle="#021920"; crashCtx.fillRect(0,0,w,h); const p=Math.min((mult-1)/9,1),ex=20+p*(w-40),ey=h-20-p*(h-50); crashCtx.beginPath(); crashCtx.moveTo(20,h-20); crashCtx.quadraticCurveTo(ex*.55,h-20,ex,ey); crashCtx.strokeStyle=crashed?"#ef476f":"#06d6a0"; crashCtx.lineWidth=5; crashCtx.stroke(); crashCtx.beginPath(); crashCtx.arc(ex,ey,Math.min(5+mult*.35,10),0,Math.PI*2); crashCtx.fillStyle="white"; crashCtx.shadowBlur=Math.min(10+mult*4,42); crashCtx.shadowColor="white"; crashCtx.fill(); crashCtx.shadowBlur=0; }
function updateCrashGlow(mult,crashed=false){ $("crash-multiplier").style.color=crashed?"#ef476f":"#06d6a0"; }
drawCrashGraph();
$("start-crash-btn").addEventListener("click",()=>{ if(!canPlay()||crashRunning)return; const bet=+$("crash-bet-slider").value; if(bet>balance)return showToast("Not enough money."); changeBalance(-bet); crashBet=bet; crashMultiplier=1; crashPoint=Math.random()<.5?1+Math.random()*1.5:Math.random()<.85?2.5+Math.random()*3:5.5+Math.random()*8; crashRunning=true; crashStart=performance.now(); $("cashout-btn").disabled=false; $("start-crash-btn").disabled=true; runCrash(); });
function runCrash(){ const e=(performance.now()-crashStart)/1000; crashMultiplier=1+e*e*.55; $("crash-multiplier").textContent=`${crashMultiplier.toFixed(2)}x`; drawCrashGraph(crashMultiplier); if(crashMultiplier>=crashPoint)return crashGameOver(); crashFrame=requestAnimationFrame(runCrash); }
$("cashout-btn").addEventListener("click",()=>{ if(!crashRunning)return; crashRunning=false; cancelAnimationFrame(crashFrame); let winnings=crashBet*crashMultiplier; const lines=[{type:"base",text:`+$${winnings.toFixed(2)} Crash Cash Out`}]; winnings=applyWinBonus(winnings,crashBet,lines).payout; changeBalance(winnings,lines); $("crash-status").textContent=`Cashed out at ${crashMultiplier.toFixed(2)}x. Won $${winnings.toFixed(2)}.`; $("cashout-btn").disabled=true; $("start-crash-btn").disabled=false; shakeWinBoard(); checkGameState(); });
function crashGameOver(){ crashRunning=false; cancelAnimationFrame(crashFrame); $("crash-multiplier").textContent="CRASHED"; updateCrashGlow(crashPoint,true); drawCrashGraph(crashPoint,true); const t=processFullLoss(crashBet); resetBetSliderToOne($("crash-bet-slider")); $("crash-status").textContent=`Crashed at ${crashPoint.toFixed(2)}x. ${t}`; $("cashout-btn").disabled=true; $("start-crash-btn").disabled=false; checkGameState(); }

/* BLACKJACK */
let blackjackDeck=[],blackjackPlayerHand=[],blackjackDealerHand=[],blackjackBet=0,blackjackRoundActive=false,blackjackDealerHidden=true,blackjackBusy=false;
function createBlackjackDeck(){ const suits=["♠","♥","♦","♣"],ranks=["A","2","3","4","5","6","7","8","9","10","J","Q","K"],d=[]; suits.forEach(s=>ranks.forEach(r=>d.push({rank:r,suit:s}))); return d.sort(()=>Math.random()-.5); }
function cardValue(c){return c.rank==="A"?11:["J","Q","K"].includes(c.rank)?10:+c.rank} function handValue(h){let t=0,a=0; h.forEach(c=>{t+=cardValue(c); if(c.rank==="A")a++;}); while(t>21&&a){t-=10;a--;} return t;} function drawCard(){ if(blackjackDeck.length<10)blackjackDeck=createBlackjackDeck(); return blackjackDeck.pop(); }
function cardEl(c,hidden=false){ const el=document.createElement("div"); el.className=`playing-card ${hidden?"hidden-card":""} ${c&&!hidden&&["♥","♦"].includes(c.suit)?"red-card":""}`; el.innerHTML=hidden?"?":`<div class="card-rank">${c.rank}</div><div class="card-suit">${c.suit}</div>`; return el; }
function renderBlackjackHands(){ $("dealer-hand").innerHTML=""; $("player-hand").innerHTML=""; blackjackDealerHand.forEach((c,i)=>$("dealer-hand").appendChild(cardEl(c,blackjackDealerHidden&&i===1))); blackjackPlayerHand.forEach(c=>$("player-hand").appendChild(cardEl(c))); $("player-total").textContent=`Total: ${handValue(blackjackPlayerHand)}`; $("dealer-total").textContent=blackjackDealerHidden?"Total: ?":`Total: ${getDealerTotal()}`; }
function getDealerTotal(){ const total=handValue(blackjackDealerHand); return Date.now()<activeJesterHatUntil&&total===21?20:total; }
function updateBlackjackButtonState(){ const off=!gameStarted||runEnded||goalPopupOpen||coinFlipOpen; $("blackjack-deal-btn").disabled=off||blackjackRoundActive||blackjackBusy; $("blackjack-hit-btn").disabled=off||!blackjackRoundActive||blackjackBusy; $("blackjack-stand-btn").disabled=off||!blackjackRoundActive||blackjackBusy; }
function resetBlackjack(){ blackjackDeck=createBlackjackDeck(); blackjackPlayerHand=[]; blackjackDealerHand=[]; blackjackRoundActive=false; blackjackDealerHidden=true; blackjackBusy=false; renderBlackjackHands(); $("blackjack-message").textContent="Press DEAL to start."; updateBlackjackButtonState(); }
$("blackjack-deal-btn").addEventListener("click",()=>{ if(!canPlay()||blackjackRoundActive)return; const bet=+$("blackjack-bet-slider").value; if(bet>balance)return showToast("Not enough money."); blackjackBet=bet; changeBalance(-bet); blackjackRoundActive=true; blackjackDealerHidden=true; blackjackPlayerHand=[drawCard(),drawCard()]; blackjackDealerHand=[drawCard(),drawCard()]; renderBlackjackHands(); $("blackjack-message").textContent="Hit or Stand?"; updateBlackjackButtonState(); if(handValue(blackjackPlayerHand)===21)finishBlackjack("blackjack"); });
$("blackjack-hit-btn").addEventListener("click",()=>{ blackjackPlayerHand.push(drawCard()); renderBlackjackHands(); if(handValue(blackjackPlayerHand)>21)finishBlackjack("bust"); });
$("blackjack-stand-btn").addEventListener("click",()=>{ blackjackDealerHidden=false; while(getDealerTotal()<17) blackjackDealerHand.push(drawCard()); finishBlackjack("compare"); });
function finishBlackjack(reason){ blackjackRoundActive=false; blackjackDealerHidden=false; let payout=0,msg="",lines=[]; const player=handValue(blackjackPlayerHand),dealer=getDealerTotal(); if(reason==="blackjack"){payout=blackjackBet*2.5; msg="BLACKJACK!";} else if(reason==="bust"){msg=`BUST! You had ${player}.`; } else if(dealer>21||player>dealer){payout=blackjackBet*2; msg=dealer>21?"Dealer busts!":"You win!";} else if(player===dealer){payout=blackjackBet; msg="Push! Your bet is returned.";} else msg=`Dealer wins. ${dealer} beats ${player}.`; if(payout>0){lines.push({type:"base",text:`+$${payout.toFixed(2)} Blackjack Payout`}); if(payout>blackjackBet)payout=applyWinBonus(payout,blackjackBet,lines).payout; changeBalance(payout,lines); if(payout>blackjackBet)shakeWinBoard();} else {const t=processFullLoss(blackjackBet); resetBetSliderToOne($("blackjack-bet-slider")); msg+=` ${t}`;} $("blackjack-message").textContent=msg; renderBlackjackHands(); updateBlackjackButtonState(); checkGameState(); }

/* ELEPHANT */
let frogRoundActive=false,frogBet=0,frogLane=0,frogMultiplier=1; const frogLaneBottoms=[8,78,148,218,288,358];
function updateFrogButtons(){ const off=!gameStarted||runEnded||goalPopupOpen||coinFlipOpen; $("frog-start-btn").disabled=off||frogRoundActive; $("frog-hop-btn").disabled=off||!frogRoundActive; $("frog-cashout-btn").disabled=off||!frogRoundActive||frogLane<=0; }
function resetFrogRoad(){ frogRoundActive=false; frogBet=0; frogLane=0; frogMultiplier=1; $("frog-player").className="frog-player elephant-player"; $("frog-player").style.bottom=`${frogLaneBottoms[0]}px`; $("frog-message").textContent="Press START CROSSING to help the pink elephant cross the river."; $("frog-multiplier").textContent="Multiplier: 1.00x"; updateFrogButtons(); }
$("frog-start-btn").addEventListener("click",()=>{ if(!canPlay())return; const bet=+$("frog-bet-slider").value; if(bet>balance)return showToast("Not enough money."); frogBet=bet; frogLane=0; frogMultiplier=1; frogRoundActive=true; changeBalance(-bet); $("frog-message").textContent="Step forward. Cash out before the elephant gets swept away!"; updateFrogButtons(); });
$("frog-hop-btn").addEventListener("click",()=>{ if(!frogRoundActive)return; frogLane++; frogMultiplier=1+frogLane*.45+frogLane*frogLane*.06; $("frog-player").classList.add("hopping"); $("frog-player").style.bottom=`${frogLaneBottoms[Math.min(frogLane,5)]}px`; $("frog-multiplier").textContent=`Multiplier: ${frogMultiplier.toFixed(2)}x`; setTimeout(()=>{ $("frog-player").classList.remove("hopping"); let chance=Math.min(.12+frogLane*.08,.55); if(activeFrogSneakers>0)chance*=Math.max(.2,1-activeFrogSneakers*.45); if(Math.random()<chance)return loseFrog(); if(frogLane>=5)$("frog-message").textContent="The pink elephant reached the safe shore! Cash out now!"; updateFrogButtons(); },520); });
$("frog-cashout-btn").addEventListener("click",()=>{ if(!frogRoundActive||frogLane<=0)return; frogRoundActive=false; activeFrogSneakers=0; let payout=frogBet*frogMultiplier; const lines=[{type:"base",text:`+$${payout.toFixed(2)} Elephant River Payout`}]; payout=applyWinBonus(payout,frogBet,lines).payout; changeBalance(payout,lines); shakeWinBoard(); $("frog-message").textContent=`Cashed out at ${frogMultiplier.toFixed(2)}x. Won $${payout.toFixed(2)}.`; resetBetLater("frog"); checkGameState(); });
function loseFrog(){ frogRoundActive=false; activeFrogSneakers=0; $("frog-player").classList.add("hit"); const t=processFullLoss(frogBet); resetBetSliderToOne($("frog-bet-slider")); $("frog-message").textContent=`SPLASH! You lost $${frogBet.toFixed(2)}. ${t}`; setTimeout(()=>{resetFrogRoad();checkGameState();},1000); }
function resetBetLater(name){ setTimeout(()=>{ if(name==="frog")resetFrogRoad(); },800); }

/* HORSE */
const horseRunners=[$("horse-0"),$("horse-1"),$("horse-2"),$("horse-3")]; let selectedHorse=0,horseRaceActive=false,horseBet=0,horseWinner=0,horseFrame=null,horseStart=0;
function updateHorseButtons(){ const off=!gameStarted||runEnded||goalPopupOpen||coinFlipOpen; $("horse-start-btn").disabled=off||horseRaceActive; document.querySelectorAll(".horse-choice").forEach(b=>b.disabled=off||horseRaceActive); }
document.querySelectorAll(".horse-choice").forEach(btn=>btn.addEventListener("click",()=>{ if(horseRaceActive)return; selectedHorse=+btn.dataset.horse; document.querySelectorAll(".horse-choice").forEach(b=>b.classList.remove("selected")); btn.classList.add("selected"); $("horse-message").textContent=`${horseNames[selectedHorse]} selected.`; }));
function resetHorseRace(){ horseRaceActive=false; horseRunners.forEach(h=>{h.style.left="88px";h.classList.remove("racing","winner")}); $("horse-message").textContent="Pick a horse and start the race."; updateHorseButtons(); }
$("horse-start-btn").addEventListener("click",()=>{ if(!canPlay()||horseRaceActive)return; const bet=+$("horse-bet-slider").value; if(bet>balance)return showToast("Not enough money."); horseBet=bet; horseWinner=Math.floor(Math.random()*4); horseRaceActive=true; changeBalance(-bet); horseRunners.forEach(h=>{h.style.left="88px";h.classList.add("racing");h.classList.remove("winner")}); horseStart=performance.now(); updateHorseButtons(); horseFrame=requestAnimationFrame(runHorseRace); });
function runHorseRace(ts){ const p=Math.min((ts-horseStart)/4200,1),start=88,finish=$("horse-board").clientWidth-88; horseRunners.forEach((h,i)=>{ let prog=i===horseWinner?Math.min(p*1.08+.03,1):Math.min(p*(.78+i*.025)+Math.sin(p*Math.PI*5+i)*.035,.9); if(p>=1&&i===horseWinner)prog=1; h.style.left=`${start+prog*(finish-start)}px`; }); if(p<1)horseFrame=requestAnimationFrame(runHorseRace); else finishHorseRace(); }
function finishHorseRace(){ horseRaceActive=false; horseRunners.forEach(h=>h.classList.remove("racing")); horseRunners[horseWinner].classList.add("winner"); if(horseWinner===selectedHorse){ let mult=4+activeGoldenHorseshoe*.5; let payout=horseBet*mult; activeGoldenHorseshoe=0; const lines=[{type:"base",text:`+$${payout.toFixed(2)} Horse Race Payout`}]; payout=applyWinBonus(payout,horseBet,lines).payout; changeBalance(payout,lines); shakeWinBoard(); $("horse-message").textContent=`${horseNames[horseWinner]} wins! You won $${payout.toFixed(2)}.`; } else { activeGoldenHorseshoe=0; const t=processFullLoss(horseBet); resetBetSliderToOne($("horse-bet-slider")); $("horse-message").textContent=`${horseNames[horseWinner]} wins! Your horse lost. ${t}`; } updateHorseButtons(); checkGameState(); }

/* POPUPS / STATE */
const goalPopup=$("goal-popup"), namePopup=$("name-popup"), gameOverPopup=$("game-over-popup"), coinFlipPopup=$("coin-flip-popup"), coin=$("coin"); let typewriterInterval=null;
function canPlay(){ return gameStarted && !runEnded && !goalPopupOpen && !coinFlipOpen; }
function typeMessage(text){ $("goal-popup-message").textContent=""; let i=0; clearInterval(typewriterInterval); typewriterInterval=setInterval(()=>{ if(i<text.length)$("goal-popup-message").textContent+=text[i++]; else clearInterval(typewriterInterval); },45); }
function showGoalPopup(){ if(goalPopupOpen||runEnded)return; goalPopupOpen=true; goalPopup.classList.remove("hidden"); typeMessage("AWESOME! You made it! But do you have the guts to keep going?"); }
$("keep-going-btn").addEventListener("click",()=>{ goalPopupOpen=false; goalPopup.classList.add("hidden"); currentRound++; goal=Math.ceil(goal*1.75); timeLeft=120; generateShopRotation(); renderShop(); updateUI(); showToast(`Round ${currentRound}! Timer reset. Shop refreshed!`); });
$("cash-out-run-btn").addEventListener("click",()=>{ goalPopupOpen=false; runEnded=true; goalPopup.classList.add("hidden"); namePopup.classList.remove("hidden"); });
$("submit-score-btn").addEventListener("click",()=>{ const name=$("player-name-input").value.trim()||"Player"; leaderboard.push({name,score:balance}); leaderboard.sort((a,b)=>b.score-a.score); leaderboard=leaderboard.slice(0,10); renderLeaderboard(); namePopup.classList.add("hidden"); });
function renderLeaderboard(){ const list=$("leaderboard-list"); list.innerHTML=""; if(!leaderboard.length){list.innerHTML="<li>No scores yet.</li>";return;} leaderboard.forEach(e=>{const li=document.createElement("li");li.textContent=`${e.name} - $${e.score.toFixed(2)}`;list.appendChild(li);}); }
function showCoinFlipPopup(){ if(coinFlipOpen||runEnded||activePlinkoBalls>0)return; if(coinFlipUses>=maxCoinFlips)return showGameOverScreen(); coinFlipOpen=true; coinFlipPopup.classList.remove("hidden"); coin.className="coin"; $("coin-flips-left").textContent=`Coin flips left: ${maxCoinFlips-coinFlipUses}`; $("coin-flip-message").textContent=`You dropped under $1. Flip the coin. Win and get $${(goal*.2).toFixed(2)}. Lose and the run ends.`; }
$("flip-coin-btn").addEventListener("click",()=>{ if(!coinFlipOpen)return; coinFlipUses++; let win=Math.random()<.5; if(hasItem("doubleHeadedCoin")){win=true;removeItemFromInventory("doubleHeadedCoin");} coin.className="coin flipping"; setTimeout(()=>{ coin.classList.remove("flipping"); if(win){ coin.classList.add("win"); balance=goal*.2; recordBalancePoint(); showMoneyGainPopup(balance,[{type:"bonus",text:`+$${balance.toFixed(2)} Coin Flip Rescue`}]); setTimeout(()=>{coinFlipPopup.classList.add("hidden");coinFlipOpen=false;updateUI();},1300); } else { coin.classList.add("lose"); setTimeout(()=>{coinFlipPopup.classList.add("hidden");coinFlipOpen=false;showGameOverScreen();},1200); } },1450); });
function showGameOverScreen(){ runEnded=true; gameStarted=false; playGameOverSound(); $("final-balance-text").textContent=`Final Balance: $${balance.toFixed(2)}`; $("highest-balance-text").textContent=`Highest Balance: $${highestBalance.toFixed(2)}`; gameOverPopup.classList.remove("hidden"); drawGameOverGraph(); }
function drawGameOverGraph(){ const canvas=$("game-over-graph"),ctx=canvas.getContext("2d"),w=360,h=220; ctx.clearRect(0,0,w,h); ctx.fillStyle="#021920"; ctx.fillRect(0,0,w,h); if(balanceHistory.length<2)return; const max=Math.max(...balanceHistory,100); let pts=balanceHistory.map((v,i)=>({x:20+i/(balanceHistory.length-1)*(w-40),y:h-20-(v/max)*(h-40),v})); for(let i=1;i<pts.length;i++){ctx.beginPath();ctx.moveTo(pts[i-1].x,pts[i-1].y);ctx.lineTo(pts[i].x,pts[i].y);ctx.strokeStyle=pts[i].v>=pts[i-1].v?"#06d6a0":"#ef476f";ctx.lineWidth=4;ctx.stroke();}}
$("try-again-btn").addEventListener("click",resetRunToTitleScreen);
function resetRunToTitleScreen(){ balance=100; goal=300; timeLeft=120; currentRound=1; gameStarted=false; runEnded=false; goalPopupOpen=false; coinFlipOpen=false; highestBalance=100; balanceHistory=[100]; coinFlipUses=0; inventory=[]; currentShopSlots=[]; activeRouletteMagnet=false; activeFrogSneakers=0; activeGoldenHorseshoe=0; activeWeightedBall=0; cashbackActiveUntil=0; activeJesterHatUntil=0; roseKatPlinkoBoosts=0; activeFreeRouletteMaxSpin=0; activePlinkoBalls=0; resetBlackjack(); resetFrogRoad(); resetHorseRace(); [goalPopup,namePopup,gameOverPopup,coinFlipPopup,itemPopup].forEach(p=>p.classList.add("hidden")); gameWrapper.classList.add("hidden"); titleScreen.classList.remove("hidden"); document.querySelectorAll(".ball").forEach(b=>b.remove()); renderInventory(); renderShop(); updateUI(); }
function checkGameState(){ if(runEnded||goalPopupOpen||coinFlipOpen||activePlinkoBalls>0)return; if(timeLeft<=0)return showGameOverScreen(); if(balance>=goal)return showGoalPopup(); if(balance<1){ if(tryUseSecondWindSoda())return; showCoinFlipPopup(); return;} updateUI(); }
setInterval(()=>{ if(!gameStarted||runEnded||goalPopupOpen||coinFlipOpen)return; timeLeft--; if(timeLeft<=0){timeLeft=0; updateUI(); if(activePlinkoBalls===0)showGameOverScreen();} else updateUI(); },1000);

playBtn.addEventListener("click",()=>{ gameStarted=true; runEnded=false; titleScreen.classList.add("hidden"); gameWrapper.classList.remove("hidden"); generateShopRotation(); renderShop(); renderInventory(); updateUI(); updateBlackjackButtonState(); updateFrogButtons(); updateHorseButtons(); requestAnimationFrame(()=>{createPegs(); requestAnimationFrame(createPegs);}); });

resetBlackjack(); resetFrogRoad(); resetHorseRace(); renderLeaderboard(); renderInventory(); generateShopRotation(); renderShop(); renderActiveItemTimers(); updateUI();
