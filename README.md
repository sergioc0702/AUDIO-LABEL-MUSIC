# Mi Música (Android)

Reproductor de música local hecho con React Native y TypeScript. Funciona con
los archivos del teléfono, sin cuenta y sin internet. La biblioteca sale de
`MediaStore`; las etiquetas leídas se guardan en Room y cada archivo solo se
vuelve a abrir si cambia.

## Funciones

- **Inicio:** accesos a favoritas, más escuchadas, recientes, añadidas y listas,
  mezcla de toda la biblioteca, y filas de recientes, listas, álbumes y artistas.
- **Buscar:** resultados agrupados en canciones, artistas, álbumes y listas, sin
  distinguir acentos. Sin texto, muestra los géneros disponibles.
- **Biblioteca:** canciones, álbumes, artistas, listas y carpetas, con orden por
  nombre o por fecha de incorporación.
- **Reproductor:** cola editable con arrastre y deshacer, mezcla que conserva la
  canción actual y permite recuperar el orden, repetición, velocidad de 0,75× a
  2× y ecualizador de cinco bandas con perfiles. Se abre deslizando hacia arriba
  el mini-reproductor, se cierra deslizando hacia abajo y la carátula cambia de
  canción al deslizarla a los lados.
- **Temas y paletas de colores:** en Ajustes se elige el diseño Estándar o uno de
  quince temas: Kawaii, Brutalista, Terminal, Tornamesa, Mixtape, Taquilla, Pixel,
  Vaporwave, Manga, Nave espacial, Constelación, Cyberpunk, Terror, Bloques y
  Poder. Cada tema tiene su propio reproductor animado, sus fuentes, su inicio,
  sus pestañas, su mini-reproductor y seis paletas de colores; la paleta colorea
  toda la app.
- **Letras sincronizadas:** al abrir Letras, la app busca gratis la letra de la
  canción en LRCLIB (lrclib.net) y la guarda para usarla sin internet. Si trae
  tiempos, avanza con la música y tocar una línea salta a esa parte; también se
  puede importar un archivo LRC. Solo se envían el título, el artista, el álbum
  y la duración.
- **La sesión se recuerda:** al reabrir la app vuelven la cola, la canción, la
  posición, la mezcla y la repetición, sin que empiece a sonar sola.
- **Temporizador:** 15 a 90 minutos o al terminar la canción. Funciona en segundo
  plano porque vive en el servicio de reproducción.
- **Menú de cada canción:** reproducir a continuación, añadir a la cola o a una
  lista, favoritas, ir al álbum o al artista, compartir y eliminar del dispositivo.
- **Copia de seguridad:** guarda favoritas y listas en un archivo y las restaura en
  este u otro teléfono, buscando las canciones por título y artista. Restaurar
  añade lo guardado, sin borrar nada.
- **Biblioteca limpia:** solo muestra lo que Android marca como música, y en Ajustes
  se pueden ocultar los audios de menos de 30 segundos.
- **Listas:** crear, renombrar, eliminar, reordenar y guardar la cola como lista.
- Reproducción en segundo plano, notificación, botones de audífonos y paso sin
  silencios entre canciones.

## Ejecutar

1. Instala Node.js 22.11 o posterior, Android Studio, el SDK y un JDK compatible.
2. Conecta un teléfono con depuración USB o abre un emulador.
3. Ejecuta `npm install`, luego `npm start` y, en otra terminal, `npm run android`.

## Generar el APK

Para uso personal, sin firma propia:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-apk.ps1 -UseDebugSigningForPersonalRelease
```

El resultado queda en `MiMusica.apk`.
Esa firma usa la clave pública de depuración de Android. Para firmar con una clave propia, define estas variables y ejecuta
`npm run build:apk`; guarda el keystore fuera del repositorio:

- `MYMUSICAPP_RELEASE_STORE_FILE` (ruta absoluta)
- `MYMUSICAPP_RELEASE_STORE_PASSWORD`
- `MYMUSICAPP_RELEASE_KEY_ALIAS`
- `MYMUSICAPP_RELEASE_KEY_PASSWORD`

Android no permite actualizar una app instalada con otra firma: cambiarla obliga a
desinstalar, y eso borra listas, favoritas e historial.

## Organización del código

- `App.tsx`: estructura general: pantallas, mini-reproductor, pestañas y hojas.
- `src/state/useMusicController.ts`: toda la lógica de biblioteca, cola y listas,
  sin interfaz. `src/state/AppContext.tsx`: navegación y estado compartido.
- `src/screens/`: Inicio, Buscar, Biblioteca, detalle y Ajustes.
- `src/navigation/TabBar.tsx`: la barra de pestañas.
- `src/player/`: lo común a todos los reproductores: la ventana, el
  mini-reproductor, la cola, el ecualizador, el temporizador y los menús.
  `src/player/kit/` reúne lo que usan los reproductores con tema (datos y
  acciones, reloj de animación, marquesina).
- `src/theme/`: el motor de temas: los tipos (`types.ts`), los ayudantes de
  diseño (`design.ts`) y `useColors` / `createStyles` (`theme.ts`).
- `src/themes/`: un tema por carpeta. Cada una tiene `theme.ts` (nombre, diseño y
  seis paletas), su reproductor y sus ayudantes. `src/themes/catalog.ts` decide
  qué temas hay y en qué orden. Cómo añadir uno: ver `AGENTS.md`.
- `src/ui/`: componentes reutilizables.
- `src/services/`: reproductor, sesión guardada y temporizador.
- `src/native/` y `android/app/`: acceso a MediaStore y base de datos Room.
- `android/kotlin-audio/`: copia local de KotlinAudio (licencia Apache 2.0, en su
  carpeta) con el ecualizador por software y correcciones de la cola.
