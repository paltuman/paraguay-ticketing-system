const wordHeader = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset="utf-8">
<style>
  body { font-family: Calibri, sans-serif; margin: 2cm; color: #333; }
  h1 { color: #1a56db; font-size: 28pt; border-bottom: 3px solid #1a56db; padding-bottom: 10px; }
  h2 { color: #1e40af; font-size: 18pt; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
  h3 { color: #2563eb; font-size: 14pt; margin-top: 20px; }
  table { border-collapse: collapse; width: 100%; margin: 15px 0; }
  th { background-color: #1a56db; color: white; padding: 10px; text-align: left; }
  td { border: 1px solid #ddd; padding: 8px; }
  tr:nth-child(even) { background-color: #f8f9fa; }
  .note { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 15px 0; }
  .tip { background-color: #d1e7dd; border-left: 4px solid #198754; padding: 12px; margin: 15px 0; }
  .warning { background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 12px; margin: 15px 0; }
  .step { background-color: #e8f0fe; border-radius: 8px; padding: 15px; margin: 10px 0; }
  ol li, ul li { margin: 5px 0; line-height: 1.6; }
  .cover { text-align: center; page-break-after: always; padding-top: 200px; }
  .cover h1 { font-size: 36pt; border: none; }
  .cover p { font-size: 14pt; color: #666; }
  .footer { text-align: center; color: #999; font-size: 9pt; margin-top: 50px; border-top: 1px solid #ddd; padding-top: 10px; }
</style></head><body>`;

const wordFooter = `<div class="footer">
<p>PAI Paraguay - Sistema de Tickets de Soporte</p>
<p>Departamento de Sub-Sistema de Información</p>
<p>Documento generado el ${new Date().toLocaleDateString('es-PY')}</p>
</div></body></html>`;

export function generateSupportUserManual(): string {
  return `${wordHeader}
<div class="cover">
  <h1>Manual del Usuario de Soporte</h1>
  <p><strong>Sistema de Tickets - PAI Paraguay</strong></p>
  <p>Guía completa de uso para usuarios del sistema</p>
  <p>Versión 1.0 - ${new Date().toLocaleDateString('es-PY')}</p>
</div>

<h1>1. Introducción</h1>
<p>Bienvenido al Sistema de Tickets del PAI Paraguay. Este manual te guiará paso a paso en el uso de todas las funcionalidades disponibles para tu rol de <strong>Usuario de Soporte</strong>.</p>

<div class="tip"><strong>💡 Tu rol:</strong> Como usuario de soporte, puedes crear tickets para reportar problemas o solicitudes, comunicarte con el equipo técnico a través del chat integrado y dar seguimiento al estado de tus solicitudes.</div>

<h2>1.1 Acceso al Sistema</h2>
<ol>
  <li>Abre tu navegador web e ingresa la dirección del sistema.</li>
  <li>Introduce tu <strong>correo electrónico</strong> y <strong>contraseña</strong>.</li>
  <li>Haz clic en <strong>"Iniciar Sesión"</strong>.</li>
</ol>

<div class="note"><strong>📌 Nota:</strong> Si es tu primera vez, un administrador debe crear tu cuenta. Recibirás un correo con instrucciones para establecer tu contraseña.</div>

<h2>1.2 Recuperar Contraseña</h2>
<ol>
  <li>En la pantalla de inicio de sesión, haz clic en <strong>"¿Olvidaste tu contraseña?"</strong>.</li>
  <li>Ingresa tu correo electrónico registrado.</li>
  <li>Revisa tu bandeja de entrada (y carpeta de spam) para el enlace de recuperación.</li>
  <li>Haz clic en el enlace y establece una nueva contraseña segura.</li>
</ol>

<h1>2. Panel Principal (Dashboard)</h1>
<p>Al iniciar sesión, verás el panel principal con la siguiente información:</p>

<table>
  <tr><th>Elemento</th><th>Descripción</th></tr>
  <tr><td>Saludo personalizado</td><td>Muestra tu nombre y rol actual</td></tr>
  <tr><td>Tarjetas de resumen</td><td>Total de tickets, abiertos, en proceso, resueltos y cerrados</td></tr>
  <tr><td>Tickets recientes</td><td>Los últimos 5 tickets creados en el sistema</td></tr>
  <tr><td>Resumen rápido</td><td>Tasa de resolución y tickets activos</td></tr>
</table>

<h1>3. Crear un Nuevo Ticket</h1>
<p>Para reportar un problema o hacer una solicitud:</p>

<div class="step">
<h3>Paso a paso:</h3>
<ol>
  <li>Haz clic en el botón <strong>"Crear Nuevo Ticket"</strong> (en el dashboard o en el menú lateral).</li>
  <li>Completa los campos del formulario:</li>
</ol>

<table>
  <tr><th>Campo</th><th>Descripción</th><th>Obligatorio</th></tr>
  <tr><td>Título</td><td>Resumen breve del problema (ej: "No puedo acceder al correo")</td><td>Sí</td></tr>
  <tr><td>Descripción</td><td>Detalle completo del problema o solicitud</td><td>Sí</td></tr>
  <tr><td>Departamento</td><td>Área a la que va dirigida la solicitud</td><td>Sí</td></tr>
  <tr><td>Prioridad</td><td>Baja, Media, Alta o Urgente</td><td>Sí</td></tr>
  <tr><td>Archivos adjuntos</td><td>Capturas de pantalla o documentos de apoyo</td><td>No</td></tr>
</table>

<ol start="3">
  <li>Haz clic en <strong>"Crear Ticket"</strong>.</li>
  <li>El sistema te asignará un número de ticket único (ej: #0042).</li>
</ol>
</div>

<div class="tip"><strong>💡 Consejo:</strong> Incluye capturas de pantalla del error. Esto ayuda al equipo técnico a resolver tu problema más rápido.</div>

<h2>3.1 Niveles de Prioridad</h2>
<table>
  <tr><th>Prioridad</th><th>Cuándo usar</th><th>Tiempo esperado</th></tr>
  <tr><td>🟢 Baja</td><td>Consultas generales, mejoras menores</td><td>3-5 días hábiles</td></tr>
  <tr><td>🟡 Media</td><td>Problemas que afectan tu trabajo pero tienen alternativas</td><td>1-3 días hábiles</td></tr>
  <tr><td>🟠 Alta</td><td>Problemas que impiden realizar tareas importantes</td><td>24 horas</td></tr>
  <tr><td>🔴 Urgente</td><td>Sistemas caídos, pérdida de datos, seguridad comprometida</td><td>4-8 horas</td></tr>
</table>

<h1>4. Gestión de Tickets</h1>

<h2>4.1 Ver tus Tickets</h2>
<ol>
  <li>Haz clic en <strong>"Tickets"</strong> en el menú lateral.</li>
  <li>Verás la lista de tus tickets con su estado actual.</li>
  <li>Puedes filtrar por estado (Abierto, En Proceso, Resuelto, Cerrado).</li>
  <li>Usa la barra de búsqueda para encontrar un ticket específico.</li>
</ol>

<h2>4.2 Estados del Ticket</h2>
<table>
  <tr><th>Estado</th><th>Significado</th><th>Color</th></tr>
  <tr><td>Abierto</td><td>Tu ticket fue registrado y espera atención</td><td>🔵 Azul</td></tr>
  <tr><td>En Proceso</td><td>Un técnico está trabajando en tu solicitud</td><td>🟡 Amarillo</td></tr>
  <tr><td>Resuelto</td><td>El problema fue solucionado</td><td>🟢 Verde</td></tr>
  <tr><td>Cerrado</td><td>El ticket fue cerrado definitivamente</td><td>⚫ Gris</td></tr>
</table>

<h2>4.3 Detalle del Ticket</h2>
<p>Al hacer clic en un ticket, verás:</p>
<ul>
  <li><strong>Información del ticket:</strong> título, descripción, prioridad, departamento</li>
  <li><strong>Historial de estados:</strong> todos los cambios de estado con fecha y responsable</li>
  <li><strong>Chat integrado:</strong> para comunicarte con el equipo técnico</li>
  <li><strong>Archivos adjuntos:</strong> documentos asociados al ticket</li>
</ul>

<h1>5. Chat Integrado</h1>
<p>El chat te permite comunicarte directamente con el equipo que atiende tu ticket.</p>

<h2>5.1 Enviar Mensajes</h2>
<ol>
  <li>Abre el ticket que deseas consultar.</li>
  <li>En la sección de chat (parte inferior), escribe tu mensaje.</li>
  <li>Presiona <strong>Enter</strong> o el botón de enviar.</li>
  <li>Puedes adjuntar archivos usando el ícono de 📎.</li>
</ol>

<h2>5.2 Notas de Voz</h2>
<ol>
  <li>Haz clic en el ícono de <strong>micrófono 🎙️</strong>.</li>
  <li>Graba tu mensaje de voz.</li>
  <li>Haz clic en <strong>enviar</strong> para adjuntarlo al chat.</li>
</ol>

<h2>5.3 Estado de los Mensajes</h2>
<table>
  <tr><th>Indicador</th><th>Significado</th></tr>
  <tr><td>✓</td><td>Mensaje enviado</td></tr>
  <tr><td>✓✓</td><td>Mensaje entregado</td></tr>
  <tr><td>✓✓ (azul)</td><td>Mensaje leído</td></tr>
</table>

<h1>6. Encuesta de Satisfacción</h1>
<p>Cuando un ticket es resuelto, el sistema te pedirá completar una breve encuesta:</p>
<ol>
  <li>Califica la atención recibida (1 a 5 estrellas ⭐).</li>
  <li>Opcionalmente, deja un comentario.</li>
  <li>Tu opinión ayuda a mejorar el servicio.</li>
</ol>

<h1>7. Perfil de Usuario</h1>
<p>Puedes ver y editar tu información personal:</p>
<ol>
  <li>Haz clic en tu <strong>avatar</strong> o nombre en la esquina superior.</li>
  <li>Selecciona <strong>"Perfil"</strong>.</li>
  <li>Puedes actualizar:
    <ul>
      <li>Nombre completo</li>
      <li>Foto de perfil</li>
      <li>Contraseña</li>
    </ul>
  </li>
</ol>

<h1>8. Notificaciones</h1>
<p>El sistema te notificará cuando:</p>
<ul>
  <li>Tu ticket cambie de estado</li>
  <li>Recibas un nuevo mensaje en el chat</li>
  <li>Un técnico sea asignado a tu ticket</li>
</ul>

<div class="note"><strong>📌 Nota:</strong> Revisa el ícono de campana 🔔 en la barra superior para ver tus notificaciones pendientes.</div>

<h1>9. Preguntas Frecuentes</h1>

<h3>¿Puedo ver los tickets de otros usuarios?</h3>
<p>No. Como usuario de soporte, solo puedes ver los tickets que tú has creado.</p>

<h3>¿Puedo reabrir un ticket cerrado?</h3>
<p>No directamente. Debes crear un nuevo ticket haciendo referencia al anterior.</p>

<h3>¿Cuántos tickets puedo crear?</h3>
<p>El sistema permite hasta 10 tickets por hora para evitar abusos.</p>

<h3>¿Qué hago si no recibo el correo de recuperación?</h3>
<p>Revisa tu carpeta de spam. Si el problema persiste, contacta a un administrador.</p>

<h3>¿Puedo adjuntar archivos grandes?</h3>
<p>El tamaño máximo por archivo es de 10 MB. Formatos aceptados: imágenes, PDFs, documentos de Office.</p>

<h1>10. Contacto y Soporte</h1>
<p>Si tienes problemas con el sistema, contacta al:</p>
<ul>
  <li><strong>Departamento de Sub-Sistema de Información</strong></li>
  <li>Email: subsistema.pai@mspbs.gov.py</li>
</ul>

${wordFooter}`;
}

export function generateSuperadminManual(): string {
  return `${wordHeader}
<div class="cover">
  <h1>Manual del Superadministrador</h1>
  <p><strong>Sistema de Tickets - PAI Paraguay</strong></p>
  <p>Guía completa de administración del sistema</p>
  <p>Versión 1.0 - ${new Date().toLocaleDateString('es-PY')}</p>
</div>

<h1>1. Introducción</h1>
<p>Este manual cubre todas las funcionalidades exclusivas del rol de <strong>Superadministrador</strong>, el nivel de acceso más alto del sistema.</p>

<div class="warning"><strong>⚠️ Importante:</strong> Como superadministrador, tienes acceso total al sistema. Usa tus privilegios con responsabilidad, ya que las acciones administrativas quedan registradas en los logs de auditoría.</div>

<h2>1.1 Jerarquía de Roles</h2>
<table>
  <tr><th>Rol</th><th>Nivel</th><th>Acceso</th></tr>
  <tr><td>Usuario de Soporte</td><td>Básico</td><td>Solo sus propios tickets</td></tr>
  <tr><td>Supervisor</td><td>Intermedio</td><td>Tickets de su departamento + métricas</td></tr>
  <tr><td>Administrador</td><td>Alto</td><td>Todos los tickets + gestión de usuarios</td></tr>
  <tr><td><strong>Superadministrador</strong></td><td><strong>Máximo</strong></td><td><strong>Control total + funciones exclusivas</strong></td></tr>
</table>

<h1>2. Panel Principal (Dashboard)</h1>
<p>Tu dashboard incluye funciones adicionales:</p>
<ul>
  <li><strong>Filtros avanzados:</strong> por departamento y período de tiempo (7, 14, 30 días)</li>
  <li><strong>Gráficos analíticos:</strong> tendencias, tiempos de respuesta, satisfacción</li>
  <li><strong>Top Performers:</strong> ranking de agentes con mejores calificaciones</li>
  <li><strong>Indicador de usuarios en línea:</strong> muestra quién está conectado (exclusivo superadmin)</li>
  <li><strong>Botón de exportar:</strong> para generar reportes</li>
</ul>

<h1>3. Gestión Completa de Tickets</h1>

<h2>3.1 Ver Todos los Tickets</h2>
<p>A diferencia de otros roles, puedes ver <strong>todos los tickets del sistema</strong> sin restricción departamental.</p>

<h2>3.2 Filtros Disponibles</h2>
<table>
  <tr><th>Filtro</th><th>Opciones</th></tr>
  <tr><td>Estado</td><td>Abierto, En Proceso, Resuelto, Cerrado</td></tr>
  <tr><td>Prioridad</td><td>Baja, Media, Alta, Urgente</td></tr>
  <tr><td>Departamento</td><td>Todos los 12 departamentos del PAI</td></tr>
  <tr><td>Agente asignado</td><td>Lista de administradores (exclusivo admin/superadmin)</td></tr>
  <tr><td>Búsqueda</td><td>Por título, número de ticket o descripción</td></tr>
</table>

<h2>3.3 Acciones sobre Tickets</h2>
<div class="step">
<h3>Cambiar Estado:</h3>
<ol>
  <li>Abre el ticket deseado.</li>
  <li>En el panel lateral, selecciona el nuevo estado.</li>
  <li>Los estados disponibles dependen del estado actual:</li>
</ol>
<table>
  <tr><th>Estado Actual</th><th>Puede cambiar a</th></tr>
  <tr><td>Abierto</td><td>En Proceso</td></tr>
  <tr><td>En Proceso</td><td>Resuelto, Abierto</td></tr>
  <tr><td>Resuelto</td><td>Cerrado, En Proceso</td></tr>
  <tr><td>Cerrado</td><td>(Estado final)</td></tr>
</table>
</div>

<div class="step">
<h3>Asignar Agente:</h3>
<ol>
  <li>Abre el ticket.</li>
  <li>En "Agente Asignado", selecciona un administrador de la lista.</li>
  <li>El agente recibirá una notificación.</li>
</ol>
</div>

<div class="step">
<h3>Eliminar Ticket:</h3>
<ol>
  <li>Abre el ticket que deseas eliminar.</li>
  <li>Haz clic en el botón <strong>"Eliminar"</strong> (ícono de papelera).</li>
  <li>Confirma la acción en el diálogo de confirmación.</li>
  <li><strong>Importante:</strong> Esta acción elimina también todos los mensajes, adjuntos e historial asociados.</li>
</ol>
</div>

<div class="warning"><strong>⚠️ Advertencia:</strong> La eliminación de tickets es permanente y no se puede deshacer. Se registra en los logs de auditoría.</div>

<h1>4. Gestión de Usuarios</h1>

<h2>4.1 Ver Usuarios</h2>
<ol>
  <li>Ve a <strong>"Usuarios"</strong> en el menú lateral.</li>
  <li>Verás la lista completa de usuarios registrados.</li>
  <li>Cada tarjeta muestra: nombre, email, departamento, rol y estado (activo/inactivo).</li>
</ol>

<h2>4.2 Crear Nuevo Usuario</h2>
<div class="step">
<ol>
  <li>Haz clic en <strong>"Nuevo Usuario"</strong>.</li>
  <li>Completa los campos:</li>
</ol>
<table>
  <tr><th>Campo</th><th>Descripción</th></tr>
  <tr><td>Nombre completo</td><td>Nombre y apellido del usuario</td></tr>
  <tr><td>Correo electrónico</td><td>Email institucional (@mspbs.gov.py)</td></tr>
  <tr><td>Contraseña</td><td>Mínimo 6 caracteres con indicador de fortaleza</td></tr>
  <tr><td>Departamento</td><td>Seleccionar de los 12 departamentos</td></tr>
  <tr><td>Cargo</td><td>Puesto del usuario</td></tr>
  <tr><td>Rol</td><td>Soporte, Supervisor, Administrador o Superadmin</td></tr>
</table>
</div>

<h2>4.3 Editar Usuario</h2>
<ul>
  <li>Puedes modificar: nombre, departamento, cargo y rol.</li>
  <li><strong>Exclusivo superadmin:</strong> puedes cambiar el rol de otros administradores.</li>
</ul>

<h2>4.4 Activar/Desactivar Usuario</h2>
<ol>
  <li>En la tarjeta del usuario, haz clic en el botón de activar/desactivar.</li>
  <li>Los usuarios desactivados no pueden iniciar sesión.</li>
  <li>Sus tickets existentes se mantienen en el sistema.</li>
</ol>

<h2>4.5 Eliminar Usuario (Exclusivo Superadmin)</h2>
<div class="warning"><strong>⚠️ Acción irreversible:</strong> Solo disponible para superadministradores.</div>
<ol>
  <li>Haz clic en el botón de eliminar en la tarjeta del usuario.</li>
  <li>Confirma la acción.</li>
  <li>El perfil del usuario será eliminado permanentemente.</li>
</ol>

<h1>5. Función de Suplantación (Impersonation)</h1>
<p>Esta función exclusiva te permite ver el sistema desde la perspectiva de otro usuario.</p>

<div class="step">
<h3>Cómo usar:</h3>
<ol>
  <li>Ve a <strong>"Usuarios"</strong>.</li>
  <li>Busca el usuario que deseas suplantar.</li>
  <li>Haz clic en el ícono de <strong>"Impersonar"</strong> (ojo 👁️).</li>
  <li>Aparecerá un banner amarillo en la parte superior indicando que estás viendo como otro usuario.</li>
  <li>Para volver a tu cuenta, haz clic en <strong>"Dejar de impersonar"</strong>.</li>
</ol>
</div>

<div class="note"><strong>📌 Nota:</strong> La suplantación queda registrada en los logs de auditoría con fecha, hora y usuario suplantado.</div>

<h1>6. Logs de Auditoría</h1>
<p>El sistema registra todas las acciones administrativas para garantizar la trazabilidad.</p>

<h2>6.1 Acceder a los Logs</h2>
<ol>
  <li>Ve a <strong>"Auditoría"</strong> en el menú lateral.</li>
  <li>Verás un listado cronológico de todas las acciones.</li>
</ol>

<h2>6.2 Tipos de Eventos Registrados</h2>
<table>
  <tr><th>Evento</th><th>Descripción</th><th>Visible para</th></tr>
  <tr><td>Inicio de sesión</td><td>Usuario ingresó al sistema</td><td>Admin, Superadmin</td></tr>
  <tr><td>Creación de ticket</td><td>Se creó un nuevo ticket</td><td>Admin, Superadmin</td></tr>
  <tr><td>Cambio de estado</td><td>Un ticket cambió de estado</td><td>Admin, Superadmin</td></tr>
  <tr><td>Asignación de agente</td><td>Se asignó un técnico al ticket</td><td>Admin, Superadmin</td></tr>
  <tr><td>Eliminación de ticket</td><td>Se eliminó un ticket</td><td>Admin, Superadmin</td></tr>
  <tr><td>Creación de usuario</td><td>Se registró un nuevo usuario</td><td>Admin, Superadmin</td></tr>
  <tr><td>Cambio de rol</td><td>Se modificó el rol de un usuario</td><td>Admin, Superadmin</td></tr>
  <tr><td>Eliminación de usuario</td><td>Se eliminó un perfil de usuario</td><td><strong>Solo Superadmin</strong></td></tr>
  <tr><td>Activación/Desactivación</td><td>Se activó o desactivó un usuario</td><td><strong>Solo Superadmin</strong></td></tr>
  <tr><td>Inicio de suplantación</td><td>Se inició una sesión de impersonación</td><td><strong>Solo Superadmin</strong></td></tr>
</table>

<h2>6.3 Filtrar Logs</h2>
<ul>
  <li>Por tipo de acción</li>
  <li>Por usuario</li>
  <li>Por rango de fechas</li>
  <li>Por búsqueda de texto</li>
</ul>

<h1>7. Estadísticas y Reportes</h1>

<h2>7.1 Panel de Estadísticas</h2>
<p>Accede desde <strong>"Estadísticas"</strong> en el menú lateral. Incluye:</p>
<ul>
  <li><strong>Tendencia de tickets:</strong> gráfico de líneas por período</li>
  <li><strong>Tiempos de respuesta:</strong> promedio de resolución por departamento</li>
  <li><strong>Satisfacción del cliente:</strong> calificaciones promedio</li>
  <li><strong>Calificaciones de agentes:</strong> ranking de administradores por desempeño</li>
  <li><strong>Creadores frecuentes:</strong> usuarios que más tickets generan</li>
</ul>

<h2>7.2 Exportar Reportes</h2>
<ol>
  <li>En la página de Estadísticas, haz clic en <strong>"Exportar"</strong>.</li>
  <li>Selecciona el formato deseado (PDF o Excel).</li>
  <li>El reporte incluirá los filtros aplicados actualmente.</li>
</ol>

<h1>8. Configuración del Sistema</h1>

<h2>8.1 Temas y Apariencia</h2>
<ul>
  <li>Cambia entre <strong>modo claro</strong> y <strong>modo oscuro</strong> usando el ícono de sol/luna 🌙.</li>
  <li>La preferencia se guarda automáticamente.</li>
</ul>

<h2>8.2 Departamentos</h2>
<p>Los 12 departamentos del PAI están preconfigurados:</p>
<ol>
  <li>DIRECCIÓN PNEI–PAI</li>
  <li>ASESORÍA JURÍDICA</li>
  <li>DEPARTAMENTO DE RECURSOS HUMANOS</li>
  <li>FISCALIZACIÓN</li>
  <li>COORDINACIÓN TÉCNICA</li>
  <li>DEPARTAMENTO DE CENTRO NACIONAL DE VACUNAS</li>
  <li>DEPARTAMENTO DE SUPERVISIÓN NACIONAL</li>
  <li>DEPARTAMENTO DE VIGILANCIA DE ENFERMEDADES PREVENIBLES POR VACUNACIÓN</li>
  <li>DEPARTAMENTO DE SUB-SISTEMA DE INFORMACIÓN</li>
  <li>DEPARTAMENTO ADMINISTRATIVO</li>
  <li>UNIDAD DE MONITOREO Y EVALUACIÓN</li>
  <li>DEPARTAMENTO DE INVESTIGACIÓN, DOCENCIA, EDUCACIÓN Y COMUNICACIÓN SOCIAL</li>
</ol>

<h1>9. Indicador de Usuarios en Línea</h1>
<div class="tip"><strong>🔒 Exclusivo Superadmin:</strong> Esta función solo está disponible para tu rol.</div>
<p>En la barra superior verás un indicador que muestra cuántos usuarios están conectados al sistema en tiempo real. Al hacer clic, puedes ver la lista de usuarios activos.</p>

<h1>10. Seguridad y Buenas Prácticas</h1>

<h2>10.1 Recomendaciones de Seguridad</h2>
<ul>
  <li>Cambia tu contraseña periódicamente (cada 90 días recomendado).</li>
  <li>No compartas tus credenciales de superadministrador.</li>
  <li>Revisa los logs de auditoría semanalmente.</li>
  <li>Desactiva usuarios que ya no pertenezcan a la institución.</li>
  <li>Verifica los roles asignados regularmente.</li>
</ul>

<h2>10.2 Límites del Sistema</h2>
<table>
  <tr><th>Límite</th><th>Valor</th></tr>
  <tr><td>Tickets por hora por usuario</td><td>10</td></tr>
  <tr><td>Tamaño máximo de archivo</td><td>10 MB</td></tr>
  <tr><td>Retención de logs de auditoría</td><td>Según configuración</td></tr>
</table>

<h2>10.3 Respaldo de Datos</h2>
<p>El sistema cuenta con respaldos automáticos de la base de datos. Para exportar datos manualmente:</p>
<ol>
  <li>Usa la función de <strong>Exportar</strong> en Estadísticas para reportes.</li>
  <li>Usa el archivo <strong>schema_export.sql</strong> para la estructura de base de datos.</li>
</ol>

<h1>11. Solución de Problemas</h1>
<table>
  <tr><th>Problema</th><th>Solución</th></tr>
  <tr><td>No puedo iniciar sesión</td><td>Verifica email/contraseña. Usa "Olvidé mi contraseña" si es necesario.</td></tr>
  <tr><td>Un usuario no puede acceder</td><td>Verifica que su cuenta esté activa en la sección de Usuarios.</td></tr>
  <tr><td>No veo los gráficos</td><td>Ajusta el período de filtro. Puede que no haya datos en el rango seleccionado.</td></tr>
  <tr><td>El chat no envía mensajes</td><td>Recarga la página. Verifica la conexión a internet.</td></tr>
  <tr><td>No recibo notificaciones</td><td>Verifica los permisos del navegador para notificaciones.</td></tr>
</table>

<h1>12. Contacto Técnico</h1>
<p>Para problemas con el sistema mismo:</p>
<ul>
  <li><strong>Departamento de Sub-Sistema de Información</strong></li>
  <li>Email: subsistema.pai@mspbs.gov.py</li>
  <li>Responsable: Equipo de desarrollo PAI</li>
</ul>

${wordFooter}`;
}

export function downloadManual(type: 'support' | 'superadmin') {
  const content = type === 'support' ? generateSupportUserManual() : generateSuperadminManual();
  const filename = type === 'support' 
    ? 'Manual_Usuario_Soporte_PAI.doc' 
    : 'Manual_Superadministrador_PAI.doc';
  
  const blob = new Blob([content], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
