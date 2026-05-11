export const metadata = {
  title: "Política de Privacidad | Vector Studio",
  description: "Política de privacidad para el agente de WhatsApp (Vector Studio).",
};

export default function PrivacyPage() {
  return (
    <main
      style={{
        maxWidth: 860,
        margin: "0 auto",
        padding: "48px 20px",
        lineHeight: 1.6,
      }}
    >
      <h1>Política de Privacidad</h1>
      <p>
        Última actualización: <strong>{new Date().toISOString().slice(0, 10)}</strong>
      </p>

      <h2>Resumen</h2>
      <p>
        Este servicio (&ldquo;Vector Studio&rdquo;) permite interactuar con un bot a través de
        WhatsApp. Usamos proveedores de mensajería (por ejemplo, Twilio o la API oficial
        de WhatsApp/Meta) para recibir y enviar mensajes.
      </p>

      <h2>Datos que recopilamos</h2>
      <ul>
        <li>
          <strong>Datos de mensajería</strong>: tu número de teléfono (ID de remitente), el
          contenido del mensaje que envías y metadatos técnicos (por ejemplo, timestamps).
        </li>
        <li>
          <strong>Datos técnicos</strong>: logs básicos de solicitudes (dirección IP, user-agent)
          para seguridad y diagnóstico.
        </li>
      </ul>

      <h2>Cómo usamos los datos</h2>
      <ul>
        <li>
          <strong>Proveer el servicio</strong>: responder a tus mensajes y mantener el contexto de la conversación.
        </li>
        <li>
          <strong>Mejorar y proteger</strong>: monitoreo, prevención de abuso y depuración.
        </li>
      </ul>

      <h2>Proveedores y terceros</h2>
      <p>
        Para operar el servicio podemos compartir datos estrictamente necesarios con:
      </p>
      <ul>
        <li>
          <strong>Proveedor de mensajería</strong> (p. ej. Twilio o WhatsApp Cloud API) para entregar mensajes.
        </li>
        <li>
          <strong>Proveedor de IA generativa</strong> (p. ej. Google Gemini) para generar respuestas del asistente.
        </li>
        <li>
          <strong>Hosting</strong> (Vercel) para ejecutar el backend y guardar logs operativos.
        </li>
      </ul>

      <h2>Retención</h2>
      <p>
        Conservamos los datos solo el tiempo necesario para operar el servicio y cumplir
        obligaciones legales. Podemos anonimizar o eliminar datos cuando ya no sean necesarios.
      </p>

      <h2>Tus derechos</h2>
      <p>
        Puedes solicitar acceso, corrección o eliminación de tus datos, así como retirar tu consentimiento
        cuando aplique.
      </p>

      <h2>Contacto</h2>
      <p>
        Para solicitudes relacionadas con privacidad:{" "}
        <a href="mailto:privacy@vectorstudio.example">privacy@vectorstudio.example</a>
      </p>

      <hr style={{ margin: "32px 0" }} />
      <p style={{ fontSize: 14, opacity: 0.8 }}>
        Nota: Este documento es una plantilla inicial. Ajusta el email de contacto y cualquier detalle
        legal según tu jurisdicción y el uso real del servicio.
      </p>
    </main>
  );
}

