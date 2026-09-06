import {Router} from 'express'; import {admin,anon} from '../config/supabase.js'; import {auth,ensureUserWorkspace} from '../middleware/auth.js'; import fs from 'node:fs'; import path from 'node:path'; import {fileURLToPath} from 'node:url';
export const router=Router(); const A=Router();
const __filename=fileURLToPath(import.meta.url); const __dirname=path.dirname(__filename);
const appScriptTemplatePath=path.resolve(__dirname,'../appscript/power-scale-importer.template.js');
const safeUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function workspaceForUserUuid(uuid){if(!safeUuid.test(uuid))return null;const {data,error}=await admin.from('workspace_members').select('workspace_id,user_id').eq('user_id',uuid).eq('active',true).limit(1).maybeSingle();if(error)throw error;return data;}
const merge=(body={},omit=[])=>Object.fromEntries(Object.entries(body).filter(([k])=>!omit.includes(k)));
const one=async(q)=>{const {data,error}=await q;if(error)throw error;return data};

router.get('/settings/theme', async (_req,res)=>res.json({data:{name:'POWER SCALE',theme:'dark'}}));
router.post('/auth/login',async(req,res,next)=>{try{const {email,password}=req.body;const {data,error}=await anon.auth.signInWithPassword({email,password});if(error)return res.status(401).json({message:'Credenciais inválidas'});await ensureUserWorkspace(data.user);const profile=await one(admin.from('profiles').select('*').eq('user_id',data.user.id).maybeSingle());res.json({token:data.session.access_token,user:{id:data.user.id,email:data.user.email,name:profile?.name||data.user.email,role:profile?.role||'user',preferences:profile?.preferences||{}}})}catch(e){next(e)}});
router.get('/auth/google/login',(req,res)=>{const base=(process.env.APP_URL||`${req.protocol}://${req.get('host')}`).replace(/\/$/,'');const redirectTo=`${base}/auth/callback`;const url=new URL(`${process.env.SUPABASE_URL}/auth/v1/authorize`);url.searchParams.set('provider','google');url.searchParams.set('redirect_to',redirectTo);res.redirect(url.toString())});
// POWER SCALE Apps Script endpoints (called by Google Ads, so they are public and UUID-scoped)
router.get('/google-ads/appscript/code/:uuid',async(req,res,next)=>{try{
  const member=await workspaceForUserUuid(req.params.uuid); if(!member)return res.status(404).type('text/plain').send('// POWER SCALE: instalação não encontrada');
  const template=fs.readFileSync(appScriptTemplatePath,'utf8');
  res.set('Cache-Control','no-store'); res.type('application/javascript; charset=utf-8').send(template.replaceAll('{{USER_UUID}}',req.params.uuid));
}catch(e){next(e)}});
router.get('/google-ads/appscript/config/:uuid',async(req,res,next)=>{try{
  const member=await workspaceForUserUuid(req.params.uuid); if(!member)return res.status(404).json({message:'Instalação não encontrada'});
  const customerId=String(req.query.customer_id||'').replace(/\D/g,''); if(!customerId)return res.status(400).json({message:'customer_id é obrigatório'});
  const {count,error}=await admin.from('google_ads_import_rows').select('*',{count:'exact',head:true}).eq('workspace_id',member.workspace_id).eq('account_external_id',customerId); if(error)throw error;
  const first=!count; res.json({days_back:first?730:7,is_first_import:first,customer_id:customerId});
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
  const accounts=new Map(), campaigns=new Map();
  for(const row of rows){const aid=row?.account?.id?String(row.account.id).replace(/\D/g,''):'';if(aid&&!accounts.has(aid))accounts.set(aid,row.account||{});const cid=row?.campaign?.id?String(row.campaign.id):'';if(aid&&cid&&!campaigns.has(cid))campaigns.set(cid,{accountExternalId:aid,...(row.campaign||{})});}
  const accountDb=new Map();
  for(const [externalId,a] of accounts){const {data,error}=await admin.from('google_ads_accounts').upsert({workspace_id:member.workspace_id,external_id:externalId,name:a.name||null,currency_code:a.currency||a.currency_code||null,source:'appscript',status:'active',sync_enabled:true,payload:a},{onConflict:'workspace_id,external_id'}).select('id,external_id').single();if(error)throw error;accountDb.set(externalId,data.id);}
  for(const [externalId,c] of campaigns){const accountId=accountDb.get(c.accountExternalId);if(!accountId)continue;const {error}=await admin.from('google_ads_campaigns').upsert({workspace_id:member.workspace_id,account_id:accountId,external_id:externalId,name:c.name||('Campanha '+externalId),status:c.status||null,advertising_channel_type:c.channel_type||c.advertising_channel_type||null,payload:c},{onConflict:'workspace_id,external_id'});if(error)throw error;}
  const inserts=rows.map(row=>({workspace_id:member.workspace_id,user_id:member.user_id,account_external_id:row?.account?.id?String(row.account.id).replace(/\D/g,''):null,campaign_external_id:row?.campaign?.id?String(row.campaign.id):null,segment_type:String(row?.segment||'unknown'),segment_date:row?.date||null,payload:row,imported_at:row?.imported_at||req.body?.imported_at||new Date().toISOString()}));
  const {error:rawError}=await admin.from('google_ads_import_rows').insert(inserts);if(rawError)throw rawError;
  res.json({ok:true,received:rows.length,accounts:accounts.size,campaigns:campaigns.size});
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
A.post('/google-ads/accounts',async(req,res,next)=>{try{const {start_date,end_date}=req.body;const accounts=await one(admin.from('google_ads_accounts').select('*').eq('workspace_id',req.workspaceId).eq('sync_enabled',true));for(const a of accounts){const camps=await one(admin.from('google_ads_campaigns').select('*').eq('account_id',a.id));a.campaigns=camps}res.json({data:accounts,start_date,end_date})}catch(e){next(e)}});
A.patch('/google-ads/accounts/:id/status',fieldUpdate('google_ads_accounts','status'));
A.patch('/google-ads/synced-accounts/:id/toggle',async(req,res,next)=>{try{const row=await one(admin.from('google_ads_accounts').select('sync_enabled').eq('workspace_id',req.workspaceId).eq('id',req.params.id).single());const data=await one(admin.from('google_ads_accounts').update({sync_enabled:!row.sync_enabled}).eq('id',req.params.id).select().single());res.json(data)}catch(e){next(e)}});
A.post('/google-ads/campaigns/:id/link-tracker',async(req,res,next)=>{try{const data=await one(admin.from('google_ads_campaigns').update({tracker_id:req.body.tracker_id}).eq('workspace_id',req.workspaceId).eq('id',req.params.id).select().single());res.json(data)}catch(e){next(e)}});
A.delete('/google-ads/campaigns/:id/link-tracker',async(req,res,next)=>{try{const data=await one(admin.from('google_ads_campaigns').update({tracker_id:null}).eq('workspace_id',req.workspaceId).eq('id',req.params.id).select().single());res.json(data)}catch(e){next(e)}});
A.patch('/google-ads/campaigns/:id/validation-status',fieldUpdate('google_ads_campaigns','validation_status'));
A.post('/google-ads/campaigns/:id/daily-metrics',async(req,res,next)=>{try{let q=admin.from('google_ads_daily_metrics').select('*').eq('workspace_id',req.workspaceId).eq('campaign_id',req.params.id);if(req.body.start_date)q=q.gte('metric_date',req.body.start_date);if(req.body.end_date)q=q.lte('metric_date',req.body.end_date);res.json({data:await one(q.order('metric_date'))})}catch(e){next(e)}});
A.post('/google-ads/segments',async(req,res,next)=>{try{let q=admin.from('google_ads_segments').select('*').eq('workspace_id',req.workspaceId);if(req.body.google_ads_campaign_id)q=q.eq('campaign_id',req.body.google_ads_campaign_id);if(req.body.start_date)q=q.gte('segment_date',req.body.start_date);if(req.body.end_date)q=q.lte('segment_date',req.body.end_date);const rows=await one(q);const out={};for(const type of req.body.segment_types||[]){out[type]=rows.filter(x=>x.segment_type===type)}res.json({data:out})}catch(e){next(e)}});
A.post('/google-ads/metrics/funnel',async(req,res,next)=>{try{res.json({data:{view_type:req.body.view_type||'sf_funnels',steps:[]}})}catch(e){next(e)}});
A.get('/google-ads/kanban-rules',list('google_ads_kanban_rules')); A.post('/google-ads/kanban-rules',create('google_ads_kanban_rules'));
A.get('/google-ads/integrations',list('google_ads_integrations'));
A.get('/google-ads/report-daily',async(req,res,next)=>{try{let q=admin.from('google_ads_daily_metrics').select('*').eq('workspace_id',req.workspaceId).eq('campaign_id',req.query.campaign_id);if(req.query.start_date)q=q.gte('metric_date',req.query.start_date);if(req.query.end_date)q=q.lte('metric_date',req.query.end_date);res.json({data:await one(q.order('metric_date'))})}catch(e){next(e)}});
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
