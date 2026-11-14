# CodeQuest

App web progresiva (PWA) para aprender a programar con lecciones cortas, quizzes, vidas, XP, rachas, repaso espaciado y prueba de nivel. Sin dependencias ni paso de compilación: son archivos estáticos.

## Probarla en local
```
cd codequest
python3 -m http.server 8000      # abre http://localhost:8000
```
(El service worker y la instalación como app requieren http://localhost o HTTPS; con doble clic a `index.html` funciona pero sin modo offline.)

## Publicarla gratis (para promocionarla)
Sube la carpeta tal cual a cualquiera de estos (todos con HTTPS gratis): **Cloudflare Pages**, **Netlify** (arrastrar y soltar la carpeta), **GitHub Pages** o **Vercel**.
En el celular: abrir la URL → menú del navegador → "Añadir a pantalla de inicio" (se instala como app y funciona sin conexión).
Cuando cambies archivos, sube `V` en `sw.js` (`cq-v2`, …) para que los usuarios reciban la actualización.

## Contenido actual
Python (8 unidades) · JavaScript (7) · HTML y CSS (5) · SQL (5) · Java (5) · C (5) = 105 lecciones, 645 ejercicios.
Hoja de ruta ya visible en la app: TypeScript, C++, C#, Go, Rust, PHP, Kotlin, Swift, Ruby, Bash, R, Dart (`roadmap.js`).

## Añadir un lenguaje o lecciones
Lee `CONTENT_SPEC.md`. Un lenguaje = un archivo `content/<id>.js`. Luego:
1. `node validate.js content/<id>.js` (ejecuta tu código de ejemplo y verifica que las respuestas sean correctas; debe dar 0 errores).
2. Agrega `<script src="content/<id>.js">` en `index.html` y el archivo en `ASSETS` de `sw.js`; añade el id a `ORDER` en `app.js` y quítalo de `roadmap.js`.
No renombres ids de unidades/lecciones ya publicadas: el progreso de los usuarios depende de ellos.

## Ejercicios que ejecutan código
JavaScript se ejecuta en el navegador (Web Worker, con límite de tiempo). Python usa Pyodide, que se descarga del CDN la primera vez que aparece un ejercicio de escribir código (necesita internet esa vez; si falla, el usuario puede omitirlo sin penalización).

## Siguientes pasos hacia monetización (cuando haya usuarios)
- Cuentas y sincronización de progreso (Firebase/Supabase) — hoy el progreso vive en el dispositivo (hay exportar/importar).
- Plan "Plus": vidas ilimitadas, sin anuncios, certificados, rutas de carrera, tutor con IA.
- Empaquetar para tiendas con Capacitor (Android/iOS) y cobrar con suscripciones de la tienda o Stripe en web.
- Ligas semanales y amigos (requieren backend).
- Comprueba que el nombre "CodeQuest" esté libre antes de lanzarlo; la mascota "Bit" es original.
