import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  TrendingUp,
  Shield,
  Zap,
  BarChart3,
  DollarSign,
  Target,
  Users,
  Star,
  CheckCircle,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800/50 backdrop-blur-sm bg-black/20">
        <div className="container mx-auto px-4 py-6 flex justify-center items-center">
          <Image
            src="/assets/sheikbot-logo.png"
            alt="SHEIKBOT"
            width={220}
            height={88}
            className="object-contain"
            style={{ height: "auto" }}
          />
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 via-transparent to-blue-600/10"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-900/20 via-transparent to-transparent"></div>

        <div className="container mx-auto px-4 py-24 text-center relative z-10">
          {/* Social Proof Badge */}
          <div className="inline-flex items-center bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-full px-6 py-2 mb-8 backdrop-blur-sm">
            <Users className="w-4 h-4 text-green-400 mr-2" />
            <span className="text-sm font-medium text-green-300">
              +12.847 traders ativos • 94% de satisfação
            </span>
          </div>

          <h1 className="text-6xl md:text-7xl font-black mb-8 leading-tight">
            <span className="bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
              Transforme
            </span>
            <br />
            <span className="bg-gradient-to-r from-green-400 via-emerald-500 to-green-400 bg-clip-text text-transparent">
              R$ 1.000
            </span>
            <span className="bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
              {" "}
              em{" "}
            </span>
            <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 bg-clip-text text-transparent">
              R$ 10.000
            </span>
          </h1>

          <p className="text-2xl text-gray-300 mb-4 max-w-3xl mx-auto font-light">
            <strong className="text-green-400">IA Avançada</strong> que já gerou
            mais de <strong className="text-yellow-400">R$ 2.3 milhões</strong>
            em lucros para nossos usuários nos últimos 30 dias
          </p>

          <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
            Sistema de trading automatizado com 87% de taxa de acerto •
            Resultados em tempo real • Zero experiência necessária
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 mb-12">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">87%</div>
              <div className="text-sm text-gray-400">Taxa de Acerto</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-400">R$ 2.3M</div>
              <div className="text-sm text-gray-400">Gerados em 30 dias</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400">24/7</div>
              <div className="text-sm text-gray-400">Operação Automática</div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/login"
              className="group relative inline-flex items-center bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-black px-12 py-5 rounded-xl font-bold text-xl transition-all duration-300 transform hover:scale-105 shadow-2xl shadow-green-500/25"
            >
              <DollarSign className="mr-3 h-6 w-6" />
              COMEÇAR A LUCRAR AGORA
              <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </Link>
            <div className="text-center">
              <div className="text-sm text-gray-400">
                ✅ Acesso imediato • ✅ Sem taxas ocultas
              </div>
              <div className="text-xs text-green-400 font-medium mt-1">
                🔥 ÚLTIMAS 48 VAGAS ABERTAS
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="bg-gradient-to-r from-zinc-900/50 to-gray-900/50 py-16 border-y border-zinc-800/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              Resultados <span className="text-green-400">Comprovados</span> em
              Tempo Real
            </h2>
            <p className="text-xl text-gray-300">
              Veja o que nossos usuários estão conquistando HOJE
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 p-8 rounded-2xl border border-green-500/20 backdrop-blur-sm">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-black" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-green-400">
                    +R$ 47.230
                  </div>
                  <div className="text-sm text-gray-400">Últimos 30 dias</div>
                </div>
              </div>
              <div className="text-gray-300">
                <strong>Carlos M.</strong> - São Paulo
                <br />
                "Em 1 mês já recuperei meu investimento e estou lucrando
                consistentemente."
              </div>
              <div className="flex text-yellow-400 mt-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 p-8 rounded-2xl border border-blue-500/20 backdrop-blur-sm">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <Target className="w-6 h-6 text-black" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-blue-400">
                    89% Acerto
                  </div>
                  <div className="text-sm text-gray-400">214 operações</div>
                </div>
              </div>
              <div className="text-gray-300">
                <strong>Ana R.</strong> - Rio de Janeiro
                <br />
                "Nunca imaginei que trading pudesse ser tão simples e
                lucrativo."
              </div>
              <div className="flex text-yellow-400 mt-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 p-8 rounded-2xl border border-purple-500/20 backdrop-blur-sm">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-black" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-purple-400">
                    +340%
                  </div>
                  <div className="text-sm text-gray-400">ROI em 3 meses</div>
                </div>
              </div>
              <div className="text-gray-300">
                <strong>Roberto L.</strong> - Belo Horizonte
                <br />
                "Minha conta cresceu 340% em apenas 3 meses. Inacreditável!"
              </div>
              <div className="flex text-yellow-400 mt-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold mb-6">
            Por que <span className="text-green-400">12.847 traders</span>{" "}
            confiam no SHEIKBOT?
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Tecnologia de ponta que transforma pequenos investimentos em grandes
            fortunas
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="group bg-gradient-to-br from-zinc-900 to-zinc-800 p-8 rounded-2xl border border-zinc-700 hover:border-green-500/50 transition-all duration-300 hover:transform hover:scale-105">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <TrendingUp className="h-8 w-8 text-black" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-green-400">
              IA Preditiva Avançada
            </h3>
            <p className="text-gray-300 mb-4">
              Algoritmos que processam 10.000+ dados por segundo para
              identificar oportunidades de lucro com 87% de precisão.
            </p>
            <div className="text-sm text-green-300 font-medium">
              ✅ Análise de 50+ indicadores simultâneos
            </div>
          </div>

          <div className="group bg-gradient-to-br from-zinc-900 to-zinc-800 p-8 rounded-2xl border border-zinc-700 hover:border-blue-500/50 transition-all duration-300 hover:transform hover:scale-105">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Zap className="h-8 w-8 text-black" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-blue-400">
              Execução Instantânea
            </h3>
            <p className="text-gray-300 mb-4">
              Operações executadas em menos de 0.3 segundos. Capture cada
              oportunidade de lucro antes que ela desapareça.
            </p>
            <div className="text-sm text-blue-300 font-medium">
              ✅ Velocidade 1000x superior ao trading manual
            </div>
          </div>

          <div className="group bg-gradient-to-br from-zinc-900 to-zinc-800 p-8 rounded-2xl border border-zinc-700 hover:border-purple-500/50 transition-all duration-300 hover:transform hover:scale-105">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <BarChart3 className="h-8 w-8 text-black" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-purple-400">
              Dashboard Profissional
            </h3>
            <p className="text-gray-300 mb-4">
              Acompanhe seus lucros crescendo em tempo real. Interface intuitiva
              que até iniciantes dominam em minutos.
            </p>
            <div className="text-sm text-purple-300 font-medium">
              ✅ Relatórios detalhados de performance
            </div>
          </div>

          <div className="group bg-gradient-to-br from-zinc-900 to-zinc-800 p-8 rounded-2xl border border-zinc-700 hover:border-orange-500/50 transition-all duration-300 hover:transform hover:scale-105">
            <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Shield className="h-8 w-8 text-black" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-orange-400">
              Proteção Total do Capital
            </h3>
            <p className="text-gray-300 mb-4">
              Stop-loss inteligente e gestão de risco automatizada. Seu dinheiro
              está protegido 24/7.
            </p>
            <div className="text-sm text-orange-300 font-medium">
              ✅ Risco máximo de 2% por operação
            </div>
          </div>
        </div>
      </section>

      {/* Free Access Section */}
      <section className="relative bg-gradient-to-r from-green-900/20 via-emerald-900/20 to-green-900/20 py-20 border-y border-green-500/20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center bg-green-500/20 border border-green-500/30 rounded-full px-6 py-2 mb-6">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-3"></div>
              <span className="text-green-300 font-bold">
                🎉 ACESSO 100% GRATUITO POR TEMPO LIMITADO
              </span>
            </div>

            <h2 className="text-5xl font-black mb-6">
              <span className="text-white">Você vai receber </span>
              <span className="text-green-400">TUDO DE GRAÇA!</span>
            </h2>

            <p className="text-2xl text-gray-300 mb-8">
              Lucramos <strong className="text-yellow-400">milhões</strong> 
              com nossas operações utilizando o SHEIKBOT, por isso podemos oferecer 
              <strong className="text-green-400"> 100% GRATUITO</strong> para 
              ajudar o máximo de pessoas possível!
            </p>

            <div className="bg-zinc-900/50 rounded-2xl p-8 mb-8 border border-green-500/30">
              <h3 className="text-3xl font-bold mb-4 text-green-400">
                🎁 O que você GANHA de presente:
              </h3>
              <p className="text-lg text-gray-300 mb-6">
                <strong className="text-yellow-400">Nossa missão é democratizar o acesso ao trading!</strong> 
                Já faturamos mais de R$ 15 milhões operando com nosso próprio robô, 
                agora queremos levar essa tecnologia para você - GRÁTIS:
              </p>
              
              <div className="grid md:grid-cols-2 gap-6 text-left">
                <div className="flex items-center">
                  <CheckCircle className="w-6 h-6 text-green-400 mr-3 flex-shrink-0" />
                  <span className="text-gray-300">
                    Sistema SHEIKBOT completo <span className="text-green-400 font-bold">(GRÁTIS)</span>
                  </span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-6 h-6 text-green-400 mr-3 flex-shrink-0" />
                  <span className="text-gray-300">
                    Suporte VIP 24/7 <span className="text-green-400 font-bold">(GRÁTIS)</span>
                  </span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-6 h-6 text-green-400 mr-3 flex-shrink-0" />
                  <span className="text-gray-300">
                    Configuração automática <span className="text-green-400 font-bold">(GRÁTIS)</span>
                  </span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-6 h-6 text-green-400 mr-3 flex-shrink-0" />
                  <span className="text-gray-300">
                    Estratégias exclusivas <span className="text-green-400 font-bold">(GRÁTIS)</span>
                  </span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-green-700/30">
                <div className="text-xl text-gray-300 mb-4">
                  Empresas concorrentes cobram até <span className="text-red-400 font-bold">R$ 5.000+</span> por isso
                </div>
                <div className="text-6xl font-black text-green-400 mb-4">
                  VOCÊ PAGA: R$ 0,00
                </div>
                <div className="text-xl text-yellow-400 font-bold">
                  💎 100% GRATUITO POR TEMPO LIMITADO!
                </div>
                <p className="text-sm text-gray-400 mt-4">
                  Não cobramos porque já lucramos operando com nosso próprio robô. 
                  <br />Agora queremos compartilhar essa tecnologia que nos enriqueceu! 🤝
                </p>
              </div>
            </div>

            {/* Final CTA */}
            <Link
              href="/login"
              className="group relative inline-flex items-center bg-gradient-to-r from-green-500 via-emerald-600 to-green-500 hover:from-green-600 hover:via-emerald-700 hover:to-green-600 text-black px-16 py-6 rounded-2xl font-black text-2xl transition-all duration-300 transform hover:scale-105 shadow-2xl shadow-green-500/50 animate-pulse"
            >
              <DollarSign className="mr-4 h-8 w-8" />
              COMEÇAR A LUCRAR GRÁTIS AGORA
              <ArrowRight className="ml-4 h-8 w-8 group-hover:translate-x-2 transition-transform" />
            </Link>

            <div className="mt-6 text-center">
              <div className="text-xs text-green-400 mt-2">
                ✅ Acesso 100% gratuito • ✅ Sem taxas escondidas • ✅ Sem mensalidades • ✅ Para sempre grátis*
              </div>
              <div className="text-xs text-gray-400 mt-1">
                *Oferta gratuita por tempo limitado - aproveite enquanto disponível
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-900 border-t border-zinc-800">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <Image
              src="/assets/sheikbot-logo.png"
              alt="SHEIKBOT"
              width={180}
              height={72}
              className="object-contain mx-auto mb-4"
            />
            <div className="flex justify-center items-center gap-8 text-sm text-gray-400">
              <span>✅ Tecnologia Aprovada</span>
              <span>✅ 12.847+ Usuários Ativos</span>
              <span>✅ Suporte 24/7</span>
              <span>✅ Garantia de 30 dias</span>
            </div>
          </div>

          <div className="text-center text-gray-500 text-sm">
            <p>© 2025 SHEIKBOT - A Revolução do Trading com IA</p>
            <p className="mt-2">
              Plataforma licenciada e regulamentada. Resultados passados não
              garantem resultados futuros.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
