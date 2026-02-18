import { useRef } from "react";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import logoSubsistema from "@/assets/Logo_Subsistema.png";

const Flyer = () => {
  const flyerRef = useRef<HTMLDivElement>(null);

  const downloadFlyer = async (format: "png" | "jpeg") => {
    if (!flyerRef.current) return;
    const canvas = await html2canvas(flyerRef.current, {
      scale: 3,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    const link = document.createElement("a");
    link.download = `Flyer_Sistema_PAI.${format === "jpeg" ? "jpg" : "png"}`;
    link.href = canvas.toDataURL(`image/${format}`, 1.0);
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-8 gap-6">
      <div className="flex gap-3">
        <Button onClick={() => downloadFlyer("png")} className="gap-2">
          <Download className="h-4 w-4" /> Descargar PNG
        </Button>
        <Button onClick={() => downloadFlyer("jpeg")} variant="outline" className="gap-2">
          <Download className="h-4 w-4" /> Descargar JPG
        </Button>
      </div>

      {/* FLYER */}
      <div
        ref={flyerRef}
        style={{
          width: "800px",
          minHeight: "1130px",
          fontFamily: "'Outfit', sans-serif",
          background: "#ffffff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Header band */}
        <div
          style={{
            background: "linear-gradient(135deg, #003366 0%, #0055A4 100%)",
            padding: "40px 50px 35px",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "4px",
              background: "#CE1126",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <img
              src={logoSubsistema}
              alt="Logo"
              style={{ width: "80px", height: "80px", borderRadius: "12px" }}
              crossOrigin="anonymous"
            />
            <div>
              <p
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "13px",
                  letterSpacing: "3px",
                  textTransform: "uppercase",
                  margin: 0,
                }}
              >
                Lanzamiento Oficial
              </p>
              <h1
                style={{
                  color: "#ffffff",
                  fontSize: "36px",
                  fontWeight: 700,
                  margin: "4px 0 0",
                  lineHeight: 1.1,
                }}
              >
                Sistema de Tickets PAI
              </h1>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "15px", margin: "6px 0 0" }}>
                Subsistema de Información
              </p>
            </div>
          </div>
        </div>

        {/* Intro */}
        <div style={{ padding: "30px 50px 10px" }}>
          <p style={{ color: "#444", fontSize: "15px", lineHeight: 1.7, margin: 0 }}>
            Nos complace presentar la nueva plataforma de gestión de tickets diseñada para
            optimizar la atención de solicitudes, mejorar los tiempos de respuesta y facilitar la
            comunicación interna de manera eficiente y profesional.
          </p>
        </div>

        {/* Features */}
        <div style={{ padding: "20px 50px" }}>
          <h2
            style={{
              color: "#003366",
              fontSize: "20px",
              fontWeight: 700,
              marginBottom: "20px",
              borderBottom: "2px solid #CE1126",
              paddingBottom: "8px",
              display: "inline-block",
            }}
          >
            Funcionalidades Principales
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
            {[
              {
                title: "Gestión de Tickets",
                desc: "Creación, seguimiento y resolución de solicitudes con prioridades y estados.",
                icon: "🎫",
              },
              {
                title: "Chat en Tiempo Real",
                desc: "Comunicación directa entre usuarios y agentes de soporte con notas de voz.",
                icon: "💬",
              },
              {
                title: "Panel de Estadísticas",
                desc: "Reportes detallados, métricas de rendimiento y gráficos interactivos.",
                icon: "📊",
              },
              {
                title: "Gestión de Usuarios",
                desc: "Roles diferenciados: Soporte, Supervisor, Administrador y Superadmin.",
                icon: "👥",
              },
              {
                title: "Notificaciones",
                desc: "Alertas automáticas sobre cambios de estado y nuevos mensajes.",
                icon: "🔔",
              },
              {
                title: "Auditoría y Seguridad",
                desc: "Registro completo de actividades con políticas de acceso por rol.",
                icon: "🔒",
              },
            ].map((f, i) => (
              <div
                key={i}
                style={{
                  background: "#f7f9fc",
                  borderRadius: "10px",
                  padding: "18px",
                  border: "1px solid #e8ecf1",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "24px" }}>{f.icon}</span>
                  <h3 style={{ color: "#003366", fontSize: "15px", fontWeight: 700, margin: 0 }}>
                    {f.title}
                  </h3>
                </div>
                <p style={{ color: "#555", fontSize: "13px", lineHeight: 1.5, margin: 0 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Access */}
        <div
          style={{
            margin: "20px 50px",
            background: "linear-gradient(135deg, #003366 0%, #0055A4 100%)",
            borderRadius: "12px",
            padding: "28px 30px",
            textAlign: "center",
            position: "relative",
          }}
        >
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px", margin: "0 0 6px", letterSpacing: "2px", textTransform: "uppercase" }}>
            Accede desde cualquier dispositivo
          </p>
          <p style={{ color: "#ffffff", fontSize: "24px", fontWeight: 700, margin: "0 0 6px" }}>
            sistemapai.lovable.app
          </p>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px", margin: 0 }}>
            Compatible con computadoras, tablets y teléfonos móviles
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "20px 50px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #e8ecf1",
            margin: "0 50px",
          }}
        >
          <p style={{ color: "#999", fontSize: "11px", margin: 0 }}>
            © 2026 Sistema PAI — Todos los derechos reservados
          </p>
          <div
            style={{
              background: "#CE1126",
              color: "#fff",
              fontSize: "11px",
              fontWeight: 600,
              padding: "6px 16px",
              borderRadius: "20px",
            }}
          >
            ¡Disponible Ahora!
          </div>
        </div>
      </div>
    </div>
  );
};

export default Flyer;
