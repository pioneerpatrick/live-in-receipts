import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Sanitize error messages to prevent information leakage
function sanitizeError(error: any): string {
  console.error('Detailed error:', {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    timestamp: new Date().toISOString()
  });
  
  return 'An error occurred while processing your request. Please try again or contact support.';
}

async function sendDeletionNotificationEmail(
  supabaseAdmin: any,
  deletedUserEmail: string,
  deletedUserName: string,
  deletedByName: string
) {
  const deletedAt = new Date().toLocaleString('en-KE', { 
    dateStyle: 'full', 
    timeStyle: 'short',
    timeZone: 'Africa/Nairobi'
  });

  try {
    // Send email to the deleted user
    await supabaseAdmin.functions.invoke('send-email', {
      body: {
        type: 'user_deleted',
        recipient: deletedUserEmail,
        data: {
          deletedUserName,
          deletedUserEmail,
          deletedByName,
          deletedAt,
          isAdminNotification: false
        }
      }
    });
    console.log('Deletion notification sent to user:', deletedUserEmail);

    // Send admin notification
    await supabaseAdmin.functions.invoke('send-email', {
      body: {
        type: 'user_deleted',
        data: {
          deletedUserName,
          deletedUserEmail,
          deletedByName,
          deletedAt,
          isAdminNotification: true
        }
      }
    });
    console.log('Admin notification sent for user deletion');
  } catch (emailError) {
    console.error('Error sending deletion notification emails:', emailError);
    // Don't throw - deletion was successful, email is supplementary
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get the authorization header to verify the requesting user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('No authorization header provided');
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create a client with the user's token to verify their identity
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user: requestingUser } } = await supabaseClient.auth.getUser()
    if (!requestingUser) {
      console.log('Could not get user from token');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Requesting user ID:', requestingUser.id);

    // Check if requesting user is admin using user_roles table
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .maybeSingle()

    if (roleError) {
      console.error('Error fetching role:', roleError);
    }

    console.log('User role data:', roleData);

    const isAdmin = roleData?.role === 'admin'

    if (!isAdmin) {
      console.log('User is not an admin, access denied');
      return new Response(JSON.stringify({ error: 'Only admins can delete users' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { userId } = await req.json()
    
    console.log('Attempting to delete user ID:', userId);

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Prevent user from deleting themselves
    if (userId === requestingUser.id) {
      return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get the target user's info before deletion for email notification
    const { data: targetUserAuth } = await supabaseAdmin.auth.admin.getUserById(userId)
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('user_id', userId)
      .maybeSingle()
    
    // Get requesting user's profile name
    const { data: requestingProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('user_id', requestingUser.id)
      .maybeSingle()

    const deletedUserEmail = targetUserAuth?.user?.email || 'unknown';
    const deletedUserName = targetProfile?.full_name || targetUserAuth?.user?.email || 'Unknown User';
    const deletedByName = requestingProfile?.full_name || requestingUser.email || 'Admin';

    // First delete the user's role from user_roles table
    const { error: roleDeleteError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId)

    if (roleDeleteError) {
      console.error('Error deleting user role:', roleDeleteError);
      // Continue anyway, as we still want to try deleting the user
    }

    // Delete user's profile from profiles table
    const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('user_id', userId)

    if (profileDeleteError) {
      console.error('Error deleting profile:', profileDeleteError);
      // Continue anyway
    }

    // Delete user from auth
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) {
      console.error('Error deleting user from auth:', error);
      const clientMessage = sanitizeError(error);
      return new Response(JSON.stringify({ error: clientMessage }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('User deleted successfully:', userId);

    // Send deletion notification emails (non-blocking)
    await sendDeletionNotificationEmail(
      supabaseAdmin,
      deletedUserEmail,
      deletedUserName,
      deletedByName
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Unexpected error:', error);
    const clientMessage = sanitizeError(error);
    return new Response(JSON.stringify({ error: clientMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
