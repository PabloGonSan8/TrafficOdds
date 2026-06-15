import { Link } from "react-router-dom";

const EMAIL = "pablitocebre9@gmail.com";

export function ContactPage() {
  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <Link to="/" className="font-cond text-sm font-semibold text-dim hover:text-ink">← Volver al lobby</Link>

      <h1 className="mt-3 font-display text-2xl sm:text-3xl">Contacto</h1>

      <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink/90">
        <p>
          ¿Dudas, sugerencias o has encontrado un fallo? Escríbenos y te respondemos.
        </p>
        <p>
          📧 Correo:{" "}
          <a className="text-signal-amber underline" href={`mailto:${EMAIL}`}>{EMAIL}</a>
        </p>
        <p className="text-dim">
          TrafficOdds es un juego de entretenimiento con puntos virtuales, sin dinero real. Consulta nuestra{" "}
          <Link to="/privacidad" className="text-signal-amber underline">política de privacidad</Link>.
        </p>
      </div>
    </main>
  );
}
