import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Get auth header helper
export function getAuthHeader(req: Request): string | null {
  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!authHeader) {
    return null;
  }
  
  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }
  
  return authHeader;
}

// Load profile function for KYC and other functions
export async function loadProfile(req: Request, supabase: any, userId: string) {
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (error) {
      console.error('Profile query error:', error);
      return { 
        user_id: userId, 
        role: "user", 
        created_at: new Date().toISOString(), 
        missing: true,
        db_error: error.message 
      };
    }
    
    if (!profile) {
      console.log('Profile not found for user:', userId);
      return { 
        user_id: userId, 
        role: "user", 
        created_at: new Date().toISOString(), 
        missing: true 
      };
    }
    
    return { ...profile, missing: false };
  } catch (error: any) {
    console.error('Profile loading error:', error);
    return { 
      user_id: userId, 
      role: "user", 
      created_at: new Date().toISOString(), 
      missing: true,
      db_error: error.message 
    };
  }
}

// Get user or return 401 response
export async function getUserOr401(req: Request) {
  // Get environment variables safely inside function
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ ok: false, error: "SERVER_MISCONFIG", detail: "Missing database configuration" }, 500, req);
  }
  
  // Extract Authorization header
  const authHeader = getAuthHeader(req);
  
  console.log('Edge Function: Auth header received:', authHeader ? authHeader.substring(0, 30) + '...' : 'None');
  
  if (!authHeader) {
    console.log('Edge Function: No auth header found');
    return json({ ok: false, error: "UNAUTHENTICATED", detail: "Missing or invalid Authorization header" }, 401, req);
  }
  
  // Validate Bearer format
  if (!authHeader.startsWith('Bearer ')) {
    console.log('Edge Function: Invalid auth header format, expected "Bearer <token>"');
    return json({ ok: false, error: "INVALID_JWT_FORMAT", detail: "Authorization header must be in format 'Bearer <token>'" }, 401, req);
  }
  
  const token = authHeader.substring(7); // Remove "Bearer "
  console.log('Edge Function: JWT token extracted:', token.substring(0, 20) + '...');
  console.log('Edge Function: JWT token length:', token.length);
  
  // Create admin client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    global: {
      headers: {
        'Authorization': authHeader
      }
    }
  });
  
  try {
    // Verify user token - this is the only source of truth
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return json({ ok: false, error: "UNAUTHENTICATED", detail: "Invalid or expired token" }, 401, req);
    }
    
    return { user, supabase };
  } catch (error) {
    return json({ ok: false, error: "SERVER_ERROR", detail: String(error) }, 500, req);
  }
}

// Helper function for JSON responses
function json(data: any, status: number, req: Request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

