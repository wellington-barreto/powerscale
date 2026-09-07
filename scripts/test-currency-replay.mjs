import fs from 'node:fs';import vm from 'node:vm';
const store=new Map([['power_scale_fx_manual',JSON.stringify({'USD-BRL':5,'BRL-USD':0.2})],['power_scale_currency_mode','ORIGINAL']]);
const localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v))};
const document={getElementById:()=>null,querySelector:()=>null,createElement:()=>({}),head:{appendChild(){}},documentElement:{}};class MutationObserver{observe(){}disconnect(){}}
const listeners=new Map();let networkCalls=0;
const raw={data:{data:[{id:1,total_cost:100,total_conversion_value:20,total_cost_by_currency:{USD:100},total_conversion_value_by_currency:{USD:20},daily_metrics:[]}]}};
const nativeFetch=async()=>{networkCalls++;return new Response(JSON.stringify(raw),{status:200,headers:{'content-type':'application/json'}})};
const window={localStorage,fetch:nativeFetch,addEventListener:(n,cb)=>{const a=listeners.get(n)||[];a.push(cb);listeners.set(n,a)},dispatchEvent:e=>{for(const cb of listeners.get(e.type)||[])cb(e)}};
const ctx={window,localStorage,document,MutationObserver,CustomEvent:class{constructor(type,o={}){this.type=type;this.detail=o.detail}},requestAnimationFrame:cb=>setTimeout(cb,0),setTimeout,clearTimeout,console,Intl,Headers,Response,URLSearchParams,structuredClone};ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(new URL('../public/assets/power-scale-currency.js',import.meta.url),'utf8'),ctx);
const first=await window.fetch('/api/v1/workspace/trackers?x=1',{method:'GET'});const queryData=await first.json();
if(networkCalls!==1)throw new Error('expected one initial network call');
const query={queryKey:['trackers'],state:{data:queryData}};
const qc={getQueryCache:()=>({getAll:()=>[query]}),setQueryData:(k,v)=>{query.state.data=v},refetchQueries:async({predicate})=>{if(predicate(query)){const r=await window.fetch('/api/v1/workspace/trackers?x=1',{method:'GET'});query.state.data=await r.json();}}};window.__POWER_SCALE_QUERY_CLIENT__=qc;
const dbg=window.__POWER_SCALE_FX_DEBUG__;dbg.setMode('BRL');await dbg.replayTaggedQueries();
if(networkCalls!==1)throw new Error(`replay used network: ${networkCalls}`);
const got=query.state.data.data.data[0].total_cost;if(Math.abs(got-500)>0.001)throw new Error(`replay conversion failed: ${got}`);
console.log('currency replay test: OK, no network, converted',got);
