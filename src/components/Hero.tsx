import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import heroImage from "@/assets/hero-industrial.jpg";

const Hero = () => {
  const handleWhatsAppClick = () => {
    const message = "Olá! Gostaria de receber o catálogo de peças técnicas da Take Bor.";
    const whatsappUrl = `https://wa.me/5511999999999?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroImage} 
          alt="Industrial manufacturing" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-industrial-blue/70" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center text-white">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Soluções sob medida em{" "}
            <span className="text-industrial-red">peças técnicas</span>{" "}
            para construção e autopeças
          </h1>
          
          <p className="text-xl md:text-2xl mb-8 text-gray-200 max-w-3xl mx-auto">
            Especializada em peças de borracha e plástico. 
            <strong className="text-white"> Se não existe, a Take Bor desenvolve pra você.</strong>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="xl" 
              variant="whatsapp"
              onClick={handleWhatsAppClick}
              className="w-full sm:w-auto"
            >
              <MessageCircle className="w-6 h-6" />
              Receba o catálogo no WhatsApp
            </Button>
            
            <Button 
              size="xl" 
              variant="cta"
              onClick={handleWhatsAppClick}
              className="w-full sm:w-auto"
            >
              Orçamento personalizado
            </Button>
          </div>
          
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-industrial-red">100+</div>
              <div className="text-sm text-gray-300">Empresas atendidas</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-industrial-red">Todo</div>
              <div className="text-sm text-gray-300">Brasil</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-industrial-red">25%</div>
              <div className="text-sm text-gray-300">Margem técnica</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-industrial-red">Sob</div>
              <div className="text-sm text-gray-300">Medida</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;