# Mi Música (Android)

Reproductor local creado con React Native y TypeScript. La biblioteca se obtiene
de `MediaStore` y completa título, artista, álbum y carátula con
`MediaMetadataRetriever` cuando faltan datos en el índice de Android.

## Pasos para ejecutar

1. Instala Node.js 22.11 o posterior, Android Studio, Android SDK y un JDK
   compatible con la versión de Android Gradle Plugin del proyecto.
2. Configura `ANDROID_HOME` y prepara un emulador Android o conecta un teléfono
   con depuración USB activada.
3. En la raíz del proyecto, ejecuta `npm install`.
4. Inicia Metro con `npm start`.
5. En otra terminal, ejecuta `npm run android`.
6. Acepta el permiso de audio para escanear el dispositivo. La biblioteca se
   actualiza al detectar cambios de MediaStore y al volver a abrir la app;
   también puedes usar el botón ↻ para volver a escanear manualmente. Android
   no mantiene este monitoreo continuo cuando el proceso está cerrado.

## Generar o actualizar el APK

La compilación release para distribuir requiere un keystore privado propio.
Configura estas variables de entorno antes de ejecutar `npm run build:apk`:

- `MYMUSICAPP_RELEASE_STORE_FILE`: ruta absoluta al keystore.
- `MYMUSICAPP_RELEASE_STORE_PASSWORD`
- `MYMUSICAPP_RELEASE_KEY_ALIAS`
- `MYMUSICAPP_RELEASE_KEY_PASSWORD`

Guarda el keystore y sus contraseñas fuera del repositorio; en CI, usa el
almacén de secretos del proveedor. Gradle detiene la compilación release si
falta alguna variable o el keystore no existe. La variante debug conserva su
firma de depuración y no necesita estas variables.

Con la firma configurada, el script compila una versión instalable con el
bundle de JavaScript incluido y copia el resultado a `MiMusica.apk` en la raíz
del proyecto, reemplazando el APK anterior solo después de una compilación
exitosa. Después de copiarlo, elimina los APK intermedios de release y debug
para conservar un único instalable en el proyecto. El APK existente no cambia
si falta la firma o falla la compilación.

Para uso personal se puede compilar explícitamente con la clave debug incluida
en Android:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-apk.ps1 -UseDebugSigningForPersonalRelease
```

Ese APK incluye el bundle y no necesita Metro, pero no es apropiado para
distribución ni puede actualizar una instalación firmada con otro certificado.
Al completar correctamente esa compilación, el script elimina también el
keystore release y la contraseña cifrada guardados en
`%LOCALAPPDATA%\MiMusicApp\signing`.

## Funcionalidad incluida

- Biblioteca de canciones, álbumes y artistas con búsqueda; al reproducir un
  álbum o artista, la cola se limita a ese grupo. Los álbumes se identifican
  por su ID de MediaStore para distinguir títulos repetidos.
- Listas de reproducción locales: crear, renombrar y eliminar listas; añadir o
  quitar canciones, reordenarlas y reproducirlas en el orden guardado. También
  se puede guardar la cola actual como una lista. Los datos se conservan en una
  base de datos Room del dispositivo; eliminar una lista no borra los archivos
  de audio.
- Orden cíclico de canciones por nombre ascendente, nombre descendente y fecha
  de incorporación, sin abrir menús.
- Biblioteca con acciones de reproducir todo y aleatorio, selector de orden,
  filtro de género en hoja inferior con chip removible, actualización automática
  al detectar nuevas canciones indexadas por Android y al volver a primer
  plano, actualización al arrastrar hacia abajo e índice alfabético. El escaneo
  incluye las carpetas de audio indexadas por MediaStore, no solo una carpeta
  elegida en la app. Las listas de canciones y reproducciones recientes se
  virtualizan para dibujar solo las filas cercanas a la pantalla. Los géneros
  conocidos se presentan en español sin cambiar las etiquetas originales
  almacenadas.
- Filas de canción compactas con indicador animado para la pista activa, menú
  contextual de duración y favoritos y gesto lateral para alternar favoritos.
  La búsqueda queda fija, el título se contrae al desplazarse y la carga inicial
  usa skeletons.
- Detalle de álbumes y artistas con su listado completo de pistas; reproducir
  una canción desde el detalle mantiene la cola limitada al grupo.
- Favoritos persistentes en el dispositivo y filtro para ver solo esas canciones.
- Acciones por canción para reproducirla a continuación o añadirla al final de
  la cola, sin reemplazar lo que ya está sonando. Si ya está en la cola, se
  evita duplicarla y se informa al usuario.
- Eliminación física de una canción desde el menú de opciones de la biblioteca,
  con confirmación previa y autorización del sistema; también se quitan sus
  referencias guardadas de favoritos, listas, historial y cola. El menú de las
  canciones dentro de listas no ofrece esta acción.
- Pantalla de Inicio con acceso a reproducción reciente, favoritas, listas,
  álbumes y canciones añadidas; navegación inferior de Inicio, Buscar y
  Biblioteca, con las secciones de colección dentro de Biblioteca.
- Mini-reproductor persistente, vista ampliada de
  reproducción y cola accesible desde el reproductor; permite arrastrar pistas
  desde el asa sin fondo para reordenarlas con una indicación visible del destino.
  El asa toma el gesto directamente y pausa el desplazamiento normal de la lista
  mientras se arrastra; la cola también se desplaza automáticamente cerca de sus
  bordes. La pista arrastrada se eleva sobre las demás; también se pueden quitar
  deslizándolas a la derecha, con opción de deshacer durante tres segundos.
- Mezcla efectiva de la cola en reproducción: conserva la pista actual, baraja
  las siguientes y permite volver al orden previo mientras no se modifique
  manualmente la cola.
- El botón Atrás de Android cierra primero los modales y vuelve desde los
  detalles de álbum, artista o lista a su listado; desde las demás secciones
  regresa a la biblioteca.
- Barra de progreso táctil con área amplia: permite saltar a un punto con un toque
  o arrastrar el indicador, con posición previsualizada y tiempos sincronizados.
- Lectura de etiquetas y carátulas del álbum o incrustadas en cada pista.
- Filtro de género a partir de las etiquetas que Android puede extraer; las
  pistas sin esa etiqueta siguen disponibles en la biblioteca general.
- Reproducción en segundo plano, controles de notificación y controles básicos
  del reproductor; los botones multimedia permiten reproducir, pausar, detener,
  avanzar, retroceder y buscar posiciones.
- Historial persistente de las canciones reproducidas recientemente, con opción
  de borrarlo. El historial guarda hasta 500 reproducciones y muestra hasta 100
  canciones distintas.
- Velocidad de reproducción ajustable entre 0,75× y 2×, guardada en el
  dispositivo.
- La cola permite quitar todas las canciones siguientes sin detener la actual.
- Temporizador de apagado de 15, 30, 45 o 60 minutos, con cuenta regresiva,
  cancelación y pausa automática de la reproducción.
- Ecualizador software de cinco bandas (60 Hz, 250 Hz, 1 kHz, 4 kHz y 12 kHz),
  con controles de −12 a +12 dB, perfiles y ajustes persistentes. Procesa el
  PCM en el audio sink de ExoPlayer, sin efectos globales ni ID de sesión de
  audio. La cadena PCM se mantiene para aplicar cambios en tiempo real, por lo
  que no hay passthrough/offload de audio comprimido; al desactivar el
  ecualizador, los samples pasan sin cambios.
- Permisos de audio adaptados a Android 13 y versiones anteriores.
- La interfaz adopta el diseño oscuro con acento lima del prototipo
  `brutal-player-rn`; los colores, tipografía, espaciado, radios y movimiento
  están definidos mediante tokens en `src/theme/tokens.ts`. El índice
  alfabético y el filtro de géneros se apoyan en `src/utils/sortTracks.ts`.

El proyecto solo incluye el destino Android. La disponibilidad de formatos y
la calidad de los metadatos dependen de los archivos y de la versión del sistema.
El módulo local de KotlinAudio conserva su licencia Apache 2.0 en
`android/kotlin-audio/LICENSE`.

## Organización del código

- `App.tsx` compone la interfaz, administra el estado de navegación y conecta
  las acciones de pantalla con los servicios de la aplicación.
- `src/services/player.ts` concentra las operaciones de `react-native-track-player`,
  como preparar el reproductor, gestionar la cola y ejecutar controles de
  reproducción.
- `src/services/PlaybackService.ts` registra el servicio de reproducción en
  segundo plano.
- `src/native/` contiene el acceso a la biblioteca local y su persistencia;
  `src/theme/`, `src/types/` y `src/utils/` agrupan tokens visuales, tipos y
  lógica reutilizable respectivamente.
