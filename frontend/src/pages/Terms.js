import React from "react";
import { useLang } from "../contexts/LanguageContext";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, FileText } from "@phosphor-icons/react";

export default function Terms() {
  const { lang } = useLang();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link to="/" className="text-zinc-400 inline-flex items-center gap-2 mb-6 hover:text-white transition-colors">
        <ArrowLeft size={16} /> {lang === "es" ? "Volver al Inicio" : "Back to Home"}
      </Link>

      <div className="pz-card p-8 space-y-6 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black border border-zinc-800">
        <div className="flex items-center gap-3 mb-4">
          <FileText size={36} color="#d4ff00" weight="duotone" />
          <div>
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#d4ff00] text-black">
              Legal & Compliance
            </span>
            <h1 className="font-display font-black text-3xl sm:text-4xl uppercase tracking-tighter text-white mt-1">
              {lang === "es" ? "Términos y Condiciones Generales" : "General Terms & Conditions"}
            </h1>
            <p className="text-xs text-zinc-500 font-mono">Última actualización: 01 de Julio de 2026</p>
          </div>
        </div>

        <div className="prose prose-invert max-w-none text-zinc-300 text-sm space-y-6 leading-relaxed max-h-[60vh] overflow-auto scrollbar-thin pr-3 bg-black/40 p-5 rounded-lg border border-zinc-900">
          <h3 className="text-[#d4ff00] font-bold text-lg uppercase tracking-tight">1. Introducción</h3>
          <p>
            Bienvenido a <strong>BetRex.app</strong>. Queremos que disfrutes el tiempo que pasas aquí. Como esta es una plataforma de pronósticos, apuestas deportivas virtuales y entretenimiento, existen una serie de leyes y regulaciones que regulan nuestras actividades. Estas reglas se explican con la mayor claridad posible en estos términos y condiciones (las "Reglas").
          </p>
          <p>
            Al crear tu cuenta, utilizar el sitio web y/o aceptar cualquier bono o premio, declaras que has leído, comprendido y aceptado las Reglas en su totalidad. Si no estás de acuerdo con las Reglas, no debes registrarte ni continuar usando el sitio web.
          </p>

          <h3 className="text-[#d4ff00] font-bold text-lg uppercase tracking-tight">2. Definiciones básicas</h3>
          <ul className="list-disc pl-5 space-y-1 text-xs text-zinc-400">
            <li><strong>"Bono"</strong> cubre todas las ofertas promocionales que otorgan una recompensa tangible, incluyendo bonos de bienvenida, recargas y giros gratuitos.</li>
            <li><strong>"Juegos"</strong> se refiere a los juegos de Tragamonedas (Slots), Casino, Loterías (Powerball, Mega Millions) y apuestas en vivo en nuestro Sitio.</li>
            <li><strong>"Cuenta"</strong> es tu cuenta de jugador registrada de forma segura en BetRex.app.</li>
            <li><strong>"Nosotros/BetRex"</strong> se refiere a BetRex Ltd, operado de conformidad con las leyes vigentes y regulaciones de licencias de juego.</li>
          </ul>

          <h3 className="text-[#d4ff00] font-bold text-lg uppercase tracking-tight">3. Licencias y Regulación Oficial</h3>
          <p>
            Como operadores oficiales de juego en línea, te informamos de forma transparente que nuestra plataforma opera bajo la licencia oficial emitida por la Autoridad de Juegos de Malta (MGA):
          </p>
          <div className="p-4 rounded border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 font-mono text-xs leading-relaxed">
            The official number and date of issue of the license is <strong>BETREX/B2C/767/2023</strong> issued on <strong>11.10.2023</strong>. BetRex.app is operated according to Maltese Law and regulated by the Malta Gaming Authority.
          </div>

          <h3 className="text-[#d4ff00] font-bold text-lg uppercase tracking-tight">4. Quién puede participar</h3>
          <p>
            Para registrarte y realizar jugadas en BetRex.app, debes cumplir estrictamente con los siguientes requisitos:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-zinc-400">
            <li>Ser mayor de <strong>18 años de edad</strong> (o la edad legal mínima para juegos de azar en tu país de residencia).</li>
            <li>Ser una persona real. No se permite el registro de empresas ni entidades legales.</li>
            <li>Participar únicamente en tu capacidad personal y recreativa, no profesional.</li>
            <li>Garantizar que tu participación en juegos de simulación y apuestas es legal en tu territorio de residencia.</li>
          </ul>

          <h3 className="text-[#d4ff00] font-bold text-lg uppercase tracking-tight">5. Registro y Cuentas</h3>
          <p>
            El registro se realiza de forma interactiva. Estás obligado a proporcionar información verídica y real, incluyendo tu nombre, correo electrónico válido, número telefónico y fecha de nacimiento. Solo se permite **una cuenta por persona, familia y dirección física de hogar**. El uso de cuentas múltiples (multi-accounts) o técnicas de VPN/IP falsificadas resultará en la suspensión inmediata y el decomiso de los saldos virtuales acumulados.
          </p>

          <h3 className="text-[#d4ff00] font-bold text-lg uppercase tracking-tight">6. Depósitos, Monedas y Wallet</h3>
          <p>
            BetRex.app utiliza un sistema de **monedas virtuales propias** para participar de forma divertida en los juegos y pronósticos deportivos.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-zinc-400">
            <li>Puedes recargar monedas virtuales en tu Wallet utilizando los métodos oficiales autorizados (Stripe, Zelle, Binance Pay).</li>
            <li>Todas las transacciones se realizan bajo los límites de prevención de lavado de activos y seguridad del portal.</li>
            <li>Las monedas virtuales sirven exclusivamente para ser jugadas dentro de los pronósticos de BetRex, juegos de Lotería y tragamonedas (Slots) místicas.</li>
          </ul>

          <h3 className="text-[#d4ff00] font-bold text-lg uppercase tracking-tight">7. Lotería, Powerball y Compras de Boletos</h3>
          <p>
            Cuando el usuario compra un boleto de Powerball o Mega Millions en la sección de Lotería por un costo de 100 monedas virtuales:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-zinc-400">
            <li>El usuario escoge sus números de la suerte libremente en el volante digital de la web.</li>
            <li>El administrador se compromete a comprar y subir la imagen escaneada del boleto físico real correspondiente en el panel de administrador.</li>
            <li>Los premios de lotería se liquidan de forma transparente y se acreditan automáticamente en monedas de la app.</li>
          </ul>

          <h3 className="text-[#d4ff00] font-bold text-lg uppercase tracking-tight">8. Juego Responsable</h3>
          <p>
            El juego debe ser divertido, moderado y recreativo. BetRex.app promueve de forma estricta el **Juego Responsable**. Ponemos a tu disposición límites de depósito, límites de tiempo de sesión de juego, auto-exclusiones y herramientas de pausa si consideras que el juego está afectando tu bienestar. Juega de forma informada y moderada.
          </p>

          <h3 className="text-[#d4ff00] font-bold text-lg uppercase tracking-tight">9. Propiedad Intelectual</h3>
          <p>
            BetRex Ltd es el único titular de los derechos de marca, logotipos, tecnología, software y sistemas empresariales utilizados bajo el dominio <strong>www.betrex.app</strong>. Cualquier uso no autorizado o reproducción parcial de nuestros activos visuales o marca será procesado de acuerdo con las leyes internacionales de propiedad intelectual.
          </p>
        </div>

        <div className="pt-6 border-t border-zinc-900 flex items-center justify-between text-xs text-zinc-500 font-mono">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={16} color="#d4ff00" weight="fill" /> Malta Gaming Authority Regulated
          </span>
          <span>BETREX/B2C/767/2023</span>
        </div>
      </div>
    </div>
  );
}