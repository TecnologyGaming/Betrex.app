import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { PaperPlaneTilt, ChatCenteredText, User, Robot, X } from "@phosphor-icons/react";

export default function Chatbot() {
  const { user } = useAuth();
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [speakToOperator, setSpeakToOperator] = useState(false);

  // Cargar historial de chat si el usuario está logueado
  useEffect(() => {
    if (!user) return;
    api.get(`/chat/${user.user_id}`).then(({ data }) => {
      if (data && data.messages) {
        setMessages(data.messages);
        setSpeakToOperator(data.speak_to_operator || false);
      } else {
        // Mensaje de bienvenida del bot por defecto
        setMessages([
          {
            sender: "bot",
            text: lang === "es" 
              ? "¡Hola! Soy el asistente virtual de BetRex.app. ⚡ ¿En qué puedo ayudarte hoy?" 
              : "Hi! I am the BetRex.app virtual assistant. ⚡ How can I help you today?",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    }).catch(() => {});
  }, [user, lang]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    const userMsg = {
      sender: "user",
      text: input,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await api.post("/chat/send", { text: userMsg.text });
      setMessages((prev) => [...prev, {
        sender: data.sender, // "bot" o "operator"
        text: data.text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      if (data.speak_to_operator) {
        setSpeakToOperator(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const requestOperator = async () => {
    setLoading(true);
    try {
      await api.post("/chat/operator-request");
      setSpeakToOperator(true);
      setMessages((prev) => [...prev, {
        sender: "bot",
        text: lang === "es" 
          ? "🔔 He enviado una solicitud a un operador humano. Te responderemos en este chat en breve. ¡Por favor mantente en línea!" 
          : "🔔 I have sent a request to a human operator. We will reply to you in this chat shortly. Please stay online!",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Botón flotante para abrir/cerrar */}
      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full bg-[#d4ff00] text-black grid place-items-center shadow-lg hover:scale-105 active:scale-95 transition-all shadow-[#d4ff00]/10"
        title="Chat de Soporte"
      >
        {open ? <X size={24} weight="bold" /> : <ChatCenteredText size={28} weight="fill" />}
      </button>

      {/* Ventana de Chat */}
      {open && (
        <div className="absolute bottom-16 right-0 w-80 sm:w-96 h-[480px] bg-[#0c0c0e] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          {/* Cabecera del chat */}
          <div className="bg-zinc-950 px-4 py-3 border-b border-zinc-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#d4ff00]/10 grid place-items-center">
                {speakToOperator ? <User size={16} color="#d4ff00" /> : <Robot size={18} color="#d4ff00" />}
              </div>
              <div>
                <div className="text-xs font-black text-white uppercase tracking-wider">
                  {speakToOperator ? (lang === "es" ? "Soporte Humano" : "Human Support") : (lang === "es" ? "Asistente Virtual" : "AstroRex Bot")}
                </div>
                <div className="text-[9px] text-zinc-500 font-mono">
                  {speakToOperator ? (lang === "es" ? "Operador en línea" : "Operator online") : (lang === "es" ? "Bot Inteligente" : "AI Assistant")}
                </div>
              </div>
            </div>
            {!speakToOperator && (
              <button
                onClick={requestOperator}
                className="btn-outline !py-1 !px-2 text-[9px] font-black uppercase tracking-wider"
              >
                {lang === "es" ? "Hablar con operador" : "Talk to operator"}
              </button>
            )}
          </div>

          {/* Historial de Mensajes */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-thin">
            {messages.map((m, i) => {
              const isUser = m.sender === "user";
              return (
                <div
                  key={i}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] p-3 rounded-2xl text-xs leading-relaxed ${
                      isUser
                        ? "bg-[#d4ff00] text-black font-semibold rounded-tr-none"
                        : "bg-zinc-900 text-zinc-300 rounded-tl-none border border-zinc-800/40"
                    }`}
                  >
                    <div>{m.text}</div>
                    <div className={`text-[8px] mt-1 text-right font-mono ${isUser ? "text-black/60" : "text-zinc-500"}`}>
                      {m.time}
                    </div>
                  </div>
                </div>
              );
            })}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-zinc-900 text-zinc-500 p-3 rounded-2xl text-[10px] font-mono rounded-tl-none animate-pulse">
                  {lang === "es" ? "Escribiendo..." : "Typing..."}
                </div>
              </div>
            )}
          </div>

          {/* Input de Mensaje */}
          <form onSubmit={sendMessage} className="p-3 bg-zinc-950 border-t border-zinc-800 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={lang === "es" ? "Escribe un mensaje..." : "Type a message..."}
              className="input !py-1.5 flex-1 text-xs"
              required
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-8 h-8 rounded-full bg-[#d4ff00] text-black grid place-items-center shrink-0 hover:scale-105 active:scale-95 transition-all"
            >
              <PaperPlaneTilt size={16} weight="bold" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}