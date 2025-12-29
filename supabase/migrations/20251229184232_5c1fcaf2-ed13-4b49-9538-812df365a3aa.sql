-- =============================================
-- ETAPA 1: Criar Tabela de User Roles (se não existir)
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- ETAPA 2: Função has_role (Security Definer)
-- =============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- =============================================
-- ETAPA 3: Políticas RLS para user_roles
-- =============================================
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;

CREATE POLICY "Users can view own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all roles"
  ON public.user_roles
  FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

-- =============================================
-- ETAPA 4: Criar Tabela de Profiles
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Super admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage all profiles"
  ON public.profiles
  FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

-- =============================================
-- ETAPA 5: Criar Tabela de Campaigns
-- =============================================
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para campaigns
DROP POLICY IF EXISTS "Users can view own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can create own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can update own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can delete own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Super admins can manage all campaigns" ON public.campaigns;

CREATE POLICY "Users can view own campaigns"
  ON public.campaigns
  FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create own campaigns"
  ON public.campaigns
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own campaigns"
  ON public.campaigns
  FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own campaigns"
  ON public.campaigns
  FOR DELETE
  USING (auth.uid() = created_by);

CREATE POLICY "Super admins can manage all campaigns"
  ON public.campaigns
  FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

-- =============================================
-- ETAPA 6: Criar Tabela de Assessments
-- =============================================
CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  candidate_name TEXT NOT NULL,
  candidate_email TEXT NOT NULL,
  candidate_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para assessments
DROP POLICY IF EXISTS "Public can view assessments by ID" ON public.assessments;
DROP POLICY IF EXISTS "Public can update assessment progress" ON public.assessments;
DROP POLICY IF EXISTS "Campaign owners can manage assessments" ON public.assessments;
DROP POLICY IF EXISTS "Super admins can manage all assessments" ON public.assessments;

CREATE POLICY "Public can view assessments by ID"
  ON public.assessments
  FOR SELECT
  USING (true);

CREATE POLICY "Public can update assessment progress"
  ON public.assessments
  FOR UPDATE
  USING (true)
  WITH CHECK (status IN ('pending', 'in_progress', 'completed'));

CREATE POLICY "Campaign owners can manage assessments"
  ON public.assessments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = assessments.campaign_id
        AND campaigns.created_by = auth.uid()
    )
  );

CREATE POLICY "Super admins can manage all assessments"
  ON public.assessments
  FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

-- =============================================
-- ETAPA 7: Criar Tabela de Responses
-- =============================================
CREATE TABLE IF NOT EXISTS public.responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE NOT NULL,
  question_index INTEGER NOT NULL,
  most_choice TEXT NOT NULL,
  least_choice TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para responses
DROP POLICY IF EXISTS "Public can insert responses" ON public.responses;
DROP POLICY IF EXISTS "Public can view responses" ON public.responses;
DROP POLICY IF EXISTS "Campaign owners can view responses" ON public.responses;
DROP POLICY IF EXISTS "Super admins can manage all responses" ON public.responses;

CREATE POLICY "Public can insert responses"
  ON public.responses
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can view responses"
  ON public.responses
  FOR SELECT
  USING (true);

CREATE POLICY "Campaign owners can view responses"
  ON public.responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      JOIN public.campaigns c ON c.id = a.campaign_id
      WHERE a.id = responses.assessment_id
        AND c.created_by = auth.uid()
    )
  );

CREATE POLICY "Super admins can manage all responses"
  ON public.responses
  FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

-- =============================================
-- ETAPA 8: Criar Tabela de Results
-- =============================================
CREATE TABLE IF NOT EXISTS public.results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE NOT NULL UNIQUE,
  d_score INTEGER NOT NULL DEFAULT 0,
  i_score INTEGER NOT NULL DEFAULT 0,
  s_score INTEGER NOT NULL DEFAULT 0,
  c_score INTEGER NOT NULL DEFAULT 0,
  d_intensity INTEGER NOT NULL DEFAULT 0,
  i_intensity INTEGER NOT NULL DEFAULT 0,
  s_intensity INTEGER NOT NULL DEFAULT 0,
  c_intensity INTEGER NOT NULL DEFAULT 0,
  primary_profile TEXT,
  secondary_profile TEXT,
  profile_pattern TEXT,
  pdf_url TEXT,
  chart_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para results
DROP POLICY IF EXISTS "Public can view results" ON public.results;
DROP POLICY IF EXISTS "Public can insert results" ON public.results;
DROP POLICY IF EXISTS "Public can update results" ON public.results;
DROP POLICY IF EXISTS "Campaign owners can view results" ON public.results;
DROP POLICY IF EXISTS "Super admins can manage all results" ON public.results;

CREATE POLICY "Public can view results"
  ON public.results
  FOR SELECT
  USING (true);

CREATE POLICY "Public can insert results"
  ON public.results
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update results"
  ON public.results
  FOR UPDATE
  USING (true);

CREATE POLICY "Campaign owners can view results"
  ON public.results
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      JOIN public.campaigns c ON c.id = a.campaign_id
      WHERE a.id = results.assessment_id
        AND c.created_by = auth.uid()
    )
  );

CREATE POLICY "Super admins can manage all results"
  ON public.results
  FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

-- =============================================
-- ETAPA 9: Função para atualizar updated_at
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at (drop first to avoid duplicates)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON public.campaigns;
DROP TRIGGER IF EXISTS update_assessments_updated_at ON public.assessments;
DROP TRIGGER IF EXISTS update_results_updated_at ON public.results;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_results_updated_at
  BEFORE UPDATE ON public.results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ETAPA 10: Trigger para criar profile automaticamente
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();