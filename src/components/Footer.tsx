import { MessageCircle, Instagram, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const Footer = () => {
  const handleWhatsAppClick = () => {
    const message = "Olá! Gostaria de mais informações sobre os produtos da Take Bor.";
    const whatsappUrl = `https://wa.me/5511999999999?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <footer className="bg-primary text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-12">
          {/* Company Info */}
          <div>
            <h3 className="text-2xl font-bold mb-4 text-industrial-red">Take Bor</h3>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Especialista em soluções técnicas para construção civil e autopeças. 
              Desenvolvimento personalizado de peças de borracha e plástico.
            </p>
            <div className="flex gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleWhatsAppClick}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <MessageCircle className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="bg-pink-600 hover:bg-pink-700 text-white"
                onClick={() => window.open('https://instagram.com/takebor', '_blank')}
              >
                <Instagram className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Products */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Nossos Produtos</h4>
            <ul className="space-y-2 text-gray-300">
              <li>• Esquadrias de Alumínio</li>
              <li>• Borrachas Automotivas</li>
              <li>• Canaletas e Vedações</li>
              <li>• Solda Plástica</li>
              <li>• Portas de Caminhão</li>
              <li>• Desenvolvimento Sob Medida</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Contato</h4>
            <div className="space-y-4 text-gray-300">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-green-400" />
                <span>WhatsApp: (11) 99999-9999</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-industrial-red" />
                <span>Atendimento em todo Brasil</span>
              </div>
              <Button
                onClick={handleWhatsAppClick}
                variant="whatsapp"
                className="w-full mt-4"
              >
                <MessageCircle className="w-4 h-4" />
                Fale conosco agora
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-600 mt-12 pt-8 text-center">
          <p className="text-gray-300">
            © 2024 Take Bor - Especialista em Peças Técnicas. Todos os direitos reservados.
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Desenvolvemos soluções personalizadas para construção civil e autopeças
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;