import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateUserRequest {
  email: string
  password: string
  full_name: string
  phone?: string
  role: 'super_admin' | 'client'
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Sem autorização')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      throw new Error('Usuário não autenticado')
    }

    // Check if user is super_admin
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .single()

    if (roleError || !userRole) {
      throw new Error('Acesso negado. Apenas super administradores podem criar usuários.')
    }

    // Get request data
    const { email, password, full_name, phone, role }: CreateUserRequest = await req.json()

    console.log('Creating user:', { email, full_name, phone, role })

    // Create the new user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    })

    if (createError) {
      console.error('Error creating user:', createError)
      throw new Error(`Erro ao criar usuário: ${createError.message}`)
    }

    console.log('User created:', newUser.user.id)

    // Update profile with phone if provided
    if (phone) {
      const { error: profileUpdateError } = await supabaseAdmin
        .from('profiles')
        .update({ phone })
        .eq('id', newUser.user.id)

      if (profileUpdateError) {
        console.error('Error updating profile with phone:', profileUpdateError)
      }
    }

    // Insert role
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: role
      })

    if (roleInsertError) {
      console.error('Error inserting role:', roleInsertError)
      // Try to delete the user if role insertion fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      throw new Error(`Erro ao atribuir role: ${roleInsertError.message}`)
    }

    console.log('Role assigned successfully')

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          full_name
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Error in create-user function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Erro desconhecido'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})