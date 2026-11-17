var W=Object.defineProperty;var _=(e,t,r)=>t in e?W(e,t,{enumerable:!0,configurable:!0,writable:!0,value:r}):e[t]=r;var h=(e,t,r)=>_(e,typeof t!="symbol"?t+"":t,r);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))n(o);new MutationObserver(o=>{for(const i of o)if(i.type==="childList")for(const s of i.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&n(s)}).observe(document,{childList:!0,subtree:!0});function r(o){const i={};return o.integrity&&(i.integrity=o.integrity),o.referrerPolicy&&(i.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?i.credentials="include":o.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function n(o){if(o.ep)return;o.ep=!0;const i=r(o);fetch(o.href,i)}})();const P="cngwriter:stories",U="cngwriter:categories",H="cngwriter:settings",R="cngwriter:theme",D=[{id:"cat-novel",name:"Novel",order:0},{id:"cat-essays",name:"Essays",order:1},{id:"cat-poetry",name:"Poetry",order:2},{id:"cat-journal",name:"Journal",order:3}],S={id:"story-lighthouse",title:"The Last Lighthouse",content:`Chapter One — Salt and Static

The lighthouse at Cape Merrow had survived three wars and four centuries of Atlantic gales, but it was the silence that finally threatened to bring it down.

Elias wound the clockwork brass lantern at 5:00 PM every evening without fail. The gears gave a familiar metallic hum — twelve slow clicks per revolution, calibrated to sweep the beam across sixty nautical miles of dark water.

"Keep writing," he muttered to himself as the Atlantic roared below.`,categoryId:"cat-novel",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};function F(){try{const e=localStorage.getItem(P);if(!e)return[S];const t=JSON.parse(e);return Array.isArray(t)&&t.length>0?t:[S]}catch{return[S]}}function V(e){try{localStorage.setItem(P,JSON.stringify(e))}catch{}}function G(){try{const e=localStorage.getItem(U);if(!e)return D;const t=JSON.parse(e);return Array.isArray(t)&&t.length>0?t:D}catch{return D}}function K(e){try{localStorage.setItem(U,JSON.stringify(e))}catch{}}function Y(){try{const e=localStorage.getItem(H);return e?JSON.parse(e):{writerName:"Writer",lastBackupAt:null}}catch{return{writerName:"Writer",lastBackupAt:null}}}function Z(e){try{localStorage.setItem(H,JSON.stringify(e))}catch{}}function Q(){try{const e=localStorage.getItem(R);return e==="light"||e==="dark"?e:window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}catch{return"dark"}}function X(e){try{localStorage.setItem(R,e)}catch{}}function E(e,t){if(!e.categoryId)return"Unshelved";const r=t.find(n=>n.id===e.categoryId);return r?r.name:"Unshelved"}function tt(e,t,r){if(t==="All")return e.length;if(t==="Unshelved")return e.filter(o=>!o.categoryId||!r.some(i=>i.id===o.categoryId)).length;const n=r.find(o=>o.name.toLowerCase()===t.toLowerCase());return n?e.filter(o=>o.categoryId===n.id).length:0}function et(e,t){const r=new Map;for(const n of e)r.set(n.id,n);for(const n of t){const o=r.get(n.id);if(!o)r.set(n.id,n);else{const i=new Date(o.updatedAt).getTime();new Date(n.updatedAt).getTime()>=i&&r.set(n.id,n)}}return Array.from(r.values()).sort((n,o)=>new Date(o.updatedAt).getTime()-new Date(n.updatedAt).getTime())}function m(e){if(!e||typeof e!="string")return 0;const t=e.replace(/[\r\n\t]+/g," ").replace(/[#*_`~>-]/g," ").trim();return t?t.split(/\s+/).filter(Boolean).length:0}function q(e){const t=m(e);return Math.max(1,Math.ceil(t/200))}function b(e){try{const t=new Date(e);return isNaN(t.getTime())?"recently":t.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}catch{return"recently"}}function rt(e){try{const t=Date.now()-new Date(e).getTime(),r=Math.max(0,Math.floor(t/1e3));if(r<45)return"just now";const n=Math.floor(r/60);if(n<60)return`${n}m ago`;const o=Math.floor(n/60);if(o<24)return`${o}h ago`;const i=Math.floor(o/24);return i<30?`${i}d ago`:b(e)}catch{return"recently"}}function ot(e){return e.toLowerCase().replace(/[^\w\s-]/g,"").trim().replace(/\s+/g,"-").slice(0,48)||"untitled"}function nt(e,t,r){return{version:1,exportedAt:new Date().toISOString(),settings:r,categories:t,stories:e}}function it(e){try{const t=JSON.parse(e);if(!t||typeof t!="object")return null;const r=Array.isArray(t.stories)?t.stories:[],n=Array.isArray(t.categories)?t.categories:[];return{version:1,exportedAt:t.exportedAt||new Date().toISOString(),settings:t.settings,categories:n,stories:r}}catch{return null}}function M(e,t,r){try{const n=new Blob([t],{type:`${r};charset=utf-8`}),o=URL.createObjectURL(n),i=document.createElement("a");i.href=o,i.download=e,document.body.appendChild(i),i.click(),document.body.removeChild(i),URL.revokeObjectURL(o)}catch(n){console.error("downloadFile error:",n)}}function dt(e,t){const r=e.title&&typeof e.title=="string"?e.title:"Untitled",n=e.content&&typeof e.content=="string"?e.content:"";return`# ${r}

*Shelf: ${t} · Updated: ${b(e.updatedAt)}*

---

${n}
`}function at(e,t){const r=e.title&&typeof e.title=="string"?e.title:"Untitled",n=e.content&&typeof e.content=="string"?e.content:"";return`${r}
Shelf: ${t} · Updated: ${b(e.updatedAt)}

${n}
`}function ct(e,t){const r=window.open("","_blank");if(!r)return;const n=e.title&&typeof e.title=="string"?e.title:"Untitled",o=e.content&&typeof e.content=="string"?e.content:"",i=o.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br/>"),s=m(o);r.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${n}</title><style>@media print{@page{margin:18mm}} body{font-family:ui-serif,Georgia,serif;max-width:720px;margin:40px auto;padding:0 24px;color:#15221d;background:#f2f5f3} h1{font-size:28px;margin:0 0 8px} .meta{font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#52635c;margin-bottom:16px} hr{border:none;border-top:1px solid #d8e2dc;margin:16px 0} pre{white-space:pre-wrap;font-family:inherit;font-size:17px;line-height:1.8}</style></head><body><h1>${n}</h1><div class="meta">${t} · ${s.toLocaleString()} words · ${b(e.updatedAt)}</div><hr/><pre>${i}</pre></body></html>`),r.document.close(),r.focus(),setTimeout(()=>{try{r.print()}catch{}},300)}class st{constructor(){h(this,"stories",F());h(this,"categories",G());h(this,"settings",Y());h(this,"theme",Q());h(this,"toasts",[]);h(this,"activeStoryId",null);h(this,"syncing",!1);h(this,"authEmail",null);h(this,"listeners",new Set);h(this,"saveTimer",null);const t=this.theme;try{t==="dark"?document.documentElement.classList.add("dark"):document.documentElement.classList.remove("dark")}catch{}}subscribe(t){return this.listeners.add(t),()=>{this.listeners.delete(t)}}notify(){for(const t of this.listeners)try{t()}catch(r){console.error("Store listener error:",r)}}schedulePersist(){this.saveTimer!==null&&clearTimeout(this.saveTimer),this.saveTimer=window.setTimeout(()=>{V(this.stories),K(this.categories),Z(this.settings),this.saveTimer=null},150)}setActiveStory(t){this.activeStoryId=t,this.notify()}setTheme(t){this.theme=t,X(t);const r=document.documentElement;t==="dark"?r.classList.add("dark"):r.classList.remove("dark"),this.notify()}toast(t,r="ok"){const n=`toast-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;this.toasts.push({id:n,message:t,tone:r}),this.notify(),setTimeout(()=>{this.toasts=this.toasts.filter(o=>o.id!==n),this.notify()},2800)}dismissToast(t){this.toasts=this.toasts.filter(r=>r.id!==t),this.notify()}createStory(t){var i;const r=`story_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,n=new Date().toISOString(),o={id:r,title:"Untitled Story",content:"",categoryId:t||((i=this.categories[0])==null?void 0:i.id)||"",createdAt:n,updatedAt:n};return this.stories=[o,...this.stories],this.schedulePersist(),this.toast("New story created","ok"),this.setActiveStory(o.id),o}updateStory(t,r){const n=new Date().toISOString();this.stories=this.stories.map(o=>o.id!==t?o:{...o,...r,updatedAt:n}),this.schedulePersist(),this.notify()}deleteStory(t){this.stories=this.stories.filter(r=>r.id!==t),this.activeStoryId===t&&(this.activeStoryId=null),this.schedulePersist(),this.toast("Story deleted","ok"),this.notify()}addCategory(t){const r=t.trim();if(!r)return null;const n=this.categories.find(i=>i.name.toLowerCase()===r.toLowerCase());if(n)return n;const o={id:`cat-${Date.now()}`,name:r,order:this.categories.length};return this.categories.push(o),this.schedulePersist(),this.toast(`Shelf "${r}" added`,"ok"),this.notify(),o}exportAllBackup(){const t=nt(this.stories,this.categories,this.settings),r=JSON.stringify(t,null,2),n=new Blob([r],{type:"application/json"}),o=URL.createObjectURL(n),i=document.createElement("a");i.href=o,i.download=`cng-writer-backup-${new Date().toISOString().slice(0,10)}.json`,i.click(),URL.revokeObjectURL(o),this.toast("Library exported","ok")}importBackupText(t){const r=it(t);if(!r)return this.toast("Invalid backup JSON","error"),!1;this.stories=et(this.stories,r.stories);const n=new Map(this.categories.map(o=>[o.name.toLowerCase(),o]));for(const o of r.categories)n.has(o.name.toLowerCase())||n.set(o.name.toLowerCase(),o);return this.categories=Array.from(n.values()),r.settings&&(this.settings={...this.settings,...r.settings}),this.schedulePersist(),this.toast(`Imported ${r.stories.length} stories`,"ok"),this.notify(),!0}async login(t,r){this.toast("Local-first mode — no sign-in required","info")}logout(){this.toast("Local Sanctuary — 100% Private","info"),this.notify()}async refreshFromCloud(){}}const a=new st;function lt(){var n,o,i;const e=document.getElementById("settings-modal-backdrop");e&&e.remove();const t=document.createElement("div");t.id="settings-modal-backdrop",t.className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4",t.innerHTML=`
    <div class="relative w-full max-w-md rounded-2xl border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark p-6 shadow-2xl">
      <div class="flex items-center justify-between pb-4 border-b border-nordic-borderLight dark:border-nordic-borderDark">
        <h3 class="font-serif text-lg font-semibold text-nordic-textLight dark:text-nordic-textDark">Library Settings & Backup</h3>
        <button id="modal-close" class="text-nordic-mutedLight hover:text-nordic-textLight dark:hover:text-nordic-textDark text-lg font-mono">✕</button>
      </div>

      <!-- Writer Name / Local Sanctuary Info -->
      <div class="mt-5">
        <h4 class="font-mono text-[11px] font-semibold uppercase tracking-wider text-nordic-mutedLight dark:text-nordic-mutedDark">Writer Profile</h4>
        <p class="mt-1 text-xs text-nordic-mutedLight dark:text-nordic-mutedDark">Local Sanctuary · 100% Private on this device</p>
        <label class="mt-3 block text-xs font-medium text-nordic-mutedLight dark:text-nordic-mutedDark">Writer Name</label>
        <input id="input-writer-name" type="text" value="${a.settings.writerName||"Writer"}" placeholder="Writer" class="mt-1 w-full rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-bgLight dark:bg-nordic-bgDark px-3 py-2 text-sm text-nordic-textLight dark:text-nordic-textDark outline-none placeholder:text-nordic-mutedLight focus:border-nordic-accentLight dark:focus:border-nordic-accentDark" />
        <p class="mt-2 text-[11px] font-mono text-nordic-mutedLight dark:text-nordic-mutedDark">Displayed in exports · stored locally only</p>
      </div>

      <!-- Library Backup Section -->
      <div class="mt-6 border-t border-nordic-borderLight dark:border-nordic-borderDark pt-5">
        <h4 class="font-mono text-[11px] font-semibold uppercase tracking-wider text-nordic-mutedLight dark:text-nordic-mutedDark">Library Backup</h4>
        <p class="mt-1 text-xs leading-5 text-nordic-mutedLight dark:text-nordic-mutedDark">Manual JSON backup — instant offline save, full control. Export your entire library or import a previous backup.</p>
        <div class="mt-4 flex gap-2">
          <button id="modal-export" class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-bgLight dark:bg-nordic-bgDark py-2.5 text-xs font-semibold text-nordic-textLight dark:text-nordic-textDark hover:border-nordic-accentLight dark:hover:border-nordic-accentDark hover:text-nordic-accentLight dark:hover:text-nordic-accentDark transition-all">Export JSON</button>
          <button id="modal-import" class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-nordic-accentLight dark:bg-nordic-accentDark py-2.5 text-xs font-bold text-white dark:text-nordic-bgDark hover:opacity-90 transition-all">Import JSON</button>
        </div>
        <p class="mt-3 text-center font-mono text-[10px] text-nordic-mutedLight dark:text-nordic-mutedDark">Offline-first · No cloud · No tracking</p>
      </div>
    </div>
  `,document.body.appendChild(t);const r=t.querySelector("#input-writer-name");r==null||r.addEventListener("change",()=>{var d;const s=r.value.trim()||"Writer";a.settings.writerName=s;try{const c=a.settings;(d=a.schedulePersist)==null||d.call(a),localStorage.setItem("cngwriter:settings",JSON.stringify(c))}catch{}}),r==null||r.addEventListener("input",()=>{const s=r.value;a.settings.writerName=s||"Writer"}),(n=t.querySelector("#modal-close"))==null||n.addEventListener("click",()=>t.remove()),t.addEventListener("click",s=>{s.target===t&&t.remove()}),(o=t.querySelector("#modal-export"))==null||o.addEventListener("click",()=>a.exportAllBackup()),(i=t.querySelector("#modal-import"))==null||i.addEventListener("click",()=>{const s=document.createElement("input");s.type="file",s.accept=".json,application/json",s.onchange=async()=>{var c;const d=(c=s.files)==null?void 0:c[0];if(d){const l=await d.text();a.importBackupText(l),t.remove()}},s.click()})}function ut(){var t,r,n,o;const e=document.createElement("header");return e.className="sticky top-0 z-40 border-b border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-bgLight/80 dark:bg-nordic-bgDark/80 backdrop-blur-xl transition-colors duration-200",e.innerHTML=`
    <div class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5">
      <div class="flex items-center gap-2.5">
        <span class="grid h-8 w-8 place-items-center rounded-lg border border-nordic-accentLight/30 bg-nordic-accentLight/10 text-nordic-accentLight dark:border-nordic-accentDark/30 dark:bg-nordic-accentDark/10 dark:text-nordic-accentDark">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path><line x1="16" y1="8" x2="2" y2="22"></line><line x1="17.5" y1="15" x2="9" y2="15"></line></svg>
        </span>
        <span class="font-serif text-[22px] font-semibold italic leading-none text-nordic-textLight dark:text-nordic-textDark">CnG</span>
        <span class="hidden font-mono text-[10px] font-medium uppercase tracking-[0.32em] text-nordic-mutedLight dark:text-nordic-mutedDark sm:inline">Writer</span>
        <span class="inline-flex items-center gap-1.5 rounded-full border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark px-2.5 py-1 font-mono text-[10px] text-nordic-mutedLight dark:text-nordic-mutedDark"><span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Private & Local</span>
      </div>

      <div class="flex items-center gap-2">
        <button id="btn-export-all" class="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark px-3 text-[13px] font-medium text-nordic-mutedLight dark:text-nordic-mutedDark hover:border-nordic-accentLight dark:hover:border-nordic-accentDark hover:text-nordic-accentLight dark:hover:text-nordic-accentDark transition-all">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Export All
        </button>
        <button id="btn-import-all" class="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark px-3 text-[13px] font-medium text-nordic-mutedLight dark:text-nordic-mutedDark hover:border-nordic-borderLight/80 transition-all">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          Import
        </button>
        <span class="mx-1 hidden sm:block h-4 w-px bg-nordic-borderLight dark:bg-nordic-borderDark"></span>
        <button id="btn-new-story" class="inline-flex h-9 items-center gap-2 rounded-lg bg-nordic-accentLight dark:bg-nordic-accentDark px-3.5 text-[13px] font-bold text-white dark:text-nordic-bgDark hover:opacity-90 active:scale-[0.97] transition-all">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span class="hidden sm:inline">New story</span><span class="sm:hidden">New</span>
        </button>
        <button id="btn-settings" class="grid h-9 w-9 place-items-center rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark text-nordic-mutedLight dark:text-nordic-mutedDark hover:text-nordic-textLight dark:hover:text-nordic-textDark transition-all">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        </button>
      </div>
    </div>
  `,(t=e.querySelector("#btn-new-story"))==null||t.addEventListener("click",()=>a.createStory()),(r=e.querySelector("#btn-export-all"))==null||r.addEventListener("click",()=>a.exportAllBackup()),(n=e.querySelector("#btn-import-all"))==null||n.addEventListener("click",()=>{const i=document.createElement("input");i.type="file",i.accept=".json,application/json",i.onchange=async()=>{var d;const s=(d=i.files)==null?void 0:d[0];if(s){const c=await s.text();a.importBackupText(c)}},i.click()}),(o=e.querySelector("#btn-settings"))==null||o.addEventListener("click",()=>lt()),e}let k="All",L="";function $(){var i,s;const e=document.createElement("div");e.className="mx-auto max-w-6xl px-5 py-6";const t=a.stories.reduce((d,c)=>d+m(c.content||""),0),r=["All","Unshelved",...a.categories.map(d=>d.name)],n=a.stories.filter(d=>{const c=E(d,a.categories),l=k==="All"||c.toLowerCase()===k.toLowerCase(),p=`${d.title} ${d.content} ${c}`.toLowerCase(),x=!L||p.includes(L.toLowerCase().trim());return l&&x});e.innerHTML=`
    <!-- Library Header -->
    <div class="flex flex-wrap items-start justify-between gap-4 border-b border-nordic-borderLight dark:border-nordic-borderDark pb-6">
      <div class="flex gap-4">
        <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-nordic-accentLight to-emerald-700 dark:from-nordic-accentDark dark:to-emerald-400 text-white dark:text-nordic-bgDark shadow-sm">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
        </span>
        <div>
          <h2 class="font-serif text-xl font-semibold tracking-tight text-nordic-textLight dark:text-nordic-textDark">Nordic Library</h2>
          <p class="max-w-[50ch] text-[13px] leading-5 text-nordic-mutedLight dark:text-nordic-mutedDark">Offline-first writing sanctuary. Stories save automatically and sync securely.</p>
          <p class="mt-2 font-mono text-[11px] text-nordic-mutedLight dark:text-nordic-mutedDark">${a.stories.length} stories · ${t.toLocaleString()} words</p>
        </div>
      </div>
      <div class="text-left sm:text-right font-mono text-[11px] text-nordic-mutedLight dark:text-nordic-mutedDark">
        Theme: <button id="btn-theme-toggle" class="underline underline-offset-4 hover:text-nordic-accentLight dark:hover:text-nordic-accentDark font-semibold uppercase">${a.theme}</button>
      </div>
    </div>

    <!-- Filters & Search Bar -->
    <div class="flex flex-wrap items-center gap-3 py-4">
      <div class="relative">
        <svg class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-nordic-mutedLight dark:text-nordic-mutedDark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input id="input-search" value="${L}" placeholder="Filter stories..." class="h-9 rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark py-2 pl-9 pr-3 text-sm text-nordic-textLight dark:text-nordic-textDark outline-none placeholder:text-nordic-mutedLight dark:placeholder:text-nordic-mutedDark focus:border-nordic-accentLight dark:focus:border-nordic-accentDark transition-all" />
      </div>

      <div class="inline-flex flex-wrap items-center gap-1.5 rounded-full border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark p-1">
        ${r.map(d=>{const c=k.toLowerCase()===d.toLowerCase(),l=tt(a.stories,d,a.categories);return`
            <button data-shelf="${d}" class="shelf-chip px-3 py-1 text-[12px] font-medium transition-all rounded-full ${c?"bg-nordic-textLight dark:bg-nordic-textDark text-nordic-bgLight dark:text-nordic-bgDark":"text-nordic-mutedLight dark:text-nordic-mutedDark hover:text-nordic-textLight dark:hover:text-nordic-textDark"}">
              ${d} <span class="ml-1 font-mono text-[10px] opacity-70">${l}</span>
            </button>
          `}).join("")}
      </div>

      <button id="btn-start-writing" class="ml-auto inline-flex h-9 items-center justify-center rounded-full border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark px-4 text-sm font-semibold text-nordic-textLight dark:text-nordic-textDark hover:border-nordic-accentLight dark:hover:border-nordic-accentDark transition-all">
        Start writing
      </button>
    </div>

    <!-- Stories Grid -->
    ${n.length===0?`
      <div class="grid place-items-center rounded-2xl border border-dashed border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight/50 dark:bg-nordic-cardDark/50 px-6 py-14 text-center">
        <p class="text-sm text-nordic-mutedLight dark:text-nordic-mutedDark">No stories found. Start a new draft or clear your filters.</p>
      </div>
    `:`
      <div class="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
        ${n.map(d=>{const c=E(d,a.categories),l=m(d.content||"");return`
            <div data-story-id="${d.id}" class="story-card group relative flex min-h-[200px] cursor-pointer flex-col rounded-2xl border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark px-5 pb-4 pt-5 text-left transition-all duration-200 hover:border-nordic-accentLight dark:hover:border-nordic-accentDark hover:shadow-md hover:-translate-y-0.5">
              <span class="line-clamp-2 pr-2 font-serif text-[18px] font-semibold leading-6 text-nordic-textLight dark:text-nordic-textDark">${d.title||"Untitled Story"}</span>
              <span class="mt-1 font-mono text-[10px] uppercase tracking-widest text-nordic-accentLight dark:text-nordic-accentDark">${c}</span>
              <p class="mt-3 line-clamp-3 text-[13px] leading-6 text-nordic-mutedLight dark:text-nordic-mutedDark">${(d.content||"No content yet. Tap to begin writing...").slice(0,200)}</p>
              <div class="mt-auto flex items-center justify-between pt-4 font-mono text-[11px] text-nordic-mutedLight dark:text-nordic-mutedDark">
                <span>${l.toLocaleString()} words</span>
                <div class="flex items-center gap-2">
                  <span title="${b(d.updatedAt)}">${rt(d.updatedAt)}</span>
                  <button data-delete-id="${d.id}" class="delete-btn grid h-7 w-7 place-items-center rounded-full border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark text-nordic-mutedLight hover:text-red-500 hover:border-red-300 dark:hover:border-red-900 transition-all" title="Delete story">
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </div>
            </div>
          `}).join("")}
      </div>
    `}
  `,(i=e.querySelector("#btn-theme-toggle"))==null||i.addEventListener("click",()=>{a.setTheme(a.theme==="dark"?"light":"dark")});const o=e.querySelector("#input-search");return o==null||o.addEventListener("input",d=>{var l;L=d.target.value;const c=e.parentElement;c&&(c.replaceChildren($()),(l=c.querySelector("#input-search"))==null||l.focus())}),e.querySelectorAll(".shelf-chip").forEach(d=>{d.addEventListener("click",c=>{var l;k=c.currentTarget.getAttribute("data-shelf")||"All",(l=e.parentElement)==null||l.replaceChildren($())})}),(s=e.querySelector("#btn-start-writing"))==null||s.addEventListener("click",()=>{const d=a.categories.find(c=>c.name.toLowerCase()===k.toLowerCase());a.createStory(d==null?void 0:d.id)}),e.querySelectorAll(".story-card").forEach(d=>{d.addEventListener("click",c=>{if(c.target.closest(".delete-btn"))return;const l=d.getAttribute("data-story-id");l&&a.setActiveStory(l)})}),e.querySelectorAll(".delete-btn").forEach(d=>{d.addEventListener("click",c=>{c.stopPropagation();const l=d.getAttribute("data-delete-id");l&&confirm("Are you sure you want to delete this story?")&&a.deleteStory(l)})}),e}function gt(e){var C,N,O,I,j,B;const t=a.stories.find(u=>u.id===e),r=document.createElement("div");if(r.className="min-h-[calc(100vh-4rem)] bg-nordic-bgLight dark:bg-nordic-bgDark transition-colors duration-200",!t)return r.innerHTML=`
      <div class="mx-auto max-w-lg px-5 py-20 text-center">
        <p class="text-nordic-mutedLight dark:text-nordic-mutedDark">Story not found or deleted.</p>
        <button id="btn-back-shelf" class="mt-4 rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark px-4 py-2 text-sm text-nordic-textLight dark:text-nordic-textDark">Return to Shelf</button>
      </div>
    `,(C=r.querySelector("#btn-back-shelf"))==null||C.addEventListener("click",()=>a.setActiveStory(null)),r;let n=t.title,o=t.content,i="Saved",s=null,d=!1;const c=E(t,a.categories);r.innerHTML=`
    <!-- Top Action Bar -->
    <div class="sticky top-16 z-30 border-b border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-bgLight/70 dark:bg-nordic-bgDark/70 backdrop-blur-xl">
      <div class="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3">
        <div class="flex items-center gap-3">
          <button id="btn-back" class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark px-2.5 text-[13px] font-medium text-nordic-textLight dark:text-nordic-textDark hover:border-nordic-accentLight dark:hover:border-nordic-accentDark transition-all">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            Shelf
          </button>
          <span id="save-indicator" class="font-mono text-[11px] text-nordic-mutedLight dark:text-nordic-mutedDark">${i}</span>
        </div>

        <div class="flex items-center gap-2">
          <select id="select-shelf" class="h-8 rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark px-2.5 text-[12px] text-nordic-textLight dark:text-nordic-textDark outline-none">
            <option value="">Unshelved</option>
            ${a.categories.map(u=>`<option value="${u.id}" ${u.id===t.categoryId?"selected":""}>${u.name}</option>`).join("")}
          </select>

          <div class="relative">
            <button id="btn-export-dropdown" class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark px-3 text-[12px] font-medium text-nordic-textLight dark:text-nordic-textDark transition-all">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Export
            </button>
            <div id="export-menu" class="hidden absolute right-0 z-40 mt-1 w-44 rounded-xl border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark py-1 shadow-lg">
              <button id="exp-md" class="w-full px-3 py-1.5 text-left text-xs text-nordic-textLight dark:text-nordic-textDark hover:bg-nordic-bgLight dark:hover:bg-nordic-bgDark">Markdown (.md)</button>
              <button id="exp-txt" class="w-full px-3 py-1.5 text-left text-xs text-nordic-textLight dark:text-nordic-textDark hover:bg-nordic-bgLight dark:hover:bg-nordic-bgDark">Plain text (.txt)</button>
              <button id="exp-pdf" class="w-full px-3 py-1.5 text-left text-xs text-nordic-textLight dark:text-nordic-textDark hover:bg-nordic-bgLight dark:hover:bg-nordic-bgDark">Print / PDF</button>
            </div>
          </div>

          <button id="btn-delete" class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 px-3 text-[12px] font-medium text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white transition-all">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Zen Writing Pad -->
    <div class="mx-auto max-w-3xl px-5 py-10">
      <div class="rounded-2xl border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark p-8 shadow-sm">
        <textarea
          id="editor-title"
          rows="1"
          placeholder="Untitled Story"
          class="w-full resize-none overflow-hidden bg-transparent font-serif text-[30px] font-semibold leading-tight text-nordic-textLight dark:text-nordic-textDark outline-none placeholder:text-nordic-mutedLight/50 dark:placeholder:text-nordic-mutedDark/50"
        >${n}</textarea>

        <div class="mt-2 font-mono text-[11px] text-nordic-mutedLight dark:text-nordic-mutedDark">
          ${c} · Last edited ${b(t.updatedAt)}
        </div>
        <div class="mt-6 h-px bg-nordic-borderLight dark:bg-nordic-borderDark"></div>

        <textarea
          id="editor-content"
          rows="14"
          placeholder="Begin writing your story here…"
          class="mt-8 min-h-[420px] w-full resize-none overflow-hidden bg-transparent font-serif text-lg leading-loose text-nordic-textLight dark:text-nordic-textDark outline-none placeholder:text-nordic-mutedLight/50 dark:placeholder:text-nordic-mutedDark/50"
        >${o}</textarea>

        <!-- Stats Bar -->
        <div class="mt-8 flex flex-wrap items-center justify-between gap-2 rounded-full border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-bgLight dark:bg-nordic-bgDark px-4 py-2 font-mono text-[11px] text-nordic-mutedLight dark:text-nordic-mutedDark">
          <span id="stats-text">${m(o).toLocaleString()} words · ${o.length.toLocaleString()} chars · ${q(o)} min read</span>
          <span class="text-nordic-accentLight dark:text-nordic-accentDark font-semibold">Zen Active</span>
        </div>
      </div>
    </div>
  `;const l=u=>{u.style.height="auto",u.style.height=`${u.scrollHeight}px`},p=r.querySelector("#editor-title"),x=r.querySelector("#editor-content"),v=r.querySelector("#save-indicator"),z=r.querySelector("#stats-text");p&&l(p),x&&l(x);const A=()=>{v.innerText="Saving...",v.className="font-mono text-[11px] text-amber-500 animate-pulse",s!==null&&clearTimeout(s),s=window.setTimeout(()=>{a.updateStory(e,{title:n,content:o}),v.innerText="Saved",v.className="font-mono text-[11px] text-nordic-accentLight dark:text-nordic-accentDark",s=null},200)};p==null||p.addEventListener("input",u=>{n=u.target.value,l(p),A()}),x==null||x.addEventListener("input",u=>{o=u.target.value,l(x),z.innerText=`${m(o).toLocaleString()} words · ${o.length.toLocaleString()} chars · ${q(o)} min read`,A()}),(N=r.querySelector("#btn-back"))==null||N.addEventListener("click",()=>{s!==null&&(clearTimeout(s),a.updateStory(e,{title:n,content:o})),a.setActiveStory(null)});const y=r.querySelector("#select-shelf");y==null||y.addEventListener("change",()=>{a.updateStory(e,{categoryId:y.value})});const w=r.querySelector("#btn-export-dropdown"),g=r.querySelector("#export-menu");w==null||w.addEventListener("click",()=>{d=!d,g==null||g.classList.toggle("hidden",!d)});const T=ot(n||"untitled");return(O=r.querySelector("#exp-md"))==null||O.addEventListener("click",()=>{M(`${T}.md`,dt({...t,title:n,content:o},c),"text/markdown"),g==null||g.classList.add("hidden")}),(I=r.querySelector("#exp-txt"))==null||I.addEventListener("click",()=>{M(`${T}.txt`,at({...t,title:n,content:o},c),"text/plain"),g==null||g.classList.add("hidden")}),(j=r.querySelector("#exp-pdf"))==null||j.addEventListener("click",()=>{ct({...t,title:n,content:o},c),g==null||g.classList.add("hidden")}),(B=r.querySelector("#btn-delete"))==null||B.addEventListener("click",()=>{confirm("Delete this story?")&&a.deleteStory(e)}),r}function ht(){const e=document.createElement("div");return e.className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2",a.toasts.forEach(t=>{var n;const r=document.createElement("div");r.className=`pointer-events-auto min-w-[200px] max-w-[320px] rounded-xl border px-3.5 py-2.5 text-xs shadow-lg backdrop-blur bg-nordic-cardLight/95 dark:bg-nordic-cardDark/95 transition-all ${t.tone==="error"?"border-red-500/40 text-red-600 dark:text-red-400":"border-nordic-accentLight/40 dark:border-nordic-accentDark/40 text-nordic-textLight dark:text-nordic-textDark"}`,r.innerHTML=`
      <div class="flex items-center justify-between gap-2">
        <span>${t.message}</span>
        <button class="font-mono text-xs opacity-60 hover:opacity-100">✕</button>
      </div>
    `,(n=r.querySelector("button"))==null||n.addEventListener("click",()=>a.dismissToast(t.id)),e.appendChild(r)}),e}const f=document.getElementById("app");function J(){a.theme==="dark"?document.documentElement.classList.add("dark"):document.documentElement.classList.remove("dark"),f.replaceChildren(),f.appendChild(ut()),a.activeStoryId?f.appendChild(gt(a.activeStoryId)):f.appendChild($()),f.appendChild(ht())}J();a.subscribe(()=>{J()});
