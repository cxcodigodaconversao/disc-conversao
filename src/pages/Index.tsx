import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BarChart3, Users, FileText, Brain, TrendingUp, Shield } from "lucide-react";
import { Link } from "react-router-dom";
const Index = () => {
  return <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-dark opacity-50" />
        <div className="absolute inset-0 gradient-overlay" />
        
        <nav className="relative z-10 container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-8 h-8 text-primary" />
              <span className="text-2xl font-bold text-primary">DISC da Conversão</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" className="text-foreground hover:text-primary">
                Sobre
              </Button>
              <Button variant="ghost" className="text-foreground hover:text-primary">
                Recursos
              </Button>
              <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                Login
              </Button>
            </div>
          </div>
        </nav>

        <div className="relative z-10 container mx-auto px-6 py-24 md:py-32">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary-hover to-primary">
              Análise Comportamental DISC para Vendas
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
              Construa equipes de vendas de alta performance através de avaliações científicas baseadas em DISC + Valores Motivacionais
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary-hover shadow-gold text-lg px-8 py-6 transition-smooth">
                Começar Avaliação Gratuita
              </Button>
              <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/10 text-lg px-8 py-6 transition-smooth">
                Ver Demonstração
              </Button>
            </div>
          </div>
        </div>

        {/* Floating Stats */}
        <div className="relative z-10 container mx-auto px-6 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[{
            value: "98%",
            label: "Precisão nas Avaliações"
          }, {
            value: "5000+",
            label: "Profissionais Avaliados"
          }, {
            value: "24h",
            label: "Resultados Rápidos"
          }].map((stat, i) => <Card key={i} className="bg-card/80 backdrop-blur-sm border-border p-6 text-center hover:bg-card-hover transition-smooth hover:shadow-gold">
                <div className="text-3xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </Card>)}
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-24 bg-card">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Por que escolher o <span className="text-primary">DISC Pro</span>?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Plataforma completa para identificar, desenvolver e otimizar talentos em vendas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[{
            icon: Brain,
            title: "Análise DISC Completa",
            description: "Avaliação profunda dos perfis comportamentais Natural e Adaptado, com identificação de tensões e potenciais"
          }, {
            icon: BarChart3,
            title: "Valores Motivacionais",
            description: "Compreenda os drivers de motivação: teórico, econômico, estético, social, político e espiritual"
          }, {
            icon: Users,
            title: "Foco em Vendas",
            description: "Insights específicos para performance comercial, abordagem ideal e tipo de cliente adequado"
          }, {
            icon: FileText,
            title: "Relatórios Profissionais",
            description: "PDFs completos com gráficos, competências e recomendações acionáveis para gestores"
          }, {
            icon: TrendingUp,
            title: "16 Competências",
            description: "Mapeamento detalhado de habilidades essenciais para vendas, do estado natural ao adaptado"
          }, {
            icon: Shield,
            title: "Segurança Total",
            description: "Dados protegidos com criptografia, controle de acesso e conformidade com LGPD"
          }].map((feature, i) => <Card key={i} className="bg-background border-border p-8 hover:bg-card-hover transition-smooth hover:shadow-md group">
                <feature.icon className="w-12 h-12 text-primary mb-4 group-hover:scale-110 transition-bounce" />
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </Card>)}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Como <span className="text-primary">Funciona</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Processo simples e científico em 3 etapas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[{
            step: "01",
            title: "Crie sua Campanha",
            description: "Configure uma campanha de avaliação e convide candidatos ou membros da equipe via email"
          }, {
            step: "02",
            title: "Questionários Científicos",
            description: "Candidatos respondem 3 questionários: DISC Natural, DISC Adaptado e Valores Motivacionais"
          }, {
            step: "03",
            title: "Relatórios e Insights",
            description: "Receba análises completas em PDF com perfis, competências e recomendações para vendas"
          }].map((item, i) => <div key={i} className="relative">
                <div className="text-6xl font-bold text-primary/20 mb-4">{item.step}</div>
                <h3 className="text-2xl font-semibold mb-3">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                {i < 2 && <div className="hidden md:block absolute top-12 -right-4 w-8 h-0.5 bg-primary/30" />}
              </div>)}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-card relative overflow-hidden">
        <div className="absolute inset-0 gradient-overlay opacity-50" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Pronto para transformar sua equipe de vendas?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Comece hoje mesmo com uma avaliação gratuita e veja os resultados
            </p>
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary-hover shadow-gold text-lg px-12 py-6 transition-smooth">
              Iniciar Avaliação Gratuita
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Brain className="w-6 h-6 text-primary" />
              <span className="text-lg font-bold text-primary">DISC Pro</span>
            </div>
            <p className="text-muted-foreground text-sm">
              © 2025 DISC Pro. Todos os direitos reservados.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-primary transition-smooth">Termos de Uso</a>
              <a href="#" className="hover:text-primary transition-smooth">Privacidade</a>
              <a href="#" className="hover:text-primary transition-smooth">Contato</a>
            </div>
          </div>
        </div>
      </footer>
    </div>;
};
export default Index;