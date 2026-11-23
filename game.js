"use strict";

const byId = id => document.getElementById(id);
const canvas = byId("table");
const screenCtx = canvas.getContext("2d");
// Keep interaction and physics in CSS pixels. Artwork is drawn on a one-CSS-pixel grid.
const pixelScene = document.createElement("canvas");
const pixelScale = 1;
const pixelCtx = pixelScene.getContext("2d");
let ctx = pixelCtx;
const backdrop = document.createElement("canvas");
const backdropCtx = backdrop.getContext("2d");
const materials = [
  {name:"木製", multiplier:1, high:"#f5e6bf", low:"#c9a574", side:"#a78054", edge:"#584536", pip:"#253546"},
  {name:"銅製", multiplier:3, high:"#ffd1ae", low:"#c17556", side:"#a05239", edge:"#60392d", pip:"#542d25"},
  {name:"鉄製", multiplier:9, high:"#edf2f5", low:"#9aaab5", side:"#6f828e", edge:"#445761", pip:"#253840"},
  {name:"金製", multiplier:28, high:"#fff4a1", low:"#e9a838", side:"#b46b1b", edge:"#71461d", pip:"#553016"},
];
const caps = {dice:40, material:3, arms:6, speed:7, wave:8, baseIncome:12, quality:5};
const TREE_PRICE = 1000;
const SAVE_VERSION = 3;
const LEGACY_CHIP_VALUE = 250;
const MATERIAL_PRICES = [85,900,6200];
const SPECIAL_DICE = {
  blast:{ink:"#ae4731",stamp:"M12 1 14 7 20 4 18 10 23 12 17 14 19 21 13 17 9 23 8 17 2 18 6 12 1 8 8 8Z",skill:"specialBlast",name:"爆裂ダイス",mark:"爆",icon:"wave",color:"#ff9d63",cost:800,detail:"出目5・6で周囲に爆裂波を放つ"},
  aura:{ink:"#236c71",stamp:"M3 3H9V13Q9 17 12 17Q15 17 15 13V3H21V14Q21 23 12 23Q3 23 3 14Z",skill:"specialAura",name:"増幅ダイス",mark:"増",icon:"gem",color:"#90eed0",cost:1150,detail:"静止中、近くの他のダイスの配当を25%増やす"},
  heat:{ink:"#a45517",stamp:"M13 1Q17 9 15 12Q19 10 19 7Q26 19 15 23Q18 18 12 14Q12 18 9 19Q8 21 10 23Q0 20 4 12Q7 15 8 9Q9 4 13 1Z",skill:"specialHeat",name:"熱気ダイス",mark:"熱",icon:"speed",color:"#ffe08a",cost:1000,detail:"出目4〜6でフィーバーゲージを6ポイント加算"},
};
// Shared palettes and pixel motifs for the playable pieces and their catalog art.
const specialSkins = new Map([
  [SPECIAL_DICE.blast,{
    high:"#762c32",low:"#bc4635",side:"#3b202b",edge:"#291924",pip:"#fff2d2",
    glow:"#ff7850",shine:"#ffd587",
    motif:"M3 13H7V10H11V6H15V3H17V8H14V12H11V16H8V20H4V17H3Z M17 17H20V13H24V10H29V13H26V16H23V20H20V23H16V28H13V23H16V20H17Z",
  }],
  [SPECIAL_DICE.aura,{
    high:"#185360",low:"#2f9a90",side:"#173343",edge:"#122634",pip:"#edffdf",
    glow:"#79ffe0",shine:"#c5ffce",
    motif:"M5 6H10V4H22V6H27V10H25V8H21V6H11V8H7V10H5Z M5 22H7V24H11V26H21V24H25V22H27V26H22V28H10V26H5Z M3 14H6V18H3Z M26 14H29V18H26Z",
  }],
  [SPECIAL_DICE.heat,{
    high:"#a65a24",low:"#efaa39",side:"#573624",edge:"#382028",pip:"#fff6bd",
    glow:"#ffc65d",shine:"#fff1a6",
    motif:"M5 25H10V22H12V18H14V14H17V9H19V4H22V10H20V15H18V21H15V25H12V28H5Z M20 28H24V24H27V19H29V24H27V28H24V30H20Z M4 7H8V11H4Z",
  }],
]);
const specialMotifs = new Map([...specialSkins].map(([special,skin])=>[special,new Path2D(skin.motif)]));
const STAR_RANKS = [
  {pay:1,size:1,pulse:0,targets:0,match:0,heat:0,color:"#e5cc96"},
  {pay:2.65,size:1.13,pulse:.125,targets:1,match:.22,heat:4,color:"#ffe28d"},
  {pay:6.9,size:1.26,pulse:.205,targets:2,match:.36,heat:8,color:"#a4ffe4"},
  {pay:18,size:1.40,pulse:.29,targets:4,match:.52,heat:14,color:"#ffd296"},
];
const MERGE_PRICES = [12,175,1800];
const MERGE_MATERIAL_FACTORS = [1,2.4,6,14];
const MAX_STARS = STAR_RANKS.length;
const FUSION_IMPACT = .40;
const FUSION_DURATION = .82;
const MASTERY = [
  {track:"masteryGold",name:"金製の★4を作る",target:4},
  {track:"masterySpecial",name:"同じ特殊ダイスを4個分集める",target:4},
  {track:"masteryBurst",name:"1回のフィーバーで8回バースト",target:8},
];
const ALL_MASTERY = (1<<MASTERY.length)-1;
const skins = [
  {id:"classic",name:"ブルーマット",unlock:0,felt:["#68879b","#58778c","#4c6b80"],inlay:"#d9c48a",
    rail:["#9d6848","#72462f","#9d6441","#78432e","#563220"],lip:["#5d3727","#613827","#47271e","#2b1915"]},
  {id:"royal",name:"ロイヤルレッド",unlock:10000,felt:["#863a46","#672a37","#421b29"],inlay:"#f2bd76",
    rail:["#a77346","#6b3a2a","#925537","#603123","#41211e"],lip:["#77462b","#683529","#462423","#301819"]},
  {id:"cyber",name:"サイバーネオン",unlock:150000,felt:["#205c66","#174453","#102c3e"],inlay:"#76ffe0",
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
    detail:skin.mastery ? "テーブルマスタリー全達成" : skin.unlock ? "累計 "+skin.unlock.toLocaleString("ja-JP")+" コイン" : "初期テーブル"}))},
];
const COLLECTION_IDS = new Set(COLLECTION_GROUPS.flatMap(group=>group.entries.map(entry=>entry.id)));
const MILESTONE_GROUPS = [
  {id:"rolls",name:"累計ロール",unit:"回",targets:[25,250,2500],reward:"income",rate:1},
  {id:"best",name:"最大共鳴コンボ",unit:"連鎖",targets:[3,8,20],reward:"resonance",rate:1},
  {id:"feverStarts",name:"フィーバー発動",unit:"回",targets:[1,10,50],reward:"fever",rate:2},
  {id:"merges",name:"累計合成",unit:"回",targets:[1,12,60],reward:"income",rate:1},
  {id:"highestStar",name:"到達した星",unit:"★",targets:[2,3,4],reward:"resonance",rate:1},
  {id:"skills",name:"習得したスキル",unit:"種",targets:[1,3,8],reward:"income",rate:1},
  {id:"collection",name:"図鑑収集",unit:"種",targets:[5,10,15],reward:"income",rate:1},
];
const MILESTONE_IDS = new Set(MILESTONE_GROUPS.flatMap(group=>group.targets.map((_,index)=>group.id+"-"+index)));
const MILESTONE_REWARDS = {income:"獲得コイン",resonance:"共鳴ボーナス",fever:"フィーバー充填"};
const SPECIAL_CAP_COSTS = {
  blast:[2900,19000,80000,390000,1950000],
  aura:[3500,27000,115000,570000,2900000],
  heat:[3200,22000,96000,490000,2400000],
};
const SPECIAL_PATHS = {
  blast:{lane:"arms",at:[6,4],requires:{wave:1}},
  aura:{lane:"dice",at:[2,4],requires:n=>n>=4 ? {merge:1,material:2} : {merge:1}},
  heat:{lane:"roll",at:[4,5],requires:{fever:1}},
};
const talents = [
  {id:"quality",lane:"dice",at:[1,2,2],icon:"die",title:"ダイス品質",costs:[1200],requires:{tree:1},
    detail:()=>"「ダイス品質」を強化に追加。出目5・6の配当を伸ばす"},
  {id:"material",lane:"dice",at:[1,3],icon:"gem",title:"材質加工",costs:[2200,24000,320000],requires:{quality:1},
    progress:(n,s)=>n>1 ? materialRequirement(n-1,s) : null,
    detail:n=>materials[n].name+"までの材質進化を強化に追加"},
  {id:"materialStart",lane:"dice",at:[1,4],icon:"die",title:"材質の下地",costs:[12500,165000],requires:n=>({material:n}),
    progress:(n,s)=>materialRequirement(n,s),
    detail:n=>"新しく購入する通常ダイスは"+materials[n].name+"から開始"},
  {id:"merge",lane:"dice",at:[2,3],icon:"gem",title:"ダイス合成",costs:[2500],requires:{quality:1},
    progress:(_,s)=>progressRequirement("ダイス（合成前換算）",dicePriceBasis(s),2),
    detail:()=>"同じ材質・星の通常ダイス2個を合成できる"},
  {id:"income",lane:"roll",at:[3,4],icon:"coin",title:"配当アップ",costs:[3200,12500,90000,600000],requires:{resonance:1},
    progress:(n,s)=>progressRequirement("基礎収益アップ Lv.",s.baseIncome,[0,3,5,7][n-1]),
    detail:n=>"基礎配当 ＋"+20*n+"%"},
  {id:"match",lane:"roll",at:[3,2,2],icon:"wave",title:"共鳴",costs:[1000],requires:{tree:1},
    detail:()=>"近いタイミングに同じ目が出ると共鳴する"},
  {id:"resonance",lane:"roll",at:[3,3],icon:"wave",title:"共鳴配当",costs:[2600,16500,135000],requires:{match:1},
    progress:(n,s)=>progressRequirement("最大共鳴コンボ",s.best,[0,3,6][n-1]),
    detail:n=>"共鳴ボーナス ＋"+25*n+"%"},
  {id:"feverMode",lane:"roll",at:[4,3],icon:"speed",title:"フィーバー",costs:[3800],requires:{match:1},
    progress:(_,s)=>progressRequirement("累計共鳴",s.resonances,3),
    detail:()=>"共鳴などで充填するフィーバーゲージを追加"},
  {id:"fever",lane:"roll",at:[4,4],icon:"speed",title:"熱気の蓄積",costs:[6000,42000,330000],requires:{feverMode:1},
    progress:(n,s)=>progressRequirement("フィーバー発動",s.feverStarts,[1,4,12][n-1]),
    detail:n=>"共鳴によるゲージ充填 ＋"+20*n+"%"},
  {id:"wave",lane:"arms",at:[6,2],icon:"wave",title:"手動衝撃波",costs:[1400],requires:{tree:1},
    detail:()=>"「テーブル衝撃波」を強化に追加"},
  {id:"arms",lane:"arms",at:[5,2],icon:"arm",title:"ロボットアーム",costs:[1800],requires:{tree:1},
    detail:()=>"「ロボットアーム」を強化に追加"},
  {id:"speed",lane:"arms",at:[5,3],icon:"speed",title:"アーム速度",costs:[3600],requires:{arms:1},
    progress:(_,s)=>progressRequirement("アーム雇用",s.arms,1),
    detail:()=>"「アーム速度」を強化に追加"},
  {id:"chain",lane:"arms",at:[5,4],icon:"arm",title:"近接ダイス連鎖",costs:[6500,52000,390000],requires:{speed:1},
    progress:(n,s)=>[progressRequirement("アーム雇用",s.arms,1),
      progressRequirement("ダイス（合成前換算）",dicePriceBasis(s),[3,5,8][n-1])],
    detail:n=>n+" 段まで連鎖し、1作動につき最大 "+2*n+" 個を追加で投擲"},
  {id:"armWave",lane:"arms",at:[5,5,2],icon:"wave",title:"アーム衝撃波",costs:[240000],requires:{chain:2,wave:1},
    progress:(_,s)=>progressRequirement("テーブル衝撃波 Lv.",s.wave,1),
    detail:()=>"アームの主投擲で衝撃波を1回発生。衝撃波Lv.で範囲が広がる"},
  ...Object.entries(SPECIAL_DICE).map(([type,special])=>({
    id:special.skill,icon:type,title:special.name,
    costs:SPECIAL_CAP_COSTS[type],...SPECIAL_PATHS[type],
    progress:(n,s)=>progressRequirement("同種のダイス（合成前換算）",specialDiceBasis(s,type),n-1),
    detail:n=>n===1 ? "ショップに追加 · 同時に1個まで" : "同時に "+n+" 個まで",
  })),
];
const talentById = new Map(talents.map(talent=>[talent.id,talent]));
const skillRoot = {id:"tree",lane:"root",at:[3,1,2],icon:"gem",title:"スキルツリー解放"};
const upgrades = [
  {key:"dice", shop:true, icon:"die", title:"通常ダイス", action:"購入",
    cost:s=>dicePurchasePrice(normalDiceBasis(s)),
    detail:s=>"初期材質 "+materials[s.talents.materialStart].name+" · 価格基準 "+normalDiceBasis(s)+" 個分"},
  {key:"tree",shop:true,icon:"gem",title:"スキルツリー解放",action:"解放",cost:()=>TREE_PRICE,
    detail:()=>"共鳴・材質加工・自動化などのスキルを解放できる"},
  {key:"baseIncome",icon:"coin",title:"基礎収益アップ",action:"強化",
    cost:s=>[30,105,300,760][s.baseIncome] ?? 1800*2.65**(s.baseIncome-4),
    detail:s=>"Lv. "+s.baseIncome+" · 基礎配当 ＋"+35*s.baseIncome+"%（1Lv.ごとに＋35%）"},
  {key:"quality",skill:"quality",icon:"die",title:"ダイス品質",action:"強化",cost:s=>150*2.5**s.quality,
    detail:s=>"Lv. "+s.quality+" · 出目5・6の配当 ＋"+15*s.quality+"%"},
  {key:"material",skill:"material",icon:"gem",title:"ダイスの材質",action:"1個進化"},
  {key:"arms",skill:"arms",icon:"arm",title:"ロボットアーム",action:"雇用",cost:s=>420*3.25**s.arms,
    detail:s=>s.arms+" / 6 基 · "+(s.talents.armWave ? "主投擲で衝撃波" : s.talents.chain ? "1個を投擲し、近くへ連鎖" : "1作動につきダイス1個")},
  {key:"speed",skill:"speed",icon:"speed",title:"アーム速度",action:"強化",cost:s=>650*2.45**s.speed,
    detail:s=>s.arms ? "Lv. "+s.speed+" · "+armInterval().toFixed(1)+" 秒ごとに作動" : "ロボットアームを雇うと解放"},
  {key:"wave",skill:"wave",icon:"wave",title:"テーブル衝撃波",action:s=>s.wave ? "強化" : "有効化",
    cost:s=>s.wave<2 ? [240,690][s.wave] : 1600*2.25**(s.wave-2),
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
const icon = name => SPECIAL_DICE[name] ?
  '<svg aria-hidden="true" viewBox="0 0 24 24"><path fill="'+SPECIAL_DICE[name].ink+'" stroke="none" d="'+SPECIAL_DICE[name].stamp+'"/></svg>' :
  '<svg aria-hidden="true"><use href="#i-'+name+'"/></svg>';
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
function specialDiceBasis(progress,type) {
  return progress.dieSpecials.reduce((total,value,index)=>
    total+(value===type ? 2**(progress.dieStars[index]-1) : 0),0);
}
function normalDiceBasis(progress) {
  return progress.dieStars.reduce((count,stars,slot)=>count+(progress.dieSpecials[slot] ? 0 : 2**(stars-1)),0);
}
function dicePurchasePrice(basis) {
  if (!basis) return 9;
  if (basis<5) return [9,17,40,76][basis-1];
  const early = Math.min(basis,36);
  const middle = clamp(basis-36,0,20);
  const late = Math.max(0,basis-56);
  return 128*1.22**(early-5)*1.16**Math.max(0,early-9)*1.16**middle*(1+late/18)**2.45;
}
function rollValue(face,rank = 0,stars = 1) {
  const quality = face>=5 ? 1+.15*state.quality : 1;
  return Math.round(face*(rank===null ? 1 : materials[rank].multiplier)*STAR_RANKS[stars-1].pay*
    (1+.35*state.baseIncome)*(1+.2*state.talents.income)*quality);
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
  return {version:SAVE_VERSION,tree:false,coins:0,dice:1,dieMaterials:[0],dieSpecials:[null],dieStars:[1],
    baseIncome:0,quality:0,arms:0,speed:0,wave:0,rolls:0,resonances:0,
    best:0,earned:0,seconds:0,muted:false,feverCharge:0,feverLeft:0,
    skin:0,feverBurstRolls:0,masteryGold:0,masterySpecial:0,masteryBurst:0,masteryRewards:0,
    collection:[],achievements:[],highestStar:1,merges:0,feverStarts:0,feverCoins:0,bestFeverCoins:0,bestFeverBursts:0,
    talents:Object.fromEntries(talents.map(talent=>[talent.id,0])),
    savedAt:Date.now()};
}
function migrateLegacy(progress,raw) {
  const ranks = progress.talents;
  const legacyCount = Number.isFinite(raw.prestiges) ? raw.prestiges : 0;
  const legacyGold = Number.isFinite(raw.masteryNeon) ? clamp(Math.floor(raw.masteryNeon),0,MAX_STARS) : 0;
  progress.masteryGold = Math.max(progress.masteryGold,legacyGold);
  if (legacyGold) progress.highestStar = Math.max(progress.highestStar,legacyGold);
  const licensedTier = raw.talents?.materialPermit>0 ? (legacyCount>0 ? 3 : 2) : 0;
  ranks.material = Math.max(...progress.dieMaterials,ranks.materialStart,licensedTier,
    progress.collection.includes("material-3") ? 3 : progress.collection.includes("material-2") ? 2 :
      progress.collection.includes("material-1") ? 1 : 0,legacyGold ? 3 : 0);
  ranks.wave = Number(!!(progress.wave || ranks.armWave));
  ranks.arms = Number(!!(progress.arms || progress.speed || ranks.chain || ranks.armWave));
  ranks.speed = Number(progress.speed>0);
  if (ranks.armWave) ranks.chain = Math.max(1,ranks.chain);
  ranks.merge = Number(progress.merges>0 || progress.highestStar>1);
  for (const [type,special] of Object.entries(SPECIAL_DICE)) {
    ranks[special.skill] = Math.max(progress.dieSpecials.filter(value=>value===type).length,
      Number(progress.collection.includes("special-"+type)));
  }
  ranks.feverMode = Number(!!(progress.feverStarts || progress.feverLeft || ranks.fever || ranks.specialHeat));
  ranks.match = Number(!!(progress.resonances || progress.best || ranks.resonance || ranks.feverMode));
  [1,3,8].forEach((target,index)=>{
    const id = "skills-"+index;
    if (legacyCount>=target && !progress.achievements.includes(id)) progress.achievements.push(id);
  });
  if (legacyCount>=1 && !progress.collection.includes("skin-royal")) progress.collection.push("skin-royal");
  if (legacyCount>=3 && !progress.collection.includes("skin-cyber")) progress.collection.push("skin-cyber");
  const refund = (id,costs)=>{
    const rank = raw.talents?.[id];
    return costs.slice(0,Number.isFinite(rank) ? clamp(Math.floor(rank),0,costs.length) : 0)
      .reduce((total,cost)=>total+cost,0);
  };
  const chips = Number.isFinite(raw.vipChips) ? Math.max(0,Math.floor(raw.vipChips)) : 0;
  const refundedChips = refund("bankroll",[1,2,3])+refund("dice",[1,2,4]);
  progress.coins = Math.min(Number.MAX_SAFE_INTEGER,progress.coins+
    (chips+refundedChips)*LEGACY_CHIP_VALUE);
  progress.tree = legacyCount>0 || chips>0 || refundedChips>0 || Object.values(ranks).some(Boolean);
}
let storageOK = true;
function load() {
  const initial = fresh();
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE));
    if (!raw || typeof raw !== "object") return initial;
    for (const key of Object.keys(initial)) {
      if (key === "talents" || key === "version" || Array.isArray(initial[key])) continue;
      if (key === "muted" || key === "tree") initial[key] = raw[key] === true;
      else if (key === "feverLeft" && Number.isFinite(raw[key])) initial[key] = clamp(raw[key],0,FEVER_DURATION);
      else if (key === "feverCharge" && Number.isFinite(raw[key])) initial[key] = clamp(raw[key],0,99.99);
      else if (Number.isFinite(raw[key])) {
        const max = key === "savedAt" ? Date.now() : (caps[key] ?? Number.MAX_SAFE_INTEGER);
        initial[key] = clamp(key === "seconds" ? raw[key] : Math.floor(raw[key]),key === "dice" ? 1 : 0,max);
      }
    }
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
    const version = Number.isFinite(raw.version) ? raw.version : 0;
    const oldSpecialStar = version<3 ? initial.masterySpecial : 0;
    initial.highestStar = normalizeStars(Math.max(initial.highestStar,initial.masteryGold,
      oldSpecialStar,...initial.dieStars));
    initial.merges = Math.max(initial.merges,initial.dieStars.reduce((total,star)=>total+2**(star-1)-1,0));
    initial.bestFeverBursts = Math.max(initial.bestFeverBursts,initial.masteryBurst,initial.feverBurstRolls);
    if (initial.feverLeft || initial.bestFeverBursts || initial.bestFeverCoins) initial.feverStarts = Math.max(1,initial.feverStarts);
    if (!initial.feverLeft) initial.feverCoins = 0;
    initial.bestFeverCoins = Math.max(initial.bestFeverCoins,initial.feverCoins);
    initial.collection = Array.isArray(raw.collection) ? [...new Set(raw.collection.filter(id=>COLLECTION_IDS.has(id)))] : [];
    initial.achievements = Array.isArray(raw.achievements) ? [...new Set(raw.achievements
      .map(id=>typeof id==="string" ? id.replace(/^prestiges-/,"skills-") : id)
      .filter(id=>MILESTONE_IDS.has(id)))] : [];
    const installed = new Map();
    initial.dieSpecials = Array.from({length:initial.dice},(_,i)=>{
      const type = specials[i];
      if (typeof type!=="string" || !Object.hasOwn(SPECIAL_DICE,type)) return null;
      const count = installed.get(type) ?? 0;
      if (count>=5) return null;
      installed.set(type,count+1);
      return type;
    });
    initial.masteryRewards = Math.min(ALL_MASTERY,initial.masteryRewards);
    // Keep legacy stars and their purchase-equivalent counts. Special slots no longer have a material.
    for (let slot=0;slot<initial.dice;slot++) {
      if (initial.dieSpecials[slot]) initial.dieMaterials[slot] = null;
    }
    if (version<2) migrateLegacy(initial,raw);
    if (version<3) {
      if (oldSpecialStar>=4) initial.masteryRewards |= 1<<1;
      initial.masterySpecial = initial.masteryRewards&(1<<1) ? 4 : 0;
    }
    // Learned skills remain active even when an older save lacks a newly required parent.
    if (Object.values(initial.talents).some(Boolean)) initial.tree = true;
    initial.merges = Math.max(initial.merges,2**(initial.highestStar-1)-1);
    if (!initial.talents.feverMode) initial.feverLeft = initial.feverCharge = initial.feverCoins = 0;
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
const impactPrints = [];
let resonanceResult, firstThrow;
const firstRollHint = byId("first-roll-hint");
const touchInput = matchMedia("(pointer: coarse)");
let dice = [], arms = [], waves = [], beams = [], particles = [], popups = [];
let popupGrid, feverGlow;
let recent = Array.from({length:7},()=>[]);
let streak = 0, lastCrit = -Infinity, shakeStart = -Infinity, shakeAmplitude = 0;
let markedDie = null, markedUntil = 0;
let fusions = [];
let burstUntil = 0, burstPayout = 0;
let impactTime = -Infinity, hitStop = 0;
let pointer = null;
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
  const before = state.earned;
  state.earned = Math.min(Number.MAX_SAFE_INTEGER,state.earned+amount);
  if (skins.some(skin=>skin.unlock>before && skin.unlock<=state.earned)) {
    recordCollection();
    awardMilestones();
  }
  uiDirty = true;
}
function skinAvailable(skin,progress = state) {
  return progress.collection.includes("skin-"+skin.id) ||
    (skin.mastery ? progress.masteryRewards===ALL_MASTERY : progress.earned>=skin.unlock);
}
function recordCollection() {
  const entries = new Set(state.collection);
  state.highestStar = Math.max(state.highestStar,...state.dieStars);
  for (const rank of state.dieMaterials) if (rank!==null) entries.add("material-"+rank);
  if (state.masteryGold) entries.add("material-3");
  for (const type of state.dieSpecials) if (type) entries.add("special-"+type);
  for (let star=1;star<=state.highestStar;star++) entries.add("star-"+star);
  for (const skin of skins) if (skinAvailable(skin)) entries.add("skin-"+skin.id);
  if (entries.size===state.collection.length) return;
  state.collection = [...entries];
  uiDirty = true;
}
function milestoneValue(group) {
  if (group.id==="collection") return state.collection.length;
  if (group.id==="skills") return Object.values(state.talents).filter(Boolean).length;
  return state[group.id];
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
  if (state.masteryRewards===ALL_MASTERY) return;
  if (scanDice) {
    for (let slot=0;slot<state.dice;slot++) {
      if (state.dieMaterials[slot]===3) state.masteryGold = Math.max(state.masteryGold,state.dieStars[slot]);
    }
    state.masterySpecial = Math.max(state.masterySpecial,
      ...Object.keys(SPECIAL_DICE).map(type=>Math.min(4,specialDiceBasis(state,type))));
  }
  state.masteryBurst = Math.max(state.masteryBurst,state.feverBurstRolls);
  const previous = state.masteryRewards;
  MASTERY.forEach((goal,index)=>{
    if (state[goal.track]>=goal.target) state.masteryRewards |= 1<<index;
  });
  if (previous===state.masteryRewards) return;
  uiDirty = true;
  recordCollection();
  awardMilestones();
  save();
  announce(state.masteryRewards===ALL_MASTERY ? "オーロラブラック解放" : "テーブルマスタリー達成");
}
function chargeFever(linked,combo,sameWave = false) {
  const charge = 10+3*Math.min(4,linked-1)+Math.min(5,combo-1)+(sameWave ? 3 : 0);
  gainFever(Math.round(charge*(1+.2*state.talents.fever)));
}
function gainFever(charge) {
  if (!state.talents.feverMode || state.feverLeft>0) return;
  state.feverCharge = Math.round((state.feverCharge+charge*(1+milestoneBonus().fever/100))*100)/100;
  if (state.feverCharge<100) return;
  impactPrint(board.x+board.w/2,board.y+board.h/2,"fever");
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
  const amount = Math.floor(seconds*estimatedRolls*averageRoll*.7*(1+milestoneBonus().income/100));
  credit(amount);
  return amount;
}
function showIdle(from,to) {
  const payout = idleReward(from,to);
  if (payout) announce("放置中の獲得  ＋"+format(payout)+" コイン");
}
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
  upgradeViews.set(item.key,{row,detail:row.querySelector(".upgrade-detail"),button,
    label:button.firstElementChild,price:button.lastElementChild,amount:button.lastElementChild.lastElementChild});
  byId(item.shop ? "shop-items" : "upgrades").append(row);
}
// Printed specimens use the same enamel stamp as the pieces on the mat.
function specimen(material, special) {
  const skin = specialSkins.get(special);
  material = skin ?? material;
  const ink = skin?.shine ?? material.pip;
  const mark = special ? '<path fill="'+ink+'" d="'+special.stamp+'"/>' :
    '<g fill="'+ink+'"><circle cx="6" cy="6" r="2.5"/><circle cx="12" cy="12" r="2.5"/><circle cx="18" cy="18" r="2.5"/></g>';
  return '<svg class="specimen" aria-hidden="true" viewBox="0 0 44 44">'+
    '<g stroke="#36414a" stroke-width="1.5" stroke-linejoin="round">'+
    '<path fill="'+material.low+'" d="M4 10 29 5 40 13 15 19Z"/>'+
    '<path fill="'+material.side+'" d="M29 5 40 13 39 34 29 38Z"/>'+
    '<path fill="'+material.high+'" d="M4 10 29 5 29 32 4 38Z"/></g>'+
    (skin ? '<path fill="'+skin.glow+'" opacity=".52" d="'+skin.motif+'" transform="matrix(.71,-.14,0,.79,5,11)"/>' : '')+
    '<g stroke="none" transform="matrix(.76,-.16,0,.8,7,14)">'+mark+'</g>'+
    '<g fill="'+material.pip+'" stroke="none"><ellipse cx="34" cy="17" rx="1.6" ry="2"/><ellipse cx="35" cy="28" rx="1.6" ry="2"/></g></svg>';
}
const enamelStamps = new Map(Object.values(SPECIAL_DICE).map(special=>[special,new Path2D(special.stamp)]));
const specialViews = new Map();
for (const [type,special] of Object.entries(SPECIAL_DICE)) {
  const row = document.createElement("article");
  row.className = "upgrade";
  row.innerHTML = '<span class="upgrade-icon special-icon">'+specimen(null,special)+'</span><div><h4 class="upgrade-name">'+
    special.name+'</h4><p class="upgrade-detail">'+special.detail+'</p><p class="special-status"></p></div>'+
    '<button class="buy"><span class="buy-label"></span><span class="price">'+icon("coin")+'<span></span></span></button>';
  const button = row.querySelector("button");
  button.addEventListener("click",()=>buySpecial(type));
  specialViews.set(type,{row,button,status:row.querySelector(".special-status")});
  byId("special-dice").append(row);
}
function specialOffer(type) {
  const special = SPECIAL_DICE[type];
  const count = state.dieSpecials.filter(value=>value===type).length;
  const limit = state.talents[special.skill];
  const basis = specialDiceBasis(state,type);
  const rosterFactor = 1+.045*Math.max(0,dicePriceBasis(state)-4);
  const typeFactor = 1.65**Math.min(basis,8)*(1+.12*Math.max(0,basis-8));
  return {count,limit,price:Math.ceil(special.cost*typeFactor*rosterFactor)};
}
function buySpecial(type) {
  if (!Object.hasOwn(SPECIAL_DICE,type)) return;
  const special = SPECIAL_DICE[type];
  const {count,limit,price} = specialOffer(type);
  if (!state.tree || count>=limit || state.dice>=caps.dice || state.coins<price) return;
  unlockAudio();
  state.coins -= price;
  const slot = state.dice++;
  state.dieSpecials[slot] = type;
  spawnDie();
  trackMastery();
  recordCollection();
  awardMilestones();
  markedDie = dice[slot];
  markedUntil = time+1.3;
  sound("buy");
  save();
  renderUI();
  purchaseFeedback(specialViews.get(type).row,special.name+"を追加",price);
}
function renderSpecials() {
  let visible = false;
  for (const [type,view] of specialViews) {
    const special = SPECIAL_DICE[type];
    const {count,limit,price} = specialOffer(type);
    view.row.hidden = !state.tree || !limit;
    if (view.row.hidden) continue;
    visible = true;
    const capped = count>=limit || state.dice>=caps.dice;
    const label = count>=limit ? "所持上限" : state.dice>=caps.dice ? "テーブル満員" : state.coins<price ? "資金不足" : "購入";
    view.status.textContent = "所持 "+count+" / "+limit+" 個";
    view.button.disabled = capped || state.coins<price;
    view.button.firstElementChild.textContent = label;
    view.button.lastElementChild.hidden = capped;
    view.button.lastElementChild.lastElementChild.textContent = format(price);
    view.button.setAttribute("aria-label",special.name+" "+label+
      (capped ? "" : " "+format(price)+" コイン"));
  }
  byId("special-shop").hidden = !visible;
}
const mergeRows = new Map();
const mergeJump = byId("merge-jump");
const mergeTabCount = byId("merge-tab-count");
mergeJump.addEventListener("click",()=>{
  byId("merge-title").scrollIntoView({block:"center",behavior:reducedMotion.matches ? "instant" : "smooth"});
  byId("merge-title").focus({preventScroll:true});
});
function mergeKey(die) {
  return [state.dieMaterials[die.slot],"normal",state.dieStars[die.slot]].join("/");
}
function mergeName(die) {
  return materials[state.dieMaterials[die.slot]].name+"・通常ダイス";
}
function mergePreview(die) {
  const stars = state.dieStars[die.slot], next = stars+1;
  return "配当 ×"+STAR_RANKS[stars-1].pay+" → ×"+STAR_RANKS[next-1].pay+
    " · 着地波 最大"+STAR_RANKS[next-1].targets+"個";
}
function mergePrice(die) {
  const {slot} = die;
  const rosterFactor = 1+.05*Math.max(0,dicePriceBasis(state)-4);
  return Math.ceil(MERGE_PRICES[state.dieStars[slot]-1]*
    MERGE_MATERIAL_FACTORS[state.dieMaterials[slot]]*rosterFactor);
}
function renderMerges() {
  const unlocked = state.tree && !!state.talents.merge;
  byId("merge-section").hidden = !unlocked;
  const groups = new Map();
  for (const die of unlocked ? dice : []) {
    if (state.dieSpecials[die.slot] || state.dieStars[die.slot]>=MAX_STARS) continue;
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
        '<p class="upgrade-detail"></p></div><button class="buy"><span class="buy-label">合成する</span>'+
        '<span class="price">'+icon("coin")+'<span></span></span></button>';
      const button = row.querySelector("button");
      button.addEventListener("click",()=>mergeDice(key));
      byId("merge-options").append(row);
      view = {row,title:row.querySelector("h4"),status:row.querySelector("p"),button,
        price:button.lastElementChild.lastElementChild};
      view.title.textContent = mergeName(die)+" ★"+stars+" → ★"+(stars+1);
      mergeRows.set(key,view);
    }
    pairs += Math.floor(group.length/2);
    const status = "所持 "+group.length+" 個 · "+mergePreview(die);
    if (view.status.textContent!==status) view.status.textContent = status;
    const price = mergePrice(die);
    const label = format(price);
    view.button.disabled = state.coins<price;
    if (view.price.textContent!==label) {
      view.price.textContent = label;
      view.button.setAttribute("aria-label",mergeName(die)+" ★"+stars+"を2個合成 "+label+" コイン");
    }
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
  if (!state.tree || !state.talents.merge) return;
  const pair = dice.filter(die=>!state.dieSpecials[die.slot] && mergeKey(die)===key).slice(0,2);
  if (pair.length!==2 || state.dieStars[pair[0].slot]>=MAX_STARS) return;
  const [first,second] = pair;
  const price = mergePrice(first);
  if (state.coins<price) return;
  if (pointer?.target && pair.includes(pointer.target)) pointer = null;
  unlockAudio();
  const inputs = pair.map(die=>({die:{...die},rank:state.dieMaterials[die.slot],
    type:state.dieSpecials[die.slot],stars:state.dieStars[die.slot]}));
  state.coins -= price;
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
  badge.style.setProperty("--die-color",material.low);
  badge.innerHTML = '<span class="material-swatch" aria-hidden="true"></span><span>'+material.name+'</span><strong>0</strong>';
  badge.title = material.name+" ×"+material.multiplier;
  byId("materials").append(badge);
});
const recordRows = [
  ["総獲得コイン"],["ロール数"],["共鳴クリティカル","match"],["最大共鳴コンボ","match"],
  ["フィーバー発動","feverMode"],["1回のフィーバーでの最高獲得コイン","feverMode"],
  ["合成回数","merge"],["到達した星","merge"],["1回のフィーバーでの最多バースト","feverMode"],
  ["プレイ時間"],["アーム作動間隔","arms"],
].map(([label,skill])=>{
  const line = document.createElement("div");
  line.innerHTML = "<dt>"+label+"</dt><dd></dd>";
  byId("records").append(line);
  return {line,value:line.lastElementChild,skill};
});
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
    const [family,key] = entry.id.split("-");
    const drawing = family==="special" ? specimen(null,SPECIAL_DICE[key]) :
      family==="material" ? specimen(materials[Number(key)]) : icon(entry.icon);
    row.innerHTML = drawing+"<strong>"+entry.name+"</strong><small></small>";
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
    renderSkins();
  });
  byId("table-skins").append(button);
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
const skillMap = byId("skill-nodes");
const skillViewport = byId("skill-viewport");
const skillInspector = byId("skill-inspector");
const skillDialog = byId("skill-detail-dialog");
const skillCompact = matchMedia("(max-width: 940px), (pointer: coarse)");
const skillDetails = {
  icon:byId("skill-detail-icon"), title:byId("skill-detail-title"), rank:byId("skill-detail-rank"),
  effect:byId("skill-detail-effect"), gates:byId("skill-detail-gates"), list:byId("skill-detail-prerequisites"),
  offer:byId("skill-detail-offer"), price:byId("skill-detail-price"), buy:byId("skill-detail-buy"),
};
const skillNodes = [skillRoot,...talents].sort((a,b)=>a.at[1]-b.at[1] || a.at[0]-b.at[0]);
const skillViews = new Map();
const skillEdges = [];
const svgNS = "http://www.w3.org/2000/svg";
const skillStateNames = {learned:"習得済み",ready:"購入可能",saving:"資金不足",locked:"条件未達"};
let selectedSkill = skillRoot;
let detailGateSignature = "";
function setText(node,value) {
  if (node.textContent!==value) node.textContent = value;
}
function talentParents(talent,rank) {
  return typeof talent.requires==="function" ? talent.requires(rank) : talent.requires;
}
function skillRank(id) {
  return id==="tree" ? Number(state.tree) : state.talents[id];
}
function progressRequirement(label,current,target) {
  return target>0 ? {text:label+" "+format(current)+" / "+format(target),met:current>=target} : null;
}
function materialRequirement(rank,progress) {
  return {text:materials[rank].name+"を図鑑に登録",met:progress.collection.includes("material-"+rank)};
}
function skillRequirements(talent,rank) {
  const parents = Object.entries(talentParents(talent,rank)).map(([id,level])=>({
    text:id==="tree" ? skillRoot.title : talentById.get(id).title+" Lv."+level,
    met:skillRank(id)>=level,
  }));
  return parents.concat(talent.progress?.(rank,state) ?? []).filter(Boolean);
}
for (const skill of skillNodes) {
  const node = document.createElement("button");
  const [column,row,span=1] = skill.at;
  node.type = "button";
  node.id = "skill-node-"+skill.id;
  node.className = "skill-node";
  node.dataset.lane = skill.lane;
  node.style.gridArea = row+" / "+column+" / span 1 / span "+span;
  node.setAttribute("aria-controls","skill-inspector");
  node.innerHTML = '<span class="skill-node-icon">'+icon(skill.icon)+'</span>'+
    '<span class="skill-node-name">'+skill.title+'</span><span class="skill-node-rank"></span>';
  node.addEventListener("click",()=>inspectSkill(skill));
  skillViews.set(skill.id,{node,rank:node.lastElementChild});
  skillMap.append(node);
}
for (const talent of talents) {
  const parents = new Set(talent.costs.flatMap((_,index)=>Object.keys(talentParents(talent,index+1))));
  for (const parent of parents) {
    const path = document.createElementNS(svgNS,"path");
    path.dataset.lane = talent.lane;
    skillEdges.push({parent,talent,path});
    byId("skill-links").append(path);
  }
}
function positionSkillEdges() {
  if (!skillMap.clientWidth) return;
  for (const {parent,talent,path} of skillEdges) {
    const from = skillViews.get(parent).node;
    const to = skillViews.get(talent.id).node;
    const x = from.offsetLeft+from.offsetWidth/2, y = from.offsetTop+from.offsetHeight;
    const endX = to.offsetLeft+to.offsetWidth/2, endY = to.offsetTop;
    const midY = (y+endY)/2;
    if (parent==="wave" && talent.id==="armWave") {
      const side = skillMap.clientWidth-10, startY = from.offsetTop+from.offsetHeight/2;
      path.setAttribute("d","M"+(from.offsetLeft+from.offsetWidth)+" "+startY+" H"+side+" V"+(endY-12)+" H"+endX+" V"+endY);
    } else {
      path.setAttribute("d","M"+x+" "+y+" C"+x+" "+midY+" "+endX+" "+midY+" "+endX+" "+endY);
    }
  }
}
const skillObserver = new ResizeObserver(positionSkillEdges);
skillObserver.observe(skillMap);
function syncSkillInspector() {
  if (!skillCompact.matches) skillDialog.close();
  const host = skillCompact.matches ? skillDialog : byId("skill-inspector-slot");
  if (skillInspector.parentElement!==host) host.append(skillInspector);
  byId("skill-detail-close").hidden = !skillCompact.matches;
}
skillCompact.addEventListener("change",syncSkillInspector);
syncSkillInspector();
function inspectSkill(skill) {
  unlockAudio();
  sound("select");
  selectedSkill = skill;
  renderSkills();
  if (skillCompact.matches && !skillDialog.open) skillDialog.showModal();
  skillDetails.title.focus({preventScroll:true});
}
function centerSkillNode(id,behavior = "instant") {
  const {node} = skillViews.get(id);
  skillViewport.scrollTo({left:node.offsetLeft+(node.offsetWidth-skillViewport.clientWidth)/2,behavior});
}
for (const button of document.querySelectorAll("[data-route-node]")) {
  button.addEventListener("click",()=>{
    const id = button.dataset.routeNode;
    centerSkillNode(id,reducedMotion.matches ? "instant" : "smooth");
    skillViews.get(id).node.focus({preventScroll:true});
  });
}
byId("skill-shop-link").addEventListener("click",()=>selectTab(byId("shop-tab"),true));
byId("skill-detail-close").addEventListener("click",()=>skillDialog.close());
skillDetails.buy.addEventListener("click",()=>{
  if (selectedSkill===skillRoot) return;
  buyTalent(selectedSkill);
  if (skillDetails.buy.disabled) skillDetails.title.focus({preventScroll:true});
});
let receiptTimer;
function purchaseFeedback(element,label,price) {
  const receipt = byId("purchase-receipt");
  const host = skillDialog.open ? skillDialog : document.body;
  if (receipt.parentElement!==host) host.append(receipt);
  receipt.textContent = "✓ "+label+"　−"+format(price)+" コイン";
  receipt.hidden = false;
  if (!reducedMotion.matches) receipt.animate([
    {opacity:.3,transform:"translate(-50%, 8px)"},
    {opacity:1,transform:"translate(-50%, 0)"},
  ],{duration:160,easing:"steps(4, end)"});
  clearTimeout(receiptTimer);
  receiptTimer = setTimeout(()=>{receipt.hidden=true;},1900);
  if (!reducedMotion.matches) element.animate([
    {transform:"scale(.98)",boxShadow:"inset 0 0 0 3px #fff1ba, 0 0 18px #ffc769b3"},
    {transform:"scale(1.012)",boxShadow:"inset 0 0 0 2px #ffcc72, 0 0 10px #ffcf8270",offset:.32},
    {boxShadow:"inset 0 0 0 1px transparent, 0 0 0 transparent"},
  ],{duration:540,easing:"ease-out"});
  if (!reducedMotion.matches && element.matches(".skill-node,.skill-inspector")) {
    const links = byId("skill-links").querySelectorAll("[data-selected=true]");
    for (const link of links) link.animate([{stroke:"#fff6b3",strokeWidth:5},{}],{duration:620});
    byId("skills").querySelector(".skill-wallet").animate([
      {filter:"brightness(1.45)",transform:"translateY(-2px)"},{}
    ],{duration:420,easing:"ease-out"});
  }
}
function buyTalent(talent) {
  const rank = state.talents[talent.id];
  const cost = talent.costs[rank];
  if (!state.tree || cost===undefined || skillRequirements(talent,rank+1).some(check=>!check.met) || state.coins<cost) return;
  unlockAudio();
  state.coins -= cost;
  state.talents[talent.id]++;
  awardMilestones();
  sound("unlock");
  save();
  renderUI();
  purchaseFeedback(skillCompact.matches ? skillInspector : skillViews.get(talent.id).node,
    talent.title+" Lv."+state.talents[talent.id],cost);
}
function renderSkins() {
  skinViews.forEach((button,index)=>{
    const skin = skins[index];
    const locked = !skinAvailable(skin);
    const selected = state.skin===index;
    button.disabled = locked;
    button.setAttribute("aria-pressed",String(selected));
    button.lastElementChild.textContent = locked ?
      (skin.mastery ? "マスタリー全達成" : "累計 "+format(skin.unlock)+" コイン") : selected ? "使用中" : "使用する";
  });
  byId("mastery-section").hidden = !skinAvailable(skins[2]) && !state.masteryRewards;
  MASTERY.forEach((goal,index)=>{
    const view = masteryViews[index], completed = !!(state.masteryRewards&(1<<index));
    const current = completed ? goal.target : Math.min(goal.target,state[goal.track]);
    view.row.classList.toggle("complete",completed);
    view.progress.value = current;
    view.value.textContent = completed ? "達成済み" : current+" / "+goal.target;
  });
}
function renderSkillDetail(offer) {
  const skill = selectedSkill;
  const isRoot = skill===skillRoot;
  const rank = skillRank(skill.id);
  const max = isRoot ? 1 : skill.costs.length;
  const maxed = rank===max;
  skillInspector.dataset.lane = skill.lane;
  setText(skillDetails.title,skill.title);
  if (skillDetails.icon.dataset.icon!==skill.icon) {
    skillDetails.icon.innerHTML = icon(skill.icon);
    skillDetails.icon.dataset.icon = skill.icon;
  }
  setText(skillDetails.rank,"Lv. "+rank+" / "+max+" · "+skillStateNames[offer.status]);
  const effect = isRoot ? "ダイスショップで解放した起点から、各ルートに進めます。" :
    rank && !maxed ? "現在 "+skill.detail(rank)+"／次のレベル "+skill.detail(rank+1) : skill.detail(rank || 1);
  setText(skillDetails.effect,effect);
  skillDetails.gates.hidden = isRoot;
  const signature = JSON.stringify(offer.requirements);
  if (signature!==detailGateSignature) {
    detailGateSignature = signature;
    skillDetails.list.replaceChildren(...offer.requirements.map(check=>{
      const entry = document.createElement("li");
      entry.dataset.met = String(check.met);
      entry.textContent = (check.met ? "✓ " : "○ ")+check.text;
      return entry;
    }));
  }
  skillDetails.offer.hidden = maxed;
  skillDetails.buy.disabled = maxed || !offer.ready;
  if (maxed) return;
  setText(skillDetails.price,format(offer.cost));
  const label = offer.ready ? (rank ? "レベルを上げる" : "スキルを習得する") : offer.blocked ? "条件未達" : "コイン不足";
  setText(skillDetails.buy,label);
}
function renderSkills() {
  byId("skills-locked").hidden = state.tree;
  byId("skill-workspace").hidden = !state.tree;
  setText(byId("skill-coins"),format(state.coins));
  if (!state.tree) return;
  for (const skill of skillNodes) {
    const isRoot = skill===skillRoot;
    const rank = skillRank(skill.id);
    const max = isRoot ? 1 : skill.costs.length;
    const cost = isRoot ? TREE_PRICE : skill.costs[rank];
    const requirements = isRoot ? [] : skillRequirements(skill,Math.min(rank+1,max));
    const blocked = requirements.some(check=>!check.met);
    const ready = rank<max && !blocked && state.coins>=cost;
    const status = rank ? "learned" : blocked ? "locked" : ready ? "ready" : "saving";
    const {node,rank:label} = skillViews.get(skill.id);
    const rankText = "Lv. "+rank+" / "+max;
    node.dataset.state = status;
    node.setAttribute("aria-pressed",String(skill===selectedSkill));
    node.setAttribute("aria-label",skill.title+" "+rankText+" "+skillStateNames[status]);
    const next = rank<max && rank>0 ? (blocked ? "条件未達" : ready ? "強化可能" : "資金不足") : "";
    setText(label,isRoot ? "習得済み" : rankText+(next ? " · "+next : ""));
    node.dataset.upgrade = String(ready && rank>0);
    if (skill===selectedSkill) renderSkillDetail({cost,requirements,blocked,ready,status});
  }
  for (const {parent,talent,path} of skillEdges) {
    const rank = Math.min(skillRank(talent.id)+1,talent.costs.length);
    const required = talentParents(talent,rank)[parent];
    path.dataset.state = !required ? "later" : skillRank(parent)>=required ? "met" : "unmet";
    path.dataset.selected = String(talent===selectedSkill);
  }
}
const feverStage = document.querySelector(".stage");
const feverView = {meter:byId("fever-meter"),label:byId("fever-label"),effect:byId("fever-effect"),progress:byId("fever-progress"),
  fill:byId("fever-fill"),value:byId("fever-value")};
function renderFever() {
  const unlocked = !!state.talents.feverMode;
  feverView.meter.hidden = !unlocked;
  feverStage.classList.toggle("fever-unlocked",unlocked);
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
  goalView.box.hidden = state.tree || state.rolls>=25 || state.dice>=2;
  if (goalView.box.hidden) return;
  const cost = upgradeOffer(upgrades[0]).price;
  goalView.label.textContent = "次の目標 · 2個目のダイス";
  goalView.value.textContent = state.coins>=cost ? "購入可能" : format(state.coins)+" / "+format(cost);
  goalView.reason.textContent = "ダイスが増えると続けて投げられます。";
  goalView.progress.max = cost;
  goalView.progress.value = state.coins;
}
function materialOffer() {
  const ranks = state.dieMaterials.filter(rank=>rank!==null);
  if (!ranks.length) return {capped:false,locked:true,noNormalDice:true,price:Infinity};
  const from = Math.min(...ranks);
  const to = from+1;
  const index = state.dieMaterials.indexOf(from);
  const advanced = ranks.filter(rank=>rank>=to).length;
  const advancedBasis = state.dieMaterials.reduce((total,rank,slot)=>
    total+(rank!==null && rank>=to ? 2**(state.dieStars[slot]-1) : 0),0);
  const rosterFactor = 1+.055*Math.max(0,normalDiceBasis(state)-4);
  const earlyGrowth = 1.14**clamp(advancedBasis-3,0,15);
  const lateGrowth = 1+Math.max(0,advancedBasis-18)/30;
  const progressFactor = (1+.12*advancedBasis)*earlyGrowth*lateGrowth;
  const starFactor = 1.8**(state.dieStars[index]-1);
  return {from,to,index,capped:from===caps.material,
    advanced,locked:to>state.talents.material,
    price:Math.ceil((MATERIAL_PRICES[from] ?? Infinity)*rosterFactor*progressFactor*starFactor)};
}
function upgradeAvailable(item) {
  if (item.key==="tree") return !state.tree;
  return !item.skill || (state.tree && state.talents[item.skill]>0);
}
function upgradeOffer(item) {
  if (item.key==="material") return materialOffer();
  return {capped:state[item.key]>=caps[item.key],locked:item.key==="speed" && !state.arms,
    price:Math.ceil(item.cost(state))};
}
function renderMaterials() {
  const counts = materials.map(()=>0);
  for (const rank of state.dieMaterials) if (rank!==null) counts[rank]++;
  Array.from(byId("materials").children).forEach((badge,index)=>{
    badge.classList.toggle("current",counts[index]>0);
    const text = counts[index]+"個";
    if (badge.lastElementChild.textContent!==text) badge.lastElementChild.textContent = text;
  });
  const offer = materialOffer();
  const rule = byId("material-rule");
  if (offer.noNormalDice) {
    rule.textContent = "材質加工の対象になる通常ダイスがありません。";
    return;
  }
  if (offer.capped) {
    rule.textContent = "すべての通常ダイスが最高材質です。";
    return;
  }
  rule.textContent = offer.locked ?
    materials[offer.to].name+"に進化するには、スキル「材質加工」Lv."+offer.to+"が必要です。" :
    "1回の購入で1個を進化します。最も下位の材質から順番に加工します。";
}
function renderUI() {
  renderFever();
  if (!byId("shop").hidden) {
    renderGoal();
    renderSpecials();
    byId("shop-arm-status").hidden = !state.arms;
  }
  renderMerges();
  if (!byId("skills").hidden) renderSkills();
  if (!byId("collection").hidden) {
    renderCollection();
    renderSkins();
  }
  byId("coins").textContent = short(state.coins);
  byId("coins").title = format(state.coins);
  byId("dice-count").firstChild.nodeValue = state.dice+" ";
  byId("arm-stat").hidden = !state.talents.arms;
  byId("arm-count").textContent = state.arms;
  byId("material-section").hidden = !state.talents.material;
  if (state.talents.material && !byId("enhance").hidden) renderMaterials();
  for (const item of upgrades) {
    const view = upgradeViews.get(item.key);
    if (item.key==="tree" && state.tree) {
      view.row.hidden = false;
      view.detail.textContent = "共鳴・材質加工・自動化など";
      view.button.disabled = true;
      view.label.textContent = "解放済み";
      view.price.hidden = false;
      view.amount.textContent = format(TREE_PRICE);
      view.button.setAttribute("aria-label","スキルツリー 解放済み");
      continue;
    }
    view.row.hidden = !upgradeAvailable(item);
    if (view.row.hidden) continue;
    const offer = upgradeOffer(item);
    const {capped,locked,price} = offer;
    view.detail.textContent = item.key!=="material" ? item.detail(state) : offer.noNormalDice ? "対象の通常ダイスなし" :
      capped ? "すべての通常ダイスが最高材質" :
      locked ? "材質加工 Lv."+offer.to+"で"+materials[offer.to].name+"を解放" :
      "ダイス #"+(offer.index+1)+" ★"+state.dieStars[offer.index]+" を"+materials[offer.to].name+" ×"+materials[offer.to].multiplier+
      "へ · "+offer.advanced+"/"+state.dice+"個済み";
    view.button.disabled = capped || locked || state.coins < price;
    const action = typeof item.action === "function" ? item.action(state) : item.action;
    view.label.textContent = capped ? "最大" : locked ? "条件未達" : state.coins<price ? "資金不足" : action;
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
    recordRows.forEach(({line,value,skill},index)=>{
      line.hidden = !!skill && !state.talents[skill];
      value.textContent = values[index];
    });
  }
  uiDirty = false;
}
function buy(item) {
  const key = item.key;
  if (!upgradeAvailable(item)) return;
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
  } else if (key === "tree") {
    state.tree = true;
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
  sound(key==="tree" ? "unlock" : "buy");
  save();
  if (key === "tree") selectTab(byId("skills-tab"),true);
  else renderUI();
  purchaseFeedback(key==="tree" ? skillViews.get("tree").node : upgradeViews.get(key).row,item.title,offer.price);
}

const tabButtons = [...document.querySelectorAll("[data-tab]")];
function selectTab(tab,focus = false) {
  if (tab.getAttribute("aria-selected")!=="true") {
    unlockAudio();
    sound("select");
  }
  const skillsOpen = tab.dataset.tab==="skills";
  document.querySelector(".game").classList.toggle("skills-open",skillsOpen);
  feverStage.inert = skillsOpen;
  if (skillsOpen) pointer = null;
  if (!skillsOpen && skillDialog.open) skillDialog.close();
  tabButtons.forEach(button=>{
    const selected = button === tab;
    button.setAttribute("aria-selected",String(selected));
    button.tabIndex = selected ? 0 : -1;
    byId(button.dataset.tab).hidden = !selected;
  });
  document.querySelector(".panel").scrollTop = 0;
  renderUI();
  if (skillsOpen && state.tree) centerSkillNode(selectedSkill.id);
  if (focus) tab.focus();
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
  selectedSkill = skillRoot;
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
  if (type==="select") tone(460,560,.045,.014,"sine");
  if (type==="unlock") {
    tone(523,659,.12,.031,"triangle");
    tone(784,988,.19,.028,"sine",.06);
  }
  if (type === "hit") tone(random(210,330),92,.046,.037,"triangle");
  if (type === "land") tone(random(170,230),72,.058,.045,"triangle");
  if (type === "wave") tone(165,54,.15,.049,"sine");
  if (type === "impact") {
    tone(238,57,.145,.055,"triangle");
    tone(320,113,.076,.031,"sine",.012);
  }
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
  if (type === "buy") {
    tone(185,85,.055,.035,"triangle");
    tone(660,660,.11,.026,"sine",.035);
    tone(990,990,.16,.022,"sine",.085);
  }
  if (type === "coin") {
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
  const sceneWidth = Math.ceil(width*pixelScale), sceneHeight = Math.ceil(height*pixelScale);
  for (const layer of [pixelScene,backdrop]) {
    if (layer.width!==sceneWidth) layer.width = sceneWidth;
    if (layer.height!==sceneHeight) layer.height = sceneHeight;
  }
  pixelCtx.setTransform(pixelScale,0,0,pixelScale,0,0);
  pixelCtx.imageSmoothingEnabled = false;
  screenCtx.setTransform(resolution,0,0,resolution,0,0);
  screenCtx.imageSmoothingEnabled = false;
  const span = Math.min(width,height);
  unit = clamp(span/420,.43,1.6);
  const margin = clamp(span*.012,3,8);
  const rail = clamp(span*.028,7,19);
  const depth = clamp(span*.014,4,9);
  const horizontal = Math.max(margin,(width-height*2.3)/2);
  const outer = {x:horizontal,y:margin,w:Math.max(1,width-horizontal*2),h:Math.max(1,height-margin*2-depth)};
  board = {outer,rail,depth,x:outer.x+rail,y:outer.y+rail,w:Math.max(1,outer.w-rail*2),h:Math.max(1,outer.h-rail*2)};
  const glowX = board.x+board.w*.5, glowY = board.y+board.h*.45;
  feverGlow = ctx.createRadialGradient(glowX,glowY,0,glowX,glowY,Math.max(board.w,board.h)*.66);
  feverGlow.addColorStop(0,"#ffcf4c4a");
  feverGlow.addColorStop(.58,"#f4bb3827");
  feverGlow.addColorStop(1,"#ffc65d99");
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
    for (const point of [...waves,...particles,...popups,...impactPrints]) move(point);
    if (pointer) {
      move(pointer.start);
      move(pointer.last);
    }
  }
  reflowPopups();
  paintTable();
}
function restAngles(face) {
  return [[0,0],[Math.PI/2,0],[0,-Math.PI/2],[0,Math.PI/2],[-Math.PI/2,0],[Math.PI,0]][face-1];
}
function spawnDie() {
  const slot = dice.length;
  state.dieSpecials[slot] ??= null;
  state.dieMaterials[slot] = state.dieSpecials[slot] ? null :
    (state.dieMaterials[slot] ?? state.talents.materialStart);
  state.dieStars[slot] ??= 1;
  const starts = [[.28,.42],[.65,.33],[.6,.68]];
  const start = state.dice===1 ? [.5,.45] : starts[dice.length];
  const face = start ? (firstThrow ? 1 : [3,5,2][dice.length]) : 1+Math.floor(Math.random()*6);
  const [rx,ry] = restAngles(face);
  let x = board.x+board.w*(start ? start[0] : random(.13,.87));
  let y = board.y+board.h*(start ? start[1] : random(.13,.87));
  if (slot===1 && state.dice===2) {
    const first = dice[0];
    const dx = board.x+board.w*.5-first.x, dy = board.y+board.h*.5-first.y;
    const angle = Math.hypot(dx,dy)>unit ? Math.atan2(dy,dx) : -.4;
    const gap = Math.min(board.w,board.h)*.15;
    x = first.x+Math.cos(angle)*gap;
    y = first.y+Math.sin(angle)*gap;
  }
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
  const die = {slot,x,y,z:0,vx:0,vy:0,vz:0,rx,ry,rz:start ? [-.17,.25,-.15][dice.length] : random(-Math.PI,Math.PI),
    sx:0,sy:0,sz:0,face,nextFace:face,rolling:false,bounces:0,launched:-Infinity};
  dice.push(die);
  confine(die,false);
}
function spawnArm() {
  arms.push({next:time+(.48+arms.length*.21)/feverMultiplier(),sweep:null});
}
function resetTable() {
  firstThrow = state.rolls===0 && state.dice===1;
  resonanceResult = null;
  dice = []; arms = []; waves = []; beams = []; popups = []; particles = [];
  markedDie = null;
  impactPrints.length = 0;
  fusions = [];
  burstUntil = 0;
  burstPayout = 0;
  impactTime = -Infinity; hitStop = 0; pointer = null;
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
  if ((hitX || hitY) && Math.hypot(die.vx,die.vy)>30*unit) {
    impactPrint(hitX ? x+Math.sign(die.x-x)*rx : x,hitY ? y+Math.sign(die.y-y)*ry : y,"rail");
    sound("hit");
    hardImpact(die);
  }
  die.x = x;
  die.y = y;
}
function launch(die, x, y, strength, manual, gesture = null) {
  if (isFusing(die) || (!manual && pointer?.target===die) || die.rolling || time-die.launched<.19) return false;
  const spread = gesture?.angle===undefined ? .34 : .10;
  const angle = (gesture?.angle ?? Math.atan2(die.y-y,die.x-x))+random(-spread,spread);
  const impulse = random(63,122)*unit*strength;
  die.vx = die.vx*.21+Math.cos(angle)*impulse;
  die.vy = die.vy*.21+Math.sin(angle)*impulse;
  die.z = Math.max(die.z,1);
  die.vz = random(230,295)*unit*Math.min(strength,1.48);
  const spin = gesture?.hard ? 1.22 : 1;
  die.sx = random(8,15)*spin*(Math.random()<.5 ? -1 : 1);
  die.sy = random(6,13)*spin*(Math.random()<.5 ? -1 : 1);
  die.sz = random(-7,7);
  die.nextFace = 1+Math.floor(Math.random()*6);
  die.manualBatch = null;
  die.fromBlast = false;
  die.echo = null;
  die.hardThrow = !!gesture?.hard;
  die.aimedThrow = gesture?.angle!==undefined;
  die.trail = [];
  die.launched = time;
  die.rolling = true;
  die.bounces = 0;
  if (manual) {
    sound("hit");
    impactPrint(die.x,die.y,"throw");
  }
  return true;
}
function hardImpact(die) {
  if (!die.hardThrow) return;
  die.hardThrow = false;
  impactPrint(die.x,die.y,"clash");
  spark(die.x,die.y,["#ffe5a2","#f7bb75"],13);
  sound("impact");
  if (reducedMotion.matches || time-impactTime<.36) return;
  impactTime = time;
  hitStop = .026;
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
  const candidates = state.talents.match ? recent[die.face] : [];
  while (candidates.length && time-candidates[0].t > RESONANCE_WINDOW) candidates.shift();
  let bonus = 0;
  const linked = new Set(candidates.map(other=>other.die));
  linked.delete(die);
  const echo = die.echo;
  const echoMatch = state.talents.match && echo?.face===die.face && time<=echo.until && dice.includes(echo.source);
  if (echoMatch) linked.add(echo.source);
  if (linked.size) {
    streak = time-lastCrit <= RESONANCE_WINDOW ? streak+1 : 1;
    lastCrit = time;
    state.resonances++;
    state.best = Math.max(state.best,streak);
    const sameWave = !!die.manualBatch && candidates.some(other=>other.die!==die && other.batch===die.manualBatch);
    const resonanceRate = .32+.16*Math.min(4,linked.size)+.10*Math.min(5,streak-1)+
      (sameWave ? .35 : 0)+(echoMatch ? .25 : 0);
    bonus = Math.round(base*resonanceRate*(1+.25*state.talents.resonance)*(1+rewards.resonance/100));
    for (const other of Array.from(linked).slice(-4)) beams.push({a:other,b:die,life:.49,phase:random(0,6)});
    requestShake(linked.size,streak);
    chargeFever(linked.size,streak,sameWave);
    sound("crit",streak);
    impactPrint(die.x,die.y,"resonance");
    spark(die.x,die.y,["#c5ffdd","#fcf2b4","#77f8c7"],7+Math.min(4,linked.size));
  } else {
    spark(die.x,die.y,["#cbb074","#fff1ad"],4);
  }
  if (state.talents.match) candidates.push({die,t:time,batch:die.manualBatch});
  const special = state.dieSpecials[die.slot];
  const star = starStats(die);
  const blast = special==="blast" ? specialStats("blast",stars) : null;
  const blastReady = blast && die.face>=blast.face;
  const blastFired = blastReady && !die.fromBlast && !echo;
  if (!die.fromBlast && !echo) {
    if (blastFired) {
      addWave(die,"blast");
      impactPrint(die.x,die.y,"blast");
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
  const specialSynergy = blastFired || (heat && die.face>=heat.face) || boost.bonus>0;
  const specialActive = specialSynergy || special==="aura";
  const burst = multiplier===2 && ((highStar && (highCombo || specialActive)) || (highCombo && specialActive)) ?
    (highStar && highCombo && specialActive ? 6 : 4) : 0;
  const chain = linked.size ? 1+.15*clamp(streak-2,0,4)+
    (specialSynergy ? .25 : 0)+(die.aimedThrow ? .15 : 0) : 1;
  const heatFactor = multiplier===2 ? 1+(heat?.feverBonus ?? 0) : 1;
  const amount = Math.round((base+bonus)*chain*(1+boost.bonus/100)*
    heatFactor*(burst || multiplier)*(1+rewards.income/100));
  credit(amount);
  if (linked.size) resonanceResult = {die, partners:[...linked], face:die.face, amount, until:time+1.1};
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
  impactPrint(die.x,die.y,"coins");
  sound("land");
  sound("coin");
  const life = bonus || burst ? 1.1 : .85;
  if (!linked.size || burst) placePopup({x:die.x,y:die.y-14*unit,die,life,total:life,amount,
    crit:bonus ? streak : 0,fever:multiplier===2,burst});
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
  if (!reducedMotion.matches) {
    die.trail ??= [];
    if (time-(die.trail.at(-1)?.t ?? -Infinity)>=.04) {
      die.trail.push({x:die.x-die.z*.1,y:die.y-die.z*.51-4.8*unit,angle:die.rz,t:time});
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
    hardImpact(die);
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
      a.x -= nx*gap;
      a.y -= ny*gap;
      b.x += nx*gap;
      b.y += ny*gap;
      const approach = (a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
      if (approach > 0) {
        const transfer = approach*.61;
        a.vx -= transfer*nx;
        a.vy -= transfer*ny;
        b.vx += transfer*nx;
        b.vy += transfer*ny;
        if (approach > 34*unit) {
          impactPrint((a.x+b.x)/2,(a.y+b.y)/2-(a.z+b.z)*.255,"clash");
          sound("hit");hardImpact(a);hardImpact(b);
        }
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
          if (state.talents.match && wave.echo?.source && Math.random()<wave.echo.chance) die.nextFace = wave.echo.face;
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
  tile.width = tile.height = 96;
  const brush = tile.getContext("2d");
  const grain = seededRandom(551);
  for (let y=0;y<96;y+=2) {
    for (let x=0;x<96;x+=3) {
      if (grain()<.42) continue;
      brush.fillStyle = grain()<.48 ? "#e6efd51c" : "#182d3e25";
      brush.fillRect(x+y%3,y,grain()<.23 ? 2 : 1,1);
    }
  }
  return backdropCtx.createPattern(tile,"repeat");
}
const feltPattern = createFeltPattern();
function pixelPolygon(g,points,fill) {
  g.beginPath();
  points.forEach(([x,y],i)=>{
    if (i) g.lineTo(Math.round(x),Math.round(y));
    else g.moveTo(Math.round(x),Math.round(y));
  });
  g.closePath();
  g.fillStyle=fill; g.fill();
}
function pixelFrame(g,x,y,w,h,cut,fill) {
  const c = Math.min(cut,w/2,h/2);
  pixelPolygon(g,[[x+c,y],[x+w-c,y],[x+w-c,y+1],[x+w,y+1],[x+w,y+h-1],
    [x+w-c,y+h-1],[x+w-c,y+h],[x+c,y+h],[x+c,y+h-1],[x,y+h-1],[x,y+1],[x+c,y+1]],fill);
}
function applySkin() {
  const skin = skins[state.skin].id;
  feverStage.dataset.skin = skin;
  document.querySelector(".panel").dataset.skin = skin;
  if (board) paintTable();
}
// Paint the wood and cloth once per resize or skin change.
function paintTable() {
  const g = backdropCtx;
  const {outer:o,x,y,w,h,depth} = board;
  const skin = skins[state.skin], noise = seededRandom(551);
  g.setTransform(pixelScale,0,0,pixelScale,0,0);
  g.clearRect(0,0,width,height);
  const border="#252b34", inset=2;
  pixelFrame(g,o.x-1,o.y+depth+3,o.w+2,o.h,5,"#121d26");
  pixelFrame(g,o.x,o.y+depth,o.w,o.h,5,border);
  pixelFrame(g,o.x+2,o.y+depth+1,o.w-4,o.h-3,4,"#654337");
  pixelFrame(g,o.x,o.y,o.w,o.h,5,border);
  pixelFrame(g,o.x+2,o.y+2,o.w-4,o.h-4,4,"#a97550");
  pixelFrame(g,o.x+3,o.y+3,o.w-6,o.h-8,3,"#cc9a64");
  g.fillStyle="#f0c487"; g.fillRect(Math.round(o.x+6),Math.round(o.y+3),Math.round(o.w-12),1);
  g.fillStyle="#82523e"; g.fillRect(Math.round(o.x+6),Math.round(o.y+o.h-5),Math.round(o.w-12),2);

  // Short, stepped grain runs follow the rails, leaving the weave quiet under the dice.
  for (let i=0;i<Math.floor(o.w*.29);i++) {
    const px=Math.round(o.x+7+noise()*(o.w-30));
    const py=Math.round((i%2 ? o.y+5 : y+h+3)+noise()*Math.max(1,board.rail-9));
    const length=Math.round(4+noise()*17);
    g.fillStyle=i%3===0 ? "#d9ab73" : "#b38458";
    g.fillRect(px,py,length,1); g.fillRect(px+length,py+1,3,1);
  }
  pixelFrame(g,x-inset,y-inset,w+4,h+4,4,border);
  pixelFrame(g,x,y,w,h,3,skin.felt[2]);
  pixelFrame(g,x+2,y+3,w-4,h-5,3,skin.felt[1]);
  g.fillStyle=skin.felt[0]; g.fillRect(Math.round(x+5),Math.round(y+3),Math.round(w-10),2);
  g.fillStyle=feltPattern; g.fillRect(Math.round(x+4),Math.round(y+5),Math.round(w-8),Math.round(h-9));

  for (const [ox,oy] of [[x+12,y+13],[x+w-15,y+13],[x+w-15,y+h-15]]) {
    g.fillStyle="#273d47"; g.fillRect(Math.round(ox),Math.round(oy),4,4);
    g.fillStyle="#c0a779"; g.fillRect(Math.round(ox+1),Math.round(oy+1),2,2);
  }
  const tapeX=Math.round(x-3), tapeY=Math.round(y+h-29);
  pixelPolygon(g,[[tapeX,tapeY+4],[tapeX+9,tapeY+4],[tapeX+9,tapeY+2],[tapeX+27,tapeY],
    [tapeX+29,tapeY+9],[tapeX+15,tapeY+11],[tapeX+2,tapeY+13]],"#bfab7d");
  g.fillStyle="#e3cea0"; g.fillRect(tapeX+4,tapeY+5,15,1); g.fillRect(tapeX+9,tapeY+8,15,1);
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
// Faces are painted as small, fixed pixel tiles and projected onto the same 3D mesh.
const faceTileSize = 32;
const diceFaceTiles = new Map();
function diceFaceTile(rank,value,lit,special) {
  const key = (special?.skill ?? rank)+"/"+value+"/"+Number(lit);
  if (diceFaceTiles.has(key)) return diceFaceTiles.get(key);
  const tile = document.createElement("canvas");
  tile.width = tile.height = faceTileSize;
  const g = tile.getContext("2d");
  const skin = specialSkins.get(special);
  const material = skin ?? materials[rank];
  const rect = (x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(x,y,w,h);};
  pixelFrame(g,0,0,32,32,3,material.high);
  g.save();
  g.clip();
  if (skin) {
    rect(2,3,28,26,skin.side);
    rect(3,4,26,24,skin.high);
    g.fillStyle=skin.low;
    g.fill(specialMotifs.get(special));
    rect(3,3,8,1,skin.glow); rect(21,28,8,1,skin.glow);
    rect(5,3,3,1,skin.shine); rect(25,28,2,1,skin.shine);
    rect(3,18,1,3,skin.glow); rect(28,9,1,3,skin.glow);
  } else if (rank===0) {
    // Open-pore grain stays muted, with long interrupted fibers rather than a specular band.
    for (const [x,y,w] of [[3,5,12],[17,7,11],[3,12,17],[22,15,8],[4,20,12],[13,24,14],[3,27,10]]) {
      rect(x,y,w,1,"#ad805163"); rect(x+3,y+1,w-3,1,"#fff2cf76");
    }
  } else if (rank===1) {
    // Copper reflects a wide warm band with a darker red return.
    pixelPolygon(g,[[2,19],[17,3],[27,3],[8,25],[2,28]],"#fdac7c");
    pixelPolygon(g,[[3,14],[13,3],[18,3],[5,18]],"#ffe0b4");
    pixelPolygon(g,[[11,29],[29,10],[29,18],[19,29]],"#d58b68");
  } else if (rank===2) {
    rect(2,3,28,27,"#9dabb4"); rect(2,7,28,7,"#c6d4d8");
    rect(3,7,23,2,"#f2f7ed"); rect(2,17,28,13,"#8394a1");
    for (const [x,y,w] of [[5,15,10],[17,18,10],[4,22,14],[14,25,13]]) {
      rect(x,y,w,1,"#b2bec6");
    }
  } else {
    rect(2,3,28,27,"#e9ad44");
    pixelPolygon(g,[[2,19],[18,3],[27,3],[7,23],[2,26]],"#ffda68");
    pixelPolygon(g,[[4,16],[17,3],[21,3],[5,20]],"#fff4bd");
    pixelPolygon(g,[[11,29],[29,11],[29,18],[19,29]],"#c98228");
    rect(20,6,5,1,"#fffbe0"); rect(22,4,1,5,"#fffbe0");
  }
  rect(2,2,28,1,skin?.glow ?? (rank===2 ? "#f1f7ef" : "#fff4d0"));
  rect(2,3,1,25,skin?.low ?? (rank===0 ? "#f9ebcb" : "#fff2bf"));
  rect(29,3,1,26,material.low);
  rect(3,29,26,2,material.side);
  if (!lit) rect(0,0,32,32,rank===0 ? "#60463258" : material.edge+"77");
  for (const [dx,dy] of pips[value]) {
    const x=16+dx*8, y=16+dy*8, r=value===1 ? 4 : 3;
    if (skin) {
      pixelFrame(g,x-r-1,y-r-1,r*2+2,r*2+2,2,skin.edge);
      pixelFrame(g,x-r+1,y-r+1,r*2-2,r*2-2,1,skin.pip);
      continue;
    }
    const red = rank===0 && value===1;
    pixelFrame(g,x-r,y-r+1,r*2,r*2,2,lit ? "#fff1bc" : material.low);
    pixelFrame(g,x-r,y-r,r*2,r*2,2,red ? "#913b32" : material.pip);
    rect(x-r+2,y+r-2,r*2-4,1,red ? "#d8865f" : "#a1987b8a");
  }
  g.restore();
  diceFaceTiles.set(key,tile);
  return tile;
}
const paintDepth = die => die.y+die.z*.9;
const edgeSide = (a,b,p) => (b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);
function projectDie(die,stars = state.dieStars[die.slot]) {
  const size = 18.2*unit*STAR_RANKS[stars-1].size*(1+Math.min(.28,die.z/(340*unit)));
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
  const special = SPECIAL_DICE[preset ? preset.type : state.dieSpecials[die.slot]];
  const stars = preset?.stars ?? state.dieStars[die.slot];
  const {size,points} = projectDie(die,stars);
  for (const [value,a,b,c,d] of faces) {
    const p=points[a], q=points[b], r=points[c], s=points[d];
    const ux=q.x-p.x, uy=q.y-p.y, vx=s.x-p.x, vy=s.y-p.y;
    if (ux*vy-uy*vx < .7) continue;
    const bright = Math.abs(ux*vy-uy*vx) > size*size*2;
    ctx.save();
    ctx.transform(ux,uy,vx,vy,p.x,p.y);
    ctx.drawImage(diceFaceTile(rank,value,bright,special),0,0,1,1);
    ctx.restore();
  }
  // One common seam weight keeps lit and shaded faces joined while the die tumbles.
  ctx.strokeStyle = specialSkins.get(special)?.edge ?? "#233346";
  ctx.lineJoin = "bevel";
  ctx.lineWidth = Math.max(1,1.55*unit);
  for (const [,a,b,c,d] of faces) {
    if (edgeSide(points[a],points[b],points[d])<.7) continue;
    ctx.beginPath();
    for (const [index,corner] of [a,b,c,d].entries()) {
      const {x,y}=points[corner];
      if (index) ctx.lineTo(Math.round(x),Math.round(y));
      else ctx.moveTo(Math.round(x),Math.round(y));
    }
    ctx.closePath();
    ctx.stroke();
  }
  if (special) {
    const x = die.x-die.z*.1+size*.78, y = die.y-die.z*.51-size*.95;
    ctx.save();
    const radius=Math.max(6,8*unit);
    ctx.translate(x,y);
    ctx.scale(radius/12,radius/12);
    rounded(ctx,-13,-13,26,26,5);
    const skin = specialSkins.get(special);
    ctx.fillStyle=skin.side; ctx.fill();
    ctx.strokeStyle=skin.glow; ctx.lineWidth=2; ctx.stroke();
    ctx.translate(-10,-10); ctx.scale(20/24,20/24);
    ctx.fillStyle=skin.shine;
    ctx.fill(enamelStamps.get(special));
    ctx.restore();
  }
  if (stars>1) {
    const x = die.x-die.z*.1-size*.83, y = die.y-die.z*.51-size*1.04;
    ctx.save();
    ctx.font = "800 "+Math.max(10,11*unit)+"px 'Toy Rounded','BIZ UDPGothic',sans-serif";
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
function drawSpecialGlow(die) {
  const skin = specialSkins.get(SPECIAL_DICE[state.dieSpecials[die.slot]]);
  if (!skin) return;
  const {x,y} = dieCenter(die);
  const radius = Math.max(14,24*unit*starStats(die).size);
  ctx.beginPath();
  ctx.ellipse(x,y+4*unit,radius*1.23,radius*.90,0,0,Math.PI*2);
  ctx.fillStyle=skin.glow+"23"; ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x,y+4*unit,radius,radius*.77,0,0,Math.PI*2);
  ctx.strokeStyle=skin.glow+"a8"; ctx.lineWidth=Math.max(1,1.7*unit); ctx.stroke();
  if (reducedMotion.matches) return;
  for (let i=0;i<3;i++) {
    const angle=time*(die.rolling ? 4 : 1.4)+die.slot+i*Math.PI*2/3;
    const px=Math.round(x+Math.cos(angle)*radius*1.27);
    const py=Math.round(y+Math.sin(angle)*radius*.93);
    ctx.fillStyle=skin.shine; ctx.fillRect(px,py,2,2);
  }
}
function drawArm(arm,index) {
  const base = index===0 ? {x:board.x+board.w-31*unit,y:board.y+board.h-47*unit,angle:-2.5} : armBase(index);
  const {x,y,angle} = base;
  const reach = arm.sweep ? clamp(arm.sweep.elapsed/.66,0,1) : 0;
  const extension = arm.sweep ? (reach<.39 ? ease(reach/.39) : 1-ease((reach-.39)/.61)) : 0;
  const restX = x+Math.cos(angle)*(index===0 ? 116 : 34)*unit, restY = y+Math.sin(angle)*(index===0 ? 116 : 34)*unit;
  const tipX = restX+((arm.sweep?.x ?? restX)-restX)*extension;
  const tipY = restY+((arm.sweep?.y ?? restY)-restY)*extension;
  const dir = Math.atan2(tipY-y,tipX-x);
  const bend = (13+Math.sin(reach*Math.PI)*30)*unit;
  const elbowX=index===0 && !arm.sweep ? x-15*unit : (x+tipX)*.5-Math.sin(dir)*bend;
  const elbowY=index===0 && !arm.sweep ? y-65*unit : (y+tipY)*.5+Math.cos(dir)*bend;
  pixelFrame(ctx,x-26*unit,y-8*unit,52*unit,28*unit,4,"#222d38");
  pixelFrame(ctx,x-23*unit,y-6*unit,46*unit,22*unit,3,"#536d76");
  pixelFrame(ctx,x-23*unit,y-6*unit,46*unit,15*unit,3,"#87a0a0");
  function strut(ax,ay,bx,by) {
    const length=Math.hypot(bx-ax,by-ay);
    ctx.save();
    ctx.translate(Math.round(ax),Math.round(ay));
    ctx.rotate(Math.atan2(by-ay,bx-ax));
    const layers = [[-9,18,"#263441"],[-7,14,"#536975"],[-6,9,"#9eb0ad"],[-6,2,"#d6d9bd"]];
    for (const [top,tall,color] of layers) {
      ctx.fillStyle=color;
      ctx.fillRect(-2*unit,top*unit,length+4*unit,tall*unit);
    }
    ctx.fillStyle="#bbc7b6"; ctx.fillRect(length*.35,-2*unit,length*.3,unit);
    ctx.restore();
  }
  strut(x,y,elbowX,elbowY);
  strut(elbowX,elbowY,tipX,tipY);
  for (const [px,py,r] of [[x,y,10],[elbowX,elbowY,7],[tipX,tipY,5],
    [x-17*unit,y+6*unit,3],[x+17*unit,y+6*unit,3]]) {
    const size=r*unit;
    pixelFrame(ctx,px-size,py-size,size*2,size*2,3,"#263441");
    pixelFrame(ctx,px-size+2,py-size+2,size*2-4,size*2-4,2,"#9cadaa");
    ctx.fillStyle="#526976";
    ctx.fillRect(Math.round(px-size*.53),Math.round(py),Math.max(1,Math.round(size*1.06)),2);
  }
  ctx.save();
  ctx.translate(tipX,tipY);
  ctx.rotate(Math.atan2(tipY-elbowY,tipX-elbowX));
  ctx.beginPath();ctx.moveTo(2*unit,-2*unit);ctx.lineTo(9*unit,-5*unit);ctx.lineTo(13*unit,-3*unit);
  ctx.moveTo(2*unit,2*unit);ctx.lineTo(9*unit,5*unit);ctx.lineTo(13*unit,3*unit);
  ctx.strokeStyle=arm.sweep ? "#e5e9d7" : "#bfcbd0";ctx.lineWidth=2*unit;ctx.stroke();
  ctx.restore();
}
function drawWave(wave) {
  const t = clamp(wave.t/wave.life,0,1);
  const radius = waveRadius(wave);
  if (radius<=0) return;
  ctx.beginPath();ctx.arc(wave.x,wave.y,radius,0,Math.PI*2);
  const color = wave.kind==="blast" ? "255,153,91" : wave.kind==="arm" ? "145,247,213" :
    wave.kind==="star" ? "200,173,255" : "255,213,137";
  ctx.strokeStyle="rgba("+color+","+(1-t)*.28+")";
  ctx.lineWidth=Math.min(radius*.35,(13-5*t)*unit);ctx.stroke();
  ctx.strokeStyle="rgba("+color+","+(1-t)*.98+")";
  ctx.lineWidth=Math.min(radius*.26,(5.5-2*t)*unit);ctx.stroke();
  ctx.setLineDash([7*unit,3*unit]);
  ctx.beginPath();ctx.arc(wave.x,wave.y,radius*.8,0,Math.PI*2);
  ctx.strokeStyle="rgba("+color+","+(1-t)*.55+")";
  ctx.lineWidth=Math.min(radius*.14,2.5*unit);ctx.stroke();
  ctx.setLineDash([]);
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
  ctx.font="800 "+amountSize+"px 'Toy Rounded','BIZ UDPGothic',sans-serif";
  const label="＋"+short(popup.amount);
  const badgeWidth = Math.min(maxWidth,ctx.measureText(label).width+14*unit);
  const top=y-amountSize*.68, tall=amountSize*1.38;
  pixelFrame(ctx,x-badgeWidth/2,top,badgeWidth,tall,3,"#272632");
  pixelFrame(ctx,x-badgeWidth/2+1,top+1,badgeWidth-2,tall-2,2,popup.crit ? "#d3bf6f" : "#cb9559");
  pixelFrame(ctx,x-badgeWidth/2+2,top+2,badgeWidth-4,tall-4,2,popup.crit ? "#314b44" : "#533933");
  ctx.strokeStyle = "#362717";
  ctx.strokeText(label,x,y,maxWidth);
  ctx.fillStyle=popup.burst ? "#ffe48b" : popup.fever ? "#fff0ad" : popup.crit ? "#c7ffcc" : "#ffe4a1";
  ctx.fillText(label,x,y,maxWidth);
  if (annotated) {
    const combo=popup.burst ? "バースト ×"+popup.burst+(popup.crit ? " · 共鳴 ×"+popup.crit : "") :
      "共鳴クリティカル"+(popup.crit>1 ? " ×"+popup.crit : "");
    const comboY = y+(amountSize+comboSize)*.64;
    ctx.font="750 "+comboSize+"px 'Toy Rounded','BIZ UDPGothic',sans-serif";
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
  const hitAge = time-impactTime;
  const strike = hitAge<.18 ? 2.7*Math.sin(hitAge*63)*(1-hitAge/.18)**2 : 0;
  const x = amplitude ? Math.sin(elapsed*62)*amplitude : 0;
  const y = amplitude ? Math.sin(elapsed*48)*amplitude*.55 : 0;
  return {x:clamp(x+kick*.65+strike*.45,-3.2,3.2),y:clamp(y+kick+strike,-3.2,3.2)};
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
// pixelfx sprite sheets preserve their color and light layers in the exported PNG.
function effectSheet(name,frameWidth,frameHeight,columns,frames,pivotX,pivotY) {
  const image = new Image();
  image.src = "art/pixelfx/"+name+".png";
  return {image,frameWidth,frameHeight,columns,frames,pivotX,pivotY};
}
const hitSheet = effectSheet("hit-spark",136,80,4,16,44,47);
const pixelEffects = {
  throw:{sheet:hitSheet,duration:.26,scale:.91},
  rail:{sheet:hitSheet,duration:.29,scale:1.08},
  clash:{sheet:hitSheet,duration:.32,scale:1.26},
  coins:{sheet:effectSheet("coin-spin",56,56,7,48,28,28),duration:.52,scale:.90},
  resonance:{sheet:effectSheet("crit-hit",216,136,5,28,84,89),duration:.62,scale:1.08},
  blast:{sheet:effectSheet("plasma-explosion",224,200,7,52,112,100),duration:.80,scale:1.43},
  fever:{sheet:effectSheet("mana-burst",208,150,7,55,104,95),duration:1.05,scale:1.76},
};
// Visual effects are paced by the animation clock and never consume roll RNG.
function impactPrint(x,y,kind) {
  if (reducedMotion.matches) return;
  if (impactPrints.length>=28) impactPrints.shift();
  impactPrints.push({x,y,kind,start:time});
}
function drawImpactPrints() {
  for (let i=impactPrints.length-1;i>=0;i--) {
    const effect = impactPrints[i];
    if (time-effect.start>=pixelEffects[effect.kind].duration) impactPrints.splice(i,1);
  }
  if (reducedMotion.matches) return;
  ctx.save();
  for (const effect of impactPrints) {
    const {sheet,duration,scale} = pixelEffects[effect.kind];
    if (!sheet.image.naturalWidth) continue;
    const progress = (time-effect.start)/duration;
    const frame = Math.min(sheet.frames-1,Math.floor(progress*sheet.frames));
    const size = Math.min(Math.max(.77,unit)*scale,Math.min(board.w,board.h)*.92/sheet.frameWidth);
    const coins = effect.kind==="coins";
    const y = effect.y-(coins ? (17+34*progress)*unit : 0);
    drawImpactHalo(effect.kind,effect.x,effect.y,progress);
    ctx.globalAlpha = coins ? Math.min(1,(1-progress)*4) : 1;
    ctx.drawImage(sheet.image,frame%sheet.columns*sheet.frameWidth,
      Math.floor(frame/sheet.columns)*sheet.frameHeight,sheet.frameWidth,sheet.frameHeight,
      effect.x-sheet.pivotX*size,y-sheet.pivotY*size,sheet.frameWidth*size,sheet.frameHeight*size);
  }
  ctx.restore();
}
function drawImpactHalo(kind,x,y,progress) {
  const styles = {coins:[23,"#ffcb63"],resonance:[53,"#ffe3a1"],blast:[74,"#ff9570"],fever:[105,"#ffdb82"]};
  const style = styles[kind];
  if (!style || progress>=.74) return;
  const [extent,color] = style;
  const reach=Math.min(extent*Math.max(unit,.78),Math.min(board.w,board.h)*.38);
  const radius=reach*(.22+.78*progress/.74);
  ctx.globalAlpha=(1-progress/.74)*.74;
  ctx.strokeStyle=color;
  ctx.lineWidth=Math.max(1.5,3*unit*(1-progress));
  ctx.beginPath(); ctx.ellipse(x,y,radius,radius*.64,0,0,Math.PI*2); ctx.stroke();
  ctx.globalAlpha*=.55;
  ctx.lineWidth=Math.max(1,unit);
  ctx.beginPath(); ctx.ellipse(x,y,radius*.76,radius*.47,0,0,Math.PI*2); ctx.stroke();
  ctx.globalAlpha=1;
}
function drawRollTrail(die) {
  if (!die.trail?.length || reducedMotion.matches) return;
  const color = specialSkins.get(SPECIAL_DICE[state.dieSpecials[die.slot]])?.glow ??
    (state.dieStars[die.slot]>1 ? starStats(die).color : materials[state.dieMaterials[die.slot]].high);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  for (let i=1;i<die.trail.length;i++) {
    const point = die.trail[i], previous = die.trail[i-1];
    const fade = 1-(time-point.t)/.30;
    if (fade<=0) continue;
    ctx.globalAlpha = fade*.48;
    ctx.lineWidth = (1+4*fade)*unit;
    ctx.beginPath(); ctx.moveTo(previous.x,previous.y); ctx.lineTo(point.x,point.y); ctx.stroke();
    if (i%3===0) {
      ctx.save();
      ctx.translate(point.x,point.y); ctx.rotate(point.angle);
      const half = (5+4*fade)*unit;
      ctx.lineWidth = 1.25*unit;
      ctx.strokeRect(-half,-half,half*2,half*2);
      ctx.restore();
    }
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
function dieCenter(die) {
  return {x:die.x-die.z*.1,y:die.y-die.z*.51-4.8*unit};
}
function renderFirstRollHint() {
  const die = dice[0];
  const visible = firstThrow && dice.length===1 && !die.rolling;
  firstRollHint.hidden = !visible;
  if (!visible) return;
  const center = dieCenter(die);
  const bottom = Math.max(center.y+24,...projectDie(die).points.map(point=>point.y));
  const label = touchInput.matches ? "ダイスをタップして振る" : "このダイスをクリック";
  if (firstRollHint.textContent!==label) firstRollHint.textContent = label;
  firstRollHint.style.left = center.x+"px";
  firstRollHint.style.top = (bottom+12)+"px";
}
function drawResonance(showResult) {
  const event = resonanceResult;
  if (!event || time>=event.until || !dice.includes(event.die)) return;
  const partners = event.partners.filter(die=>dice.includes(die) && !die.rolling && die.face===event.face);
  if (!partners.length || event.die.rolling || event.die.face!==event.face) return;
  const center = dieCenter(event.die);
  const points = partners.map(dieCenter);
  ctx.save();
  if (!showResult) {
    for (const point of points) {
      ctx.beginPath(); ctx.moveTo(center.x,center.y); ctx.lineTo(point.x,point.y);
      ctx.strokeStyle="#ffc86767"; ctx.lineWidth=9*unit; ctx.stroke();
      ctx.strokeStyle="#fff0b6"; ctx.lineWidth=3*unit; ctx.stroke();
    }
  } else {
    for (const die of [event.die,...partners]) {
      const {points:corners} = projectDie(die);
      const left=Math.min(...corners.map(p=>p.x)), top=Math.min(...corners.map(p=>p.y));
      const right=Math.max(...corners.map(p=>p.x)), bottom=Math.max(...corners.map(p=>p.y));
      rounded(ctx,left-3,top-3,right-left+6,bottom-top+6,6);
      ctx.strokeStyle="#b87133"; ctx.lineWidth=4; ctx.stroke();
      ctx.strokeStyle="#fff0ae"; ctx.lineWidth=2; ctx.stroke();
    }
    const label=event.face+"がそろった　＋"+format(event.amount)+"コイン";
    ctx.font="bold 14px 'Toy Rounded','BIZ UDPGothic',sans-serif";
    const labelW=Math.min(board.w-8,ctx.measureText(label).width+20), labelH=29;
    const midX=(center.x+points.reduce((sum,p)=>sum+p.x,0))/(points.length+1);
    const midY=(center.y+points.reduce((sum,p)=>sum+p.y,0))/(points.length+1);
    const x=clamp(midX,board.x+labelW/2+4,board.x+board.w-labelW/2-4);
    const preferred=midY-31*unit-labelH/2;
    const bounds=dice.map(die=>{
      const {points:corners}=projectDie(die);
      return {left:Math.min(...corners.map(p=>p.x))-5,right:Math.max(...corners.map(p=>p.x))+5,
        top:Math.min(...corners.map(p=>p.y))-5,bottom:Math.max(...corners.map(p=>p.y))+5};
    });
    let position, distance=Infinity;
    for (let y=board.y+labelH/2+4;y<=board.y+board.h-labelH/2-4;y+=5) {
      for (const offset of [0,-24,24,-48,48]) {
        const cx=clamp(x+offset,board.x+labelW/2+4,board.x+board.w-labelW/2-4);
        if (bounds.some(b=>cx+labelW/2>b.left && cx-labelW/2<b.right &&
          y+labelH/2>b.top && y-labelH/2<b.bottom)) continue;
        const cost=Math.abs(y-preferred)+Math.abs(cx-x)*1.3;
        if (cost<distance) {distance=cost;position={x:cx,y};}
      }
    }
    // A full board can have no free space for the result. Use the stage header there.
    if (!position) {
      ctx.restore();
      return label;
    } else {
      const left=position.x-labelW/2, top=position.y-labelH/2;
      pixelFrame(ctx,left,top,labelW,labelH,4,"#302931");
      pixelFrame(ctx,left+1,top+1,labelW-2,labelH-2,3,"#c18e50");
      pixelFrame(ctx,left+2,top+2,labelW-4,labelH-5,2,"#f9e7b5");
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillStyle="#613923"; ctx.fillText(label,position.x,position.y,labelW-12);
    }
  }
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
  drawImpactPrints();
  for (const wave of waves) drawWave(wave);
  for (const die of dice) {
    if (isFusing(die)) continue;
    drawStarAura(die);
    drawSpecialGlow(die);
    const lift=die.z/unit, size=(16+lift*.09)*unit*starStats(die).size;
    ctx.beginPath();
    ctx.ellipse(die.x+die.z*.13+3*unit,die.y+die.z*.20+5*unit,size,size*.65,die.rz*.08,0,Math.PI*2);
    ctx.fillStyle="rgba(6,23,15,"+(.36/(1+lift*.016))+")";
    ctx.fill();
  }
  ctx.restore();
  for (const beam of beams) if (beam.arm && beam.life>0) drawBeam(beam);
  drawResonance(false);
  arms.forEach(drawArm);
  if (firstThrow && dice.length===1 && !dice[0].rolling) {
    const center = dieCenter(dice[0]);
    ctx.beginPath(); ctx.arc(center.x,center.y,Math.max(25,32*unit),0,Math.PI*2);
    ctx.strokeStyle="#f2dfaa95"; ctx.lineWidth=1.3; ctx.stroke();
  }
  const ordered = [...dice].sort((a,b)=>paintDepth(a)-paintDepth(b));
  for (const die of ordered) {
    if (isFusing(die) && !reducedMotion.matches) continue;
    drawRollTrail(die);
    drawDie(die);
  }
  drawThrowGuide();
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
    ctx.font = "700 "+Math.max(10,12*unit)+"px 'Toy Rounded','BIZ UDPGothic',sans-serif";
    ctx.fillText("#"+(die.slot+1),die.x-die.z*.10,y-26*unit);
    ctx.restore();
  }
  for (const fusion of fusions) drawFusion(fusion);
  for (const p of particles) if (p.life>0) {
    ctx.globalAlpha=clamp(p.life/p.total,0,1);
    diamond(ctx,p.x,p.y,p.size,p.color);
  }
  ctx.restore();

  // Keep Japanese result labels crisp at the physical display resolution.
  screenCtx.clearRect(0,0,width,height);
  screenCtx.drawImage(pixelScene,0,0,width,height);
  ctx = screenCtx;
  ctx.save();
  ctx.translate(shift.x,shift.y);
  for (const p of popups) {
    if (p.life<=0 || (resonanceResult?.until>time && resonanceResult.partners.includes(p.die))) continue;
    drawPopup(p);
  }
  const label = drawResonance(true) ?? "";
  const status = byId("resonance-status");
  if (status.textContent!==label) status.textContent = label;
  renderFirstRollHint();
  ctx.restore();
  ctx = pixelCtx;
}

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
function findDie(from,to) {
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
  if (!target && firstThrow && dice.length===1) {
    const {x,y} = dieCenter(dice[0]);
    if (faceEntry([{x:x-24,y:y-24},{x:x+24,y:y-24},{x:x+24,y:y+24},{x:x-24,y:y+24}],from,to)<Infinity) return dice[0];
  }
  return target;
}
function manualRoll(die,x,y,power = 1,angle) {
  const strength = Math.min(2.22,(1+.062*state.wave)*power);
  const hard = power>=1.40;
  if (!launch(die,x,y,strength,true,{angle,hard})) return false;
  firstThrow = false;
  firstRollHint.hidden = true;
  if (state.wave) addWave(die);
  if (hard) spark(die.x,die.y,["#ffe3a1","#fff6d3"],8);
  return true;
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
byId("roll-button").addEventListener("click",()=>{
  unlockAudio();
  keyboardRoll();
});

function aimPower(gesture,now) {
  const span = Math.min(board.w,board.h);
  const dx = gesture.last.x-gesture.start.x, dy = gesture.last.y-gesture.start.y;
  const distance = Math.hypot(dx,dy);
  const flick = distance>Math.max(7,span*.022);
  const charge = clamp((now-gesture.started-130)/750,0,1);
  const speed = flick ? gesture.speed*clamp(1-(now-gesture.movedAt)/300,0,1) : 0;
  const power = 1+Math.min(.9,charge*.70+(flick ? Math.min(.66,distance/span*1.6+speed*.16) : 0));
  return {power,flick,angle:flick ? Math.atan2(dy,dx) : undefined};
}
function drawThrowGuide() {
  if (!pointer?.target || pointer.target.rolling) return;
  const {power,angle} = aimPower(pointer,performance.now());
  const {x,y} = pointer.target;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x,y,22*unit,0,Math.PI*2);
  ctx.strokeStyle = "#15271eca";
  ctx.lineWidth = 4*unit;
  ctx.stroke();
  ctx.strokeStyle = "#fff1c78a";
  ctx.lineWidth = unit;
  ctx.stroke();
  ctx.strokeStyle = "#ffe1a0";
  ctx.lineWidth = 2.8*unit;
  ctx.beginPath();
  ctx.arc(x,y,22*unit,-Math.PI/2,-Math.PI/2+Math.PI*2*(power-1)/.9);
  ctx.stroke();
  if (angle!==undefined) {
    const reach = (35+power*15)*unit;
    const endX = x+Math.cos(angle)*reach, endY = y+Math.sin(angle)*reach;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(endX,endY);
    ctx.lineTo(endX-Math.cos(angle-.48)*9*unit,endY-Math.sin(angle-.48)*9*unit);
    ctx.moveTo(endX,endY);ctx.lineTo(endX-Math.cos(angle+.48)*9*unit,endY-Math.sin(angle+.48)*9*unit);
    ctx.stroke();
  }
  ctx.restore();
}
canvas.addEventListener("pointerdown",event=>{
  if (pointer || event.button !== 0) return;
  event.preventDefault();
  unlockAudio();
  canvas.setPointerCapture(event.pointerId);
  const at=inputPoint(event);
  const now = performance.now();
  pointer={id:event.pointerId,start:at,last:at,target:findDie(at,at),started:now,movedAt:now,speed:0};
});
function drag(event) {
  if (pointer?.id !== event.pointerId) return;
  const at=inputPoint(event);
  const now = performance.now();
  const distance = Math.hypot(at.x-pointer.last.x,at.y-pointer.last.y);
  if (distance<=.25) return;
  pointer.speed = distance/unit/Math.max(8,now-pointer.movedAt);
  if (!pointer.target && aimPower({...pointer,last:at},now).flick) {
    const crossed = findDie(pointer.last,at);
    if (crossed) manualRoll(crossed,pointer.last.x,pointer.last.y,1.25,Math.atan2(at.y-pointer.last.y,at.x-pointer.last.x));
  }
  pointer.last = at;
  pointer.movedAt = now;
}
canvas.addEventListener("pointermove",drag);
canvas.addEventListener("pointerup",event=>{
  if (pointer?.id!==event.pointerId) return;
  drag(event);
  const gesture = pointer;
  pointer = null;
  const {power,angle} = aimPower(gesture,performance.now());
  const {target,start} = gesture;
  if (target && !target.rolling) manualRoll(target,start.x,start.y,power,angle);
});
function release(event) {if (pointer?.id===event.pointerId) pointer=null;}
for (const event of ["pointerup","pointercancel","lostpointercapture"]) canvas.addEventListener(event,release);
document.addEventListener("keydown",event=>{
  if (event.repeat || dialog.open || skillDialog.open || !byId("skills").hidden || (event.code!=="Space" && !(event.key==="Enter" && event.target===canvas))) return;
  if (event.target!==canvas && (event.target!==document.body || !matchMedia("(pointer:fine)").matches)) return;
  event.preventDefault();
  unlockAudio();
  keyboardRoll();
});

applySkin();
resize();
resetTable();
recordCollection();
awardMilestones(false);
showIdle(state.savedAt,Date.now());
trackMastery();
save();
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
    const elapsed = Math.min(.06,(now-previous)/1000);
    const pause = Math.min(hitStop,elapsed);
    hitStop -= pause;
    carry += elapsed-pause;
    while (hitStop<=0 && carry>=1/120) {
      step(1/120);
      carry-=1/120;
    }
    if (byId("skills").hidden) draw();
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
