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
- **La sesión se recuerda:** al reabrir la app vuelven la cola, la canción, la
  posición, la mezcla y la repetición, sin que empiece a sonar sola.
- **Temporizador:** 15 a 90 minutos o al terminar la canción. Funciona en segundo
  plano porque vive en el servicio de reproducción.
- **Menú de cada canción:** reproducir a continuación, añadir a la cola o a una
  lista, favoritas, ir al álbum o al artista, y eliminar del dispositivo.
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

El resultado queda en `MiMusica.apk`. Esa firma usa la clave pública de depuración
de Android. Para firmar con una clave propia, define estas variables y ejecuta
`npm run build:apk`; guarda el keystore fuera del repositorio:

- `MYMUSICAPP_RELEASE_STORE_FILE` (ruta absoluta)
- `MYMUSICAPP_RELEASE_STORE_PASSWORD`
- `MYMUSICAPP_RELEASE_KEY_ALIAS`
- `MYMUSICAPP_RELEASE_KEY_PASSWORD`

Android no permite actualizar una app instalada con otra firma: cambiarla obliga a
desinstalar, y eso borra listas, favoritas e historial.

## Organización del código

- `App.tsx`: estructura general, pestañas y avisos.
- `src/state/useMusicController.ts`: toda la lógica de biblioteca, cola y listas,
  sin interfaz. `src/state/AppContext.tsx`: navegación y estado compartido.
- `src/screens/`: Inicio, Buscar, Biblioteca, detalle y Ajustes.
- `src/player/`: reproductor, mini-reproductor, cola, ecualizador, temporizador y
  menús.
- `src/ui/`: componentes reutilizables. `src/theme/theme.ts`: colores y tipografía.
- `src/services/`: reproductor, sesión guardada y temporizador.
- `src/native/` y `android/app/`: acceso a MediaStore y base de datos Room.
- `android/kotlin-audio/`: copia local de KotlinAudio (licencia Apache 2.0, en su
  carpeta) con el ecualizador por software y correcciones de la cola.
- `PRODUCT.md`: qué es el producto y para quién.
