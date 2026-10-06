import { useEffect, useState } from "react";
import api from "@/lib/api";
import { MessageCircle } from "lucide-react";

export default function WhatsAppFloat({ message = "Olá! Gostaria de mais informações." }) {
  const [phone, setPhone] = useState("");
  useEffect(() => {
    api.get("/company").then(r => setPhone(r.data?.whatsapp || r.data?.telefone || "")).catch(() => {});
  }, []);
  if (!phone) return null;
  const clean = phone.replace(/\D/g, "");
  const link = `https://wa.me/${clean.startsWith("55") ? clean : "55" + clean}?text=${encodeURIComponent(message)}`;
  return (
    <a
      data-testid="wa-float"
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-xl shadow-green-500/30 hover:scale-110 transition-transform"
      aria-label="Falar no WhatsApp"
    >
      <MessageCircle className="w-7 h-7" />
    </a>
  );
}
