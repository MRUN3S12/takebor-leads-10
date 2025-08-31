import { Card, CardContent } from "@/components/ui/card";
import { Target, Users, Award, Zap } from "lucide-react";

const WhyChoose = () => {
  const differentials = [
    {
      icon: Target,
      title: "Produção Sob Medida",
      description: "Desenvolvemos peças técnicas específicas para sua necessidade, garantindo encaixe perfeito e funcionalidade ideal."
    },
    {
      icon: Users,
      title: "Atendimento Direto",
      description: "Comunicação direta com nossa equipe técnica, sem intermediários. Entendemos sua demanda e oferecemos a melhor solução."
    },
    {
      icon: Award,
      title: "Qualidade Comprovada",
      description: "Processos rigorosos de controle de qualidade garantem que cada peça atenda aos mais altos padrões técnicos."
    },
    {
      icon: Zap,
      title: "Flexibilidade Total",
      description: "Adaptamos nossa produção ao seu cronograma e especificações, oferecendo soluções ágeis para demandas urgentes."
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary">
            Por que escolher a <span className="text-industrial-red">Take Bor</span>?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Nossa experiência e compromisso com a excelência técnica nos torna 
            a escolha ideal para suas necessidades em peças especializadas.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {differentials.map((item, index) => (
            <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-b from-card to-card/80">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-industrial-blue to-industrial-red rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <item.icon className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="font-bold text-xl mb-4 text-primary group-hover:text-industrial-red transition-colors">
                  {item.title}
                </h3>
                
                <p className="text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Statistics */}
        <div className="mt-16 bg-card rounded-xl p-8 shadow-lg border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="group">
              <div className="text-4xl font-bold text-industrial-red mb-2 group-hover:scale-110 transition-transform">
                100+
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                Empresas Atendidas
              </div>
            </div>
            <div className="group">
              <div className="text-4xl font-bold text-industrial-blue mb-2 group-hover:scale-110 transition-transform">
                25%
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                Margem Técnica
              </div>
            </div>
            <div className="group">
              <div className="text-4xl font-bold text-industrial-red mb-2 group-hover:scale-110 transition-transform">
                Todo
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                Brasil
              </div>
            </div>
            <div className="group">
              <div className="text-4xl font-bold text-industrial-blue mb-2 group-hover:scale-110 transition-transform">
                24h
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                Resposta Técnica
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyChoose;