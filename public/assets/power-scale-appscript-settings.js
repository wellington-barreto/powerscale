(function(){
  'use strict';
  var ID='ps-appscript-sync-settings', pollTimer=null;
  function token(){return localStorage.getItem('sf_token')||'';}
  function api(path,opts){opts=opts||{};opts.headers=Object.assign({'Content-Type':'application/json','Authorization':'Bearer '+token()},opts.headers||{});return fetch('/api/v1'+path,opts).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();});}
  function fmt(v){if(!v)return '—';try{return new Date(v).toLocaleString('pt-BR');}catch(e){return v;}}
  function statusText(d){
    var text=d.force_full_import?'Carga completa ATIVA · próxima execução: '+(d.full_import_days||730)+' dias':'Modo normal · cargas incrementais';
    if(d.last_full_completed_at)text+=' · última full: '+fmt(d.last_full_completed_at);
    if(d.last_mcc_selected!=null)text+=' · última MCC: '+(d.last_mcc_ok||0)+'/'+d.last_mcc_selected+' OK'+(d.last_mcc_errors?' · '+d.last_mcc_errors+' erro(s)':'');
    return text;
  }
  function refreshBox(box){
    if(!box||!document.body.contains(box))return Promise.resolve();
    var toggle=box.querySelector('#ps-full-toggle'),status=box.querySelector('#ps-full-status');
    return api('/workspace/google-ads/appscript-settings').then(function(j){var d=j.data||{};toggle.checked=!!d.force_full_import;status.textContent=statusText(d);box.dataset.forceFull=d.force_full_import?'1':'0';}).catch(function(e){status.textContent='Não foi possível carregar a configuração: '+e.message;});
  }
  function ensurePolling(box){
    if(pollTimer)return;
    pollTimer=setInterval(function(){
      var current=document.getElementById(ID);
      if(!current){clearInterval(pollTimer);pollTimer=null;return;}
      // Enquanto a carga full estiver ativa, acompanha a finalização no backend.
      if(current.dataset.forceFull==='1')refreshBox(current);
    },5000);
  }
  function mount(){
    if(location.pathname!='/dashboard/integracao-appscript'||document.getElementById(ID))return;
    var headings=[].slice.call(document.querySelectorAll('h2'));
    var h=headings.find(function(x){return (x.textContent||'').trim()==='Instalar Google Ads Script';});
    if(!h)return;
    var card=h.closest('div[style]'); if(!card)return;
    var box=document.createElement('div');box.id=ID;box.dataset.forceFull='0';
    box.style.cssText='border:1px solid rgba(var(--fx-gold-rgb),.18);background:var(--fx-panel,#11151d);border-radius:14px;padding:20px 22px;margin-bottom:18px;color:var(--fx-text,#e8e8e8);';
    box.innerHTML='<div style="display:flex;justify-content:space-between;gap:18px;align-items:center;flex-wrap:wrap"><div><div style="font-family:Cormorant Garamond,serif;font-size:15px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--fx-gold-bright,#d8b36a)">Sincronização histórica</div><div style="font-size:12.5px;opacity:.68;margin-top:5px">Ative para que a próxima execução importe 730 dias. Na MCC, a opção é desativada automaticamente somente após a finalização confirmada pelo backend.</div></div><label style="display:flex;align-items:center;gap:10px;font-size:12px;font-weight:700;cursor:pointer"><input id="ps-full-toggle" type="checkbox" style="width:18px;height:18px;accent-color:#c9a45b"> FORÇAR CARGA COMPLETA</label></div><div id="ps-full-status" style="margin-top:12px;font-size:11.5px;opacity:.68">Carregando configuração…</div>';
    card.parentNode.insertBefore(box,card);
    var toggle=box.querySelector('#ps-full-toggle'),status=box.querySelector('#ps-full-status');
    refreshBox(box);ensurePolling(box);
    toggle.addEventListener('change',function(){var checked=toggle.checked;toggle.disabled=true;status.textContent='Salvando…';api('/workspace/google-ads/appscript-settings',{method:'PATCH',body:JSON.stringify({force_full_import:checked,full_import_days:730})}).then(function(j){var d=j.data||{};box.dataset.forceFull=d.force_full_import?'1':'0';status.textContent=statusText(d);}).catch(function(e){toggle.checked=!checked;status.textContent='Erro ao salvar: '+e.message;}).finally(function(){toggle.disabled=false;});});
  }
  var obs=new MutationObserver(mount);obs.observe(document.documentElement,{childList:true,subtree:true});
  addEventListener('popstate',function(){setTimeout(mount,0)});setInterval(mount,1000);mount();
})();
