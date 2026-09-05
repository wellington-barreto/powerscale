import { admin } from '../config/supabase.js';
export const ws=(table,workspaceId)=>admin.from(table).select('*').eq('workspace_id',workspaceId);
export function ok(res,data,extra={}){return res.json({data,...extra})}
