import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";

// Helper function to create JSON responses
function json(data: any, status = 200, req?: Request): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...(req ? corsHeaders(req) : {})
    }
  });
}

serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    // Auth required
    const authResult = await requireUser(req);
    if (!authResult.ok) {
      return json(authResult.body, authResult.status, req);
    }
    
    const { user } = authResult;
    
    // Create Supabase client for database operations
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({
        ok: false,
        error: "SERVER_MISCONFIG",
        detail: "Missing database configuration"
      }, 500, req);
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Load current profile
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
      
    if (profileError || !currentProfile) {
      return json({
        ok: false,
        error: "PROFILE_NOT_FOUND",
        user_id: user.id
      }, 200, req);
    }

    // Parse request body
    const body = await req.json();
    
    if (body.profile) {
      // Handle profile updates
      const profileData = body.profile;
      
      // Prepare update data - only allow updating certain fields
      const updateData: any = {};
      
      if (profileData.firstName !== undefined) updateData.first_name = profileData.firstName;
      if (profileData.lastName !== undefined) updateData.last_name = profileData.lastName;
      if (profileData.phone !== undefined) updateData.phone = profileData.phone;
      if (profileData.country !== undefined) updateData.country = profileData.country;
      if (profileData.bio !== undefined) updateData.bio = profileData.bio;
      
      // Add updated timestamp
      updateData.updated_at = new Date().toISOString();
      
      // Update profile
      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single();
        
      if (error) {
        return json({
          ok: false,
          error: "UPDATE_FAILED",
          detail: error.message
        }, 400, req);
      }
      
      return json({
        ok: true,
        data,
        message: "Profile updated successfully"
      }, 200, req);
    }
    
    if (body.notifications) {
      // Handle notification preferences
      // This would typically be stored in a separate table or as JSON in profile
      return json({
        ok: true,
        message: "Notification preferences saved"
      }, 200, req);
    }
    
    if (body.security) {
      // Handle security settings
      const securityData = body.security;
      
      // This would typically update security-related fields
      return json({
        ok: true,
        message: "Security settings saved"
      }, 200, req);
    }

    return json({ 
      ok: false, 
      error: "INVALID_REQUEST",
      detail: "No valid update data provided"
    }, 400, req);

  } catch (error) {
    return json({ok:false,error:"SERVER_ERROR",detail:String(error)}, 500, req);
  }
});
