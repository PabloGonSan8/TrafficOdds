# Solicitud de reconsideración — trafficodds.netlify.app

> Pega el texto de abajo en Search Console → Acciones manuales → Solicitar revisión.
> Mensaje de referencia del foro: **[WNC-633901]**

---

## Texto para enviar (español)

Hola:

He recibido una acción manual por "problemas graves de spam" en
trafficodds.netlify.app y he revisado mi sitio a fondo contra las políticas de
spam de Google. He hecho los siguientes cambios para corregir las señales que
podían interpretarse como spam:

1. **Publicidad eliminada por completo.** He retirado todo el código de Google
   AdSense del sitio: la etiqueta del SDK del `<head>`, los bloques de anuncio
   de la aplicación, los marcadores "Espacio publicitario" y el fichero
   `ads.txt`. El sitio ya no carga ningún anuncio ni script publicitario, de modo
   que no puede percibirse como una página creada principalmente para mostrar
   anuncios.

2. **Eliminada la meta etiqueta de keywords** (relleno de palabras clave) de la
   portada.

3. **Contenido propio y original.** Las páginas de guías, "Cómo funciona" y FAQ
   son textos escritos a mano que explican cómo se juega cada modo, cómo se
   calculan las cuotas y qué probabilidad hay detrás de cada apuesta. No hay
   contenido copiado, generado automáticamente ni traducido de otras webs.

Sobre la naturaleza del sitio: TrafficOdds es un **juego de entretenimiento que
funciona exclusivamente con puntos virtuales**. No se usa dinero real, no se
pueden comprar ni vender puntos, y los puntos no tienen ningún valor económico.
No es una casa de apuestas ni un casino con dinero real; es un simulador. El
modo principal es original: apuestas de puntos sobre una simulación de tráfico
de vehículos generada en el navegador.

Quedo a disposición para cualquier aclaración o cambio adicional que necesiten.
Gracias por revisar de nuevo el sitio.

Un saludo,
TrafficOdds

---

## Antes de enviar

- [ ] **Desplegar** los cambios en Netlify (push a `main` → build automático).
- [ ] Verificar en producción que NO carga `pagead`/`adsbygoogle` (DevTools →
      Network, filtro "pagead": debe salir 0 peticiones).
- [ ] Comprobar que `https://trafficodds.netlify.app/ads.txt` da 404.
- [ ] Esperar a que Google recachee (puedes pedir indexación de la portada y de
      `/guias` en Search Console → Inspección de URL).
- [ ] Enviar la solicitud de reconsideración con el texto de arriba.

## Si la revisión se rechaza (siguiente palanca)

El siguiente sospechoso es el **contenido a escala**: 14 de 15 juegos son
clásicos de casino genéricos (ruleta, blackjack, baccarat…) con guías de
estructura idéntica generadas por un script. Si vuelven a rechazar:

- Quedarte solo con el concepto original (tráfico) y unos pocos juegos, y
  `noindex` al resto de guías.
- Considerar un dominio propio en lugar del subdominio `netlify.app`
  (los subdominios gratuitos con temática de apuestas se marcan en bloque).
