import { Card } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export default function AssessmentConfirmation() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="p-12 max-w-lg text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-green-100 p-6">
            <CheckCircle className="w-20 h-20 text-green-600" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold mb-4 text-foreground">
          Foi registrado suas respostas, muito obrigado!
        </h1>
        
        <p className="text-muted-foreground text-lg mb-4">
          Sua avaliação DISC foi concluída com sucesso.
        </p>
        
        <p className="text-muted-foreground">
          O responsável pela avaliação terá acesso aos seus resultados em breve e entrará em contato quando necessário.
        </p>
        
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Você pode fechar esta janela.
          </p>
        </div>
      </Card>
    </div>
  );
}