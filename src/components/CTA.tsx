import { Button } from "@/components/ui/button";
import { MessageCircle, Phone } from "lucide-react";

const CTA = () => {
  const handleWhatsAppClick = () => {
    const message = "Olá! Preciso de uma peça técnica personalizada. Gostaria de falar com a equipe da Take Bor.";
    const whatsappUrl = `https://wa.me/5511999999999?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <section className="py-20 bg-gradient-to-r from-industrial-blue via-primary to-technical-gray">
      <div className="container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto text-white">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Precisa de uma <span className="text-industrial-red">peça técnica</span>?
          </h2>
          
          <p className="text-xl md:text-2xl mb-8 text-gray-200 max-w-3xl mx-auto">
            Fale agora mesmo com a Take Bor e descubra como podemos 
            desenvolver a solução perfeita para sua necessidade.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
            <Button 
              size="xl" 
              variant="whatsapp"
              onClick={handleWhatsAppClick}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
            >
              <MessageCircle className="w-6 h-6" />
              Atendimento via WhatsApp
            </Button>
            
            <Button 
              size="xl" 
              variant="cta"
              onClick={handleWhatsAppClick}
              className="w-full sm:w-auto bg-white text-industrial-blue hover:bg-gray-100"
            >
              <Phone className="w-6 h-6" />
              Solicitar orçamento
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="font-bold text-lg mb-2">Resposta Rápida</h3>
              <p className="text-sm text-gray-200">
                Retornamos seu contato em até 24 horas com proposta técnica
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="font-bold text-lg mb-2">Desenvolvimento Personalizado</h3>
              <p className="text-sm text-gray-200">
                Criamos peças sob medida para sua aplicação específica
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="font-bold text-lg mb-2">Entrega Nacional</h3>
              <p className="text-sm text-gray-200">
                Enviamos para todo o Brasil com garantia de qualidade
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;