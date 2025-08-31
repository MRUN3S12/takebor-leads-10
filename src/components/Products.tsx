import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Car, Wrench, Cog } from "lucide-react";
import productsImage from "@/assets/products-technical.jpg";

const Products = () => {
  const productCategories = [
    {
      icon: Building2,
      title: "Construção Civil",
      subtitle: "Esquadrias de Alumínio",
      products: [
        "Borrachas para esquadrias",
        "Vedações técnicas",
        "Perfis de acabamento",
        "Componentes sob medida"
      ]
    },
    {
      icon: Car,
      title: "Autopeças",
      subtitle: "Borrachas Automotivas",
      products: [
        "Borrachas de porta",
        "Canaletas automotivas",
        "Solda plástica",
        "Portas de caminhão"
      ]
    }
  ];

  const additionalServices = [
    {
      icon: Wrench,
      title: "Desenvolvimento",
      description: "Criamos peças técnicas personalizadas conforme sua necessidade"
    },
    {
      icon: Cog,
      title: "Produção Técnica",
      description: "Processos industriais com alta precisão e qualidade"
    }
  ];

  return (
    <section className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary">
            Nossos <span className="text-industrial-red">Produtos</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Soluções técnicas especializadas para construção civil e setor automotivo, 
            com foco em qualidade e desenvolvimento personalizado.
          </p>
        </div>

        {/* Hero Product Image */}
        <div className="mb-16">
          <img 
            src={productsImage} 
            alt="Produtos técnicos Take Bor" 
            className="w-full h-64 md:h-80 object-cover rounded-lg shadow-xl"
          />
        </div>

        {/* Product Categories */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {productCategories.map((category, index) => (
            <Card key={index} className="h-full shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-industrial-blue rounded-lg flex items-center justify-center">
                    <category.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-primary">{category.title}</CardTitle>
                    <p className="text-sm text-muted-foreground font-medium">{category.subtitle}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {category.products.map((product, productIndex) => (
                    <li key={productIndex} className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-industrial-red rounded-full" />
                      <span className="text-foreground">{product}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Services */}
        <div className="grid md:grid-cols-2 gap-8">
          {additionalServices.map((service, index) => (
            <Card key={index} className="bg-card border-industrial-blue/20 shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-industrial-red rounded-lg flex items-center justify-center flex-shrink-0">
                    <service.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2 text-primary">{service.title}</h3>
                    <p className="text-muted-foreground">{service.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Products;