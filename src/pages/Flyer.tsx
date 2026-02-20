import { useRef } from "react";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { Download, Ticket, MessageCircle, Bell, LayoutDashboard } from "lucide-react";
import logoPai from "@/assets/logo-pai-circular.png";

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

  const features = [
    {
      title: "Gestión de Tickets",
      desc: "Registro, clasificación y seguimiento de solicitudes con asignación de prioridades, estados y responsables, asegurando control y trazabilidad en todo el proceso.",
      icon: "ticket",
    },
    {
      title: "Comunicación en Tiempo Real",
      desc: "Canal de mensajería directa entre usuarios y personal de soporte que permite intercambiar información, adjuntar evidencias y agilizar la resolución de incidencias.",
      icon: "message",
    },
    {
      title: "Sistema de Notificaciones",
      desc: "Envío automático de alertas ante actualizaciones, cambios de estado o respuestas, manteniendo a los usuarios informados en todo momento.",
      icon: "bell",
    },
    {
      title: "Panel de Control y Seguimiento",
      desc: "Visualización centralizada del estado de solicitudes, métricas de atención y control operativo para una gestión eficiente del servicio.",
      icon: "layout-dashboard",
    },
  ];

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
        {/* Decorative top accent */}
        <div style={{ height: "6px", background: "linear-gradient(90deg, #003366, #0055A4, #CE1126)" }} />

        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #001a33 0%, #003366 40%, #0055A4 100%)",
            padding: "44px 50px 40px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Subtle geometric decoration */}
          <div style={{
            position: "absolute", top: "-40px", right: "-40px",
            width: "200px", height: "200px", borderRadius: "50%",
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          }} />
          <div style={{
            position: "absolute", bottom: "-60px", right: "80px",
            width: "140px", height: "140px", borderRadius: "50%",
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
          }} />

          <div style={{ display: "flex", alignItems: "center", gap: "24px", position: "relative", zIndex: 1 }}>
            <div style={{
              background: "rgba(255,255,255,0.1)", borderRadius: "16px", padding: "8px",
              backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.15)",
            }}>
              <img
                src={logoPai}
                alt="Logo PAI"
                style={{ width: "78px", height: "78px", borderRadius: "50%" }}
                crossOrigin="anonymous"
              />
            </div>
            <div>
              <p style={{
                color: "#CE1126", fontSize: "12px", letterSpacing: "4px",
                textTransform: "uppercase", margin: 0, fontWeight: 700,
              }}>
                Lanzamiento Oficial
              </p>
              <div style={{ marginTop: "8px" }}>
                <h1 style={{
                  color: "#ffffff", fontSize: "28px", fontWeight: 800,
                  margin: 0, lineHeight: 1.2, letterSpacing: "-0.5px",
                }}>
                  Sistema de Tickets
                </h1>
                <p style={{
                  color: "rgba(255,255,255,0.75)", fontSize: "14px", fontWeight: 500,
                  margin: "4px 0 0", letterSpacing: "0.5px",
                }}>
                  Programa Ampliado de Inmunizaciones — PAI
                </p>
              </div>
            </div>
          </div>

          {/* Red accent line */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            height: "4px", background: "#CE1126",
          }} />
        </div>

        {/* Subtitle bar */}
        <div style={{
          background: "#f0f4f8", padding: "16px 50px",
          borderBottom: "1px solid #e2e8f0", textAlign: "center",
        }}>
          <p style={{
            color: "#003366", fontSize: "13px", fontWeight: 700,
            letterSpacing: "3px", textTransform: "uppercase", margin: 0,
          }}>
            Subsistema de Información
          </p>
        </div>

        {/* Intro */}
        <div style={{ padding: "28px 50px 8px", textAlign: "center" }}>
          <p style={{
            color: "#555", fontSize: "14.5px", lineHeight: 1.75, margin: 0,
            maxWidth: "620px", marginLeft: "auto", marginRight: "auto",
          }}>
            Plataforma institucional de gestión de tickets para una atención ágil, organizada y eficiente.
          </p>
        </div>

        {/* Section title */}
        <div style={{ padding: "20px 50px 0", textAlign: "center" }}>
          <h2 style={{
            color: "#003366", fontSize: "19px", fontWeight: 800,
            margin: "0 auto 6px", letterSpacing: "0.5px",
          }}>
            Funcionalidades Principales
          </h2>
          <div style={{
            width: "60px", height: "3px", background: "#CE1126",
            margin: "0 auto", borderRadius: "2px",
          }} />
        </div>

        {/* Features */}
        <div style={{ padding: "22px 50px 10px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {features.map((f, i) => (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "flex-start", gap: "16px",
                  background: i % 2 === 0
                    ? "linear-gradient(135deg, #f7f9fc 0%, #eef2f7 100%)"
                    : "#ffffff",
                  borderRadius: "12px", padding: "18px 20px",
                  border: "1px solid #e4e9f0",
                  boxShadow: "0 1px 4px rgba(0,51,102,0.04)",
                }}
              >
                <div style={{
                  background: "linear-gradient(135deg, #003366, #0055A4)",
                  borderRadius: "10px", minWidth: "46px", height: "46px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(0,51,102,0.2)",
                }}>
                  {f.icon === "ticket" && <Ticket size={22} color="#ffffff" />}
                  {f.icon === "message" && <MessageCircle size={22} color="#ffffff" />}
                  {f.icon === "bell" && <Bell size={22} color="#ffffff" />}
                  {f.icon === "layout-dashboard" && <LayoutDashboard size={22} color="#ffffff" />}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    color: "#003366", fontSize: "14.5px", fontWeight: 700,
                    margin: "0 0 4px",
                  }}>
                    {f.title}
                  </h3>
                  <p style={{
                    color: "#5a6a7a", fontSize: "12.5px", lineHeight: 1.55, margin: 0,
                  }}>
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Access CTA */}
        <div style={{
          margin: "22px 50px",
          background: "linear-gradient(135deg, #001a33 0%, #003366 50%, #0055A4 100%)",
          borderRadius: "14px", padding: "30px 30px 28px",
          textAlign: "center", position: "relative", overflow: "hidden",
        }}>
          {/* Decorative circles */}
          <div style={{
            position: "absolute", top: "-20px", left: "-20px",
            width: "100px", height: "100px", borderRadius: "50%",
            background: "rgba(206,17,38,0.15)",
          }} />
          <div style={{
            position: "absolute", bottom: "-30px", right: "-10px",
            width: "80px", height: "80px", borderRadius: "50%",
            background: "rgba(255,255,255,0.04)",
          }} />

          <p style={{
            color: "#CE1126", fontSize: "11px", margin: "0 0 8px",
            letterSpacing: "3px", textTransform: "uppercase", fontWeight: 700,
            position: "relative", zIndex: 1,
          }}>
            Accede desde cualquier dispositivo
          </p>
          <div style={{
            background: "rgba(255,255,255,0.12)", borderRadius: "10px",
            padding: "12px 24px", display: "inline-block",
            border: "1px solid rgba(255,255,255,0.15)",
            position: "relative", zIndex: 1,
          }}>
            <p style={{
              color: "#ffffff", fontSize: "20px", fontWeight: 800,
              margin: 0, letterSpacing: "0.5px",
            }}>
              soporte-subsistema.web.app/auth
            </p>
          </div>
          <p style={{
            color: "rgba(255,255,255,0.55)", fontSize: "11.5px",
            margin: "10px 0 0", position: "relative", zIndex: 1,
          }}>
            Compatible con computadoras, tablets y teléfonos móviles
          </p>
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 50px 20px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderTop: "1px solid #e8ecf1", margin: "0 40px",
        }}>
          <p style={{ color: "#aaa", fontSize: "10px", margin: 0 }}>
            © 2025 Sistema PAI — Subsistema de Información
          </p>
          <div style={{
            background: "linear-gradient(135deg, #CE1126, #a30d1e)",
            color: "#fff", fontSize: "10px", fontWeight: 700,
            padding: "6px 18px", borderRadius: "20px",
            letterSpacing: "1px", textTransform: "uppercase",
          }}>
            ¡Disponible Ahora!
          </div>
        </div>
      </div>
    </div>
  );
};

export default Flyer;
