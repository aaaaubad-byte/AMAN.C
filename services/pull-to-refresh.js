(() => {
"use strict";
if (window.AMANPullRefresh) return;
const STYLE = '.aman-pull-indicator{height:0;overflow:hidden;display:flex;align-items:center;justify-content:center;gap:8px;color:var(--muted);font-size:11px;font-weight:700;opacity:0;transition:height .18s ease,opacity .18s ease}.aman-pull-indicator.is-pulling{height:42px;opacity:1}.aman-pull-indicator.is-refreshing{height:42px;opacity:1}.aman-pull-indicator .aman-pull-spinner{width:15px;height:15px;border:2px solid var(--line);border-top-color:var(--turquoise);border-radius:50%;display:none}.aman-pull-indicator.is-refreshing .aman-pull-spinner{display:block;animation:aman-pull-spin .7s linear infinite}@keyframes aman-pull-spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.aman-pull-indicator,.aman-pull-indicator .aman-pull-spinner{transition:none;animation:none!important}}';
function installStyle(){
 if(document.getElementById("aman-pull-refresh-style"))return;
 const style=document.createElement("style");style.id="aman-pull-refresh-style";style.textContent=STYLE;document.head.append(style);
}
function attach(root,refresh){
 if(!root||root.dataset.pullRefreshReady==="true"||typeof refresh!=="function")return;
 root.dataset.pullRefreshReady="true";installStyle();
 const indicator=document.createElement("div");indicator.className="aman-pull-indicator";indicator.setAttribute("aria-live","polite");
 const spinner=document.createElement("span");spinner.className="aman-pull-spinner";spinner.setAttribute("aria-hidden","true");
 const label=document.createElement("span");label.textContent="اسحب للأسفل للتحديث";indicator.append(spinner,label);root.insertBefore(indicator,root.firstChild);
 let startY=null,armed=false,refreshing=false;
 root.addEventListener("touchstart",event=>{
  if(refreshing||event.touches.length!==1)return;
  if(event.target.closest("input,select,textarea,button,a,[contenteditable=true]"))return;
  if(window.scrollY>1||root.scrollTop>1)return;
  startY=event.touches[0].clientY;armed=false;
 },{passive:true});
 root.addEventListener("touchmove",event=>{
  if(startY===null||refreshing||event.touches.length!==1)return;
  const distance=event.touches[0].clientY-startY;
  if(distance<=0){indicator.classList.remove("is-pulling");label.textContent="اسحب للأسفل للتحديث";armed=false;return;}
  if(distance>8)event.preventDefault();
  indicator.classList.add("is-pulling");armed=distance>=64;
  label.textContent=armed?"اترك للتحديث":"اسحب للأسفل للتحديث";
 },{passive:false});
 const finish=async()=>{
  if(startY===null)return;
  startY=null;indicator.classList.remove("is-pulling");
  if(!armed||refreshing){armed=false;return;}
  armed=false;refreshing=true;indicator.classList.add("is-refreshing");label.textContent="جارٍ تحديث البيانات…";
  try{await refresh();label.textContent="اكتمل التحديث";}
  catch{label.textContent="تعذر التحديث";}
  finally{refreshing=false;indicator.classList.remove("is-refreshing");window.setTimeout(()=>{if(!refreshing)indicator.classList.remove("is-pulling");},900);}
 };
 root.addEventListener("touchend",finish,{passive:true});
 root.addEventListener("touchcancel",()=>{startY=null;armed=false;indicator.classList.remove("is-pulling");},{passive:true});
}
window.AMANPullRefresh={attach};
})();