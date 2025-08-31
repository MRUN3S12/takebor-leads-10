import { CheckCircle } from "lucide-react";
import manufacturingImage from "@/assets/manufacturing.jpg";

const About = () => {
  const features = [
    "Entrega para todo Brasil",
    "Desenvolvimento sob demanda", 
    "Atendimento humano especializado",
    "Portfólio técnico completo"
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-primary">
              Sobre a <span className="text-industrial-red">Take Bor</span>
            </h2>
            
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              A Take Bor é uma empresa técnica especializada em soluções 
              inovadoras para construção civil e autopeças. Nossa expertise 
              em desenvolvimento de peças sob medida nos posiciona como 
              referência no mercado, sempre priorizando qualidade e 
              atendimento personalizado.
            </p>
            
            <div className="space-y-4 mb-8">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <span className="text-lg font-medium text-foreground">{feature}</span>
                </div>
              ))}
            </div>
            
            <div className="bg-card p-6 rounded-lg border shadow-lg">
              <h3 className="font-bold text-xl mb-2 text-industrial-blue">Nossa Missão</h3>
              <p className="text-muted-foreground">
                Ser a empresa de referência em peças técnicas, oferecendo 
                soluções personalizadas que atendam às necessidades específicas 
                de cada cliente com excelência e inovação.
              </p>
            </div>
          </div>
          
          <div className="relative">
            <img 
              src={manufacturingImage} 
              alt="Instalações da Take Bor" 
              className="w-full h-[500px] object-cover rounded-lg shadow-xl"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent rounded-lg" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;