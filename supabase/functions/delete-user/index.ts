import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { user_id } = await req.json();

    if (!user_id) {
      throw new Error('user_id é obrigatório');
    }

    console.log('Deletando usuário:', user_id);

    // Delete user from auth.users
    const { error } = await supabase.auth.admin.deleteUser(user_id);

    if (error) {
      console.error('Erro ao deletar usuário:', error);
      throw error;
    }

    console.log('Usuário deletado com sucesso:', user_id);

    return new Response(
      JSON.stringify({ success: true, message: 'Usuário excluído com sucesso' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro na edge function delete-user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
