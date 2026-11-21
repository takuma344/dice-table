"use strict";

const byId = id => document.getElementById(id);
const canvas = byId("table");
const ctx = canvas.getContext("2d");
const backdrop = document.createElement("canvas");
const backdropCtx = backdrop.getContext("2d");
const materials = [
  {name:"木製", multiplier:1, high:"#ffe0a8", low:"#c88c51", side:"#9c5d36", edge:"#5d3322", pip:"#452c22"},
  {name:"象牙", multiplier:3, high:"#fffbea", low:"#d4c5a6", side:"#ae9974", edge:"#756442", pip:"#2b3c32"},
  {name:"黄金", multiplier:9, high:"#fff4a1", low:"#e9a838", side:"#b46b1b", edge:"#71461d", pip:"#553016"},
  {name:"ネオンレーザー", multiplier:28, high:"#2c816e", low:"#133e42", side:"#172a3c", edge:"#74ffe2", pip:"#a9ffee"},
];
const caps = {dice:40, material:3, arms:6, speed:7, wave:8};
const VIP_TARGET = 40000;
const MATERIAL_PRICES = [85,650,4200];
const SPECIAL_DICE = {
  blast:{name:"爆裂ダイス",mark:"爆",icon:"wave",color:"#ff9d63",cost:650,detail:"出目5・6で周囲に爆裂波を放つ"},
  aura:{name:"増幅ダイス",mark:"増",icon:"gem",color:"#90eed0",cost:950,detail:"静止中、近くの他のダイスの配当を25%増やす"},
  heat:{name:"熱気ダイス",mark:"熱",icon:"speed",color:"#ffe08a",cost:850,detail:"出目4〜6でフィーバーゲージを6ポイント加算"},
};
const STAR_RANKS = [
  {pay:1,size:1,pulse:0,targets:0,match:0,heat:0,color:"#e5cc96"},
  {pay:3.25,size:1.13,pulse:.125,targets:1,match:.22,heat:4,color:"#ffe28d"},
  {pay:9.5,size:1.26,pulse:.205,targets:2,match:.36,heat:8,color:"#a4ffe4"},
  {pay:28,size:1.40,pulse:.29,targets:4,match:.52,heat:14,color:"#ffd296"},
];
const MAX_STARS = STAR_RANKS.length;
const SPECIAL_LIMIT = MAX_STARS;
const FUSION_IMPACT = .40;
const FUSION_DURATION = .82;
const MASTERY = [
  {track:"masteryNeon",name:"ネオンレーザーの★4を作る",target:4,reward:3},
  {track:"masterySpecial",name:"特殊ダイスの★4を作る",target:4,reward:2},
  {track:"masteryBurst",name:"1回のフィーバーで8回バースト",target:8,reward:4},
];
const ALL_MASTERY = (1<<MASTERY.length)-1;
const skins = [
  {id:"classic",name:"クラシックグリーン",unlock:0,felt:["#367054","#265b44","#133f33"],inlay:"#d9c48a",
    rail:["#9d6848","#72462f","#9d6441","#78432e","#563220"],lip:["#5d3727","#613827","#47271e","#2b1915"]},
  {id:"royal",name:"ロイヤルレッド",unlock:1,felt:["#863a46","#672a37","#421b29"],inlay:"#f2bd76",
    rail:["#a77346","#6b3a2a","#925537","#603123","#41211e"],lip:["#77462b","#683529","#462423","#301819"]},
  {id:"cyber",name:"サイバーネオン",unlock:3,felt:["#205c66","#174453","#102c3e"],inlay:"#76ffe0",
    rail:["#48747e","#223b51","#365f69","#25374a","#152637"],lip:["#294455","#243c50","#192d41","#122133"]},
  {id:"aurora",name:"オーロラブラック",mastery:true,felt:["#254a49","#172b32","#111925"],inlay:"#ffd38e",
    rail:["#816e50","#2f3540","#43505b","#2a3138","#191f28"],lip:["#454052","#283342","#171d2a","#101721"]},
];
const COLLECTION_GROUPS = [
  {name:"材質",entries:materials.map((material,index)=>({id:"material-"+index,icon:"die",
    name:material.name,detail:"材質配当 ×"+material.multiplier}))},
  {name:"特殊ダイス",entries:Object.entries(SPECIAL_DICE).map(([type,special])=>({id:"special-"+type,
    icon:special.icon,name:special.name,detail:special.detail}))},
  {name:"到達した星",entries:STAR_RANKS.map((star,index)=>({id:"star-"+(index+1),icon:"gem",
    name:"★"+(index+1),detail:"星の配当 ×"+star.pay+(star.targets ? " · 着地波 最大"+star.targets+"個" : " · 初期ランク")}))},
  {name:"テーブルスキン",entries:skins.map(skin=>({id:"skin-"+skin.id,icon:"gem",name:skin.name,
    detail:skin.mastery ? "ネオンマスタリー全達成" : skin.unlock ? "VIP転生 "+skin.unlock+"回" : "初期テーブル"}))},
];
const COLLECTION_IDS = new Set(COLLECTION_GROUPS.flatMap(group=>group.entries.map(entry=>entry.id)));
const MILESTONE_GROUPS = [
  {id:"rolls",name:"累計ロール",unit:"回",targets:[25,250,2500],reward:"income",rate:1},
  {id:"best",name:"最大共鳴コンボ",unit:"連鎖",targets:[3,8,20],reward:"resonance",rate:1},
  {id:"feverStarts",name:"フィーバー発動",unit:"回",targets:[1,10,50],reward:"fever",rate:2},
  {id:"merges",name:"累計合成",unit:"回",targets:[1,12,60],reward:"income",rate:1},
  {id:"highestStar",name:"到達した星",unit:"★",targets:[2,3,4],reward:"resonance",rate:1},
  {id:"prestiges",name:"VIP転生",unit:"回",targets:[1,3,8],reward:"income",rate:1},
  {id:"collection",name:"図鑑収集",unit:"種",targets:[5,10,15],reward:"income",rate:1},
];
const MILESTONE_IDS = new Set(MILESTONE_GROUPS.flatMap(group=>group.targets.map((_,index)=>group.id+"-"+index)));
const MILESTONE_REWARDS = {income:"獲得コイン",resonance:"共鳴ボーナス",fever:"フィーバー充填"};
const talents = [
  {id:"bankroll",branch:"スタートダッシュ",icon:"coin",title:"準備金",costs:[1,2,3],
    detail:n=>"次の転生時に初期コイン ＋"+20*n},
  {id:"dice",branch:"スタートダッシュ",icon:"die",title:"予備ダイス",costs:[1,2,4],requires:"bankroll",
    detail:n=>"次の転生時に初期ダイス ＋"+n+" 個"},
  {id:"income",branch:"収益・フィーバー",icon:"coin",title:"配当アップ",costs:[1,2,4,6],
    detail:n=>"通常・放置の獲得コイン ＋"+20*n+"%"},
  {id:"resonance",branch:"収益・フィーバー",icon:"wave",title:"共鳴配当",costs:[1,2,3],requires:"income",
    detail:n=>"共鳴ボーナス ＋"+25*n+"%"},
  {id:"fever",branch:"収益・フィーバー",icon:"speed",title:"熱気の蓄積",costs:[1,2,3],requires:"income",
    detail:n=>"共鳴時のゲージ獲得 ＋"+20*n+"%"},
  {id:"chain",branch:"アーム連鎖",icon:"arm",title:"近接ダイス連鎖",costs:[1,2,3],
    detail:n=>n+" 段まで連鎖し、1作動につき最大 "+2*n+" 個を追加で投擲"},
  {id:"armWave",branch:"アーム連鎖",icon:"wave",title:"アーム衝撃波",costs:[8],requires:"chain",
    detail:()=>"アームの主投擲で衝撃波を1回発生。衝撃波Lv.で範囲が広がる"},
  {id:"materialPermit",branch:"材質",icon:"gem",title:"材質ライセンス",costs:[1],
    detail:()=>"黄金・ネオンへの進化に必須。全ダイスの材質条件も必要"},
  {id:"materialStart",branch:"材質",icon:"die",title:"材質の下地",costs:[2,4],
    detail:n=>"解放・強化した時点から、新しく生成・購入するダイスは"+materials[n].name},
];
const upgrades = [
  {key:"dice", icon:"die", title:"ダイス購入", action:"購入",
    cost:s=>dicePurchasePrice(dicePriceBasis(s)),
    detail:s=>s.dice+" / "+caps.dice+" 個 · 価格基準 "+dicePriceBasis(s)+" 個分"},
  {key:"material", icon:"gem", title:"ダイスの材質", action:"1個進化"},
  {key:"arms", icon:"arm", title:"ロボットアーム", action:"雇用", cost:s=>95*2.48**s.arms,
    detail:s=>s.arms+" / 6 基 · "+(s.talents.armWave ? "主投擲で衝撃波" : s.talents.chain ? "1個を投擲し、近くへ連鎖" : "1作動につきダイス1個")},
  {key:"speed", icon:"speed", title:"アーム速度", action:"強化", cost:s=>125*1.72**s.speed,
    detail:s=>s.arms ? "Lv. "+s.speed+" · "+armInterval().toFixed(1)+" 秒ごとに作動" : "ロボットアームを雇うと解放"},
  {key:"wave", icon:"wave", title:"テーブル衝撃波", action:s=>s.wave ? "強化" : "解放",
    cost:s=>s.wave<2 ? [26,55][s.wave] : 95*1.68**(s.wave-2),
    detail:s=>s.wave ? "Lv. "+s.wave+" · 手動で短辺の "+(waveRange(s.wave)*100).toFixed(1).replace(/\.0$/,"")+"% まで巻き込む" :
      "Lv. 0 · 近くのダイスも一緒に振れる"},
];
const SAVE = "lucky-dice-table.v1";
const RESONANCE_WINDOW = .8;
const FEVER_DURATION = 10;
const SHAKE_COOLDOWN = .85;
const SHAKE_DURATION = .24;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const number = new Intl.NumberFormat("ja-JP");
const compact = new Intl.NumberFormat("ja-JP",{notation:"compact",maximumFractionDigits:1});
const format = value => number.format(Math.floor(value));
const short = value => value < 100000 ? format(value) : compact.format(value);
const clamp = (value, min, max) => Math.min(max,Math.max(min,value));
const random = (min,max) => min + Math.random()*(max-min);
const ease = t => t*t*(3-2*t);
const icon = name => '<svg aria-hidden="true"><use href="#i-'+name+'"/></svg>';
function interval(level) {return Math.max(1.1,4.5*.81**level);}
function chainRange(rank,speed) {return .13+.025*rank+.01*speed;}
function waveRange(level) {return .10+.025*(level-1);}
function armWaveRange(level) {return .17+.015*Math.max(0,level-1);}
function feverMultiplier() {return state.feverLeft>0 ? 2 : 1;}
function armInterval() {return interval(state.speed)/feverMultiplier();}
function dicePriceBasis(progress) {
  // Each merge preserves the number of original dice represented by its two inputs.
  return progress.dieStars.reduce((count,stars)=>count+2**(stars-1),0);
}
function dicePurchasePrice(basis) {
  if (basis<5) return [14,22,34,48][basis-1];
  const early = Math.min(basis,36);
  const middle = clamp(basis-36,0,20);
  const late = Math.max(0,basis-56);
  return 65*1.19**(early-5)*1.15**Math.max(0,early-12)*1.14**middle*(1+late/18)**2.35;
}
function rollValue(face,rank = 0,stars = 1) {
  return Math.round(face*materials[rank].multiplier*STAR_RANKS[stars-1].pay*(1+.2*state.talents.income));
}
function starStats(die) {return STAR_RANKS[state.dieStars[die.slot]-1];}
function normalizeStars(stars) {
  return Number.isFinite(stars) ? clamp(Math.floor(stars),1,MAX_STARS) : 1;
}
function specialStats(type,stars) {
  const level = stars-1;
  if (type==="blast") return {range:[.16,.235,.32,.395][level]+.006*state.wave,strength:.85+.08*level,face:6-Math.max(1,stars)};
  if (type==="aura") return {range:[.20,.265,.335,.41][level],bonus:[25,60,110,180][level],heat:[0,0,2,4][level]};
  return {charge:[6,13,22,34][level],face:5-stars,feverBonus:[0,0,.30,.55][level]};
}
function normalizeMaterial(rank,fallback = 0) {
  return Number.isFinite(rank) ? clamp(Math.floor(rank),0,caps.material) : fallback;
}
function fresh() {
  return {coins:0,dice:1,dieMaterials:[0],dieSpecials:[null],dieStars:[1],arms:0,speed:0,wave:0,rolls:0,resonances:0,
    best:0,earned:0,seconds:0,muted:false,feverCharge:0,feverLeft:0,runEarned:0,
    vipChips:0,prestiges:0,skin:0,feverBurstRolls:0,masteryNeon:0,masterySpecial:0,masteryBurst:0,masteryRewards:0,
    collection:[],achievements:[],highestStar:1,merges:0,feverStarts:0,feverCoins:0,bestFeverCoins:0,bestFeverBursts:0,
    talents:Object.fromEntries(talents.map(talent=>[talent.id,0])),
    savedAt:Date.now()};
}
let storageOK = true;
function load() {
  const initial = fresh();
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE));
    if (!raw || typeof raw !== "object") return initial;
    for (const key of Object.keys(initial)) {
      if (key === "talents" || Array.isArray(initial[key])) continue;
      if (key === "muted") initial[key] = raw[key] === true;
      else if (key === "feverLeft" && Number.isFinite(raw[key])) initial[key] = clamp(raw[key],0,FEVER_DURATION);
      else if (key === "feverCharge" && Number.isFinite(raw[key])) initial[key] = clamp(raw[key],0,99.99);
      else if (Number.isFinite(raw[key])) {
        const max = key === "savedAt" ? Date.now() : (caps[key] ?? Number.MAX_SAFE_INTEGER);
        initial[key] = clamp(key === "seconds" ? raw[key] : Math.floor(raw[key]),key === "dice" ? 1 : 0,max);
      }
    }
    if (!Number.isFinite(raw.runEarned)) initial.runEarned = initial.earned;
    for (const talent of talents) {
      const rank = raw.talents?.[talent.id];
      if (Number.isFinite(rank)) initial.talents[talent.id] = clamp(Math.floor(rank),0,talent.costs.length);
    }
    const ranks = Array.isArray(raw.dieMaterials) ? raw.dieMaterials : null;
    const legacyRank = normalizeMaterial(raw.material);
    initial.dieMaterials = Array.from({length:initial.dice},(_,i)=>
      ranks ? normalizeMaterial(ranks[i],initial.talents.materialStart) : legacyRank);
    const specials = Array.isArray(raw.dieSpecials) ? raw.dieSpecials : [];
    const stars = Array.isArray(raw.dieStars) ? raw.dieStars : [];
    initial.dieStars = Array.from({length:initial.dice},(_,i)=>normalizeStars(stars[i]));
    initial.highestStar = normalizeStars(Math.max(initial.highestStar,initial.masteryNeon,initial.masterySpecial,...initial.dieStars));
    initial.merges = Math.max(initial.merges,2**(initial.highestStar-1)-1,
      initial.dieStars.reduce((total,star)=>total+2**(star-1)-1,0));
    initial.bestFeverBursts = Math.max(initial.bestFeverBursts,initial.masteryBurst,initial.feverBurstRolls);
    if (initial.feverLeft || initial.bestFeverBursts || initial.bestFeverCoins) initial.feverStarts = Math.max(1,initial.feverStarts);
    if (!initial.feverLeft) initial.feverCoins = 0;
    initial.bestFeverCoins = Math.max(initial.bestFeverCoins,initial.feverCoins);
    initial.collection = Array.isArray(raw.collection) ? [...new Set(raw.collection.filter(id=>COLLECTION_IDS.has(id)))] : [];
    initial.achievements = Array.isArray(raw.achievements) ? [...new Set(raw.achievements.filter(id=>MILESTONE_IDS.has(id)))] : [];
    const installed = new Map();
    initial.dieSpecials = Array.from({length:initial.dice},(_,i)=>{
      const type = specials[i];
      if (typeof type!=="string" || !Object.hasOwn(SPECIAL_DICE,type)) return null;
      const count = installed.get(type) ?? 0;
      if (count>=SPECIAL_LIMIT) return null;
      installed.set(type,count+1);
      return type;
    });
    initial.masteryRewards = Math.min(ALL_MASTERY,initial.masteryRewards);
    if (!initial.feverLeft) initial.feverBurstRolls = 0;
    if (!skins[initial.skin] || !skinAvailable(skins[initial.skin],initial)) initial.skin = 0;
  } catch {
    // An invalid save falls back to the starting table.
  }
  return initial;
}
let state = load();
let time = 0;
let width = 1, height = 1, resolution = 1, unit = 1;
let board;
let dice = [], arms = [], waves = [], beams = [], particles = [], popups = [];
let popupGrid, feverGlow;
let recent = Array.from({length:7},()=>[]);
let streak = 0, lastCrit = -Infinity, shakeStart = -Infinity, shakeAmplitude = 0;
let markedDie = null, markedUntil = 0;
let fusions = [];
let burstUntil = 0, burstPayout = 0;
let uiDirty = true;
let noticeTimer;
let achievementTimer, cachedAchievements, cachedAchievementCount, cachedBonus;
let hiddenAt = document.hidden ? Date.now() : 0;

function save(stamp = Date.now()) {
  state.savedAt = stamp;
  try { localStorage.setItem(SAVE,JSON.stringify(state)); storageOK = true; }
  catch { storageOK = false; }
  byId("save-status").classList.toggle("error",!storageOK);
  byId("save-status").lastElementChild.textContent = storageOK ? "自動セーブ" : "保存できません";
  byId("storage-label").textContent = storageOK ? "端末内に自動保存" : "この端末では保存できません";
}
function announce(message) {
  const notice = byId("notice");
  notice.textContent = message;
  notice.classList.add("active");
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(()=>notice.classList.remove("active"),3000);
}
function credit(amount) {
  state.coins = Math.min(Number.MAX_SAFE_INTEGER,state.coins+amount);
  state.earned = Math.min(Number.MAX_SAFE_INTEGER,state.earned+amount);
  state.runEarned = Math.min(Number.MAX_SAFE_INTEGER,state.runEarned+amount);
  uiDirty = true;
}
function skinAvailable(skin,progress = state) {
  return skin.mastery ? progress.prestiges>=3 && progress.masteryRewards===ALL_MASTERY : progress.prestiges>=skin.unlock;
}
function recordCollection() {
  const entries = new Set(state.collection);
  state.highestStar = Math.max(state.highestStar,...state.dieStars);
  for (const rank of state.dieMaterials) entries.add("material-"+rank);
  if (state.masteryNeon) entries.add("material-3");
  for (const type of state.dieSpecials) if (type) entries.add("special-"+type);
  for (let star=1;star<=state.highestStar;star++) entries.add("star-"+star);
  for (const skin of skins) if (skinAvailable(skin)) entries.add("skin-"+skin.id);
  if (entries.size===state.collection.length) return;
  state.collection = [...entries];
  uiDirty = true;
}
function milestoneValue(group) {
  return group.id==="collection" ? state.collection.length : state[group.id];
}
function milestoneBonus() {
  if (cachedAchievements===state.achievements && cachedAchievementCount===state.achievements.length) return cachedBonus;
  cachedAchievements = state.achievements;
  cachedAchievementCount = state.achievements.length;
  cachedBonus = {income:0,resonance:0,fever:0};
  for (const group of MILESTONE_GROUPS) {
    group.targets.forEach((_,index)=>{
      if (state.achievements.includes(group.id+"-"+index)) cachedBonus[group.reward] += group.rate;
    });
  }
  return cachedBonus;
}
function awardMilestones(notify = true) {
  const unlocked = [];
  for (const group of MILESTONE_GROUPS) {
    const progress = milestoneValue(group);
    group.targets.forEach((target,index)=>{
      const id = group.id+"-"+index;
      if (progress<target || state.achievements.includes(id)) return;
      state.achievements.push(id);
      unlocked.push({title:group.name+" "+milestoneTarget(group,target),bonus:MILESTONE_REWARDS[group.reward]+" ＋"+group.rate+"%"});
    });
  }
  if (!unlocked.length) return;
  uiDirty = true;
  if (!notify) return;
  const notice = byId("achievement-notice");
  const latest = unlocked.at(-1);
  notice.textContent = unlocked.length===1 ? "実績達成 · "+latest.title+" · "+latest.bonus :
    "実績 "+unlocked.length+"件達成 · "+latest.title;
  notice.classList.add("active");
  clearTimeout(achievementTimer);
  achievementTimer = setTimeout(()=>notice.classList.remove("active"),3300);
  sound("achievement");
  save();
}
function milestoneTarget(group,target) {
  return group.unit==="★" ? "★"+target : format(target)+group.unit;
}
function trackMastery(scanDice = true) {
  if (state.prestiges<3 || state.masteryRewards===ALL_MASTERY) return;
  if (scanDice) {
    for (let slot=0;slot<state.dice;slot++) {
      if (state.dieMaterials[slot]===3) state.masteryNeon = Math.max(state.masteryNeon,state.dieStars[slot]);
      if (state.dieSpecials[slot]) state.masterySpecial = Math.max(state.masterySpecial,state.dieStars[slot]);
    }
  }
  state.masteryBurst = Math.max(state.masteryBurst,state.feverBurstRolls);
  let chips = 0;
  MASTERY.forEach((goal,index)=>{
    if (state[goal.track]<goal.target || (state.masteryRewards&(1<<index))) return;
    state.masteryRewards |= 1<<index;
    chips += goal.reward;
  });
  if (!chips) return;
  state.vipChips = Math.min(Number.MAX_SAFE_INTEGER,state.vipChips+chips);
  uiDirty = true;
  recordCollection();
  awardMilestones();
  save();
  announce(state.masteryRewards===ALL_MASTERY ?
    "オーロラブラック解放  ＋"+chips+" VIPチップ" : "ネオンマスタリー達成  ＋"+chips+" VIPチップ");
}
function chargeFever(linked,combo,sameWave = false) {
  const charge = 5+3*Math.min(4,linked-1)+Math.min(5,combo-1)+(sameWave ? 3 : 0);
  gainFever(Math.round(charge*(1+.2*state.talents.fever)));
}
function gainFever(charge) {
  if (state.feverLeft>0) return;
  state.feverCharge = Math.round((state.feverCharge+charge*(1+milestoneBonus().fever/100))*100)/100;
  if (state.feverCharge<100) return;
  state.feverCharge = 0;
  state.feverLeft = FEVER_DURATION;
  state.feverBurstRolls = 0;
  state.feverCoins = 0;
  state.feverStarts++;
  for (const arm of arms) arm.next = time+Math.max(0,arm.next-time)/2;
  sound("fever");
}
function tickFever(dt) {
  if (state.feverLeft<=0) return;
  state.feverLeft = Math.max(0,state.feverLeft-dt);
  if (state.feverLeft>1e-8) return;
  state.feverLeft = 0;
  state.feverCharge = 0;
  state.feverBurstRolls = 0;
  state.feverCoins = 0;
  for (const arm of arms) arm.next = time+Math.max(0,arm.next-time)*2;
  uiDirty = true;
}
function idleReward(from, to) {
  const seconds = Math.min(14400,(to-from)/1000);
  if (seconds < 12 || !state.arms) return 0;
  const chain = state.talents.chain;
  const neighbors = state.dice-1;
  const chainExtras = chain ? Math.min(chain*2,neighbors*chainRange(chain,state.speed)) : 0;
  const waveExtras = state.talents.armWave ? (neighbors-chainExtras)*armWaveRange(state.wave)*.45 : 0;
  const estimatedRolls = Math.min(state.dice*1.25,state.arms*(1+chainExtras+waveExtras)/interval(state.speed));
  const total = state.dieMaterials.reduce((sum,rank,slot)=>{
    for (let face=1;face<=6;face++) sum += rollValue(face,rank,state.dieStars[slot]);
    return sum;
  },0);
  const averageRoll = total/(6*state.dice);
  const amount = Math.floor(seconds*estimatedRolls*averageRoll*(1+milestoneBonus().income/100));
  credit(amount);
  return amount;
}
function showIdle(from,to) {
  const payout = idleReward(from,to);
  if (payout) announce("放置中の獲得  ＋"+format(payout)+" コイン");
}
recordCollection();
awardMilestones(false);
showIdle(state.savedAt,Date.now());
save();

const upgradeViews = new Map();
for (const item of upgrades) {
  const row = document.createElement("article");
  row.className = "upgrade";
  row.dataset.kind = item.key;
  row.innerHTML = '<span class="upgrade-icon">'+icon(item.icon)+'</span><div><h3 class="upgrade-name">'+
    item.title+'</h3><p class="upgrade-detail"></p></div><button class="buy"><span class="buy-label"></span><span class="price">'+
    icon("coin")+'<span></span></span></button>';
  const button = row.querySelector("button");
  button.addEventListener("click",()=>buy(item));
  upgradeViews.set(item.key,{detail:row.querySelector(".upgrade-detail"),button,
    label:button.firstElementChild,price:button.lastElementChild,amount:button.lastElementChild.lastElementChild});
  byId("upgrades").append(row);
}
const specialViews = new Map();
for (const [type,special] of Object.entries(SPECIAL_DICE)) {
  const row = document.createElement("article");
  row.className = "upgrade";
  row.style.setProperty("--special-color",special.color);
  row.innerHTML = '<span class="upgrade-icon special-icon">'+icon(special.icon)+'</span><div><h4 class="upgrade-name">'+
    special.name+'</h4><p class="upgrade-detail">'+special.detail+'</p><p class="special-status"></p></div>'+
    '<button class="buy"><span class="buy-label"></span><span class="price">'+icon("coin")+'<span></span></span></button>';
  const button = row.querySelector("button");
  button.addEventListener("click",()=>buySpecial(type));
  specialViews.set(type,{button,status:row.querySelector(".special-status")});
  byId("special-dice").append(row);
}
function conversionOffer(type) {
  const count = state.dieSpecials.filter(value=>value===type).length;
  const slot = state.dieSpecials.findLastIndex((value,index)=>value===null && state.dieStars[index]===1);
  return {count,slot,price:Math.ceil(SPECIAL_DICE[type].cost*1.28**count)};
}
function buySpecial(type) {
  if (!Object.hasOwn(SPECIAL_DICE,type)) return;
  const special = SPECIAL_DICE[type];
  const {slot,count,price} = conversionOffer(type);
  if (state.dice<3 || slot<0 || state.coins<price || count>=SPECIAL_LIMIT) return;
  unlockAudio();
  state.coins -= price;
  state.dieSpecials[slot] = type;
  recordCollection();
  awardMilestones();
  markedDie = dice[slot];
  markedUntil = time+1.3;
  sound("buy");
  save();
  renderUI();
  announce("ダイス #"+(slot+1)+" が"+special.name+"になりました");
}
function renderSpecials() {
  for (const [type,view] of specialViews) {
    const special = SPECIAL_DICE[type];
    const {slot,count,price} = conversionOffer(type);
    const capped = count>=SPECIAL_LIMIT;
    const label = capped ? "所持上限" : "変換";
    const target = state.dice<3 ? "ダイス3個で解放" : slot<0 ? "★1の通常ダイスが必要" : "対象 #"+(slot+1);
    view.status.textContent = "所持 "+count+" / "+SPECIAL_LIMIT+" 個"+(capped ? "" : " · "+target);
    view.button.disabled = capped || state.dice<3 || slot<0 || state.coins<price;
    view.button.firstElementChild.textContent = label;
    view.button.lastElementChild.hidden = capped;
    view.button.lastElementChild.lastElementChild.textContent = format(price);
    view.button.setAttribute("aria-label",special.name+" "+label+
      (capped ? "" : " "+format(price)+" コイン"));
  }
}
const mergeRows = new Map();
const mergeJump = byId("merge-jump");
const mergeTabCount = byId("merge-tab-count");
mergeJump.addEventListener("click",()=>{
  byId("merge-title").scrollIntoView({block:"center",behavior:reducedMotion.matches ? "instant" : "smooth"});
  byId("merge-title").focus({preventScroll:true});
});
function mergeKey(die) {
  return [state.dieMaterials[die.slot],state.dieSpecials[die.slot] ?? "normal",state.dieStars[die.slot]].join("/");
}
function mergeName(die) {
  const material = materials[state.dieMaterials[die.slot]].name;
  const type = SPECIAL_DICE[state.dieSpecials[die.slot]]?.name ?? "通常ダイス";
  return material+"・"+type;
}
function mergePreview(die) {
  const type = state.dieSpecials[die.slot], stars = state.dieStars[die.slot];
  const next = stars+1;
  const percent = range=>Math.round(range*1000)/10+"%";
  let effect = "";
  if (type==="blast") {
    const before = specialStats(type,stars), after = specialStats(type,next);
    effect = " · 爆裂半径 "+percent(before.range)+" → "+percent(after.range)+" · 出目"+after.face+"以上で発動";
  }
  if (type==="aura") {
    const before = specialStats(type,stars), after = specialStats(type,next);
    effect = " · 増幅 ＋"+before.bonus+"% → ＋"+after.bonus+"% · 半径 "+percent(before.range)+" → "+percent(after.range);
  }
  if (type==="heat") effect = " · 充填 ＋"+specialStats(type,stars).charge+" → ＋"+specialStats(type,next).charge+" pt";
  return "配当 ×"+STAR_RANKS[stars-1].pay+" → ×"+STAR_RANKS[next-1].pay+
    " · 着地波 最大"+STAR_RANKS[next-1].targets+"個"+effect;
}
function renderMerges() {
  const groups = new Map();
  for (const die of dice) {
    if (state.dieStars[die.slot]>=MAX_STARS) continue;
    const key = mergeKey(die);
    if (!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(die);
  }
  for (const [key,view] of mergeRows) {
    if ((groups.get(key)?.length ?? 0)>=2) continue;
    view.row.remove();
    mergeRows.delete(key);
  }
  let pairs = 0;
  for (const [key,group] of groups) {
    if (group.length<2) continue;
    const die = group[0], stars = state.dieStars[die.slot];
    let view = mergeRows.get(key);
    if (!view) {
      const row = document.createElement("article");
      row.className = "upgrade merge-option";
      row.innerHTML = '<span class="upgrade-icon merge-icon" aria-hidden="true">★</span><div><h4 class="upgrade-name"></h4>'+
        '<p class="upgrade-detail"></p></div><button class="buy">合成する</button>';
      const button = row.querySelector("button");
      button.addEventListener("click",()=>mergeDice(key));
      button.setAttribute("aria-label",mergeName(die)+" ★"+stars+"を2個合成");
      byId("merge-options").append(row);
      view = {row,title:row.querySelector("h4"),status:row.querySelector("p"),button};
      view.title.textContent = mergeName(die)+" ★"+stars+" → ★"+(stars+1);
      mergeRows.set(key,view);
    }
    pairs += Math.floor(group.length/2);
    const status = "所持 "+group.length+" 個 · "+mergePreview(die);
    if (view.status.textContent!==status) view.status.textContent = status;
  }
  byId("merge-empty").hidden = mergeRows.size>0;
  mergeTabCount.hidden = pairs===0;
  mergeJump.hidden = pairs===0;
  const count = String(pairs);
  if (mergeTabCount.textContent!==count) {
    mergeTabCount.textContent = count;
    mergeTabCount.setAttribute("aria-label","合成可能 "+count+" 組");
    mergeJump.textContent = "★ 合成できるダイス "+count+" 組 →";
  }
}
function mergeDice(key) {
  const pair = dice.filter(die=>mergeKey(die)===key).slice(0,2);
  if (pair.length!==2 || state.dieStars[pair[0].slot]>=MAX_STARS) return;
  const [first,second] = pair;
  unlockAudio();
  const inputs = pair.map(die=>({die:{...die},rank:state.dieMaterials[die.slot],
    type:state.dieSpecials[die.slot],stars:state.dieStars[die.slot]}));
  const stars = ++state.dieStars[first.slot];
  state.merges++;
  const removed = second.slot;
  dice.splice(removed,1);
  for (const ranks of [state.dieMaterials,state.dieSpecials,state.dieStars]) ranks.splice(removed,1);
  state.dice = dice.length;
  dice.forEach((die,index)=>{die.slot=index;});
  first.rolling = false;
  first.z = 0;
  first.vz = 0;
  first.vx = 0;
  first.vy = 0;
  first.bounces = 0;
  first.nextFace = first.face;
  [first.rx,first.ry] = restAngles(first.face);
  first.launched = -Infinity;
  first.fromBlast = false;
  first.manualBatch = null;
  first.echo = null;
  first.trail = [];
  recent = recent.map(matches=>matches.filter(match=>!pair.includes(match.die)));
  beams = beams.filter(beam=>!pair.includes(beam.a) && !pair.includes(beam.b));
  for (const die of dice) if (die.echo && pair.includes(die.echo.source)) die.echo.source = null;
  for (const wave of waves) {
    wave.hit.delete(second);
    wave.hit.add(first);
    if (wave.echo && pair.includes(wave.echo.source)) wave.echo.source = null;
  }
  for (const arm of arms) if (arm.sweep && pair.includes(arm.sweep.target)) arm.sweep = null;
  markedDie = first;
  markedUntil = time+1.3;
  fusions = fusions.filter(effect=>!pair.includes(effect.die));
  if (!reducedMotion.matches) {
    first.x = board.x+board.w*.5;
    first.y = board.y+board.h*.5;
  }
  fusions.push({die:first,inputs,start:time,impacted:false,x:first.x,y:first.y});
  trackMastery();
  recordCollection();
  awardMilestones();
  sound("merge");
  save();
  renderUI();
  if (document.activeElement===document.body) byId("merge-title").focus({preventScroll:true});
  announce(mergeName(first)+" が★"+stars+"に合成されました");
}
materials.forEach(material=>{
  const badge = document.createElement("span");
  badge.className = "material";
  const label = material.name === "ネオンレーザー" ? "ネオン" : material.name;
  badge.style.setProperty("--die-color",material.low);
  badge.innerHTML = '<span class="material-swatch" aria-hidden="true"></span><span>'+label+'</span><strong>0</strong>';
  badge.title = material.name+" ×"+material.multiplier;
  byId("materials").append(badge);
});
const recordLabels = ["総獲得コイン","ロール数","共鳴クリティカル","最大共鳴コンボ","フィーバー発動",
  "1回のフィーバーでの最高獲得コイン","合成回数","到達した星","1回のフィーバーでの最多バースト",
  "プレイ時間","アーム作動間隔"];
for (const label of recordLabels) {
  const line = document.createElement("div");
  line.innerHTML = "<dt>"+label+"</dt><dd></dd>";
  byId("records").append(line);
}
const collectionViews = new Map();
for (const button of document.querySelectorAll("[data-journal-jump]")) {
  button.addEventListener("click",()=>{
    const heading = byId(button.dataset.journalJump);
    heading.scrollIntoView({block:"start",behavior:reducedMotion.matches ? "instant" : "smooth"});
    heading.focus({preventScroll:true});
  });
}
for (const group of COLLECTION_GROUPS) {
  const section = document.createElement("section");
  section.className = "collection-branch";
  section.innerHTML = "<h4>"+group.name+'</h4><div class="collection-grid"></div>';
  for (const entry of group.entries) {
    const row = document.createElement("div");
    row.className = "collection-entry";
    row.innerHTML = icon(entry.icon)+"<strong>"+entry.name+"</strong><small></small>";
    section.lastElementChild.append(row);
    collectionViews.set(entry.id,{row,status:row.lastElementChild,entry});
  }
  byId("collection-list").append(section);
}
const milestoneViews = MILESTONE_GROUPS.map(group=>{
  const card = document.createElement("article");
  card.className = "milestone-card";
  card.innerHTML = "<h4>"+group.name+'</h4><p></p><progress aria-label="'+group.name+
    'の進捗"></progress><div class="milestone-tiers"></div>';
  const targets = group.targets.map(target=>{
    const chip = document.createElement("span");
    chip.className = "milestone-tier";
    chip.textContent = milestoneTarget(group,target);
    card.lastElementChild.append(chip);
    return chip;
  });
  byId("milestone-list").append(card);
  return {group,targets,progress:card.querySelector("progress"),detail:card.querySelector("p")};
});
function renderCollection() {
  byId("collection-count").textContent = state.collection.length+" / "+COLLECTION_IDS.size;
  byId("achievement-count").textContent = state.achievements.length+" / "+MILESTONE_IDS.size;
  const bonus = milestoneBonus();
  byId("achievement-bonus").textContent = "現在の報酬 · "+Object.entries(bonus).map(([key,value])=>
    MILESTONE_REWARDS[key]+" ＋"+value+"%").join(" · ");
  for (const [id,view] of collectionViews) {
    const unlocked = state.collection.includes(id);
    const status = unlocked ? "収集済み · "+view.entry.detail : "未解放";
    if (view.status.textContent===status) continue;
    view.row.classList.toggle("locked",!unlocked);
    view.status.textContent = status;
  }
  for (const {group,targets,progress,detail} of milestoneViews) {
    const current = milestoneValue(group);
    const next = group.targets.find((_,index)=>!state.achievements.includes(group.id+"-"+index));
    progress.max = next ?? group.targets.at(-1);
    progress.value = current;
    const text = "現在 "+milestoneTarget(group,current)+" · 各段階で"+MILESTONE_REWARDS[group.reward]+" ＋"+group.rate+"%";
    if (detail.textContent!==text) detail.textContent = text;
    targets.forEach((chip,index)=>{
      const done = state.achievements.includes(group.id+"-"+index);
      const text = milestoneTarget(group,group.targets[index])+(done ? " ✓" : "");
      if (chip.textContent===text && chip.hasAttribute("aria-label")) return;
      chip.classList.toggle("done",done);
      chip.textContent = text;
      chip.setAttribute("aria-label",milestoneTarget(group,group.targets[index])+(done ? " 達成済み" : " 未達成"));
    });
  }
}
const vipDialog = byId("vip-dialog");
const vipButton = byId("vip-rebirth");
const skinViews = skins.map((skin,index)=>{
  const button = document.createElement("button");
  button.className = "skin-choice";
  button.style.setProperty("--felt",skin.felt[1]);
  button.innerHTML = '<span class="skin-swatch" aria-hidden="true"></span><span>'+skin.name+'</span><small></small>';
  button.addEventListener("click",()=>{
    if (!skinAvailable(skin) || state.skin===index) return;
    state.skin = index;
    applySkin();
    save();
    renderVIP();
  });
  byId("vip-skins").append(button);
  return button;
});
const masteryViews = MASTERY.map(goal=>{
  const row = document.createElement("article");
  row.className = "mastery-goal";
  row.innerHTML = "<strong>"+goal.name+'</strong><span></span><progress max="'+goal.target+
    '" aria-label="'+goal.name+'"></progress>';
  byId("mastery-goals").append(row);
  return {row,value:row.querySelector("span"),progress:row.querySelector("progress")};
});
const talentViews = new Map();
for (const branch of new Set(talents.map(talent=>talent.branch))) {
  const group = document.createElement("section");
  group.className = "talent-branch";
  group.innerHTML = "<h4>"+branch+'</h4><div class="upgrades"></div>';
  for (const talent of talents.filter(item=>item.branch===branch)) {
    const row = document.createElement("article");
    row.className = "upgrade";
    row.innerHTML = '<span class="upgrade-icon">'+icon(talent.icon)+'</span><div><h5 class="upgrade-name">'+
      talent.title+'</h5><p class="upgrade-detail"></p></div><button class="buy"><span class="buy-label"></span><span class="price">'+
      icon("gem")+'<span></span></span></button>';
    const button = row.querySelector("button");
    const price = button.lastElementChild;
    button.addEventListener("click",()=>buyTalent(talent));
    talentViews.set(talent.id,{detail:row.querySelector(".upgrade-detail"),button,label:button.firstElementChild,price});
    group.lastElementChild.append(row);
  }
  byId("vip-talents").append(group);
}
function pendingChips() {
  return Math.floor(Math.sqrt(state.runEarned/VIP_TARGET));
}
function talentLocked(talent) {
  return talent.requires && !state.talents[talent.requires];
}
function buyTalent(talent) {
  const rank = state.talents[talent.id];
  const cost = talent.costs[rank];
  if (cost===undefined || talentLocked(talent) || state.vipChips<cost) return;
  unlockAudio();
  state.vipChips -= cost;
  state.talents[talent.id]++;
  sound("buy");
  save();
  renderUI();
}
function renderVIP() {
  const reward = pendingChips();
  byId("vip-chips").textContent = format(state.vipChips);
  byId("vip-count").textContent = format(state.prestiges);
  byId("vip-reward").textContent = "＋"+format(reward)+" チップ";
  const nextTarget = VIP_TARGET*(reward+1)**2;
  byId("vip-condition").textContent = reward ?
    "転生可能 · 今回の獲得 "+format(state.runEarned)+" コイン · "+format(reward+1)+" 枚は "+format(nextTarget)+" コインから" :
    "今回の獲得 "+format(state.runEarned)+" / "+format(VIP_TARGET)+" コインで転生可能";
  byId("vip-progress").max = nextTarget;
  byId("vip-progress").value = state.runEarned;
  vipButton.disabled = reward===0;
  if (vipDialog.open) byId("vip-confirm-text").textContent = "今回の転生で VIPチップを "+format(reward)+" 枚獲得します。";
  skinViews.forEach((button,index)=>{
    const skin = skins[index];
    const locked = !skinAvailable(skin);
    const selected = state.skin===index;
    button.disabled = locked;
    button.setAttribute("aria-pressed",String(selected));
    button.lastElementChild.textContent = locked ?
      (skin.mastery ? "マスタリー全達成で解放" : "転生 "+skin.unlock+" 回で解放") : selected ? "使用中" : "使用する";
  });
  byId("mastery-section").hidden = state.prestiges<3;
  MASTERY.forEach((goal,index)=>{
    const view = masteryViews[index], completed = !!(state.masteryRewards&(1<<index));
    const current = Math.min(goal.target,state[goal.track]);
    view.row.classList.toggle("complete",completed);
    view.progress.value = current;
    view.value.textContent = completed ? "達成済み" : current+" / "+goal.target+" · ＋"+goal.reward+"チップ";
  });
  for (const talent of talents) {
    const view = talentViews.get(talent.id);
    const rank = state.talents[talent.id];
    const cost = talent.costs[rank];
    const locked = talentLocked(talent);
    const maxed = cost===undefined;
    const prerequisite = locked ? talents.find(item=>item.id===talent.requires).title+" Lv.1 が必要" : "";
    const effect = talent.detail(rank || 1);
    view.detail.textContent = "Lv. "+rank+" / "+talent.costs.length+" · "+(prerequisite || (rank ? "" : "解放で ")+effect);
    view.button.disabled = maxed || !!locked || state.vipChips<cost;
    view.label.textContent = maxed ? "最大" : locked ? "未解放" : rank ? "強化" : "解放";
    view.price.hidden = maxed;
    view.price.lastElementChild.textContent = cost ?? "";
    view.button.title = maxed || locked ? "" : talent.detail(rank+1);
    view.button.setAttribute("aria-label",talent.title+" "+view.label.textContent+(view.price.hidden ? "" : " "+cost+" VIPチップ"));
  }
}
vipButton.addEventListener("click",()=>{
  if (!pendingChips()) return;
  unlockAudio();
  vipDialog.returnValue = "cancel";
  vipDialog.showModal();
  renderVIP();
});
vipDialog.addEventListener("close",()=>{
  if (vipDialog.returnValue!=="rebirth") return;
  const reward = pendingChips();
  if (!reward) return;
  const old = state;
  const remaining = fresh();
  for (const key of ["rolls","resonances","best","earned","seconds","muted","skin","talents",
    "masteryNeon","masterySpecial","masteryBurst","masteryRewards","collection","achievements","highestStar",
    "merges","feverStarts","bestFeverCoins","bestFeverBursts"]) remaining[key] = old[key];
  remaining.vipChips = Math.min(Number.MAX_SAFE_INTEGER,old.vipChips+reward);
  remaining.prestiges = Math.min(Number.MAX_SAFE_INTEGER,old.prestiges+1);
  const newSkin = skins.findIndex(skin=>skin.unlock>old.prestiges && skin.unlock<=remaining.prestiges);
  if (newSkin>=0) remaining.skin = newSkin;
  remaining.coins = remaining.talents.bankroll*20;
  remaining.dice = 1+remaining.talents.dice;
  remaining.dieMaterials = Array(remaining.dice).fill(remaining.talents.materialStart);
  state = remaining;
  resetTable();
  trackMastery();
  recordCollection();
  awardMilestones();
  applySkin();
  save();
  renderUI();
  sound("fever");
  announce("VIP転生  ＋"+format(reward)+" チップ");
});
const feverStage = document.querySelector(".stage");
const feverView = {label:byId("fever-label"),effect:byId("fever-effect"),progress:byId("fever-progress"),
  fill:byId("fever-fill"),value:byId("fever-value")};
function renderFever() {
  const active = state.feverLeft>0;
  const fraction = active ? state.feverLeft/FEVER_DURATION : state.feverCharge/100;
  const value = active ? Math.ceil(state.feverLeft)+" 秒" : Math.floor(state.feverCharge)+"%";
  const label = active ? "黄金の狂熱タイム" : "フィーバー";
  feverStage.classList.toggle("fevers-on",active);
  if (feverView.label.textContent!==label) feverView.label.textContent = label;
  feverView.effect.hidden = !active;
  const effect = time<burstUntil ? "バースト ×"+burstPayout : "コイン・アーム ×2";
  if (feverView.effect.textContent!==effect) feverView.effect.textContent = effect;
  if (feverView.value.textContent!==value) {
    feverView.value.textContent = value;
    feverView.progress.setAttribute("aria-valuetext",active ? "残り "+value : value+" 充填");
  }
  feverView.progress.setAttribute("aria-valuenow",String(Math.round(fraction*100)));
  feverView.fill.style.transform = "scaleX("+fraction+")";
}
const goalView = {box:byId("shop-goal"),label:byId("goal-label"),value:byId("goal-value"),
  reason:byId("goal-reason"),progress:byId("goal-progress")};
function renderGoal() {
  goalView.box.hidden = state.prestiges>0 || state.arms>0 || state.rolls>=35 || state.earned>=VIP_TARGET;
  if (goalView.box.hidden) return;
  let key = "arms", reason = "アームが一定間隔でダイスを1個振ります。";
  if (state.dice<2) {
    key = "dice";
    reason = "ダイスが2個になると、同じ出目で共鳴できます。";
  } else if (!state.wave) {
    key = "wave";
    reason = "近くのダイスをまとめて振り、共鳴を狙えます。";
  }
  const item = upgrades.find(upgrade=>upgrade.key===key);
  const cost = Math.ceil(item.cost(state));
  goalView.label.textContent = "次の目標 · "+item.title;
  goalView.value.textContent = state.coins>=cost ? "購入可能" : format(state.coins)+" / "+format(cost);
  goalView.reason.textContent = reason;
  goalView.progress.max = cost;
  goalView.progress.value = state.coins;
}
function materialOffer() {
  const from = Math.min(...state.dieMaterials);
  const to = from+1;
  const advanced = state.dieMaterials.filter(rank=>rank>=to).length;
  const requiredRebirths = materialRebirths(to);
  const needsLicense = to>1 && !state.talents.materialPermit;
  const rosterFactor = 1+.035*Math.max(0,state.dice-6);
  const progressFactor = (1+.08*advanced)*1.095**Math.max(0,advanced-4);
  return {from,to,index:state.dieMaterials.indexOf(from),capped:from===caps.material,
    advanced,requiredRebirths,needsLicense,locked:needsLicense || state.prestiges<requiredRebirths,
    price:Math.ceil((MATERIAL_PRICES[from] ?? Infinity)*rosterFactor*progressFactor)};
}
function materialRebirths(tier) {
  return Math.max(0,tier-2);
}
function upgradeOffer(item) {
  if (item.key==="material") return materialOffer();
  return {capped:state[item.key]>=caps[item.key],locked:item.key==="speed" && !state.arms,
    price:Math.ceil(item.cost(state))};
}
function renderMaterials() {
  const counts = materials.map(()=>0);
  for (const rank of state.dieMaterials) counts[rank]++;
  Array.from(byId("materials").children).forEach((badge,index)=>{
    badge.classList.toggle("current",counts[index]>0);
    const text = counts[index]+"個";
    if (badge.lastElementChild.textContent!==text) badge.lastElementChild.textContent = text;
  });
  const offer = materialOffer();
  const rule = byId("material-rule");
  if (offer.capped) {
    rule.textContent = "全ダイスが最高材質です。";
    return;
  }
  const nextTier = offer.locked ? offer.to : offer.to+1;
  const rebirths = materialRebirths(nextTier);
  if (nextTier>caps.material) {
    rule.textContent = "1回の購入でダイス1個がネオンレーザーになります。";
    return;
  }
  const requirements = ["全ダイスが"+materials[nextTier-1].name+"以上"];
  if (nextTier>1) requirements.push("材質ライセンスの解放");
  if (rebirths) requirements.push("VIP転生が通算"+rebirths+"回以上");
  rule.textContent = materials[nextTier].name+"の解放には"+requirements.join("、")+"が必要です。";
}
function renderUI() {
  renderFever();
  if (!byId("shop").hidden) {
    renderGoal();
    renderSpecials();
  }
  renderMerges();
  if (!byId("vip").hidden || vipDialog.open) renderVIP();
  if (!byId("collection").hidden) renderCollection();
  byId("coins").textContent = short(state.coins);
  byId("coins").title = format(state.coins);
  byId("dice-count").firstChild.nodeValue = state.dice+" ";
  byId("arm-count").textContent = state.arms;
  byId("play-hint").classList.toggle("wave-unlocked",state.wave>0);
  renderMaterials();
  for (const item of upgrades) {
    const view = upgradeViews.get(item.key);
    const offer = upgradeOffer(item);
    const {capped,locked,price} = offer;
    view.detail.textContent = item.key!=="material" ? item.detail(state) : capped ? "全ダイスが最高材質" :
      offer.needsLicense ? materials[offer.to].name+"には材質ライセンスが必要" :
      locked ? "VIP転生 "+offer.requiredRebirths+" 回で"+materials[offer.to].name+"を解放" :
      "ダイス #"+(offer.index+1)+" を"+materials[offer.to].name+" ×"+materials[offer.to].multiplier+
      "へ · "+offer.advanced+"/"+state.dice+"個済み";
    view.button.disabled = capped || locked || state.coins < price;
    const action = typeof item.action === "function" ? item.action(state) : item.action;
    view.label.textContent = capped ? "最大" : locked ? "未解放" : action;
    view.price.hidden = capped || locked;
    view.amount.textContent = Number.isFinite(price) ? short(price) : "";
    view.button.setAttribute("aria-label",item.title+" "+view.label.textContent+
      (view.price.hidden ? "" : " "+format(price)+" コイン"));
  }
  if (!byId("stats").hidden) {
    const mins = Math.floor(state.seconds/60), secs = Math.floor(state.seconds%60);
    const values = [format(state.earned),format(state.rolls),format(state.resonances),format(state.best),
      format(state.feverStarts),format(state.bestFeverCoins),format(state.merges),"★"+state.highestStar,format(state.bestFeverBursts),
      mins+" 分 "+secs+" 秒",state.arms ? armInterval().toFixed(2)+" 秒" : "未雇用"];
    byId("records").querySelectorAll("dd").forEach((node,index)=>{node.textContent=values[index];});
  }
  uiDirty = false;
}
function buy(item) {
  const key = item.key;
  const offer = upgradeOffer(item);
  if (offer.capped || offer.locked || state.coins<offer.price || !Number.isFinite(offer.price)) return;
  unlockAudio();
  state.coins -= offer.price;
  if (key === "material") {
    state.dieMaterials[offer.index] = offer.to;
    markedDie = dice[offer.index];
    markedUntil = time+1.3;
    announce("ダイス #"+(offer.index+1)+" が"+materials[offer.to].name+"に進化");
    trackMastery();
  } else {
    state[key]++;
  }
  if (key === "dice") spawnDie();
  if (key === "dice" || key === "material") {
    recordCollection();
    awardMilestones();
  }
  if (key === "arms") spawnArm();
  if (key === "speed") arms.forEach(arm=>{arm.next = Math.min(arm.next,time+armInterval());});
  if (key === "arms" && state.arms === 1) announce("ロボットアームが稼働を開始");
  sound("buy");
  save();
  renderUI();
}

const tabButtons = [...document.querySelectorAll("[data-tab]")];
function selectTab(tab,focus = false) {
  tabButtons.forEach(button=>{
    const selected = button === tab;
    button.setAttribute("aria-selected",String(selected));
    button.tabIndex = selected ? 0 : -1;
    byId(button.dataset.tab).hidden = !selected;
  });
  document.querySelector(".panel").scrollTop = 0;
  if (focus) tab.focus();
  renderUI();
}
for (const tab of tabButtons) {
  tab.addEventListener("click",()=>selectTab(tab));
  tab.addEventListener("keydown",event=>{
    if (!["ArrowLeft","ArrowRight","Home","End"].includes(event.key)) return;
    event.preventDefault();
    const offset = event.key === "ArrowLeft" ? -1 : 1;
    const next = event.key === "Home" ? 0 : event.key === "End" ? tabButtons.length-1 :
      (tabButtons.indexOf(tab)+offset+tabButtons.length)%tabButtons.length;
    selectTab(tabButtons[next],true);
  });
}
const dialog = byId("reset-dialog");
byId("reset").addEventListener("click",()=>{
  dialog.returnValue = "cancel";
  dialog.showModal();
});
dialog.addEventListener("close",()=>{
  if (dialog.returnValue !== "reset") return;
  state = fresh();
  time = 0;
  resetTable();
  applySkin();
  clearTimeout(achievementTimer);
  byId("achievement-notice").classList.remove("active");
  recordCollection();
  updateSound();
  save();
  renderUI();
  selectTab(tabButtons[0]);
  announce("初期状態に戻しました");
});

let audio;
const lastSound = {};
function unlockAudio() {
  if (state.muted) return;
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  try {
    if (!audio) audio = new Audio();
    if (audio.state === "suspended") audio.resume().catch(()=>{});
  } catch {
    // Gameplay remains available when audio is unavailable.
  }
}
function tone(freq,end,length,volume,type,delay = 0) {
  const when = audio.currentTime+delay;
  const osc = audio.createOscillator(), envelope = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq,when);
  osc.frequency.exponentialRampToValueAtTime(end,when+length);
  envelope.gain.setValueAtTime(.0001,when);
  envelope.gain.exponentialRampToValueAtTime(volume,when+.005);
  envelope.gain.exponentialRampToValueAtTime(.0001,when+length);
  osc.connect(envelope).connect(audio.destination);
  osc.start(when);
  osc.stop(when+length+.01);
}
function sound(type,combo = 1) {
  if (state.muted || !audio || audio.state !== "running") return;
  const now = audio.currentTime;
  if (now-(lastSound[type] ?? -10) < (type==="burst" ? .28 : type === "crit" ? .18 : .075)) return;
  if ((type==="coin" || type==="crit") && now-(lastSound.fever ?? -10)<.36) return;
  lastSound[type] = now;
  if (type === "hit") tone(random(210,330),92,.046,.037,"triangle");
  if (type === "land") tone(random(170,230),72,.058,.045,"triangle");
  if (type === "wave") tone(165,54,.15,.049,"sine");
  if (type === "blast") tone(224,60,.16,.045,"triangle");
  if (type === "achievement") {
    tone(587,587,.13,.027,"triangle");
    tone(784,784,.22,.034,"sine",.085);
  }
  if (type === "burst") {
    tone(440,660,.13,.03,"triangle");
    tone(880,1100,.19,.031,"sine",.065);
  }
  if (type === "merge") {
    tone(294,430,.34,.025,"sine");
    tone(523,523,.14,.027,"triangle",.28);
    tone(784,784,.23,.038,"sine",.39);
    tone(1047,1047,.31,.031,"triangle",.43);
  }
  if (type === "coin" || type === "buy") {
    tone(720,880,.082,.03,"sine");
    tone(1050,1160,.092,.024,"sine",.036);
  }
  if (type === "crit") {
    const pitch = 392*2**(Math.min(combo-1,8)/18);
    tone(pitch,pitch,.13,.036,"triangle");
    tone(pitch*1.5,pitch*1.5,.17,.032,"sine",.045);
    if (combo>=4) tone(pitch*2,pitch*2,.19,.025,"sine",.09);
  }
  if (type === "fever") {
    [523,659,784,1047].forEach((pitch,index)=>tone(pitch,pitch,index===3 ? .34 : .18,.038,"triangle",index*.065));
    tone(523,523,.29,.022,"sine",.195);
  }
}
function updateSound() {
  const button = byId("sound");
  button.setAttribute("aria-pressed",String(state.muted));
  button.setAttribute("aria-label",state.muted ? "ミュートを解除" : "音をミュート");
  button.title = button.getAttribute("aria-label");
  button.firstElementChild.firstElementChild.setAttribute("href",state.muted ? "#i-mute" : "#i-sound");
}
byId("sound").addEventListener("click",()=>{
  state.muted = !state.muted;
  if (!state.muted) unlockAudio();
  else if (audio?.state === "running") audio.suspend().catch(()=>{});
  updateSound();
  save();
});

let resizePending = false;
function requestResize() {
  resizePending = true;
}
function resize() {
  resizePending = false;
  const area = canvas.getBoundingClientRect();
  if (board && (!area.width || !area.height)) return;
  const nextWidth = Math.max(1,area.width), nextHeight = Math.max(1,area.height);
  const nextResolution = Math.min(2,devicePixelRatio || 1,Math.sqrt(2100000/(nextWidth*nextHeight)));
  if (board && width===nextWidth && height===nextHeight && resolution===nextResolution) return;
  const old = board, oldUnit = unit;
  width = nextWidth;
  height = nextHeight;
  resolution = nextResolution;
  const pixelWidth = Math.max(1,Math.round(width*resolution));
  const pixelHeight = Math.max(1,Math.round(height*resolution));
  if (canvas.width!==pixelWidth) canvas.width = pixelWidth;
  if (canvas.height!==pixelHeight) canvas.height = pixelHeight;
  if (backdrop.width!==pixelWidth) backdrop.width = pixelWidth;
  if (backdrop.height!==pixelHeight) backdrop.height = pixelHeight;
  ctx.setTransform(resolution,0,0,resolution,0,0);
  const span = Math.min(width,height);
  unit = clamp(span/420,.43,1.6);
  const margin = clamp(span*.042,5,19);
  const rail = clamp(span*.068,7,38);
  const depth = clamp(span*.045,6,24);
  const horizontal = Math.max(margin,(width-height*2.3)/2);
  const outer = {x:horizontal,y:margin,w:Math.max(1,width-horizontal*2),h:Math.max(1,height-margin*2-depth)};
  board = {outer,rail,depth,x:outer.x+rail,y:outer.y+rail,w:Math.max(1,outer.w-rail*2),h:Math.max(1,outer.h-rail*2)};
  const glowX = board.x+board.w*.5, glowY = board.y+board.h*.45;
  feverGlow = ctx.createRadialGradient(glowX,glowY,0,glowX,glowY,Math.max(board.w,board.h)*.66);
  feverGlow.addColorStop(0,"#ffcc472c");
  feverGlow.addColorStop(.58,"#e6aa181a");
  feverGlow.addColorStop(1,"#ffc65d77");
  if (old) {
    const ratio = unit/oldUnit;
    function move(point) {
      point.x = board.x+(point.x-old.x)/old.w*board.w;
      point.y = board.y+(point.y-old.y)/old.h*board.h;
    }
    for (const die of dice) {
      move(die);
      die.trail = [];
      die.z *= ratio;
      die.vx *= ratio;
      die.vy *= ratio;
      die.vz *= ratio;
      confine(die,false);
    }
    for (const fusion of fusions) {
      move(fusion);
      for (const input of fusion.inputs) move(input.die);
    }
    for (const arm of arms) if (arm.sweep) move(arm.sweep);
    for (const point of [...waves,...particles,...popups]) move(point);
    if (pointer) move(pointer);
  }
  reflowPopups();
  paintTable();
}
function restAngles(face) {
  return [[0,0],[Math.PI/2,0],[0,-Math.PI/2],[0,Math.PI/2],[-Math.PI/2,0],[Math.PI,0]][face-1];
}
function spawnDie() {
  const slot = dice.length;
  state.dieMaterials[slot] ??= state.talents.materialStart;
  state.dieSpecials[slot] ??= null;
  state.dieStars[slot] ??= 1;
  const starts = [[.28,.42],[.65,.33],[.6,.68]];
  const start = state.dice===1 ? [.5,.38] : starts[dice.length];
  const face = start ? [3,5,2][dice.length] : 1+Math.floor(Math.random()*6);
  const [rx,ry] = restAngles(face);
  let x = board.x+board.w*(start ? start[0] : random(.13,.87));
  let y = board.y+board.h*(start ? start[1] : random(.13,.87));
  if (!start) {
    let clearance = -Infinity;
    for (let sample=0;sample<14;sample++) {
      const px = board.x+board.w*random(.11,.89), py = board.y+board.h*random(.11,.89);
      let nearest = Infinity;
      for (const die of dice) nearest = Math.min(nearest,(die.x-px)**2+(die.y-py)**2);
      if (nearest<=clearance) continue;
      x = px;
      y = py;
      clearance = nearest;
    }
  }
  const die = {slot,x,y,z:0,vx:0,vy:0,vz:0,rx,ry,rz:start ? [-.34,.25,-.15][dice.length] : random(-Math.PI,Math.PI),
    sx:0,sy:0,sz:0,face,nextFace:face,rolling:false,bounces:0,launched:-Infinity};
  dice.push(die);
  confine(die,false);
}
function spawnArm() {
  arms.push({next:time+(.48+arms.length*.21)/feverMultiplier(),sweep:null});
}
function resetTable() {
  dice = []; arms = []; waves = []; beams = []; popups = []; particles = [];
  markedDie = null;
  fusions = [];
  burstUntil = 0;
  burstPayout = 0;
  state.dieMaterials.length = state.dice;
  state.dieSpecials.length = state.dice;
  state.dieStars.length = state.dice;
  recent = Array.from({length:7},()=>[]);
  streak = 0; lastCrit = -Infinity; shakeStart = -Infinity; shakeAmplitude = 0;
  for (let i=0;i<state.dice;i++) spawnDie();
  for (let i=0;i<state.arms;i++) spawnArm();
}
function isFusing(die) {return fusions.some(fusion=>fusion.die===die && !fusion.impacted);}
function confine(die,rebound = true) {
  const padding = unit*17*starStats(die).size;
  const rx = Math.min(padding,board.w*.5), ry = Math.min(padding,board.h*.5);
  const x = clamp(die.x,board.x+rx,board.x+board.w-rx);
  const y = clamp(die.y,board.y+ry,board.y+board.h-ry);
  const hitX = rebound && (die.x-x)*die.vx>0;
  const hitY = rebound && (die.y-y)*die.vy>0;
  if (hitX) die.vx *= -.66;
  if (hitY) die.vy *= -.66;
  if ((hitX || hitY) && Math.hypot(die.vx,die.vy)>30*unit) sound("hit");
  die.x = x;
  die.y = y;
}
function launch(die, x, y, strength, manual) {
  if (die.rolling || isFusing(die) || time-die.launched < .19) return false;
  const angle = Math.atan2(die.y-y,die.x-x)+random(-.34,.34);
  const impulse = random(63,122)*unit*strength;
  die.vx = die.vx*.21+Math.cos(angle)*impulse;
  die.vy = die.vy*.21+Math.sin(angle)*impulse;
  die.z = Math.max(die.z,1);
  die.vz = random(230,295)*unit*strength;
  die.sx = random(8,15)*(Math.random()<.5 ? -1 : 1);
  die.sy = random(6,13)*(Math.random()<.5 ? -1 : 1);
  die.sz = random(-7,7);
  die.nextFace = 1+Math.floor(Math.random()*6);
  die.manualBatch = null;
  die.fromBlast = false;
  die.echo = null;
  die.trail = [];
  die.launched = time;
  die.rolling = true;
  die.bounces = 0;
  if (manual) sound("hit");
  return true;
}
function addWave(source,kind = "manual") {
  const batch = kind==="manual" ? Symbol() : null;
  if (batch) source.manualBatch = batch;
  const blast = kind==="blast" ? specialStats("blast",state.dieStars[source.slot]) : null;
  const star = starStats(source);
  const range = blast?.range ?? (kind==="star" ? star.pulse : kind==="arm" ? armWaveRange(state.wave) : waveRange(state.wave));
  const strength = blast?.strength ?? (kind==="star" ? .72 : kind==="arm" ? .82+.033*state.wave : 1+.062*state.wave);
  const echo = (kind==="star" || kind==="blast") && star.targets ?
    {source,face:source.face,chance:star.match,until:time+1.9} : null;
  const remaining = kind==="star" ? star.targets : Infinity;
  waves.push({x:source.x,y:source.y,range,t:0,life:.34,strength,batch,kind,echo,remaining,hit:new Set([source])});
  if (waves.length > 24) waves.shift();
  if (kind==="blast" || kind==="manual") sound(kind==="blast" ? "blast" : "wave");
}
function waveRadius(wave) {
  const t = clamp(wave.t/wave.life,0,1);
  return Math.min(board.w,board.h)*wave.range*(1-(1-t)**2);
}
function spark(x,y,palette,count) {
  if (reducedMotion.matches) count = Math.ceil(count*.35);
  if (particles.length > 260) return;
  for (let i=0;i<count;i++) {
    const angle = random(0,Math.PI*2), speed = random(14,88)*unit;
    const life = random(.28,.65);
    particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life,total:life,
      color:palette[i%palette.length],size:random(1.3,3)*unit});
  }
}
function requestShake(linked,combo) {
  if (reducedMotion.matches || time-shakeStart<SHAKE_COOLDOWN) return;
  shakeStart = time;
  shakeAmplitude = Math.min(2.5,(1.5+.17*Math.min(4,linked)+.12*Math.min(5,combo-1))*unit);
}
function auraBonus(die) {
  let best = {bonus:0,heat:0};
  const span = Math.min(board.w,board.h);
  for (const aura of dice) {
    if (aura===die || aura.rolling || state.dieSpecials[aura.slot]!=="aura") continue;
    const stats = specialStats("aura",state.dieStars[aura.slot]);
    if (stats.bonus>best.bonus && Math.hypot(die.x-aura.x,die.y-aura.y)<=span*stats.range) best = stats;
  }
  return best;
}
function settle(die) {
  die.z = 0;
  die.rolling = false;
  die.face = die.nextFace;
  [die.rx,die.ry] = restAngles(die.face);
  die.rz %= Math.PI*2;
  state.rolls++;
  const rewards = milestoneBonus();
  const stars = state.dieStars[die.slot];
  const base = rollValue(die.face,state.dieMaterials[die.slot],stars);
  const candidates = recent[die.face];
  while (candidates.length && time-candidates[0].t > RESONANCE_WINDOW) candidates.shift();
  let bonus = 0;
  const linked = new Set(candidates.map(other=>other.die));
  linked.delete(die);
  const echo = die.echo;
  const echoMatch = echo?.face===die.face && time<=echo.until && dice.includes(echo.source);
  if (echoMatch) linked.add(echo.source);
  if (linked.size) {
    streak = time-lastCrit <= RESONANCE_WINDOW ? streak+1 : 1;
    lastCrit = time;
    state.resonances++;
    state.best = Math.max(state.best,streak);
    const sameWave = !!die.manualBatch && candidates.some(other=>other.die!==die && other.batch===die.manualBatch);
    const resonanceRate = .60+.20*Math.min(4,linked.size)+.12*Math.min(5,streak-1)+(sameWave ? .35 : 0)+(echoMatch ? .20 : 0);
    bonus = Math.round(base*resonanceRate*(1+.25*state.talents.resonance)*(1+rewards.resonance/100));
    for (const other of Array.from(linked).slice(-4)) beams.push({a:other,b:die,life:.49,phase:random(0,6)});
    requestShake(linked.size,streak);
    chargeFever(linked.size,streak,sameWave);
    sound("crit",streak);
    spark(die.x,die.y,["#c5ffdd","#fcf2b4","#77f8c7"],7+Math.min(4,linked.size));
  } else {
    spark(die.x,die.y,["#cbb074","#fff1ad"],4);
  }
  candidates.push({die,t:time,batch:die.manualBatch});
  const special = state.dieSpecials[die.slot];
  const star = starStats(die);
  const blast = special==="blast" ? specialStats("blast",stars) : null;
  const blastReady = blast && die.face>=blast.face;
  const blastFired = blastReady && !die.fromBlast && !echo;
  if (!die.fromBlast && !echo) {
    if (blastFired) {
      addWave(die,"blast");
      spark(die.x,die.y,["#ff9d63","#ffe0a0"],10);
    } else if (star.targets) {
      addWave(die,"star");
      spark(die.x,die.y,[star.color],7);
    }
    if (star.heat) gainFever(star.heat);
  }
  const heat = special==="heat" ? specialStats("heat",stars) : null;
  if (heat && die.face>=heat.face && state.feverLeft===0) {
    gainFever(heat.charge);
    spark(die.x,die.y,["#ffe08a","#fff0c4"],8);
  }
  const boost = auraBonus(die);
  if (boost.bonus) spark(die.x,die.y,["#90eed0"],4);
  if (boost.heat) gainFever(boost.heat);
  const multiplier = feverMultiplier();
  const highCombo = linked.size>0 && streak>=4;
  const highStar = stars>=3;
  const specialActive = blastFired || (heat && die.face>=heat.face) || special==="aura" || boost.bonus>0;
  const burst = multiplier===2 && ((highStar && (highCombo || specialActive)) || (highCombo && specialActive)) ?
    (highStar && highCombo && specialActive ? 6 : 4) : 0;
  const payout = Math.round((base+bonus)*(1+boost.bonus/100)*(multiplier===2 ? 1+(heat?.feverBonus ?? 0) : 1))*(burst || multiplier);
  const amount = Math.round(payout*(1+rewards.income/100));
  credit(amount);
  if (multiplier===2) {
    state.feverCoins = Math.min(Number.MAX_SAFE_INTEGER,state.feverCoins+amount);
    state.bestFeverCoins = Math.max(state.bestFeverCoins,state.feverCoins);
  }
  if (burst) {
    state.feverBurstRolls++;
    state.bestFeverBursts = Math.max(state.bestFeverBursts,state.feverBurstRolls);
    burstPayout = time<burstUntil ? Math.max(burstPayout,burst) : burst;
    burstUntil = time+.7;
    spark(die.x,die.y,["#ffe18b","#a5ffe7"],10);
    sound("burst");
    trackMastery(false);
  }
  sound("land");
  sound("coin");
  const life = bonus || burst ? 1.1 : .85;
  placePopup({x:die.x,y:die.y-14*unit,life,total:life,amount,crit:bonus ? streak : 0,fever:multiplier===2,burst});
  awardMilestones();
}
function tickDie(die,dt) {
  if (isFusing(die)) return;
  die.x += die.vx*dt;
  die.y += die.vy*dt;
  const friction = Math.exp(-(die.rolling ? 1.15 : 8)*dt);
  die.vx *= friction;
  die.vy *= friction;
  confine(die);
  if (!die.rolling) return;
  if (starStats(die).targets && !reducedMotion.matches) {
    die.trail ??= [];
    if (time-(die.trail.at(-1)?.t ?? -Infinity)>=.04) {
      die.trail.push({x:die.x-die.z*.1,y:die.y-die.z*.51-4.8*unit,t:time});
      if (die.trail.length>8) die.trail.shift();
    }
  }
  die.vz -= 900*unit*dt;
  die.z += die.vz*dt;
  die.rx += die.sx*dt;
  die.ry += die.sy*dt;
  die.rz += die.sz*dt;
  if (die.z <= 0) {
    die.z = 0;
    if (die.bounces < 2) {
      die.vz = Math.max(36*unit,-die.vz*(die.bounces ? .39 : .48));
      die.bounces++;
      die.sx *= .54;
      die.sy *= .54;
      die.sz *= .62;
      sound("hit");
    } else settle(die);
  }
  if (die.rolling && die.bounces === 2) {
    const [rx,ry] = restAngles(die.nextFace);
    const wrap = a=>Math.atan2(Math.sin(a),Math.cos(a));
    die.rx += wrap(rx-die.rx)*Math.min(1,dt*24);
    die.ry += wrap(ry-die.ry)*Math.min(1,dt*24);
  }
}
function separateDice() {
  for (let i=0;i<dice.length;i++) {
    const a = dice[i];
    if (isFusing(a)) continue;
    const aSize = starStats(a).size;
    for (let j=i+1;j<dice.length;j++) {
      const b = dice[j];
      if (isFusing(b) || Math.abs(a.z-b.z)>17*unit) continue;
      const min = 14*unit*(aSize+starStats(b).size);
      const dx = b.x-a.x, dy = b.y-a.y;
      const distSq = dx*dx+dy*dy;
      if (distSq >= min*min) continue;
      const dist = Math.sqrt(distSq);
      const nx = dist > .001 ? dx/dist : 1, ny = dist > .001 ? dy/dist : 0;
      const gap = (min-dist)*.31;
      a.x -= nx*gap; a.y -= ny*gap;
      b.x += nx*gap; b.y += ny*gap;
      const approach = (a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
      if (approach > 0) {
        const transfer = approach*.61;
        a.vx -= transfer*nx; a.vy -= transfer*ny;
        b.vx += transfer*nx; b.vy += transfer*ny;
        if (approach > 34*unit) sound("hit");
      }
      confine(a,false); confine(b,false);
    }
  }
}
function armBase(index) {
  const at = [.46,.56,.32,.7,.65,.34][index];
  const side = [0,1,2,3,2,3][index];
  if (side < 2) return {x:side ? board.x+board.w+board.rail*.46 : board.x-board.rail*.46,
    y:board.y+board.h*at,angle:side ? Math.PI : 0};
  return {x:board.x+board.w*at,
    y:side === 2 ? board.y-board.rail*.46 : board.y+board.h+board.rail*.46,
    angle:side === 2 ? Math.PI/2 : -Math.PI/2};
}
function tickArm(arm,dt) {
  if (arm.sweep) {
    arm.sweep.elapsed += dt*feverMultiplier();
    if (arm.sweep.elapsed>.66) arm.sweep = null;
  }
  if (time >= arm.next) {
    const available = dice.filter(die=>!isFusing(die));
    const settled = available.filter(die=>!die.rolling);
    const targets = settled.length ? settled : available;
    const target = targets[Math.floor(Math.random()*targets.length)];
    if (!target) {
      arm.next = time+.12;
      return;
    }
    arm.sweep = {elapsed:0,x:target.x,y:target.y,target,fired:false};
    arm.next = time+armInterval();
  }
  if (arm.sweep && !arm.sweep.fired && arm.sweep.elapsed >= .24) {
    const sweep = arm.sweep;
    sweep.fired = true;
    let target = sweep.target;
    if (target.rolling || isFusing(target)) {
      let nearest = Infinity;
      for (const die of dice) {
        if (die.rolling || isFusing(die)) continue;
        const distance = Math.hypot(die.x-sweep.x,die.y-sweep.y);
        if (distance>=nearest) continue;
        target = die;
        nearest = distance;
      }
    }
    const angle = random(0,Math.PI*2);
    const inwardX = .86*(1-2*(target.x-board.x)/board.w);
    const inwardY = .86*(1-2*(target.y-board.y)/board.h);
    const originX = target.x-(Math.cos(angle)+inwardX)*unit;
    const originY = target.y-(Math.sin(angle)+inwardY)*unit;
    if (!launch(target,originX,originY,1,false)) return;
    sweep.x = target.x;
    sweep.y = target.y;
    spark(target.x,target.y,["#8cfacf","#d5ffcd"],7);
    sound("hit");
    if (state.talents.chain) cascadeArm(target);
    if (state.talents.armWave) addWave(target,"arm");
  }
}
function cascadeArm(source) {
  const rank = state.talents.chain;
  const reach = Math.min(board.w,board.h)*chainRange(rank,state.speed);
  let remaining = rank*2;
  let sources = [source];
  for (let depth=0;depth<rank && remaining>0 && sources.length;depth++) {
    const next = [];
    for (const from of sources) {
      const nearby = dice.filter(die=>!die.rolling && !isFusing(die))
        .map(die=>({die,distance:Math.hypot(die.x-from.x,die.y-from.y)}))
        .filter(item=>item.distance<=reach)
        .sort((a,b)=>a.distance-b.distance);
      for (const {die} of nearby.slice(0,Math.min(2,remaining))) {
        if (!launch(die,from.x,from.y,.9,false)) continue;
        next.push(die);
        beams.push({a:from,b:die,life:.49,phase:random(0,6),arm:true});
        remaining--;
      }
      if (!remaining) break;
    }
    sources = next;
  }
}
function tickFusion() {
  if (!fusions.length) return;
  for (const fusion of fusions) {
    if (fusion.impacted || time-fusion.start<FUSION_IMPACT) continue;
    fusion.impacted = true;
    spark(fusion.x,fusion.y,[starStats(fusion.die).color,"#fff3c6","#ffe29a"],30);
  }
  fusions = fusions.filter(fusion=>time-fusion.start<FUSION_DURATION);
}
function step(dt) {
  time += dt;
  state.seconds += dt;
  tickFusion();
  tickFever(dt);
  for (const arm of arms) tickArm(arm,dt);
  for (const wave of waves) {
    wave.t += dt;
    const radius = waveRadius(wave);
    for (const die of dice) {
      if (wave.remaining<=0) break;
      if (!wave.hit.has(die) && Math.hypot(die.x-wave.x,die.y-wave.y)<=radius) {
        wave.hit.add(die);
        if (launch(die,wave.x,wave.y,wave.strength,wave.kind==="manual")) {
          die.manualBatch = wave.batch;
          die.fromBlast = wave.kind==="blast";
          die.echo = wave.echo;
          if (wave.echo?.source && Math.random()<wave.echo.chance) die.nextFace = wave.echo.face;
          wave.remaining--;
        }
      }
    }
  }
  waves = waves.filter(w=>w.t<w.life);
  for (const die of dice) tickDie(die,dt);
  separateDice();
  for (const particle of particles) {
    particle.x += particle.vx*dt;
    particle.y += particle.vy*dt;
    particle.vy += 70*unit*dt;
    particle.life -= dt;
  }
  for (const popup of popups) popup.life -= dt;
  popups = popups.filter(popup=>popup.life>0);
  for (const list of [particles,beams]) {
    for (const effect of list) if (list!==particles) effect.life -= dt;
    while (list[0]?.life<=0) list.shift();
  }
}
function rounded(g,x,y,w,h,r) {
  g.beginPath();
  g.roundRect(x,y,w,h,Math.max(0,Math.min(r,w*.5,h*.5)));
}
function gradient(g,x1,y1,x2,y2,stops) {
  const fill = g.createLinearGradient(x1,y1,x2,y2);
  stops.forEach(([at,color])=>fill.addColorStop(at,color));
  return fill;
}
function seededRandom(seed) {
  return ()=>{
    seed = (1664525*seed+1013904223)>>>0;
    return seed/4294967296;
  };
}
function createFeltPattern() {
  const tile = document.createElement("canvas");
  tile.width = tile.height = 192;
  const brush = tile.getContext("2d");
  const rand = seededRandom(50783);
  const fibers = Math.ceil(tile.width*tile.height*.105);
  for (let i=0;i<fibers;i++) {
    brush.fillStyle = i%2 ? "rgba(9,34,25,.14)" : "rgba(198,217,164,.13)";
    brush.fillRect(rand()*tile.width,rand()*tile.height,.3+rand()*1.55,.45+rand()*.9);
  }
  return backdropCtx.createPattern(tile,"repeat");
}
const feltPattern = createFeltPattern();
function applySkin() {
  const skin = skins[state.skin].id;
  feverStage.dataset.skin = skin;
  document.querySelector(".panel").dataset.skin = skin;
  if (board) paintTable();
}
function paintTable() {
  const g = backdropCtx, rand = seededRandom(91273);
  g.resetTransform();
  g.clearRect(0,0,backdrop.width,backdrop.height);
  g.setTransform(resolution,0,0,resolution,0,0);
  const {outer:o,rail,depth,x,y,w,h} = board;
  const skin = skins[state.skin];
  const round = rail*1.7;
  g.save();
  g.shadowColor = "#050f0bb8";
  g.shadowBlur = 22*unit;
  g.shadowOffsetY = 8*unit;
  rounded(g,o.x,o.y+depth,o.w,o.h,round);
  g.fillStyle = "#321e18";
  g.fill();
  g.restore();

  const lip = gradient(g,0,o.y+o.h-depth,0,o.y+o.h+depth,
    [[0,skin.lip[0]],[.5,skin.lip[1]],[.72,skin.lip[2]],[1,skin.lip[3]]]);
  rounded(g,o.x,o.y+depth,o.w,o.h,round);
  g.fillStyle = lip;
  g.fill();
  rounded(g,o.x,o.y,o.w,o.h,round);
  g.fillStyle = gradient(g,o.x,o.y,o.x+o.w*.72,o.y+o.h,
    [[0,skin.rail[0]],[.2,skin.rail[1]],[.45,skin.rail[2]],[.74,skin.rail[3]],[1,skin.rail[4]]]);
  g.fill();
  g.save();
  g.clip();
  for (let i=0;i<235;i++) {
    const py = o.y+rand()*o.h;
    const px = o.x-rand()*o.w*.25;
    const amp = .7+rand()*4;
    g.beginPath();
    g.moveTo(px,py);
    g.bezierCurveTo(px+o.w*.31,py+amp*3,px+o.w*.67,py-amp*2,px+o.w*1.3,py+amp);
    g.strokeStyle = i%3 ? "rgba(56,25,15,"+(.055+rand()*.16)+")" : "rgba(255,185,116,"+(.04+rand()*.12)+")";
    g.lineWidth = .45+rand()*1.05;
    g.stroke();
  }
  g.restore();

  for (const [inset,color,line] of [[1.3,skin.inlay+"6e",1.5],[rail*.27,"#2b1715b0",1.9],[rail*.34,skin.inlay+"5d",.9],[rail*.78,"#2d1d16",3]]) {
    rounded(g,o.x+inset,o.y+inset,Math.max(1,o.w-inset*2),Math.max(1,o.h-inset*2),round-inset*.65);
    g.strokeStyle = color;
    g.lineWidth = line*unit;
    g.stroke();
  }

  const feltRound = rail*.8;
  rounded(g,x,y,w,h,feltRound);
  g.fillStyle = "#235841";
  g.fill();
  g.save();
  g.clip();
  const cx=x+w*.51, cy=y+h*.42;
  const felt = g.createRadialGradient(cx,cy,0,cx,cy,Math.max(w,h)*.68);
  felt.addColorStop(0,skin.felt[0]);
  felt.addColorStop(.58,skin.felt[1]);
  felt.addColorStop(1,skin.felt[2]);
  g.fillStyle = felt;
  g.fillRect(x,y,w,h);
  g.fillStyle = feltPattern;
  g.fillRect(x,y,w,h);
  const edge = Math.min(w,h)*.045;
  rounded(g,x+edge,y+edge,w-edge*2,h-edge*2,rail*.62);
  g.strokeStyle = skin.inlay+"5a";
  g.lineWidth = Math.max(.7,unit);
  g.stroke();
  const lines = [[1,1],[-1,1],[1,-1],[-1,-1]];
  for (const [dx,dy] of lines) {
    const lx = dx>0 ? x+edge*1.6 : x+w-edge*1.6;
    const ly = dy>0 ? y+edge*1.6 : y+h-edge*1.6;
    g.beginPath();
    g.moveTo(lx+dx*edge*1.35,ly);
    g.lineTo(lx,ly);
    g.lineTo(lx,ly+dy*edge*1.35);
    g.strokeStyle = "#c9b67b77";
    g.stroke();
    diamond(g,lx+dx*edge*.8,ly+dy*edge*.8,Math.max(1.5,unit*2.4),"#d2c08f88");
  }
  const circleR = Math.min(w,h)*.285;
  for (const [r,color] of [[circleR,"#dcc28e30"],[circleR*.935,"#dcc28e22"]]) {
    g.beginPath();
    g.arc(x+w/2,y+h/2,r,0,Math.PI*2);
    g.strokeStyle = color;
    g.lineWidth = unit;
    g.stroke();
  }
  for (const [dx,dy] of [[0,1],[0,-1],[-1,0],[1,0]]) {
    diamond(g,x+w/2+circleR*.975*dx,y+h/2+circleR*.975*dy,3.2*unit,"#d2c08f7c");
  }
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = skin.inlay+"6e";
  g.font = "700 "+Math.max(9,Math.min(h*.077,w*.088))+"px Georgia";
  g.fillText("DICE TABLE",x+w/2,y+h/2,w*.47);
  g.beginPath();
  g.moveTo(x+w/2-circleR*.37,y+h/2+circleR*.23);
  g.lineTo(x+w/2+circleR*.37,y+h/2+circleR*.23);
  g.strokeStyle = "#dcc28e45";
  g.stroke();
  diamond(g,x+w/2,y+h/2+circleR*.35,3.2*unit,"#d2c08f80");
  g.restore();

  rounded(g,x,y,w,h,feltRound);
  g.strokeStyle = "#162a20";
  g.lineWidth = 2.7*unit;
  g.stroke();
  rounded(g,x+2*unit,y+2*unit,Math.max(1,w-4*unit),Math.max(1,h-4*unit),feltRound);
  g.strokeStyle = "#122f2588";
  g.lineWidth = 2*unit;
  g.stroke();

  for (const at of [.16,.84]) {
    for (const py of [o.y+rail*.5,o.y+o.h-rail*.5]) {
      const px = o.x+o.w*at;
      g.beginPath(); g.arc(px,py,3.1*unit,0,Math.PI*2);
      g.fillStyle="#35241b";g.fill();
      g.beginPath(); g.arc(px,py-.5*unit,2.3*unit,0,Math.PI*2);
      g.fillStyle="#d0a36a";g.fill();
      g.beginPath();g.moveTo(px-1.2*unit,py);g.lineTo(px+1.2*unit,py-.8*unit);
      g.strokeStyle="#795132";g.lineWidth=.9*unit;g.stroke();
    }
  }
}
function diamond(g,x,y,r,color) {
  g.beginPath();g.moveTo(x,y-r);g.lineTo(x+r,y);g.lineTo(x,y+r);g.lineTo(x-r,y);g.closePath();
  g.fillStyle=color;g.fill();
}

const meshPoints = [
  [-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],
  [-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1],
];
// Each tuple gives a face's value and its corners in outward winding order.
const faces = [[1,4,5,6,7],[6,0,3,2,1],[2,3,7,6,2],[5,0,1,5,4],[3,1,2,6,5],[4,0,4,7,3]];
const pips = [
  [],[[0,0]],[[-1,-1],[1,1]],[[-1,-1],[0,0],[1,1]],
  [[-1,-1],[1,-1],[-1,1],[1,1]],[[-1,-1],[1,-1],[0,0],[-1,1],[1,1]],
  [[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]],
];
function softFace(points,radius) {
  ctx.beginPath();
  points.forEach((p,i)=>{
    const prev = points[(i+3)%4], next = points[(i+1)%4];
    const before = Math.min(.23,radius/(Math.hypot(p.x-prev.x,p.y-prev.y)||1));
    const after = Math.min(.23,radius/(Math.hypot(p.x-next.x,p.y-next.y)||1));
    const x = p.x+(prev.x-p.x)*before, y = p.y+(prev.y-p.y)*before;
    if (i) ctx.lineTo(x,y);
    else ctx.moveTo(x,y);
    ctx.quadraticCurveTo(p.x,p.y,p.x+(next.x-p.x)*after,p.y+(next.y-p.y)*after);
  });
  ctx.closePath();
}
const paintDepth = die => die.y+die.z*.9;
const edgeSide = (a,b,p) => (b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);
function projectDie(die,stars = state.dieStars[die.slot]) {
  const size = 14.2*unit*STAR_RANKS[stars-1].size*(1+Math.min(.28,die.z/(340*unit)));
  const cx = die.x-die.z*.10, cy = die.y-die.z*.51-4.8*unit;
  const ax=Math.cos(die.rx), bx=Math.sin(die.rx);
  const ay=Math.cos(die.ry), by=Math.sin(die.ry);
  const az=Math.cos(die.rz), bz=Math.sin(die.rz);
  const points = meshPoints.map(([x,y,z])=>{
    const yy=y*ax-z*bx, zz=y*bx+z*ax;
    const xx=x*ay+zz*by, depth=-x*by+zz*ay;
    return {x:cx+(xx*az-yy*bz)*size,y:cy+((xx*bz+yy*az)*.91-depth*.30)*size};
  });
  return {size,points};
}
function drawDie(die,preset = null) {
  const rank = preset?.rank ?? state.dieMaterials[die.slot];
  const material = materials[rank];
  const special = SPECIAL_DICE[preset ? preset.type : state.dieSpecials[die.slot]];
  const stars = preset?.stars ?? state.dieStars[die.slot];
  const {size,points} = projectDie(die,stars);
  for (const [value,a,b,c,d] of faces) {
    const p=points[a], q=points[b], r=points[c], s=points[d];
    const ux=q.x-p.x, uy=q.y-p.y, vx=s.x-p.x, vy=s.y-p.y;
    if (ux*vy-uy*vx < .7) continue;
    const bright = Math.abs(ux*vy-uy*vx) > size*size*2;
    softFace([p,q,r,s],2.9*unit);
    ctx.fillStyle = gradient(ctx,0,Math.min(p.y,q.y,r.y,s.y),0,Math.max(p.y,q.y,r.y,s.y),
      [[0,bright ? material.high : material.low],[1,bright ? material.low : material.side]]);
    ctx.fill();
    ctx.lineWidth = .86*unit;
    ctx.strokeStyle = bright ? special?.color ?? (stars>1 ? "#ffe7a3" : material.edge) : material.edge;
    ctx.stroke();
    if (rank===0 && bright) {
      ctx.save();
      ctx.clip();
      ctx.strokeStyle="#864d242a";
      ctx.lineWidth=.62*unit;
      for (let i=0;i<4;i++) {
        const y = p.y+vy*(i+1)/5, x = p.x+vx*(i+1)/5;
        ctx.beginPath();ctx.moveTo(x,y);
        ctx.quadraticCurveTo(x+ux*.58+vx*.09,y+uy*.58+vy*.09,x+ux,y+uy);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.save();
    ctx.transform(ux,uy,vx,vy,p.x,p.y);
    for (const [dx,dy] of pips[value]) {
      const x=.5+dx*.237, y=.5+dy*.237, radius=value===1 ? .094 : .074;
      ctx.beginPath();ctx.arc(x,y+.014,radius,0,Math.PI*2);
      ctx.fillStyle = bright ? "#fff7cf70" : "#ffedb44d";ctx.fill();
      ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);
      ctx.fillStyle=material.pip;ctx.fill();
    }
    ctx.restore();
  }
  if (special) {
    const x = die.x-die.z*.1+size*.78, y = die.y-die.z*.51-size*.95;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x,y,Math.max(6,7.4*unit),0,Math.PI*2);
    ctx.fillStyle = "#142e28";
    ctx.fill();
    ctx.strokeStyle = special.color;
    ctx.lineWidth = Math.max(1,unit);
    ctx.stroke();
    ctx.font = "750 "+Math.max(8,9*unit)+"px 'Segoe UI',sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = special.color;
    ctx.fillText(special.mark,x,y);
    ctx.restore();
  }
  if (stars>1) {
    const x = die.x-die.z*.1-size*.83, y = die.y-die.z*.51-size*1.04;
    ctx.save();
    ctx.font = "800 "+Math.max(10,11*unit)+"px 'Segoe UI',sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 2.4*unit;
    ctx.strokeStyle = "#1b3228";
    ctx.strokeText("★"+stars,x,y);
    ctx.fillStyle = "#ffe5a0";
    ctx.fillText("★"+stars,x,y);
    ctx.restore();
  }
}
function drawArm(arm,index) {
  const base = armBase(index);
  const {x,y,angle} = base;
  const reach = arm.sweep ? clamp(arm.sweep.elapsed/.66,0,1) : 0;
  const extension = arm.sweep ? (reach<.39 ? ease(reach/.39) : 1-ease((reach-.39)/.61)) : 0;
  const restX = x+Math.cos(angle)*34*unit, restY = y+Math.sin(angle)*34*unit;
  const tipX = restX+((arm.sweep?.x ?? restX)-restX)*extension;
  const tipY = restY+((arm.sweep?.y ?? restY)-restY)*extension;
  const dir = Math.atan2(tipY-y,tipX-x);
  const bend = (13+Math.sin(reach*Math.PI)*30)*unit;
  const elbowX=(x+tipX)*.5-Math.sin(dir)*bend, elbowY=(y+tipY)*.5+Math.cos(dir)*bend;
  ctx.lineJoin="round";ctx.lineCap="round";
  for (const [thickness,color,offset] of [[14,"#142a23ad",4],[12,"#2b2722",0],[8,"#94704d",0],[3,"#efbc77",-2]]) {
    ctx.beginPath();ctx.moveTo(x,y+offset*unit);ctx.lineTo(elbowX,elbowY+offset*unit);ctx.lineTo(tipX,tipY+offset*unit);
    ctx.strokeStyle=color;ctx.lineWidth=thickness*unit;ctx.stroke();
  }
  for (const [px,py,r] of [[x,y,12],[elbowX,elbowY,6],[tipX,tipY,5]]) {
    ctx.beginPath();ctx.arc(px,py,r*unit,0,Math.PI*2);
    ctx.fillStyle="#29352c";ctx.fill();ctx.strokeStyle="#bb9863";ctx.lineWidth=1.5*unit;ctx.stroke();
    ctx.beginPath();ctx.arc(px,py,r*.31*unit,0,Math.PI*2);
    ctx.fillStyle=arm.sweep ? "#afffce" : "#dfbb74";ctx.fill();
  }
  ctx.save();
  ctx.translate(tipX,tipY);
  ctx.rotate(Math.atan2(tipY-elbowY,tipX-elbowX));
  ctx.beginPath();ctx.moveTo(2*unit,-2*unit);ctx.lineTo(9*unit,-5*unit);ctx.lineTo(13*unit,-3*unit);
  ctx.moveTo(2*unit,2*unit);ctx.lineTo(9*unit,5*unit);ctx.lineTo(13*unit,3*unit);
  ctx.strokeStyle=arm.sweep ? "#c9ffdd" : "#e9bd7e";ctx.lineWidth=2*unit;ctx.stroke();
  ctx.restore();
}
function drawWave(wave) {
  const t = clamp(wave.t/wave.life,0,1);
  const radius = waveRadius(wave);
  if (radius<=0) return;
  ctx.beginPath();ctx.arc(wave.x,wave.y,radius,0,Math.PI*2);
  const color = wave.kind==="blast" ? "255,153,91" : wave.kind==="arm" ? "145,247,213" :
    wave.kind==="star" ? "200,173,255" : "255,213,137";
  ctx.strokeStyle="rgba("+color+","+(1-t)*.66+")";
  ctx.lineWidth=Math.min(radius*.18,(3.5-2*t)*unit);ctx.stroke();
  ctx.beginPath();ctx.arc(wave.x,wave.y,radius*.8,0,Math.PI*2);
  ctx.strokeStyle="rgba("+color+","+(1-t)*.25+")";
  ctx.lineWidth=Math.min(radius*.08,unit);ctx.stroke();
}
function drawBeam(beam) {
  const {a,b,life,phase} = beam;
  const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;
  const yA=a.y-a.z*.53, yB=b.y-b.z*.53;
  ctx.beginPath();ctx.moveTo(a.x,yA);
  for (let i=1;i<8;i++) {
    const at=i/8, twitch=Math.sin(i*7.1+time*34+phase)*5.2*unit;
    ctx.lineTo(a.x+dx*at-dy/len*twitch,yA+(yB-yA)*at+dx/len*twitch);
  }
  ctx.lineTo(b.x,yB);
  ctx.globalAlpha=clamp(life/.49,0,1);
  ctx.strokeStyle=beam.arm ? "#f8ab557b" : "#80f9a87b";ctx.lineWidth=7*unit;ctx.stroke();
  ctx.strokeStyle=beam.arm ? "#ffe2ae" : "#ceffd8";ctx.lineWidth=1.6*unit;ctx.stroke();
  ctx.globalAlpha=1;
}
function reflowPopups() {
  const shallow = board.h<100 && width>board.w*1.8;
  const x = shallow ? 8 : board.x, y = shallow ? 3 : board.y;
  const w = shallow ? width-16 : board.w, h = shallow ? Math.max(1,height-6) : board.h;
  const columns = Math.max(1,Math.floor(w/Math.max(100,105*unit)));
  const rows = Math.max(1,Math.floor(h/Math.max(33,36*unit)));
  popupGrid = {x,y,columns,rows,w:w/columns,h:h/rows};
  const previous = popups;
  popups = [];
  for (const popup of previous) placePopup(popup);
}
function popupCell(slot) {
  const {x,y,columns,w,h} = popupGrid;
  return {x:x+(slot%columns+.5)*w,y:y+(Math.floor(slot/columns)+.5)*h};
}
function placePopup(popup) {
  const {columns,rows} = popupGrid;
  const occupied = new Set(popups.map(item=>item.slot));
  let closest = -1, bestDistance = Infinity;
  for (let slot=0;slot<columns*rows;slot++) {
    if (occupied.has(slot)) continue;
    const {x,y} = popupCell(slot);
    const distance = (x-popup.x)**2+(y-popup.y)**2;
    if (distance>=bestDistance) continue;
    closest = slot;
    bestDistance = distance;
  }
  if (closest>=0) {
    popup.slot = closest;
    popups.push(popup);
    return;
  }
  // On a packed table, combine nearby payouts inside an existing slot.
  const nearest = popups.reduce((best,item)=>{
    const cell = popupCell(item.slot);
    const distance = (cell.x-popup.x)**2+(cell.y-popup.y)**2;
    return distance<best.distance ? {item,distance} : best;
  },{distance:Infinity}).item;
  nearest.amount += popup.amount;
  nearest.crit = Math.max(nearest.crit,popup.crit);
  nearest.fever ||= popup.fever;
  nearest.burst = Math.max(nearest.burst ?? 0,popup.burst ?? 0);
  nearest.life = Math.max(nearest.life,.4);
}
function drawPopup(popup) {
  const age=popup.total-popup.life;
  const cell = popupCell(popup.slot);
  const maxWidth = Math.max(1,popupGrid.w-7);
  const annotated = popup.crit || popup.burst;
  const amountSize = Math.min(popupGrid.h*.36,Math.max(13,(annotated ? 17 : 15)*unit));
  const comboSize = Math.min(popupGrid.h*.26,Math.max(10,11*unit));
  const x=cell.x, y=cell.y-popupGrid.h*(age/popup.total*.14+(annotated ? .11 : 0));
  ctx.globalAlpha=clamp(popup.life/.23,0,1);
  ctx.textAlign="center";
  ctx.textBaseline="middle";
  ctx.lineWidth=Math.min(3*unit,popupGrid.h*.05);
  ctx.strokeStyle="#17322a";
  ctx.font="800 "+amountSize+"px 'Segoe UI',sans-serif";
  const label="＋"+short(popup.amount);
  ctx.strokeText(label,x,y,maxWidth);
  ctx.fillStyle=popup.burst ? "#ffe48b" : popup.fever ? "#fff0ad" : popup.crit ? "#c7ffcc" : "#ffe4a1";
  ctx.fillText(label,x,y,maxWidth);
  if (annotated) {
    const combo=popup.burst ? "バースト ×"+popup.burst+(popup.crit ? " · 共鳴 ×"+popup.crit : "") :
      "共鳴クリティカル"+(popup.crit>1 ? " ×"+popup.crit : "");
    const comboY = y+(amountSize+comboSize)*.64;
    ctx.font="750 "+comboSize+"px 'Segoe UI',sans-serif";
    ctx.strokeText(combo,x,comboY,maxWidth);
    ctx.fillText(combo,x,comboY,maxWidth);
  }
  ctx.globalAlpha=1;
}
function tableShake() {
  if (reducedMotion.matches) return {x:0,y:0};
  const elapsed = time-shakeStart;
  const amplitude = elapsed>=SHAKE_DURATION ? 0 : shakeAmplitude*ease(clamp(elapsed/.03,0,1))*(1-elapsed/SHAKE_DURATION)**2;
  const latestImpact = fusions.findLast(fusion=>fusion.impacted);
  const impact = latestImpact ? time-latestImpact.start-FUSION_IMPACT : -1;
  const kick = impact>=0 && impact<.24 ? 3.1*Math.sin(impact*55)*(1-impact/.24)**2 : 0;
  const x = amplitude ? Math.sin(elapsed*62)*amplitude : 0;
  const y = amplitude ? Math.sin(elapsed*48)*amplitude*.55 : 0;
  return {x:clamp(x+kick*.65,-3.2,3.2),y:clamp(y+kick,-3.2,3.2)};
}
function drawStarAura(die) {
  const star = starStats(die);
  if (!star.targets || isFusing(die)) return;
  const radius = (23+star.targets*2)*unit*star.size;
  ctx.beginPath();
  ctx.ellipse(die.x,die.y,radius,radius*.77,0,0,Math.PI*2);
  ctx.fillStyle = star.color+"1e";
  ctx.fill();
  ctx.lineWidth = 5*unit;
  ctx.strokeStyle = star.color+"30";
  ctx.stroke();
  ctx.lineWidth = 1.25*unit;
  ctx.strokeStyle = star.color+"bd";
  ctx.stroke();
  if (!reducedMotion.matches) {
    const angle = time*1.45+die.slot;
    diamond(ctx,die.x+Math.cos(angle)*radius,die.y+Math.sin(angle)*radius*.77,2.3*unit,star.color);
  }
}
function drawStarTrail(die) {
  if (!die.trail?.length || reducedMotion.matches) return;
  const star = starStats(die);
  ctx.save();
  for (const point of die.trail) {
    const alpha = clamp(1-(time-point.t)/.35,0,1);
    if (!alpha) continue;
    ctx.beginPath();
    ctx.arc(point.x,point.y,(2+alpha*4)*unit*star.size,0,Math.PI*2);
    ctx.globalAlpha = .31*alpha;
    ctx.fillStyle = star.color;
    ctx.fill();
  }
  ctx.restore();
}
function drawFusion(fusion) {
  const elapsed = time-fusion.start;
  const {x,y} = fusion;
  const star = starStats(fusion.die);
  if (elapsed<FUSION_IMPACT) {
    if (reducedMotion.matches) return;
    const t = ease(elapsed/FUSION_IMPACT);
    for (const input of fusion.inputs) {
      const die = input.die;
      const moving = {...die,x:die.x+(x-die.x)*t,y:die.y+(y-die.y)*t,
        z:die.z*(1-t)+Math.sin(t*Math.PI)*19*unit,rz:die.rz+t*1.6};
      ctx.beginPath();ctx.moveTo(die.x,die.y);ctx.lineTo(moving.x,moving.y-moving.z*.51);
      ctx.lineWidth = 1.7*unit;
      ctx.strokeStyle = star.color+"8c";
      ctx.stroke();
      drawDie(moving,input);
    }
    return;
  }
  const t = clamp((elapsed-FUSION_IMPACT)/(FUSION_DURATION-FUSION_IMPACT),0,1);
  ctx.save();
  ctx.globalAlpha = (reducedMotion.matches ? .56 : .8)*(1-t);
  const radius = Math.min(board.w,board.h)*(reducedMotion.matches ? .11 : .05+.28*t);
  ctx.fillStyle = star.color+"29";
  ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);
  ctx.fill();
  ctx.strokeStyle = star.color;
  ctx.lineWidth = 3*unit;
  ctx.stroke();
  ctx.restore();
}
function draw() {
  ctx.clearRect(0,0,width,height);
  ctx.save();
  const shift = tableShake();
  ctx.translate(shift.x,shift.y);
  ctx.drawImage(backdrop,0,0,width,height);
  if (state.feverLeft>0) {
    const {outer:o,rail} = board;
    const intro = reducedMotion.matches ? 0 : clamp((state.feverLeft-FEVER_DURATION+.45)/.45,0,1);
    rounded(ctx,o.x+2*unit,o.y+2*unit,Math.max(1,o.w-4*unit),Math.max(1,o.h-4*unit),rail*1.7);
    ctx.strokeStyle="rgba(255,204,120,"+(.55+.35*intro)+")";
    ctx.lineWidth=2.4*unit;
    ctx.stroke();
  }
  ctx.save();
  rounded(ctx,board.x,board.y,board.w,board.h,board.rail*.77);
  ctx.clip();
  if (state.feverLeft>0) {
    ctx.fillStyle=feverGlow;
    ctx.fillRect(board.x,board.y,board.w,board.h);
  }
  for (const aura of dice) {
    if (aura.rolling || state.dieSpecials[aura.slot]!=="aura") continue;
    ctx.beginPath();
    const {range} = specialStats("aura",state.dieStars[aura.slot]);
    ctx.arc(aura.x,aura.y,Math.min(board.w,board.h)*range,0,Math.PI*2);
    ctx.fillStyle = "#90eed01a";
    ctx.fill();
    ctx.strokeStyle = "#90eed06b";
    ctx.lineWidth = Math.max(.75,unit);
    ctx.stroke();
  }
  for (const wave of waves) drawWave(wave);
  for (const die of dice) {
    if (isFusing(die)) continue;
    drawStarAura(die);
    const lift=die.z/unit, size=(16+lift*.09)*unit*starStats(die).size;
    ctx.beginPath();
    ctx.ellipse(die.x+die.z*.13+3*unit,die.y+die.z*.20+5*unit,size,size*.65,die.rz*.08,0,Math.PI*2);
    ctx.fillStyle="rgba(6,23,15,"+(.36/(1+lift*.016))+")";
    ctx.fill();
  }
  ctx.restore();
  for (const beam of beams) if (beam.life>0) drawBeam(beam);
  arms.forEach(drawArm);
  const ordered = [...dice].sort((a,b)=>paintDepth(a)-paintDepth(b));
  for (const die of ordered) {
    if (isFusing(die) && !reducedMotion.matches) continue;
    drawStarTrail(die);
    drawDie(die);
  }
  if (markedDie && !isFusing(markedDie) && time<markedUntil) {
    const die = markedDie;
    const y = die.y-die.z*.51;
    ctx.save();
    ctx.globalAlpha = Math.min(1,(markedUntil-time)*3);
    ctx.strokeStyle = "#ffe19b";
    ctx.lineWidth = 1.5*unit;
    ctx.beginPath();
    ctx.ellipse(die.x-die.z*.10,y-4*unit,22*unit,20*unit,0,0,Math.PI*2);
    ctx.stroke();
    ctx.fillStyle = "#ffe19b";
    ctx.textAlign = "center";
    ctx.font = "700 "+Math.max(10,12*unit)+"px 'Segoe UI',sans-serif";
    ctx.fillText("#"+(die.slot+1),die.x-die.z*.10,y-26*unit);
    ctx.restore();
  }
  for (const fusion of fusions) drawFusion(fusion);
  for (const p of particles) if (p.life>0) {
    ctx.globalAlpha=clamp(p.life/p.total,0,1);
    diamond(ctx,p.x,p.y,p.size,p.color);
  }
  ctx.globalAlpha=1;
  for (const p of popups) if (p.life>0) drawPopup(p);
  ctx.restore();
}

let pointer = null;
function inputPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const shift = tableShake();
  return {x:(event.clientX-rect.left)*width/Math.max(1,rect.width)-shift.x,
    y:(event.clientY-rect.top)*height/Math.max(1,rect.height)-shift.y};
}
function faceEntry(points,from,to) {
  let start = 0, end = 1;
  for (let i=0;i<points.length;i++) {
    const a = points[i], b = points[(i+1)%points.length];
    const first = edgeSide(a,b,from), last = edgeSide(a,b,to);
    if (first<0 && last<0) return Infinity;
    if (first<0) start = Math.max(start,first/(first-last));
    if (last<0) end = Math.min(end,first/(first-last));
    if (start>end) return Infinity;
  }
  return start;
}
function hitDie(from,to) {
  let target, entry = Infinity;
  for (const die of dice) {
    if (isFusing(die)) continue;
    const {points} = projectDie(die);
    for (const [,a,b,c,d] of faces) {
      if (edgeSide(points[a],points[b],points[d])<.7) continue;
      const at = faceEntry([points[a],points[b],points[c],points[d]],from,to);
      if (!Number.isFinite(at)) continue;
      if (at<entry || (at===entry && paintDepth(die)>=paintDepth(target))) {
        target = die;
        entry = at;
      }
    }
  }
  if (target) manualRoll(target,from.x+(to.x-from.x)*entry,from.y+(to.y-from.y)*entry);
}
function manualRoll(die,x,y) {
  const strength = 1+.062*state.wave;
  if (launch(die,x,y,strength,true) && state.wave) addWave(die);
}
function keyboardRoll() {
  const x = board.x+board.w/2, y = board.y+board.h/2;
  let nearest;
  let limit = Infinity;
  for (const die of dice) {
    if (die.rolling || isFusing(die)) continue;
    const distance = Math.hypot(die.x-x,die.y-y);
    if (distance <= limit) {
      nearest = die;
      limit = distance;
    }
  }
  if (nearest) manualRoll(nearest,x,y);
}
canvas.addEventListener("pointerdown",event=>{
  if (pointer || event.button !== 0) return;
  event.preventDefault();
  unlockAudio();
  canvas.setPointerCapture(event.pointerId);
  const at=inputPoint(event);
  pointer={id:event.pointerId,...at};
  hitDie(at,at);
});
function drag(event) {
  if (pointer?.id !== event.pointerId) return;
  const at=inputPoint(event);
  if (at.x!==pointer.x || at.y!==pointer.y) hitDie(pointer,at);
  pointer={id:event.pointerId,...at};
}
canvas.addEventListener("pointermove",drag);
canvas.addEventListener("pointerup",drag);
function release(event) {if (pointer?.id===event.pointerId) pointer=null;}
for (const event of ["pointerup","pointercancel","lostpointercapture"]) canvas.addEventListener(event,release);
document.addEventListener("keydown",event=>{
  if (event.repeat || dialog.open || vipDialog.open || (event.code!=="Space" && !(event.key==="Enter" && event.target===canvas))) return;
  if (event.target!==canvas && (event.target!==document.body || !matchMedia("(pointer:fine)").matches)) return;
  event.preventDefault();
  unlockAudio();
  keyboardRoll();
});

applySkin();
resize();
resetTable();
trackMastery();
draw();
updateSound();
renderUI();
const observer = new ResizeObserver(requestResize);
observer.observe(canvas);
window.addEventListener("resize",requestResize);

let previous=performance.now(), carry=0, lastUI=0, lastFeverUI=0;
function frame(now) {
  if (!document.hidden) {
    if (resizePending) resize();
    carry += Math.min(.06,(now-previous)/1000);
    while (carry>=1/120) {
      step(1/120);
      carry-=1/120;
    }
    draw();
    if (uiDirty || (!byId("stats").hidden && now-lastUI>500)) {
      renderUI();
      lastUI=now;
      lastFeverUI=now;
    } else if (state.feverLeft>0 && now-lastFeverUI>=50) {
      renderFever();
      lastFeverUI=now;
    }
  }
  previous=now;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
setInterval(()=>{if (!document.hidden) save();},4000);
document.addEventListener("visibilitychange",()=>{
  if (document.hidden) {
    hiddenAt=Date.now();
    save(hiddenAt);
  } else {
    if (hiddenAt) showIdle(hiddenAt,Date.now());
    hiddenAt=0;
    previous=performance.now();
    carry=0;
    save();
  }
});
window.addEventListener("pagehide",()=>save(hiddenAt || Date.now()));
