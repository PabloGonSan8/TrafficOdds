import { Link } from "react-router-dom";

const EMAIL = "pablitocebre9@gmail.com";
const UPDATED = "15 de junio de 2026";

function H({ children }) {
  return <h2 className="mt-6 font-display text-lg text-signal-amber sm:text-xl">{children}</h2>;
}

export function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <Link to="/" className="font-cond text-sm font-semibold text-dim hover:text-ink">← Volver al lobby</Link>

      <h1 className="mt-3 font-display text-2xl sm:text-3xl">Política de privacidad</h1>
      <p className="mt-1 font-cond text-sm text-dim">Última actualización: {UPDATED}</p>

      <div className="mt-2 space-y-2 text-sm leading-relaxed text-ink/90">
        <H>Quiénes somos</H>
        <p>
          TrafficOdds es un juego de entretenimiento basado en apuestas con <strong>puntos virtuales</strong>.
          No se utiliza dinero real, no se compran ni se venden puntos y estos no tienen ningún valor económico.
          Responsable del sitio: el titular de TrafficOdds. Contacto: <a className="text-signal-amber underline" href={`mailto:${EMAIL}`}>{EMAIL}</a>.
        </p>

        <H>Qué datos tratamos</H>
        <p>
          No pedimos registro ni recogemos datos personales identificativos de forma directa. Tu progreso del juego
          (puntos, historial, ajustes) se guarda <strong>únicamente en tu navegador</strong> mediante
          almacenamiento local (localStorage); no se envía a ningún servidor nuestro.
        </p>

        <H>Cookies y publicidad</H>
        <p>
          El sitio es gratuito y se financia con publicidad. Utilizamos <strong>Google AdSense</strong>, un servicio de
          Google que puede usar cookies e identificadores para mostrar anuncios.
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>Google y sus socios pueden usar cookies para servir anuncios basados en tus visitas a este y otros sitios.</li>
          <li>Puedes gestionar la personalización de anuncios en{" "}
            <a className="text-signal-amber underline" href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">Configuración de anuncios de Google</a>.</li>
          <li>Más información sobre cómo Google usa los datos:{" "}
            <a className="text-signal-amber underline" href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">policies.google.com/technologies/partner-sites</a>.</li>
        </ul>

        <H>Consentimiento</H>
        <p>
          Al entrar, mostramos un aviso de cookies. Hasta que aceptas, los anuncios funcionan en modo
          <strong> no personalizado</strong> (Modo de Consentimiento de Google). Puedes cambiar tu elección
          borrando los datos del sitio en tu navegador y recargando la página.
        </p>

        <H>Terceros</H>
        <p>
          Cargamos fuentes de Google Fonts y la librería de anuncios de Google. Estos servicios pueden registrar
          datos técnicos (como tu dirección IP) conforme a sus propias políticas de privacidad.
        </p>

        <H>Menores</H>
        <p>El juego no está dirigido a menores de 14 años y no recoge datos de ellos a sabiendas.</p>

        <H>Tus derechos</H>
        <p>
          Puedes ejercer tus derechos de acceso, rectificación o supresión escribiendo a{" "}
          <a className="text-signal-amber underline" href={`mailto:${EMAIL}`}>{EMAIL}</a>. Como tus datos de juego
          viven solo en tu navegador, puedes borrarlos en cualquier momento desde los ajustes del navegador.
        </p>

        <H>Cambios</H>
        <p>Podemos actualizar esta política. Publicaremos los cambios en esta misma página.</p>

        <p className="pt-4">
          <Link to="/contacto" className="text-signal-amber underline">Contacto</Link>
        </p>
      </div>
    </main>
  );
}
