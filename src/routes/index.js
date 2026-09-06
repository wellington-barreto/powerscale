import {Router} from 'express'; import {admin,anon} from '../config/supabase.js'; import {auth,ensureUserWorkspace} from '../middleware/auth.js'; import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import {fileURLToPath} from 'node:url';
export const router=Router(); const A=Router();
const __filename=fileURLToPath(import.meta.url); const __dirname=path.dirname(__filename);
const appScriptTemplatePath=path.resolve(__dirname,'../appscript/power-scale-importer.template.js');
const safeUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function workspaceForUserUuid(uuid){if(!safeUuid.test(uuid))return null;const {data,error}=await admin.from('workspace_members').select('workspace_id,user_id').eq('user_id',uuid).eq('active',true).limit(1).maybeSingle();if(error)throw error;return data;}
const merge=(body={},omit=[])=>Object.fromEntries(Object.entries(body).filter(([k])=>!omit.includes(k)));
const one=async(q)=>{const {data,error}=await q;if(error)throw error;return data};

function resolvePublicBase(req){
  const normalize=(value)=>{
    const raw=String(value||'').trim();
    if(!raw || raw.includes('${')) return null;
    const candidate=/^https?:\/\//i.test(raw)?raw:`https://${raw}`;
    try {
      const u=new URL(candidate);
      if(!['http:','https:'].includes(u.protocol)) return null;
      return u.origin.replace(/\/$/,'');
    } catch { return null; }
  };

  // APP_URL has priority only when it is a real absolute URL. Vercel does not
  // expand strings such as http://${VERCEL_PROJECT_PRODUCTION_URL} entered in
  // the Environment Variables UI, so template-looking values are ignored.
  const configured=normalize(process.env.APP_URL);
  if(configured) return configured;

  const production=normalize(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if(production) return production;

  const deployment=normalize(process.env.VERCEL_URL);
  if(deployment) return deployment;

  const forwardedProto=String(req.get('x-forwarded-proto')||req.protocol||'https').split(',')[0].trim();
  const forwardedHost=String(req.get('x-forwarded-host')||req.get('host')||'').split(',')[0].trim();
  const requestBase=normalize(`${forwardedProto}://${forwardedHost}`);
  if(requestBase) return requestBase;

  throw new Error('Não foi possível determinar a URL pública do POWER SCALE');
}

router.get('/settings/theme', async (_req,res)=>res.json({data:{name:'POWER SCALE',theme:'dark'}}));
router.post('/auth/login',async(req,res,next)=>{try{const {email,password}=req.body;const {data,error}=await anon.auth.signInWithPassword({email,password});if(error)return res.status(401).json({message:'Credenciais inválidas'});await ensureUserWorkspace(data.user);const profile=await one(admin.from('profiles').select('*').eq('user_id',data.user.id).maybeSingle());res.json({token:data.session.access_token,user:{id:data.user.id,email:data.user.email,name:profile?.name||data.user.email,role:profile?.role||'user',preferences:profile?.preferences||{}}})}catch(e){next(e)}});
router.get('/auth/google/login',(req,res)=>{const base=resolvePublicBase(req);const redirectTo=`${base}/auth/callback`;const url=new URL(`${process.env.SUPABASE_URL}/auth/v1/authorize`);url.searchParams.set('provider','google');url.searchParams.set('redirect_to',redirectTo);res.redirect(url.toString())});
// POWER SCALE Apps Script endpoints (called by Google Ads, so they are public and UUID-scoped)
router.get('/google-ads/appscript/code/:uuid',async(req,res,next)=>{try{
  const member=await workspaceForUserUuid(req.params.uuid); if(!member)return res.status(404).type('text/plain').send('// POWER SCALE: instalação não encontrada');
  const template=fs.readFileSync(appScriptTemplatePath,'utf8');
  const publicBase=resolvePublicBase(req);
  const apiBase=publicBase+'/api/v1';
  const code=template.replaceAll('{{USER_UUID}}',req.params.uuid).replaceAll('{{API_BASE_URL}}',apiBase);
  res.set('Cache-Control','no-store'); res.type('application/javascript; charset=utf-8').send(code);
}catch(e){next(e)}});
router.get('/google-ads/appscript/config/:uuid',async(req,res,next)=>{try{
  const member=await workspaceForUserUuid(req.params.uuid); if(!member)return res.status(404).json({message:'Instalação não encontrada'});
  const customerId=String(req.query.customer_id||'').replace(/\D/g,''); if(!customerId)return res.status(400).json({message:'customer_id é obrigatório'});
  // A conta só é considerada inicializada depois que existem métricas canônicas de campanha.
  // Isso permite que bancos vindos da v9 (que possuíam raw/segmentos, mas não campaign_level)
  // refaçam automaticamente o histórico na primeira execução da v10.
  const {count,error}=await admin.from('google_ads_import_rows').select('*',{count:'exact',head:true})
    .eq('workspace_id',member.workspace_id).eq('account_external_id',customerId).eq('segment_type','campaign_level'); if(error)throw error;
  const first=!count;
  const firstDays=Math.max(1,Math.min(3650,Number(process.env.APPSCRIPT_FIRST_IMPORT_DAYS||730)||730));
  const incrementalDays=Math.max(1,Math.min(365,Number(process.env.APPSCRIPT_INCREMENTAL_DAYS||7)||7));
  res.json({days_back:first?firstDays:incrementalDays,is_first_import:first,customer_id:customerId,first_import_days:firstDays,incremental_days:incrementalDays});
}catch(e){next(e)}});
router.post('/google-ads/appscript/log/:uuid',async(req,res,next)=>{try{
  const member=await workspaceForUserUuid(req.params.uuid); if(!member)return res.status(404).json({message:'Instalação não encontrada'});
  const customerId=String(req.body?.customer_id||'').replace(/\D/g,''); let accountId=null;
  if(customerId){const {data:a}=await admin.from('google_ads_accounts').select('id').eq('workspace_id',member.workspace_id).eq('external_id',customerId).maybeSingle();accountId=a?.id||null;}
  const {error}=await admin.from('google_ads_sync_logs').insert({workspace_id:member.workspace_id,account_id:accountId,status:req.body?.status||'client_log',started_at:req.body?.started_at||new Date().toISOString(),finished_at:req.body?.finished_at||new Date().toISOString(),payload:req.body||{}}); if(error)throw error;
  res.json({ok:true});
}catch(e){next(e)}});
router.post('/google-ads/import/:uuid',async(req,res,next)=>{try{
  const member=await workspaceForUserUuid(req.params.uuid); if(!member)return res.status(404).json({message:'Instalação não encontrada'});
  const rows=Array.isArray(req.body?.data)?req.body.data:[]; if(!rows.length)return res.json({ok:true,received:0}); if(rows.length>1000)return res.status(413).json({message:'Batch acima do limite'});

  const digits=v=>v==null?null:String(v).replace(/\D/g,'')||null;
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
  const text=v=>v==null?null:String(v);
  const stable=v=>{if(v===null||v===undefined)return '';if(Array.isArray(v))return '['+v.map(stable).join(',')+']';if(typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';return JSON.stringify(v)};
  const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
  const metricCols=m=>({
    impressions:num(m?.impressions), clicks:num(m?.clicks), cost:num(m?.cost), conversions:num(m?.conversions), conversion_value:num(m?.conversion_value),
    checkout_conversions:num(m?.checkout_conversions), checkout_value:num(m?.checkout_value), all_conversions:num(m?.all_conversions), all_conversion_value:num(m?.all_conversion_value),
    view_through_conversions:num(m?.view_through_conversions), cross_device_conversions:num(m?.cross_device_conversions), average_cpc:m?.average_cpc==null?null:num(m.average_cpc),
    average_cpm:m?.average_cpm==null?null:num(m.average_cpm), ctr_percent:m?.ctr_percent==null?null:num(m.ctr_percent), impression_share_percent:m?.impression_share_percent==null?null:num(m.impression_share_percent),
    top_impression_share_percent:m?.top_impression_share_percent==null?null:num(m.top_impression_share_percent), absolute_top_impression_share_percent:m?.absolute_top_impression_share_percent==null?null:num(m.absolute_top_impression_share_percent),
    search_rank_lost_is_percent:m?.search_rank_lost_is_percent==null?null:num(m.search_rank_lost_is_percent), search_rank_lost_top_is_percent:m?.search_rank_lost_top_is_percent==null?null:num(m.search_rank_lost_top_is_percent),
    search_rank_lost_abs_top_is_percent:m?.search_rank_lost_abs_top_is_percent==null?null:num(m.search_rank_lost_abs_top_is_percent), search_budget_lost_is_percent:m?.search_budget_lost_is_percent==null?null:num(m.search_budget_lost_is_percent),
    search_budget_lost_top_is_percent:m?.search_budget_lost_top_is_percent==null?null:num(m.search_budget_lost_top_is_percent), search_budget_lost_abs_top_is_percent:m?.search_budget_lost_abs_top_is_percent==null?null:num(m.search_budget_lost_abs_top_is_percent),
    search_eligible_top_is_percent:m?.search_eligible_top_is_percent==null?null:num(m.search_eligible_top_is_percent), search_eligible_abs_top_is_percent:m?.search_eligible_abs_top_is_percent==null?null:num(m.search_eligible_abs_top_is_percent),
    search_exact_match_is_percent:m?.search_exact_match_is_percent==null?null:num(m.search_exact_match_is_percent), search_click_share_percent:m?.search_click_share_percent==null?null:num(m.search_click_share_percent),
    interactions:m?.interactions==null?null:num(m.interactions), interaction_rate_percent:m?.interaction_rate_percent==null?null:num(m.interaction_rate_percent), invalid_clicks:m?.invalid_clicks==null?null:num(m.invalid_clicks),
    invalid_click_rate_percent:m?.invalid_click_rate_percent==null?null:num(m.invalid_click_rate_percent), average_cost:m?.average_cost==null?null:num(m.average_cost), engagements:m?.engagements==null?null:num(m.engagements),
    engagement_rate:m?.engagement_rate==null?null:num(m.engagement_rate), active_view_impressions:m?.active_view_impressions==null?null:num(m.active_view_impressions), active_view_measurability:m?.active_view_measurability==null?null:num(m.active_view_measurability),
    active_view_viewability:m?.active_view_viewability==null?null:num(m.active_view_viewability), gmail_forwards:m?.gmail_forwards==null?null:num(m.gmail_forwards), gmail_saves:m?.gmail_saves==null?null:num(m.gmail_saves),
    gmail_secondary_clicks:m?.gmail_secondary_clicks==null?null:num(m.gmail_secondary_clicks)
  });
  const dimensionFor=row=>{const t=String(row?.segment||'unknown');const keys={
    campaign_roster:['campaign'], campaign_level:['campaign'], ad_group:['ad_group'], gender:['gender'], age_range:['age_range'], audience:['audience'], keyword:['keyword'], device:['device'], ad:['ad'],
    hour_of_day:['hour','device'], day_of_week:['day_of_week'], location:['location'], placement:['placement'], search_term:['search_term'], asset:['asset'], labels:['campaign','ad_group'],
    video:['video','ad_group'], pmax_asset_group:['asset_group'], pmax_asset:['asset_group','asset'], display_creative:['creative','ad_group'], demand_gen_creative:['creative','ad_group']
  }[t]||[];const o={};for(const k of keys)if(row?.[k]!==undefined)o[k]=row[k];return o};
  const segmentDataFor=row=>{const t=String(row?.segment||'unknown');switch(t){
    case 'device': return {device:row?.device||'UNKNOWN'};
    case 'gender': return row?.gender||{}; case 'age_range': return row?.age_range||{}; case 'audience': return row?.audience||{};
    case 'keyword': return row?.keyword||{}; case 'ad': return row?.ad||{}; case 'location': return row?.location||{}; case 'placement': return row?.placement||{};
    case 'search_term': return row?.search_term||{}; case 'asset': return row?.asset||{}; case 'video': return row?.video||{}; case 'pmax_asset_group': return row?.asset_group||{};
    case 'pmax_asset': return {asset_group:row?.asset_group||{},asset:row?.asset||{}}; case 'display_creative': case 'demand_gen_creative': return row?.creative||{};
    case 'day_of_week': return {day_of_week:row?.day_of_week||'UNKNOWN'}; case 'hour_of_day': return {hour:row?.hour,device:row?.device||null};
    case 'labels': return {campaign_labels:row?.campaign?.labels||[],ad_group_labels:row?.ad_group?.labels||[]}; case 'ad_group': return row?.ad_group||{};
    default:return dimensionFor(row);
  }};
  const readableSegmentKey=row=>{const t=String(row?.segment||'unknown');const d=segmentDataFor(row);const pick=(...v)=>v.find(x=>x!==undefined&&x!==null&&String(x)!=='');switch(t){
    case 'device': return text(d.device)||'UNKNOWN'; case 'gender': return text(d.type)||text(d.criterion_id)||'UNDETERMINED'; case 'age_range': return text(d.type)||text(d.criterion_id)||'AGE_RANGE_UNDETERMINED';
    case 'audience': return text(pick(d.name,d.criterion_id,d.type))||'audience'; case 'keyword': return text(pick(d.text,d.criterion_id))||'keyword'; case 'ad': return text(pick(d.name,d.id))||'ad';
    case 'hour_of_day': return String(d.hour??'0')+(d.device?':'+d.device:''); case 'day_of_week': return text(d.day_of_week)||'UNKNOWN';
    case 'location': return text(pick(d.canonical_name,d.name,d.country_code,d.country_criterion_id))||'location'; case 'placement': return text(pick(d.name,d.url,d.placement_id))||'placement';
    case 'search_term': return text(pick(d.term,d.match_type))||'search_term'; case 'asset': return text(pick(d.name,d.text,d.id))||'asset'; case 'video': return text(pick(d.title,d.id))||'video';
    case 'pmax_asset_group': return text(pick(d.name,d.id))||'pmax_asset_group'; case 'pmax_asset': return text(pick(d.asset?.name,d.asset?.id))||'pmax_asset';
    case 'display_creative': case 'demand_gen_creative': return text(pick(d.name,d.id))||t; case 'labels': return stable(d); case 'campaign_level': return 'campaign'; case 'ad_group': return text(pick(d.name,d.id))||'campaign';
    default:return stable(d)||t;
  }};

  const accounts=new Map(), campaigns=new Map();
  for(const row of rows){const aid=digits(row?.account?.id);if(aid&&!accounts.has(aid))accounts.set(aid,row.account||{});const cid=row?.campaign?.id?String(row.campaign.id):'';if(aid&&cid&&!campaigns.has(aid+'|'+cid))campaigns.set(aid+'|'+cid,{accountExternalId:aid,...(row.campaign||{})});}
  const accountDb=new Map();
  for(const [externalId,a] of accounts){const {data,error}=await admin.from('google_ads_accounts').upsert({workspace_id:member.workspace_id,external_id:externalId,name:a.name||null,currency_code:a.currency||a.currency_code||null,timezone:a.timezone||null,source:'appscript',status:'active',sync_enabled:true,payload:a},{onConflict:'workspace_id,external_id'}).select('id,external_id').single();if(error)throw error;accountDb.set(externalId,data.id);}
  const campaignDb=new Map();
  for(const [,c] of campaigns){const accountId=accountDb.get(c.accountExternalId) || (await one(admin.from('google_ads_accounts').select('id').eq('workspace_id',member.workspace_id).eq('external_id',c.accountExternalId).maybeSingle()))?.id;if(!accountId)continue;const {data,error}=await admin.from('google_ads_campaigns').upsert({workspace_id:member.workspace_id,account_id:accountId,external_id:String(c.id),name:c.name||('Campanha '+c.id),status:c.status||null,advertising_channel_type:c.channel_type||c.advertising_channel_type||null,payload:c},{onConflict:'workspace_id,account_id,external_id'}).select('id,external_id').single();if(error)throw error;campaignDb.set(c.accountExternalId+'|'+String(c.id),data.id);}

  const raw=[], segAgg=new Map(); const affected=new Map();
  for(const row of rows){
    const aid=digits(row?.account?.id), cid=row?.campaign?.id?String(row.campaign.id):null, campaignId=aid&&cid?(campaignDb.get(aid+'|'+cid) || null):null;
    const st=String(row?.segment||'unknown'), dt=row?.date||null, dim=dimensionFor(row), segmentData=segmentDataFor(row), sk=readableSegmentKey(row);
    // Raw identity includes the original ad group/dimension so repeated syncs are idempotent without collapsing source rows.
    const rk=sha([aid||'',cid||'',dt||'',st,String(row?.ad_group?.id||''),stable(dim)].join('|'));
    raw.push({row_key:rk,workspace_id:member.workspace_id,user_id:member.user_id,account_external_id:aid,campaign_external_id:cid,segment_type:st,segment_date:dt,segment_key:sk,ad_group_external_id:row?.ad_group?.id?String(row.ad_group.id):null,dimension:segmentData,payload:row,imported_at:row?.imported_at||req.body?.imported_at||new Date().toISOString()});
    if(campaignId && st!=='campaign_roster' && st!=='campaign_level'){
      const ak=[campaignId,dt||'',st,sk].join('|'); const m=metricCols(row?.metrics||{});
      if(!segAgg.has(ak))segAgg.set(ak,{workspace_id:member.workspace_id,campaign_id:campaignId,segment_date:dt,segment_type:st,segment_key:sk,dimension:segmentData,...m,payload:row,updated_at:new Date().toISOString(),_weight:num(m.impressions)});
      else{const a=segAgg.get(ak),w=num(m.impressions),oldW=a._weight||0;for(const k of ['impressions','clicks','cost','conversions','conversion_value','checkout_conversions','checkout_value','all_conversions','all_conversion_value','view_through_conversions','cross_device_conversions','interactions','invalid_clicks','engagements','active_view_impressions','gmail_forwards','gmail_saves','gmail_secondary_clicks'])a[k]=num(a[k])+num(m[k]);for(const k of ['average_cpc','average_cpm','ctr_percent','impression_share_percent','top_impression_share_percent','absolute_top_impression_share_percent','search_rank_lost_is_percent','search_rank_lost_top_is_percent','search_rank_lost_abs_top_is_percent','search_budget_lost_is_percent','search_budget_lost_top_is_percent','search_budget_lost_abs_top_is_percent','search_eligible_top_is_percent','search_eligible_abs_top_is_percent','search_exact_match_is_percent','search_click_share_percent','interaction_rate_percent','invalid_click_rate_percent','average_cost','engagement_rate','active_view_measurability','active_view_viewability'])if(m[k]!=null)a[k]=(a[k]==null||oldW+w===0)?num(m[k]):((num(a[k])*oldW+num(m[k])*w)/(oldW+w));a._weight=oldW+w;}
    }
    if(campaignId && st==='campaign_level' && dt)affected.set(campaignId+'|'+dt,{campaignId,dt,accountId:accountDb.get(aid)||null,aid,cid});
  }
  const segs=[...segAgg.values()].map(({_weight,...x})=>x);
  if(raw.length){const {error}=await admin.from('google_ads_import_rows').upsert(raw,{onConflict:'workspace_id,row_key'});if(error)throw error;}
  if(segs.length){const {error}=await admin.from('google_ads_segments').upsert(segs,{onConflict:'campaign_id,segment_date,segment_type,segment_key'});if(error)throw error;}

  // Métrica diária canônica: uma linha campaign_level por campanha/data, enviada diretamente pelo Google Ads.
  // Reconsultamos o RAW após o upsert para manter idempotência mesmo quando o importador envia batches de 500 linhas.
  for(const {campaignId,dt,accountId,aid,cid} of affected.values()){
    const {data:rr,error}=await admin.from('google_ads_import_rows').select('payload,imported_at')
      .eq('workspace_id',member.workspace_id).eq('account_external_id',aid).eq('campaign_external_id',cid)
      .eq('segment_type','campaign_level').eq('segment_date',dt).order('imported_at',{ascending:false}).limit(1); if(error)throw error;
    const source=rr?.[0]?.payload; if(!source)continue;
    const m=metricCols(source.metrics||{});
    const payload={...source,normalized_by:'power_scale_v10',derived_from:'campaign_level'};
    const {error:me}=await admin.from('google_ads_daily_metrics').upsert({workspace_id:member.workspace_id,account_id:accountId,campaign_id:campaignId,metric_date:dt,...m,payload,updated_at:new Date().toISOString()},{onConflict:'campaign_id,metric_date'});if(me)throw me;
  }
  res.json({ok:true,received:rows.length,accounts:accounts.size,campaigns:campaigns.size,segments:segs.length,daily_rebuilt:affected.size});
}catch(e){next(e)}});

router.use(auth);
router.get('/user',async(req,res,next)=>{try{const p=await one(admin.from('profiles').select('*').eq('user_id',req.user.id).maybeSingle());res.json({id:req.user.id,uuid:req.user.id,email:req.user.email,name:p?.name||req.user.email,role:p?.role||req.workspaceRole||'user',preferences:p?.preferences||{}})}catch(e){next(e)}});
router.put('/profile',async(req,res,next)=>{try{const data=await one(admin.from('profiles').upsert({user_id:req.user.id,...merge(req.body,['user_id','role'])}).select().single());res.json(data)}catch(e){next(e)}});
router.put('/profile/preferences',async(req,res,next)=>{try{const data=await one(admin.from('profiles').upsert({user_id:req.user.id,preferences:req.body.preferences||{}}).select().single());res.json(data)}catch(e){next(e)}});
router.put('/profile/password',async(req,res,next)=>{try{const {error}=await admin.auth.admin.updateUserById(req.user.id,{password:req.body.password||req.body.new_password});if(error)throw error;res.json({success:true})}catch(e){next(e)}});
router.get('/auth/google/ads-url',async(req,res)=>res.json({url:null,message:'Configure a integração OAuth do Google Ads no POWER SCALE.'}));

A.get('/platforms',listRaw('platforms')); A.post('/platforms',create('platforms')); A.post('/platforms/:id',update('platforms'));
A.get('/user-platforms',list('user_platforms')); A.post('/user-platforms',create('user_platforms')); A.delete('/user-platforms/:id',remove('user_platforms'));
A.get('/trackers',async(req,res,next)=>{try{let q=admin.from('trackers').select('*,platform:platforms(*)',{count:'exact'}).eq('workspace_id',req.workspaceId).is('archived_at',null);if(req.query.q)q=q.ilike('name',`%${req.query.q}%`);const {data,error,count}=await q.order('id',{ascending:false});if(error)throw error;res.json({data:{data,total:count??data.length}})}catch(e){next(e)}});
A.post('/trackers',create('trackers')); A.put('/trackers/:id',update('trackers'));
A.delete('/trackers/:id',async(req,res,next)=>{try{await one(admin.from('trackers').update({archived_at:new Date().toISOString()}).eq('id',req.params.id).eq('workspace_id',req.workspaceId));res.json({success:true})}catch(e){next(e)}});
A.get('/trackers/archived',async(req,res,next)=>{try{const data=await one(admin.from('trackers').select('*,platform:platforms(*)').eq('workspace_id',req.workspaceId).not('archived_at','is',null));res.json({data})}catch(e){next(e)}});
A.post('/trackers/:id/restore',async(req,res,next)=>{try{const data=await one(admin.from('trackers').update({archived_at:null}).eq('id',req.params.id).eq('workspace_id',req.workspaceId).select().single());res.json(data)}catch(e){next(e)}});
A.get('/trackers/:id/scroll-analytics',async(req,res,next)=>{try{const data=await one(admin.from('tracker_scroll_events').select('*').eq('workspace_id',req.workspaceId).eq('tracker_id',req.params.id));res.json({data})}catch(e){next(e)}});
A.get('/trackers/unlinked-campaigns/count',async(req,res,next)=>{try{const {count,error}=await admin.from('google_ads_campaigns').select('*',{count:'exact',head:true}).eq('workspace_id',req.workspaceId).is('tracker_id',null);if(error)throw error;res.json({count:count||0})}catch(e){next(e)}});

A.get('/domains',listPaged('domains')); A.post('/domains',create('domains')); A.delete('/domains/:id',remove('domains'));
A.post('/domains/:id/verify',async(req,res,next)=>{try{const data=await one(admin.from('domains').update({status:'verified',verified_at:new Date().toISOString()}).eq('id',req.params.id).eq('workspace_id',req.workspaceId).select().single());res.json(data)}catch(e){next(e)}});
A.get('/sites',listPaged('sites')); A.post('/sites',create('sites')); A.put('/sites/:id',update('sites')); A.delete('/sites/:id',remove('sites'));
A.post('/landing-pages/:id/capture',async(req,res,next)=>{try{const data=await one(admin.from('site_captures').insert({workspace_id:req.workspaceId,site_id:req.params.id,status:'queued'}).select().single());res.json(data)}catch(e){next(e)}});
A.get('/canvas-views',list('canvas_views')); A.post('/canvas-views',create('canvas_views')); A.delete('/canvas-views/:id',remove('canvas_views'));

A.post('/visitors-logs',async(req,res,next)=>{try{const page=Number(req.query.page||1),limit=Number(req.body?.limit||50),from=(page-1)*limit;let q=admin.from('visitor_sessions').select('*',{count:'exact'}).eq('workspace_id',req.workspaceId).order('started_at',{ascending:false}).range(from,from+limit-1);const {data,error,count}=await q;if(error)throw error;res.json({data,total:count||0,current_page:page,last_page:Math.max(1,Math.ceil((count||0)/limit))})}catch(e){next(e)}});
A.get('/visitors-logs/:id',async(req,res,next)=>{try{const data=await one(admin.from('visitor_sessions').select('*,events:visitor_events(*)').eq('workspace_id',req.workspaceId).eq('id',req.params.id).single());res.json(data)}catch(e){next(e)}});
A.get('/visitors-logs/:id/replay',async(req,res,next)=>{try{const data=await one(admin.from('visitor_replays').select('*').eq('workspace_id',req.workspaceId).eq('session_id',req.params.id).maybeSingle());res.json(data||{replay:[]})}catch(e){next(e)}});
A.post('/visitors-logs/:id/insight',async(req,res,next)=>{try{const data=await one(admin.from('visitor_insights').insert({workspace_id:req.workspaceId,session_id:req.params.id,insight:'Insight pendente de integração com IA'}).select().single());res.json(data)}catch(e){next(e)}});

A.get('/google-accounts',list('google_accounts')); A.get('/google-accounts/:id/ad-accounts',async(req,res,next)=>{try{const data=await one(admin.from('google_ads_accounts').select('*').eq('workspace_id',req.workspaceId).eq('google_account_id',req.params.id));res.json(data)}catch(e){next(e)}}); A.delete('/google-accounts/:id',remove('google_accounts'));
A.get('/google-ads/appscript-accounts',async(req,res,next)=>{try{const data=await one(admin.from('google_ads_accounts').select('*').eq('workspace_id',req.workspaceId).eq('source','appscript').order('name',{ascending:true}));const last=await one(admin.from('google_ads_import_rows').select('imported_at').eq('workspace_id',req.workspaceId).order('imported_at',{ascending:false}).limit(1).maybeSingle());res.json({data,last_import:last?{completed_at:last.imported_at,status:'success'}:null})}catch(e){next(e)}});
A.post('/google-ads/accounts',async(req,res,next)=>{try{const {start_date,end_date}=req.body||{};const accounts=await one(admin.from('google_ads_accounts').select('*').eq('workspace_id',req.workspaceId).eq('sync_enabled',true));for(const a of accounts){const camps=await one(admin.from('google_ads_campaigns').select('*,tracker:trackers(*)').eq('account_id',a.id));const ids=camps.map(c=>c.id);let metrics=[];if(ids.length){let q=admin.from('google_ads_daily_metrics').select('*').eq('workspace_id',req.workspaceId).in('campaign_id',ids);if(start_date)q=q.gte('metric_date',start_date);if(end_date)q=q.lte('metric_date',end_date);metrics=await one(q)}for(const c of camps){const p=c.payload||{};for(const k of ['bidding_strategy','target_cpa','target_roas','budget_daily','channel_type','channel_sub_type','max_cpc_limit','target_impression_share'])if(c[k]==null&&p[k]!=null)c[k]=p[k];const mm=metrics.filter(m=>m.campaign_id===c.id);const sum=k=>mm.reduce((z,m)=>z+Number(m[k]||0),0);c.snapshots_sum_impressions=sum('impressions');c.snapshots_sum_clicks=sum('clicks');c.snapshots_sum_cost=sum('cost');c.snapshots_sum_conversions=sum('conversions');c.snapshots_sum_conversion_value=sum('conversion_value');c.snapshots_sum_checkout_conversions=sum('checkout_conversions');c.snapshots_sum_checkout_value=sum('checkout_value');c.snapshots_sum_all_conversions=sum('all_conversions');c.snapshots_sum_all_conversion_value=sum('all_conversion_value');c.snapshots_count=mm.length}a.campaigns=camps}res.json({data:accounts,start_date,end_date})}catch(e){next(e)}});
A.post('/google-ads/campaigns/:id/link-tracker',async(req,res,next)=>{try{const data=await one(admin.from('google_ads_campaigns').update({tracker_id:req.body.tracker_id}).eq('workspace_id',req.workspaceId).eq('id',req.params.id).select().single());res.json(data)}catch(e){next(e)}});
A.delete('/google-ads/campaigns/:id/link-tracker',async(req,res,next)=>{try{const data=await one(admin.from('google_ads_campaigns').update({tracker_id:null}).eq('workspace_id',req.workspaceId).eq('id',req.params.id).select().single());res.json(data)}catch(e){next(e)}});
A.patch('/google-ads/campaigns/:id/validation-status',fieldUpdate('google_ads_campaigns','validation_status'));
A.post('/google-ads/campaigns/:id/daily-metrics',async(req,res,next)=>{try{let q=admin.from('google_ads_daily_metrics').select('*').eq('workspace_id',req.workspaceId).eq('campaign_id',req.params.id);if(req.body.start_date)q=q.gte('metric_date',req.body.start_date);if(req.body.end_date)q=q.lte('metric_date',req.body.end_date);const rows=await one(q.order('metric_date'));res.json({data:rows.map(x=>({...x,date:x.metric_date}))})}catch(e){next(e)}});
A.post('/google-ads/segments',async(req,res,next)=>{try{let campaignIds=null;if(req.body.tracker_id){const cs=await one(admin.from('google_ads_campaigns').select('id').eq('workspace_id',req.workspaceId).eq('tracker_id',req.body.tracker_id));campaignIds=cs.map(x=>x.id);if(!campaignIds.length){const out={};for(const t of req.body.segment_types||[])out[t]=[];return res.json({data:out})}}let q=admin.from('google_ads_segments').select('*').eq('workspace_id',req.workspaceId);if(req.body.google_ads_campaign_id)q=q.eq('campaign_id',req.body.google_ads_campaign_id);else if(campaignIds)q=q.in('campaign_id',campaignIds);if(req.body.start_date)q=q.gte('segment_date',req.body.start_date);if(req.body.end_date)q=q.lte('segment_date',req.body.end_date);const rows=await one(q);const additive=['impressions','clicks','cost','conversions','conversion_value','checkout_conversions','checkout_value','all_conversions','all_conversion_value','view_through_conversions','cross_device_conversions','interactions','invalid_clicks','engagements','active_view_impressions','gmail_forwards','gmail_saves','gmail_secondary_clicks'];const weighted=['average_cpc','average_cpm','ctr_percent','impression_share_percent','top_impression_share_percent','absolute_top_impression_share_percent','search_rank_lost_is_percent','search_rank_lost_top_is_percent','search_rank_lost_abs_top_is_percent','search_budget_lost_is_percent','search_budget_lost_top_is_percent','search_budget_lost_abs_top_is_percent','search_eligible_top_is_percent','search_eligible_abs_top_is_percent','search_exact_match_is_percent','search_click_share_percent','interaction_rate_percent','invalid_click_rate_percent','average_cost','engagement_rate','active_view_measurability','active_view_viewability'];const groups=new Map();for(const x of rows){const k=x.segment_type+'|'+(x.segment_key||'');if(!groups.has(k))groups.set(k,{...x,segment_data:x.dimension||x.payload?.[x.segment_type]||{},date_from:x.segment_date,date_to:x.segment_date,_w:Number(x.impressions||0)});else{const a=groups.get(k),w=Number(x.impressions||0),ow=a._w||0;for(const c of additive)a[c]=Number(a[c]||0)+Number(x[c]||0);for(const c of weighted)if(x[c]!=null)a[c]=(a[c]==null||ow+w===0)?Number(x[c]):((Number(a[c])*ow+Number(x[c])*w)/(ow+w));a._w=ow+w;if(x.segment_date<a.date_from)a.date_from=x.segment_date;if(x.segment_date>a.date_to)a.date_to=x.segment_date}}const normalized=[...groups.values()].map(({_w,...x})=>x);const out={};for(const type of req.body.segment_types||[]){out[type]=normalized.filter(x=>x.segment_type===type)}res.json({data:out})}catch(e){next(e)}});
A.post('/google-ads/metrics/funnel',async(req,res,next)=>{try{const b=req.body||{};let ids=[];if(b.google_ads_campaign_id)ids=[Number(b.google_ads_campaign_id)];else if(b.tracker_id){const cs=await one(admin.from('google_ads_campaigns').select('id').eq('workspace_id',req.workspaceId).eq('tracker_id',b.tracker_id));ids=cs.map(x=>x.id)}let rows=[];if(ids.length){let q=admin.from('google_ads_daily_metrics').select('*,campaign:google_ads_campaigns(name)').eq('workspace_id',req.workspaceId).in('campaign_id',ids);const from=String(b.from||'').slice(0,10),to=String(b.to||'').slice(0,10);if(from)q=q.gte('metric_date',from);if(to)q=q.lte('metric_date',to);rows=await one(q.order('metric_date'))}const sum=k=>rows.reduce((z,x)=>z+Number(x[k]||0),0);const impressions=sum('impressions'),clicks=sum('clicks'),cost=sum('cost'),conversions=sum('conversions'),conversionValue=sum('conversion_value'),checkouts=sum('checkout_conversions');const timeline=rows.map(x=>({date:x.metric_date,campaign_id:x.campaign_id,campaign_name:x.campaign?.name||null,impressions:Number(x.impressions||0),clicks:Number(x.clicks||0),cost:Number(x.cost||0),conversions:Number(x.conversions||0),conversion_value:Number(x.conversion_value||0),checkouts:Number(x.checkout_conversions||0)}));res.json({data:{view_type:b.view_type||'google_ads',funnel:{impressions,clicks,page_views:0,passed:0,checkouts,purchases:conversions,conversions},cards:{investment:{value:cost},result:{value:conversions},conversion_value:{value:conversionValue},checkout_conversions:{value:checkouts},cost_per_result:{value:conversions?cost/conversions:0}},charts:{timeline_daily:timeline},steps:[]}})}catch(e){next(e)}});
A.get('/google-ads/kanban-rules',list('google_ads_kanban_rules')); A.post('/google-ads/kanban-rules',create('google_ads_kanban_rules'));
A.get('/google-ads/integrations',list('google_ads_integrations'));
A.get('/google-ads/report-daily',async(req,res,next)=>{try{let q=admin.from('google_ads_daily_metrics').select('*').eq('workspace_id',req.workspaceId).eq('campaign_id',req.query.campaign_id);if(req.query.start_date)q=q.gte('metric_date',req.query.start_date);if(req.query.end_date)q=q.lte('metric_date',req.query.end_date);const rows=await one(q.order('metric_date'));res.json({data:rows.map(x=>({...x,date:x.metric_date}))})}catch(e){next(e)}});
A.post('/google-ads/report-daily/note',async(req,res,next)=>{try{const b=req.body;const data=await one(admin.from('google_ads_daily_notes').upsert({workspace_id:req.workspaceId,campaign_id:b.campaign_id,note_date:b.date||b.note_date,note:b.note},{onConflict:'campaign_id,note_date'}).select().single());res.json(data)}catch(e){next(e)}});
A.post('/google-ads/report-daily/override',async(req,res,next)=>{try{const b=req.body;const data=await one(admin.from('google_ads_daily_overrides').upsert({workspace_id:req.workspaceId,campaign_id:b.campaign_id,override_date:b.date||b.override_date,values:b.values||b},{onConflict:'campaign_id,override_date'}).select().single());res.json(data)}catch(e){next(e)}});
A.get('/google-ads/synced-accounts',list('google_ads_accounts')); A.post('/google-ads/import-sync',async(req,res)=>res.json({success:true,queued:true}));

for(const [path,table] of [['categories','financial_categories'],['entries','financial_entries'],['mining','financial_mining']]){A.get(`/financial/${path}`,list(table));A.post(`/financial/${path}`,create(table));A.put(`/financial/${path}/:id`,update(table));A.delete(`/financial/${path}/:id`,remove(table))}
A.post('/financial/mining/:id/convert',async(req,res,next)=>{try{const m=await one(admin.from('financial_mining').select('*').eq('workspace_id',req.workspaceId).eq('id',req.params.id).single());const t=await one(admin.from('trackers').insert({workspace_id:req.workspaceId,name:m.name,mining_status:'destrave',payload:{source_mining_id:m.id}}).select().single());await one(admin.from('financial_mining').update({tracker_id:t.id,status:'converted'}).eq('id',m.id));res.json({success:true,tracker:t})}catch(e){next(e)}});
A.get('/financial/company',async(req,res,next)=>{try{
  const year=Number(req.query.year||new Date().getFullYear());
  const [cats,stored]=await Promise.all([
    one(admin.from('financial_categories').select('*').eq('workspace_id',req.workspaceId).order('id',{ascending:true})),
    one(admin.from('financial_company_settings').select('settings').eq('workspace_id',req.workspaceId).maybeSingle())
  ]);
  const settings=stored?.settings||{};
  const values=settings.values||{};
  const rows=(Array.isArray(cats)?cats:[]).map(cat=>{
    const categoryId=cat.id;
    const yearValues=values?.[String(categoryId)]?.[String(year)]||{};
    const months={};
    for(let m=1;m<=12;m++) months[m]=Number(yearValues?.[String(m)]||0);
    return {
      category_id:categoryId,
      category_name:cat.name||'',
      category_type:cat.type||cat.category_type||'expense',
      months,
      by_currency:{},
      total:Object.values(months).reduce((sum,v)=>sum+Number(v||0),0),
      has_google_ads:false
    };
  });
  res.json({data:{year,rows}})
}catch(e){next(e)}});
A.put('/financial/company',async(req,res,next)=>{try{
  const categoryId=req.body.category_id;
  const year=Number(req.body.year||new Date().getFullYear());
  const month=Number(req.body.month);
  const value=Number(req.body.value||0);
  if(!categoryId||month<1||month>12)return res.status(400).json({message:'category_id, month e year são obrigatórios'});
  const current=await one(admin.from('financial_company_settings').select('settings').eq('workspace_id',req.workspaceId).maybeSingle());
  const settings=current?.settings&&typeof current.settings==='object'?current.settings:{};
  const values=settings.values&&typeof settings.values==='object'?settings.values:{};
  const cid=String(categoryId),ys=String(year),ms=String(month);
  values[cid]=values[cid]&&typeof values[cid]==='object'?values[cid]:{};
  values[cid][ys]=values[cid][ys]&&typeof values[cid][ys]==='object'?values[cid][ys]:{};
  values[cid][ys][ms]=value;
  const nextSettings={...settings,values};
  await one(admin.from('financial_company_settings').upsert({workspace_id:req.workspaceId,settings:nextSettings},{onConflict:'workspace_id'}));
  res.json({data:{success:true,category_id:categoryId,year,month,value}})
}catch(e){next(e)}});
A.get('/financial/viability',async(req,res,next)=>{try{const s=await one(admin.from('financial_viability_settings').select('settings').eq('workspace_id',req.workspaceId).maybeSingle());res.json({data:s?.settings||{}})}catch(e){next(e)}}); A.put('/financial/viability',settingsUpsert('financial_viability_settings'));
A.get('/financial/dashboard',async(req,res,next)=>{try{let q=admin.from('financial_entries').select('*').eq('workspace_id',req.workspaceId);if(req.query.year)q=q.gte('entry_date',`${req.query.year}-01-01`).lte('entry_date',`${req.query.year}-12-31`);const rows=await one(q);const revenue=rows.filter(x=>x.type==='income').reduce((s,x)=>s+Number(x.amount),0),expenses=rows.filter(x=>x.type!=='income').reduce((s,x)=>s+Number(x.amount),0);res.json({data:{revenue,expenses,profit:revenue-expenses,entries:rows}})}catch(e){next(e)}});
A.post('/dashboard',async(req,res,next)=>{try{const trackers=await count('trackers',req.workspaceId),visitors=await count('visitor_sessions',req.workspaceId);res.json({data:{trackers,visitors}})}catch(e){next(e)}}); A.post('/dashboard/charts/sales',async(req,res)=>res.json({data:[]}));
A.get('/plan-usage',async(req,res)=>res.json({plan:'development',limits:{},usage:{}}));
router.use('/workspace',A);

function list(table){return async(req,res,next)=>{try{const data=await one(admin.from(table).select('*').eq('workspace_id',req.workspaceId).order('id',{ascending:false}));res.json({data})}catch(e){next(e)}}}

function listRaw(table){return async(req,res,next)=>{try{const data=await one(admin.from(table).select('*').eq('workspace_id',req.workspaceId).order('id',{ascending:false}));res.json(data)}catch(e){next(e)}}}
function listPaged(table){return async(req,res,next)=>{try{const page=Number(req.query.page||1),limit=50,from=(page-1)*limit;const {data,error,count}=await admin.from(table).select('*',{count:'exact'}).eq('workspace_id',req.workspaceId).range(from,from+limit-1).order('id',{ascending:false});if(error)throw error;res.json({data,total:count||0,current_page:page})}catch(e){next(e)}}}
function create(table){return async(req,res,next)=>{try{const data=await one(admin.from(table).insert({workspace_id:req.workspaceId,...merge(req.body,['id','workspace_id','created_at','updated_at'])}).select().single());res.json({data})}catch(e){next(e)}}}
function update(table){return async(req,res,next)=>{try{const data=await one(admin.from(table).update(merge(req.body,['id','workspace_id','created_at'])).eq('workspace_id',req.workspaceId).eq('id',req.params.id).select().single());res.json({data})}catch(e){next(e)}}}
function remove(table){return async(req,res,next)=>{try{await one(admin.from(table).delete().eq('workspace_id',req.workspaceId).eq('id',req.params.id));res.json({success:true})}catch(e){next(e)}}}
function fieldUpdate(table,field){return async(req,res,next)=>{try{const data=await one(admin.from(table).update({[field]:req.body[field]}).eq('workspace_id',req.workspaceId).eq('id',req.params.id).select().single());res.json(data)}catch(e){next(e)}}}
function settingsUpsert(table){return async(req,res,next)=>{try{const data=await one(admin.from(table).upsert({workspace_id:req.workspaceId,settings:req.body},{onConflict:'workspace_id'}).select().single());res.json({data:data.settings})}catch(e){next(e)}}}
async function count(table,workspaceId){const {count,error}=await admin.from(table).select('*',{count:'exact',head:true}).eq('workspace_id',workspaceId);if(error)throw error;return count||0}
