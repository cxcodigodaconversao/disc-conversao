-- Adicionar campo de telefone na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Adicionar comentário descritivo
COMMENT ON COLUMN public.profiles.phone IS 'Número de telefone do usuário/empresa';

-- Permitir que super_admins atualizem qualquer perfil
CREATE POLICY "Super admins can update all profiles" ON public.profiles
FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Permitir que users atualizem seu próprio perfil (incluindo telefone)
CREATE POLICY "Users can update own profile details" ON public.profiles
FOR UPDATE USING (
  auth.uid() = id
)
WITH CHECK (
  auth.uid() = id
);