(() => {
  const MODE_KEY = 'power_scale_currency_mode';
  const MANUAL_KEY = 'power_scale_fx_manual';
  const SUPPORTED = ['USD','BRL','EUR','GBP'];
  const originalFetch = window.fetch.bind(window);
  let mode = (localStorage.getItem(MODE_KEY) || 'ORIGINAL').toUpperCase();
  if (mode !== 'ORIGINAL' && !SUPPORTED.includes(mode)) mode = 'ORIGINAL';

  const CACHE_KEY = 'power_scale_fx_cache_v2';
  const FX_BOOT_PAIRS = ['USD-BRL','EUR-BRL','GBP-BRL','USD-EUR','GBP-EUR','GBP-USD'];
  let apiRates = {};
  let ratePromise = null;
  let ratesLoadedAt = 0;
  let fxStatus = {provider:'AwesomeAPI',error:null,diagnostics:[]};

  // Cada resposta monetária fica preservada em memória exatamente como veio do backend.
  // A troca de moeda reprojeta esse snapshot local; nunca refaz fetch e nunca converte
  // em cima de um valor já convertido.
  const snapshots = new Map();
  let snapshotSeq = 0;

  const readManual = () => { try { return JSON.parse(localStorage.getItem(MANUAL_KEY) || '{}') || {}; } catch { return {}; } };
  const saveManual = v => localStorage.setItem(MANUAL_KEY, JSON.stringify(v || {}));
  const readCache = () => { try { const x=JSON.parse(localStorage.getItem(CACHE_KEY)||'{}'); return x&&typeof x==='object'?x:{}; } catch { return {}; } };
  const saveCache = rates => { try { localStorage.setItem(CACHE_KEY,JSON.stringify({saved_at:Date.now(),rates:rates||{}})); } catch {} };
  const fmt = (v, digits=4) => Number(v || 0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:digits});
  const clone = value => {
    try { if (typeof structuredClone === 'function') return structuredClone(value); } catch {}
    return JSON.parse(JSON.stringify(value));
  };

  // Usa imediatamente o último snapshot local de câmbio. A atualização online acontece
  // em paralelo no boot e nunca entra no caminho crítico de uma troca de moeda.
  const cachedAtBoot = readCache();
  if (cachedAtBoot?.rates && typeof cachedAtBoot.rates === 'object') {
    apiRates = cachedAtBoot.rates;
    ratesLoadedAt = Number(cachedAtBoot.saved_at || 0) || 0;
  }

  function normalizeRate(pair, rate, source, updatedAt){
    const n=Number(rate);
    if(!Number.isFinite(n)||n<=0)return null;
    return {pair,rate:n,source,updated_at:updatedAt||null};
  }
  function expandAwesomeRows(json){
    const out={};
    for(const pair of FX_BOOT_PAIRS){
      const [from,to]=pair.split('-');
      const row=json?.[`${from}${to}`],bid=Number(row?.bid);
      if(!Number.isFinite(bid)||bid<=0)continue;
      const updated=row?.create_date||row?.timestamp||null;
      out[pair]=normalizeRate(pair,bid,'awesomeapi-browser',updated);
      out[`${to}-${from}`]=normalizeRate(`${to}-${from}`,1/bid,'awesomeapi-browser-inverse',updated);
    }
    for(const cur of SUPPORTED)out[`${cur}-${cur}`]=normalizeRate(`${cur}-${cur}`,1,'identity',null);
    return out;
  }
  async function fetchAwesomeAtBoot(){
    const url=`https://economia.awesomeapi.com.br/json/last/${FX_BOOT_PAIRS.join(',')}`;
    const r=await originalFetch(url,{method:'GET',headers:{accept:'application/json'},cache:'no-store'});
    if(!r.ok){const e=new Error(`AwesomeAPI HTTP ${r.status}`);e.status=r.status;throw e;}
    return expandAwesomeRows(await r.json());
  }
  async function refreshRates(force=false){
    if(!force && Object.keys(apiRates).length && ratesLoadedAt && (Date.now()-ratesLoadedAt)<15*60*1000) return apiRates;
    if(ratePromise)return ratePromise;
    ratePromise=(async()=>{
      fxStatus={provider:'AwesomeAPI/browser',error:null,diagnostics:[]};
      try{
        const next=await fetchAwesomeAtBoot();
        if(Object.keys(next).length){
          apiRates=next; ratesLoadedAt=Date.now(); saveCache(next);
          fxStatus.diagnostics.push({attempt:'browser-boot',status:200,pairs:FX_BOOT_PAIRS.slice()});
        }
      }catch(e){
        const msg=String(e?.message||e); fxStatus.error=msg;
        fxStatus.diagnostics.push({attempt:'browser-boot',status:e?.status||0,error:msg,pairs:FX_BOOT_PAIRS.slice()});
        console.warn('[POWER SCALE] cotações indisponíveis no carregamento',e);
      }finally{ ratePromise=null; renderPanel(); }
      return apiRates;
    })();
    return ratePromise;
  }
  function rateFor(from,to){
    from=String(from||'').toUpperCase(); to=String(to||mode).toUpperCase();
    if(!from)return null; if(to==='ORIGINAL'||from===to)return 1;
    const key=`${from}-${to}`,manual=readManual(); const mv=Number(manual[key]);
    if(Number.isFinite(mv)&&mv>0)return mv;
    const av=Number(apiRates[key]?.rate); return Number.isFinite(av)&&av>0?av:null;
  }
  function cv(value,from,to=mode){
    const n=Number(value||0); if(to==='ORIGINAL'||from===to)return n;
    const r=rateFor(from,to); return r==null?n:n*r;
  }

  const moneyFields = new Set(['cost','conversion_value','checkout_value','all_conversion_value','average_cpc','average_cpm','average_cost','budget','budget_daily','target_cpa','refund','organic_sales','profit','cost_per_conv','snapshots_sum_cost','snapshots_sum_conversion_value','snapshots_sum_checkout_value','snapshots_sum_all_conversion_value','snapshots_sum_refund','snapshots_sum_organic_sales','total_cost','total_conversion_value','total_profit','revenue','investment','amount']);
  function convertObjectMoney(obj,from,to){
    if(!obj||typeof obj!=='object')return obj;
    for(const k of Object.keys(obj)) if(moneyFields.has(k)&&typeof obj[k] !== 'object' && obj[k]!=null) obj[k]=cv(obj[k],from,to);
    return obj;
  }
  function mapToTarget(map,to){let total=0;for(const [cur,val] of Object.entries(map||{})) total+=cv(val,cur,to);return {[to]:total};}

  function transformAccounts(j,target){
    if(target==='ORIGINAL')return j;
    const list=Array.isArray(j?.data)?j.data:[];
    for(const acc of list){
      const from=String(acc.currency_code||'').toUpperCase();
      if(!from)continue;
      if(from!==target) for(const c of acc.campaigns||[])convertObjectMoney(c,from,target);
      acc.currency_code=target;
    }
    return j;
  }
  function transformTrackers(j,target){
    if(target==='ORIGINAL')return j;
    const list=j?.data?.data;if(!Array.isArray(list))return j;
    for(const t of list){
      const cost=t.total_cost_by_currency||{},rev=t.total_conversion_value_by_currency||{};
      t.total_cost=Object.entries(cost).reduce((s,[cur,v])=>s+cv(v,cur,target),0);
      t.total_conversion_value=Object.entries(rev).reduce((s,[cur,v])=>s+cv(v,cur,target),0);
      t.total_profit=t.total_conversion_value-t.total_cost;
      t.total_cost_by_currency=mapToTarget(cost,target);t.total_conversion_value_by_currency=mapToTarget(rev,target);
      for(const d of t.daily_metrics||[]){
        if(d.by_currency){let costN=0,valN=0;for(const [cur,b] of Object.entries(d.by_currency)){costN+=cv(b.cost,cur,target);valN+=cv(b.conversion_value,cur,target);}d.cost=costN;d.conversion_value=valN;d.profit=valN-costN;d.by_currency={[target]:{cost:costN,conversion_value:valN,profit:valN-costN}};}
      }
    }
    return j;
  }
  function transformReport(j,target){
    if(target==='ORIGINAL')return j;
    const d=j?.data,from=String(d?.campaign?.currency_code||'').toUpperCase();if(!d||!from)return j;
    if(from!==target){convertObjectMoney(d.campaign,from,target);convertObjectMoney(d.totals,from,target);for(const r of d.rows||[])convertObjectMoney(r,from,target);}
    d.campaign.currency_code=target;return j;
  }
  function transformFunnel(j,target){
    if(target==='ORIGINAL')return j;
    const d=j?.data;if(!d)return j;const from=String(d.currency_code||d.campaign?.currency_code||'').toUpperCase();if(!from)return j;
    if(from!==target){convertObjectMoney(d.funnel,from,target);if(d.cards)for(const c of Object.values(d.cards))if(c&&typeof c==='object'&&'value'in c)c.value=cv(c.value,from,target);for(const r of d.charts?.timeline_daily||[])convertObjectMoney(r,from,target);}
    d.currency_code=target;return j;
  }
  function transformDashboard(j,target){
    if(target==='ORIGINAL')return j;
    const d=j?.data;if(!d)return j;
    for(const key of ['purchase_by_currency','refund_by_currency']){
      const arr=d.cards?.[key];if(Array.isArray(arr)){const amount=arr.reduce((s,x)=>s+cv(x.amount,x.currency||'',target),0);d.cards[key]=[{currency:target,amount}];}
    }
    return j;
  }
  function transformSalesChart(j,target){
    if(target==='ORIGINAL')return j;
    const arr=j?.charts?.sales_daily_by_currency||j?.data;if(!Array.isArray(arr))return j;
    const out=[];for(const row of arr){const from=String(row.currency||'').toUpperCase();const nr={...row,currency:target};for(const k of ['amount','revenue','cost'])nr[k]=cv(row[k],from,target);out.push(nr);}
    if(j.charts?.sales_daily_by_currency)j.charts.sales_daily_by_currency=out;if(Array.isArray(j.data))j.data=out;return j;
  }
  function transformByUrl(j,url,target){
    const p=String(url);
    if(p.includes('/workspace/google-ads/accounts'))return transformAccounts(j,target);
    if(p.includes('/workspace/trackers'))return transformTrackers(j,target);
    if(p.includes('/workspace/google-ads/report-daily'))return transformReport(j,target);
    if(p.includes('/workspace/google-ads/metrics/funnel'))return transformFunnel(j,target);
    if(p.includes('/workspace/dashboard/charts/sales'))return transformSalesChart(j,target);
    if(/\/workspace\/dashboard(?:\?|$)/.test(p))return transformDashboard(j,target);
    return j;
  }
  const convertibleUrl=url=>['/workspace/google-ads/accounts','/workspace/trackers','/workspace/google-ads/report-daily','/workspace/google-ads/metrics/funnel','/workspace/dashboard'].some(p=>String(url).includes(p));

  function rememberSnapshot(raw,url){
    const id='fx'+(++snapshotSeq);
    snapshots.set(id,{raw:clone(raw),url:String(url)});
    return id;
  }
  function projectSnapshot(id,target){
    const snap=snapshots.get(id);if(!snap)return null;
    const next=transformByUrl(clone(snap.raw),snap.url,target);
    if(next&&typeof next==='object')Object.defineProperty(next,'__psfx_snapshot_id',{value:id,enumerable:true,configurable:true,writable:true});
    return next;
  }
  async function transformedResponse(resp,url){
    if(!resp.ok||!convertibleUrl(url))return resp;
    const ct=resp.headers.get('content-type')||'';if(!ct.includes('application/json'))return resp;
    let raw;try{raw=await resp.clone().json();}catch{return resp;}
    const id=rememberSnapshot(raw,url);
    const j=projectSnapshot(id,mode);
    const h=new Headers(resp.headers);h.delete('content-length');
    return new Response(JSON.stringify(j),{status:resp.status,statusText:resp.statusText,headers:h});
  }

  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:input?.url||'';
    // Apenas o primeiro carregamento sem taxa local pode esperar a cotação. Troca de moeda nunca passa aqui.
    if(mode!=='ORIGINAL'&&convertibleUrl(url)&&!Object.keys(apiRates).length) await refreshRates();
    const resp=await originalFetch(input,init);
    return transformedResponse(resp,url);
  };

  function projectQueryCache(){
    const q=window.__POWER_SCALE_QUERY_CLIENT__;
    if(!q?.getQueryCache)return false;
    let changed=0;
    for(const query of q.getQueryCache().getAll()){
      const data=query?.state?.data;
      const id=data&&typeof data==='object'?data.__psfx_snapshot_id:null;
      if(!id||!snapshots.has(id))continue;
      const next=projectSnapshot(id,mode);if(!next)continue;
      q.setQueryData(query.queryKey,next);changed++;
    }
    return changed>0;
  }
  function liveRefresh(){
    // v13.9: operação estritamente local. Não dispara focus/online, não invalida
    // React Query e não chama nenhum endpoint.
    projectQueryCache();
    window.dispatchEvent(new CustomEvent('power-scale:currency-local',{detail:{mode}}));
  }
  window.__POWER_SCALE_APPLY_CURRENCY__=projectQueryCache;

  function css(){if(document.getElementById('ps-fx-css'))return;const st=document.createElement('style');st.id='ps-fx-css';st.textContent=`
#ps-fx-wrap{position:relative;display:flex;align-items:center}.ps-fx-btn{height:38px;min-width:86px;padding:0 11px;border-radius:10px;background:var(--fx-surface);border:1px solid rgba(var(--fx-gold-rgb),.13);color:var(--fx-text-2);font:600 12px/1 system-ui;cursor:pointer;display:flex;align-items:center;gap:7px;justify-content:center}.ps-fx-btn:hover,.ps-fx-btn.open{color:var(--fx-gold-bright);border-color:rgba(var(--fx-gold-rgb),.45);box-shadow:0 0 12px rgba(var(--fx-gold-rgb),.10)}.ps-fx-dot{width:6px;height:6px;border-radius:50%;background:var(--fx-gold)}.ps-fx-pop{display:none;position:absolute;right:0;top:46px;width:330px;padding:10px;border-radius:12px;background:var(--fx-surface);border:1px solid rgba(var(--fx-gold-rgb),.22);box-shadow:0 18px 48px rgba(0,0,0,.42);z-index:9999}.ps-fx-pop.open{display:block}.ps-fx-title{font-size:10px;letter-spacing:1.3px;text-transform:uppercase;color:var(--fx-text-3);font-weight:700;padding:4px 6px 8px}.ps-fx-modes{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;padding-bottom:9px;border-bottom:1px solid rgba(var(--fx-gold-rgb),.10)}.ps-fx-mode{padding:8px 4px;border-radius:8px;border:1px solid transparent;background:transparent;color:var(--fx-text-2);font-size:11px;font-weight:700;cursor:pointer}.ps-fx-mode:hover{background:rgba(var(--fx-gold-rgb),.07)}.ps-fx-mode.active{background:rgba(var(--fx-gold-rgb),.15);border-color:rgba(var(--fx-gold-rgb),.32);color:var(--fx-gold-bright)}.ps-fx-rates{padding-top:8px}.ps-fx-rate{display:grid;grid-template-columns:70px 1fr 92px;gap:8px;align-items:center;padding:6px}.ps-fx-pair{font-size:11px;font-weight:800;color:var(--fx-text-1)}.ps-fx-api{font-size:10px;color:var(--fx-text-3)}.ps-fx-api b{display:block;color:var(--fx-gold-bright);font-size:11px;margin-top:2px}.ps-fx-input{width:92px;height:30px;border-radius:7px;border:1px solid rgba(var(--fx-gold-rgb),.18);background:var(--fx-bg);color:var(--fx-text-1);padding:0 8px;font-size:11px;text-align:right;outline:none}.ps-fx-input:focus{border-color:rgba(var(--fx-gold-rgb),.55)}.ps-fx-note{font-size:9.5px;line-height:1.35;color:var(--fx-text-3);padding:7px 6px 2px}.ps-fx-manual{color:var(--fx-invest);font-size:9px;margin-left:3px}@media(max-width:900px){#ps-fx-wrap{display:none}}`;
    document.head.appendChild(st);
  }
  function renderPanel(){
    const wrap=document.getElementById('ps-fx-wrap');if(!wrap)return;const btn=wrap.querySelector('.ps-fx-btn'),pop=wrap.querySelector('.ps-fx-pop');btn.querySelector('.ps-fx-label').textContent=mode==='ORIGINAL'?'Original':mode;
    pop.querySelectorAll('.ps-fx-mode').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
    const rates=pop.querySelector('.ps-fx-rates');if(mode==='ORIGINAL'){rates.innerHTML='<div class="ps-fx-note">Modo original: cada conta mantém a moeda cadastrada no Google Ads. Valores de moedas diferentes não são convertidos nem somados.</div>';return;}
    const manual=readManual();rates.innerHTML=SUPPORTED.filter(s=>s!==mode).map(src=>{const key=`${src}-${mode}`,api=apiRates[key]?.rate,man=manual[key]??'';return `<div class="ps-fx-rate"><div class="ps-fx-pair">${src} → ${mode}${man!==''?'<span class="ps-fx-manual">Manual</span>':''}</div><div class="ps-fx-api">API hoje<b>${api?fmt(api,6):'—'}</b></div><input class="ps-fx-input" inputmode="decimal" data-pair="${key}" placeholder="${api?fmt(api,6):'Taxa'}" value="${man}"></div>`}).join('')+'<div class="ps-fx-note">Campo vazio = usa a taxa já carregada no navegador. Alterar moeda ou taxa personalizada recalcula somente os dados que já estão em memória.</div>';
    rates.querySelectorAll('.ps-fx-input').forEach(inp=>{let timer=null;inp.addEventListener('input',()=>{const m=readManual(),raw=inp.value.trim().replace(',','.');if(!raw)delete m[inp.dataset.pair];else{const n=Number(raw);if(Number.isFinite(n)&&n>0)m[inp.dataset.pair]=n;}saveManual(m);clearTimeout(timer);timer=setTimeout(liveRefresh,80);});});
  }
  function mount(){
    css();if(document.getElementById('ps-fx-wrap'))return true;const header=document.querySelector('header');if(!header)return false;const right=[...header.querySelectorAll('div')].find(d=>d.className&&String(d.className).includes('flex items-center gap-2')&&d.querySelector('button'));if(!right)return false;
    const wrap=document.createElement('div');wrap.id='ps-fx-wrap';wrap.innerHTML=`<button class="ps-fx-btn" type="button" title="Moeda de exibição"><span class="ps-fx-dot"></span><span class="ps-fx-label"></span><span style="font-size:10px;opacity:.7">⌄</span></button><div class="ps-fx-pop"><div class="ps-fx-title">Moeda de exibição</div><div class="ps-fx-modes">${['ORIGINAL',...SUPPORTED].map(m=>`<button type="button" class="ps-fx-mode" data-mode="${m}">${m==='ORIGINAL'?'Orig.':m}</button>`).join('')}</div><div class="ps-fx-rates"></div></div>`;
    right.insertBefore(wrap,right.firstChild);const btn=wrap.querySelector('.ps-fx-btn'),pop=wrap.querySelector('.ps-fx-pop');btn.addEventListener('click',e=>{e.stopPropagation();pop.classList.toggle('open');btn.classList.toggle('open',pop.classList.contains('open'));});document.addEventListener('click',e=>{if(!wrap.contains(e.target)){pop.classList.remove('open');btn.classList.remove('open')}});wrap.querySelectorAll('.ps-fx-mode').forEach(b=>b.addEventListener('click',()=>{const next=b.dataset.mode;if(next===mode)return;mode=next;localStorage.setItem(MODE_KEY,mode);renderPanel();liveRefresh();}));renderPanel();
    // Atualiza cotação em segundo plano. Não reprojeta automaticamente a tela e não faz refetch.
    refreshRates().then(renderPanel);
    return true;
  }
  const obs=new MutationObserver(()=>mount()&&obs.disconnect());if(!mount())obs.observe(document.documentElement,{childList:true,subtree:true});
})();
