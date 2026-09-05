import { admin } from '../config/supabase.js';
export async function auth(req,res,next){
  try{
    const h=req.headers.authorization||''; if(!h.startsWith('Bearer ')) return res.status(401).json({message:'Unauthorized'});
    const token=h.slice(7); const {data:{user},error}=await admin.auth.getUser(token);
    if(error||!user) return res.status(401).json({message:'Invalid token'});
    req.user=user; req.token=token;
    const {data:member,error:me}=await admin.from('workspace_members').select('workspace_id,role').eq('user_id',user.id).eq('active',true).limit(1).maybeSingle();
    if(me) throw me; if(!member) return res.status(403).json({message:'No active workspace'});
    req.workspaceId=member.workspace_id; req.workspaceRole=member.role; next();
  }catch(e){next(e)}
}
