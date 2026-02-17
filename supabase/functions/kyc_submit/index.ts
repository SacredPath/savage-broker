import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleOptions, json } from "../_shared/cors.ts";
import { getUserOr401, loadProfile } from "../_shared/auth.ts";

serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    // Auth required
    const authResult = await getUserOr401(req);
    if (authResult instanceof Response) return authResult;
    
    const { user, supabase } = authResult;
    
    // Load profile
    const profileResult = await loadProfile(req, supabase, user.id);
    if (profileResult.missing) {
      return json({ 
        ok: false, 
        error: "PROFILE_NOT_FOUND",
        user_id: user.id
      }, 200, req);
    }
    
    const { missing, ...profile } = profileResult;

    // Get submission data
    const body = await req.json();
    const { firstName, lastName, dateOfBirth, nationality, documents } = body;

    // Update profile with KYC data
    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth,
        nationality: nationality,
        kyc_status: 'pending',
        kyc_submitted_at: new Date().toISOString(),
        kyc_documents: documents
      })
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error('KYC submission update error:', updateError);
      return json({ 
        ok: false, 
        error: "SUBMISSION_FAILED",
        detail: updateError.message 
      }, 500, req);
    }

    return json({ 
      ok: true,
      status: 'pending',
      message: "KYC submitted successfully",
      profile: updatedProfile
    }, 200, req);

  } catch (error) {
    console.error('KYC submission error:', error);
    return json({ok:false,error:"SERVER_ERROR",detail:String(error)}, 500, req);
  }
});
