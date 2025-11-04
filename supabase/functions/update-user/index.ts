import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UpdateUserRequest {
  user_id: string
  full_name?: string
  email?: string
  phone?: string
  password?: string
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
          persistSession: false,
        },
      }
    )

    // Get the user from the request
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      console.error('Authentication error:', userError)
      throw new Error('Não autorizado')
    }

    console.log('Authenticated user:', user.id)

    // Check if the user has super_admin role
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .single()

    if (roleError || !userRole) {
      console.error('Role check failed:', roleError)
      throw new Error('Acesso negado. Apenas super administradores podem editar usuários.')
    }

    console.log('User has super_admin role')

    // Get the request body
    const requestData: UpdateUserRequest = await req.json()
    const { user_id, full_name, email, phone, password } = requestData

    if (!user_id) {
      throw new Error('ID do usuário é obrigatório')
    }

    console.log('Updating user:', user_id)

    // Check if the user to be updated exists
    const { data: existingUser, error: existingUserError } = await supabaseAdmin.auth.admin.getUserById(user_id)
    
    if (existingUserError || !existingUser) {
      console.error('User not found:', existingUserError)
      throw new Error('Usuário não encontrado')
    }

    // If email is being changed, check if it's not already in use
    if (email && email !== existingUser.user.email) {
      const { data: emailCheck } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .neq('id', user_id)
        .single()

      if (emailCheck) {
        throw new Error('Este email já está em uso')
      }
    }

    // Update auth.users if email or password changed
    if (email || password) {
      const updateData: any = {}
      if (email) updateData.email = email
      if (password) updateData.password = password

      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        user_id,
        updateData
      )

      if (authUpdateError) {
        console.error('Auth update error:', authUpdateError)
        throw new Error(`Erro ao atualizar autenticação: ${authUpdateError.message}`)
      }

      console.log('Auth data updated successfully')
    }

    // Update profiles table
    const profileUpdate: any = {}
    if (full_name !== undefined) profileUpdate.full_name = full_name
    if (email !== undefined) profileUpdate.email = email
    if (phone !== undefined) profileUpdate.phone = phone

    if (Object.keys(profileUpdate).length > 0) {
      const { error: profileUpdateError } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdate)
        .eq('id', user_id)

      if (profileUpdateError) {
        console.error('Profile update error:', profileUpdateError)
        throw new Error(`Erro ao atualizar perfil: ${profileUpdateError.message}`)
      }

      console.log('Profile updated successfully')
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Usuário atualizado com sucesso',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Error in update-user function:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Erro ao atualizar usuário',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})