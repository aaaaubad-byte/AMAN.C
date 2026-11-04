(() => {
"use strict";
if (window.AMANPullRefresh) return;
const attached = new WeakMap();
const STYLE = '.aman-pull-indicator{height:0;overflow:hidden;display:flex;align-items:center;justify-content:center;gap:8px;color:var(--muted);font-size:11px;font-weight:700;opacity:0;transition:height .18s ease,opacity .18s ease}.aman-pull-indicator.is-pulling,.aman-pull-indicator.is-refreshing{height:42px;opacity:1}.aman-pull-indicator .aman-pull-spinner{width:15px;height:15px;border:2px solid var(--line);border-top-color:var(--turquoise);border-radius:50%;display:none}.aman-pull-indicator.is-refreshing .aman-pull-spinner{display:block;animation:aman-pull-spin .7s linear infinite}@keyframes aman-pull-spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.aman-pull-indicator,.aman-pull-indicator .aman-pull-spinner{transition:none;animation:none!important}}';
function installStyle(){
 if(document.getElementById("aman-pull-refresh-style"))return;
 const style=document.createElement("style");style.id="aman-pull-refresh-style";style.textContent=STYLE;document.head.append(style);
}
function attach(root,refresh){
 if(!root)return;
 const existing=attached.get(root);
 if(existing){existing.refresh=typeof refresh==="function"?refresh:null;return;}
 if(typeof refresh!=="function")return;
 installStyle();
 const indicator=document.createElement("div");indicator.className="aman-pull-indicator";indicator.setAttribute("aria-live","polite");
 const spinner=document.createElement("span");spinner.className="aman-pull-spinner";spinner.setAttribute("aria-hidden","true");
 const label=document.createElement("span");label.textContent="اسحب للأسفل للتحديث";indicator.append(spinner,label);root.insertBefore(indicator,root.firstChild);
 const state={refresh,startY:null,armed:false,refreshing:false};
 attached.set(root,state);
 root.addEventListener("touchstart",event=>{
  if(!state.refresh||state.refreshing||event.touches.length!==1)return;
  if(event.target.closest("input,select,textarea,[contenteditable=true]"))return;
  if(window.scrollY>1||root.scrollTop>1)return;
  state.startY=event.touches[0].clientY;state.armed=false;
 },{passive:true});
 root.addEventListener("touchmove",event=>{
  if(state.startY===null||state.refreshing||event.touches.length!==1)return;
  const distance=event.touches[0].clientY-state.startY;
  if(distance<=0){indicator.classList.remove("is-pulling");label.textContent="اسحب للأسفل للتحديث";state.armed=false;return;}
  if(distance>8)event.preventDefault();
  indicator.classList.add("is-pulling");state.armed=distance>=64;
  label.textContent=state.armed?"اترك للتحديث":"اسحب للأسفل للتحديث";
 },{passive:false});
 const finish=async()=>{
  if(state.startY===null)return;
  state.startY=null;indicator.classList.remove("is-pulling");
  if(!state.armed||state.refreshing||!state.refresh){state.armed=false;return;}
  state.armed=false;state.refreshing=true;indicator.classList.add("is-refreshing");label.textContent="جارٍ تحديث البيانات…";
  try{await state.refresh();label.textContent="اكتمل التحديث";}
  catch{label.textContent="تعذر التحديث";}
  finally{state.refreshing=false;indicator.classList.remove("is-refreshing");window.setTimeout(()=>{if(!state.refreshing)indicator.classList.remove("is-pulling");},900);}
 };
 root.addEventListener("touchend",finish,{passive:true});
 root.addEventListener("touchcancel",()=>{state.startY=null;state.armed=false;indicator.classList.remove("is-pulling");},{passive:true});
}
window.AMANPullRefresh={attach};
})();