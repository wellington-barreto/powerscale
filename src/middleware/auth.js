import { admin } from '../config/supabase.js';

function safeSlug(value='workspace') {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40) || 'workspace';
}

export async function ensureUserWorkspace(user) {
  let { data: member, error } = await admin
    .from('workspace_members')
    .select('workspace_id,role')
    .eq('user_id', user.id)
    .eq('active', true)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (member) return member;

  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário';
  const base = safeSlug(displayName);
  const slug = `${base}-${user.id.slice(0,8)}`;

  const { data: workspace, error: we } = await admin
    .from('workspaces')
    .insert({ name: `${displayName} - POWER SCALE`, slug })
    .select('id')
    .single();
  if (we) throw we;

  const { data: createdMember, error: me } = await admin
    .from('workspace_members')
    .insert({ workspace_id: workspace.id, user_id: user.id, role: 'owner', active: true })
    .select('workspace_id,role')
    .single();
  if (me) throw me;

  const { error: pe } = await admin.from('profiles').upsert({
    user_id: user.id,
    name: displayName,
    role: 'admin',
    preferences: { onboarding_completed: false }
  });
  if (pe) throw pe;

  return createdMember;
}

export async function auth(req,res,next){
  try{
    const h=req.headers.authorization||'';
    if(!h.startsWith('Bearer ')) return res.status(401).json({message:'Unauthorized'});
    const token=h.slice(7);
    const {data:{user},error}=await admin.auth.getUser(token);
    if(error||!user) return res.status(401).json({message:'Invalid token'});
    req.user=user;
    req.token=token;

    const member = await ensureUserWorkspace(user);
    req.workspaceId=member.workspace_id;
    req.workspaceRole=member.role;
    next();
  }catch(e){next(e)}
}
