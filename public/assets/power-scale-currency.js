(() => {
  const MODE_KEY = 'power_scale_currency_mode';
  const MANUAL_KEY = 'power_scale_fx_manual';
  const SUPPORTED = ['USD','BRL','EUR','GBP'];
  const SYMBOL = {USD:'US$',BRL:'R$',EUR:'€',GBP:'£'};
  const originalFetch = window.fetch.bind(window);
  let mode = (localStorage.getItem(MODE_KEY) || 'ORIGINAL').toUpperCase();
  if (mode !== 'ORIGINAL' && !SUPPORTED.includes(mode)) mode = 'ORIGINAL';
  let apiRates = {};
  let ratePromise = null;
  let ratesLoadedAt = 0;

  const CACHE_KEY = 'power_scale_fx_cache_v2';
  const FX_BOOT_PAIRS = ['USD-BRL','EUR-BRL','GBP-BRL','USD-EUR','GBP-EUR','GBP-USD'];
  let fxStatus = {provider:'AwesomeAPI',error:null,diagnostics:[]};
  const readManual = () => { try { return JSON.parse(localStorage.getItem(MANUAL_KEY) || '{}') || {}; } catch { return {}; } };
  const saveManual = v => localStorage.setItem(MANUAL_KEY, JSON.stringify(v || {}));
  const readCache = () => { try { const x=JSON.parse(localStorage.getItem(CACHE_KEY)||'{}'); return x&&typeof x==='object'?x:{}; } catch { return {}; } };
  const saveCache = rates => { try { localStorage.setItem(CACHE_KEY,JSON.stringify({saved_at:Date.now(),rates:rates||{}})); } catch {} };
  const fmt = (v, digits=4) => Number(v || 0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:digits});

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
    const json=await r.json();
    return expandAwesomeRows(json);
  }
  function liveRefresh(){
    // Atualização suave: sem location.reload e sem nova consulta de câmbio.
    // React Query refaz apenas as consultas de dados da aplicação para reaplicar a moeda selecionada.
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('online'));
    window.dispatchEvent(new CustomEvent('power-scale:currency-change',{detail:{mode,rates:apiRates,manual:readManual(),status:fxStatus}}));
  }
  async function refreshRates(force=false){
    // As cotações são carregadas uma vez pelo navegador no boot e ficam em memória.
    // Trocar Original/USD/BRL/EUR/GBP NÃO chama novamente a AwesomeAPI.
    if(!force && Object.keys(apiRates).length)return apiRates;
    if(ratePromise)return ratePromise;
    ratePromise=(async()=>{
      fxStatus={provider:'AwesomeAPI/browser',error:null,diagnostics:[]};
      const cached=readCache();
      try{
        const next=await fetchAwesomeAtBoot();
        if(Object.keys(next).length){
          apiRates=next;
          ratesLoadedAt=Date.now();
          saveCache(next);
          fxStatus.diagnostics.push({attempt:'browser-boot',status:200,pairs:FX_BOOT_PAIRS.slice()});
        }
      }catch(e){
        const msg=String(e?.message||e);
        fxStatus.error=msg;
        fxStatus.diagnostics.push({attempt:'browser-boot',status:e?.status||0,error:msg,pairs:FX_BOOT_PAIRS.slice()});
        // Se a consulta atual falhar, reaproveita apenas o último snapshot salvo no navegador.
        const fallback=cached?.rates&&typeof cached.rates==='object'?cached.rates:{};
        if(Object.keys(fallback).length){
          apiRates=fallback;
          ratesLoadedAt=Number(cached.saved_at||0)||Date.now();
          fxStatus.diagnostics.push({attempt:'browser-cache',status:200,saved_at:cached.saved_at||null});
        }
        console.warn('[POWER SCALE] cotações indisponíveis no carregamento',e);
      }finally{
        ratePromise=null;
        renderPanel();
      }
      return apiRates;
    })();
    return ratePromise;
  }
  function rateFor(from,to){
    from=String(from||'').toUpperCase();to=String(to||mode).toUpperCase();if(!from)return null;if(from===to)return 1;
    const key=`${from}-${to}`,manual=readManual();const mv=Number(manual[key]);if(Number.isFinite(mv)&&mv>0)return mv;
    const av=Number(apiRates[key]?.rate);return Number.isFinite(av)&&av>0?av:null;
  }
  function cv(value,from,to=mode){const n=Number(value||0);if(to==='ORIGINAL'||from===to)return n;const r=rateFor(from,to);return r==null?n:n*r;}
  const moneyFields = new Set(['cost','conversion_value','checkout_value','all_conversion_value','average_cpc','average_cpm','average_cost','budget','budget_daily','target_cpa','refund','organic_sales','profit','cost_per_conv','snapshots_sum_cost','snapshots_sum_conversion_value','snapshots_sum_checkout_value','snapshots_sum_all_conversion_value','total_cost','total_conversion_value','total_profit','revenue','investment','amount']);
  function convertObjectMoney(obj,from,to){if(!obj||typeof obj!=='object')return obj;for(const k of Object.keys(obj)){if(moneyFields.has(k)&&typeof obj[k] !== 'object' && obj[k]!=null)obj[k]=cv(obj[k],from,to);}return obj;}
  function mapToTarget(map,to){let total=0;for(const [cur,val] of Object.entries(map||{})) total+=cv(val,cur,to);return {[to]:total};}

  function transformAccounts(j){
    const list=Array.isArray(j?.data)?j.data:[];
    for(const acc of list){const from=String(acc.currency_code||'').toUpperCase();if(from===mode){acc.currency_code=mode;continue;}for(const c of acc.campaigns||[]){convertObjectMoney(c,from,mode);for(const k of Object.keys(c)){if(k.startsWith('snapshots_sum_')&&/cost|value/i.test(k))c[k]=cv(c[k],from,mode);}}acc.currency_code=mode;}
    return j;
  }
  function transformTrackers(j){
    const list=j?.data?.data;if(!Array.isArray(list))return j;
    for(const t of list){
      const cost=t.total_cost_by_currency||{},rev=t.total_conversion_value_by_currency||{};
      t.total_cost=Object.entries(cost).reduce((s,[cur,v])=>s+cv(v,cur,mode),0);
      t.total_conversion_value=Object.entries(rev).reduce((s,[cur,v])=>s+cv(v,cur,mode),0);
      t.total_profit=t.total_conversion_value-t.total_cost;t.total_cost_by_currency=mapToTarget(cost,mode);t.total_conversion_value_by_currency=mapToTarget(rev,mode);
      for(const d of t.daily_metrics||[]){if(d.by_currency){let costN=0,valN=0;for(const [cur,b] of Object.entries(d.by_currency)){costN+=cv(b.cost,cur,mode);valN+=cv(b.conversion_value,cur,mode);}d.cost=costN;d.conversion_value=valN;d.profit=valN-costN;d.by_currency={[mode]:{cost:costN,conversion_value:valN,profit:valN-costN}};}}
    }return j;
  }
  function transformReport(j){const d=j?.data,from=String(d?.campaign?.currency_code||'').toUpperCase();if(!d||from===mode)return j;convertObjectMoney(d.campaign,from,mode);d.campaign.currency_code=mode;convertObjectMoney(d.totals,from,mode);for(const r of d.rows||[])convertObjectMoney(r,from,mode);return j;}
  function transformFunnel(j){const d=j?.data;if(!d)return j;const from=String(d.currency_code||d.campaign?.currency_code||'').toUpperCase();if(from===mode)return j;convertObjectMoney(d.funnel,from,mode);if(d.cards)for(const c of Object.values(d.cards))if(c&&typeof c==='object'&&'value'in c)c.value=cv(c.value,from,mode);for(const r of d.charts?.timeline_daily||[])convertObjectMoney(r,from,mode);d.currency_code=mode;return j;}
  function transformDashboard(j){
    const d=j?.data;if(!d)return j;
    for(const key of ['purchase_by_currency','refund_by_currency']){const arr=d.cards?.[key];if(Array.isArray(arr)){const amount=arr.reduce((s,x)=>s+cv(x.amount,x.currency||'',mode),0);d.cards[key]=[{currency:mode,amount}];}}
    // Newer dashboard derives its money from /google-ads/accounts. Keep this for older dashboard endpoints.
    return j;
  }
  async function transformedResponse(resp,url){
    if(mode==='ORIGINAL'||!resp.ok)return resp;
    const ct=resp.headers.get('content-type')||'';if(!ct.includes('application/json'))return resp;
    let j;try{j=await resp.clone().json();}catch{return resp;}
    const p=String(url);
    if(p.includes('/workspace/google-ads/accounts'))j=transformAccounts(j);
    else if(p.includes('/workspace/trackers'))j=transformTrackers(j);
    else if(p.includes('/workspace/google-ads/report-daily'))j=transformReport(j);
    else if(p.includes('/workspace/google-ads/metrics/funnel'))j=transformFunnel(j);
    else if(p.includes('/workspace/dashboard/charts/sales')){const arr=j?.charts?.sales_daily_by_currency||j?.data;if(Array.isArray(arr)){const out=[];for(const row of arr){const from=String(row.currency||'').toUpperCase();const nr={...row,currency:mode};for(const k of ['amount','revenue','cost'])nr[k]=cv(row[k],from,mode);out.push(nr);}if(j.charts?.sales_daily_by_currency)j.charts.sales_daily_by_currency=out;if(Array.isArray(j.data))j.data=out;}}
    else if(/\/workspace\/dashboard(?:\?|$)/.test(p))j=transformDashboard(j);
    else return resp;
    const h=new Headers(resp.headers);h.delete('content-length');return new Response(JSON.stringify(j),{status:resp.status,statusText:resp.statusText,headers:h});
  }
  const convertibleUrl=url=>['/workspace/google-ads/accounts','/workspace/trackers','/workspace/google-ads/report-daily','/workspace/google-ads/metrics/funnel','/workspace/dashboard'].some(p=>String(url).includes(p));
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:input?.url||'';
    if(mode!=='ORIGINAL'&&convertibleUrl(url)) await refreshRates();
    const resp=await originalFetch(input,init);return transformedResponse(resp,url);
  };

  function css(){if(document.getElementById('ps-fx-css'))return;const st=document.createElement('style');st.id='ps-fx-css';st.textContent=`
#ps-fx-wrap{position:relative;display:flex;align-items:center}.ps-fx-btn{height:38px;min-width:86px;padding:0 11px;border-radius:10px;background:var(--fx-surface);border:1px solid rgba(var(--fx-gold-rgb),.13);color:var(--fx-text-2);font:600 12px/1 system-ui;cursor:pointer;display:flex;align-items:center;gap:7px;justify-content:center}.ps-fx-btn:hover,.ps-fx-btn.open{color:var(--fx-gold-bright);border-color:rgba(var(--fx-gold-rgb),.45);box-shadow:0 0 12px rgba(var(--fx-gold-rgb),.10)}.ps-fx-dot{width:6px;height:6px;border-radius:50%;background:var(--fx-gold)}.ps-fx-pop{display:none;position:absolute;right:0;top:46px;width:330px;padding:10px;border-radius:12px;background:var(--fx-surface);border:1px solid rgba(var(--fx-gold-rgb),.22);box-shadow:0 18px 48px rgba(0,0,0,.42);z-index:9999}.ps-fx-pop.open{display:block}.ps-fx-title{font-size:10px;letter-spacing:1.3px;text-transform:uppercase;color:var(--fx-text-3);font-weight:700;padding:4px 6px 8px}.ps-fx-modes{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;padding-bottom:9px;border-bottom:1px solid rgba(var(--fx-gold-rgb),.10)}.ps-fx-mode{padding:8px 4px;border-radius:8px;border:1px solid transparent;background:transparent;color:var(--fx-text-2);font-size:11px;font-weight:700;cursor:pointer}.ps-fx-mode:hover{background:rgba(var(--fx-gold-rgb),.07)}.ps-fx-mode.active{background:rgba(var(--fx-gold-rgb),.15);border-color:rgba(var(--fx-gold-rgb),.32);color:var(--fx-gold-bright)}.ps-fx-rates{padding-top:8px}.ps-fx-rate{display:grid;grid-template-columns:70px 1fr 92px;gap:8px;align-items:center;padding:6px}.ps-fx-pair{font-size:11px;font-weight:800;color:var(--fx-text-1)}.ps-fx-api{font-size:10px;color:var(--fx-text-3)}.ps-fx-api b{display:block;color:var(--fx-gold-bright);font-size:11px;margin-top:2px}.ps-fx-input{width:92px;height:30px;border-radius:7px;border:1px solid rgba(var(--fx-gold-rgb),.18);background:var(--fx-bg);color:var(--fx-text-1);padding:0 8px;font-size:11px;text-align:right;outline:none}.ps-fx-input:focus{border-color:rgba(var(--fx-gold-rgb),.55)}.ps-fx-note{font-size:9.5px;line-height:1.35;color:var(--fx-text-3);padding:7px 6px 2px}.ps-fx-manual{color:var(--fx-invest);font-size:9px;margin-left:3px}@media(max-width:900px){#ps-fx-wrap{display:none}}`;
    document.head.appendChild(st);
  }
  function renderPanel(){
    const wrap=document.getElementById('ps-fx-wrap');if(!wrap)return;const btn=wrap.querySelector('.ps-fx-btn'),pop=wrap.querySelector('.ps-fx-pop');btn.querySelector('.ps-fx-label').textContent=mode==='ORIGINAL'?'Original':mode;
    pop.querySelectorAll('.ps-fx-mode').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
    const rates=pop.querySelector('.ps-fx-rates');if(mode==='ORIGINAL'){rates.innerHTML='<div class="ps-fx-note">Modo original: cada conta mantém a moeda cadastrada no Google Ads. Valores de moedas diferentes não são convertidos nem somados.</div>';return;}
    const manual=readManual();rates.innerHTML=SUPPORTED.filter(s=>s!==mode).map(src=>{const key=`${src}-${mode}`,api=apiRates[key]?.rate,man=manual[key]??'';return `<div class="ps-fx-rate"><div class="ps-fx-pair">${src} → ${mode}${man!==''?'<span class="ps-fx-manual">Manual</span>':''}</div><div class="ps-fx-api">API hoje<b>${api?fmt(api,6):'—'}</b></div><input class="ps-fx-input" inputmode="decimal" data-pair="${key}" placeholder="${api?fmt(api,6):'Taxa'}" value="${man}"></div>`}).join('')+'<div class="ps-fx-note">Campo vazio = usa a taxa carregada da AwesomeAPI no navegador. A cotação fica em memória durante a sessão; a taxa personalizada afeta somente a exibição.</div>';
    rates.querySelectorAll('.ps-fx-input').forEach(inp=>{let timer=null;inp.addEventListener('input',()=>{const m=readManual(),raw=inp.value.trim().replace(',','.');if(!raw)delete m[inp.dataset.pair];else{const n=Number(raw);if(Number.isFinite(n)&&n>0)m[inp.dataset.pair]=n;}saveManual(m);clearTimeout(timer);timer=setTimeout(()=>liveRefresh(),180);});});
  }
  function mount(){
    css();if(document.getElementById('ps-fx-wrap'))return true;const header=document.querySelector('header');if(!header)return false;const right=[...header.querySelectorAll('div')].find(d=>d.className&&String(d.className).includes('flex items-center gap-2')&&d.querySelector('button'));if(!right)return false;
    const wrap=document.createElement('div');wrap.id='ps-fx-wrap';wrap.innerHTML=`<button class="ps-fx-btn" type="button" title="Moeda de exibição"><span class="ps-fx-dot"></span><span class="ps-fx-label"></span><span style="font-size:10px;opacity:.7">⌄</span></button><div class="ps-fx-pop"><div class="ps-fx-title">Moeda de exibição</div><div class="ps-fx-modes">${['ORIGINAL',...SUPPORTED].map(m=>`<button type="button" class="ps-fx-mode" data-mode="${m}">${m==='ORIGINAL'?'Orig.':m}</button>`).join('')}</div><div class="ps-fx-rates"></div></div>`;
    right.insertBefore(wrap,right.firstChild);const btn=wrap.querySelector('.ps-fx-btn'),pop=wrap.querySelector('.ps-fx-pop');btn.addEventListener('click',e=>{e.stopPropagation();pop.classList.toggle('open');btn.classList.toggle('open',pop.classList.contains('open'));});document.addEventListener('click',e=>{if(!wrap.contains(e.target)){pop.classList.remove('open');btn.classList.remove('open')}});wrap.querySelectorAll('.ps-fx-mode').forEach(b=>b.addEventListener('click',()=>{const next=b.dataset.mode;if(next===mode)return;mode=next;localStorage.setItem(MODE_KEY,mode);renderPanel();liveRefresh();}));renderPanel();refreshRates().then(()=>{renderPanel();if(mode!=='ORIGINAL')liveRefresh();});return true;
  }
  const obs=new MutationObserver(()=>mount()&&obs.disconnect());if(!mount())obs.observe(document.documentElement,{childList:true,subtree:true});
})();
