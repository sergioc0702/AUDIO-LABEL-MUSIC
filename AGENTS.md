# Contexto para agentes: Mi Música

Léelo antes de tocar el código. Resume qué es la app, cómo está armada, qué se
ha hecho y qué errores ya se corrigieron para no repetirlos. Las funciones para
usuarios están en `README.md`.

## Qué es

Reproductor de música local para Android, sin cuenta ni internet (salvo las
letras de LRCLIB). React Native 0.88 (nueva arquitectura), TypeScript,
Reanimated 4 + react-native-worklets, Gesture Handler, react-native-svg,
lucide-react-native y una copia propia de react-native-track-player con
KotlinAudio en `android/kotlin-audio/`.

- Repositorio: `github.com/sergioc0702/AUDIO-LABEL-MUSIC`, rama única `main`.
- El dueño habla español: responde en español. El código, los nombres y los
  comentarios van en inglés; los textos de la interfaz, en español.

## Comandos

```bash
npm install                    # aplica patches/ con patch-package
npx tsc --noEmit               # tipos: debe quedar sin errores
npx eslint App.tsx src __tests__ --ext .ts,.tsx   # 0 errores (avisos tolerados)
npx jest --silent              # todos los tests deben pasar
```

APK personal (PowerShell). Tarda unos 2 minutos y deja `MiMusica.apk` en la raíz:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-apk.ps1 -UseDebugSigningForPersonalRelease
```

- El aviso de que terminó llega tarde porque el demonio de Gradle retiene la
  salida. Vigila en paralelo la fecha de `MiMusica.apk` y avisa en cuanto
  cambie.
- Al terminar, detén Gradle con `cd android; .\gradlew --stop`, porque el PC
  tiene poco espacio y poca memoria.
- Comprueba que la fecha de `MiMusica.apk` sea posterior al inicio de la
  compilación.
- Para instalar: `adb install -r MiMusica.apk`, con el adb de
  `%LOCALAPPDATA%\Android\Sdk\platform-tools`. En Git Bash usa
  `MSYS_NO_PATHCONV=1` con adb.

Tests de Kotlin (ecualizador y cola):

```bash
export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ANDROID_HOME="$LOCALAPPDATA/Android/Sdk"
cd android && ./gradlew :kotlin-audio:testDebugUnitTest
```

## Cómo está armado

```
App.tsx                      pantallas, mini-reproductor, pestañas y hojas
index.js                     registra App y el servicio de reproducción
src/
  state/                     estado y acciones, sin interfaz
    AppContext.tsx           navegación, Atrás y estado compartido (useApp)
    useMusicController.ts    une las piezas de music/ y maneja el reproductor:
                             cola, mezcla, repetir, sesión y eliminar canciones
    music/                   una pieza por tema
      useNotices.ts          errores y avisos cortos de abajo
      useLibrary.ts          permiso, canciones, favoritas, carpetas, datos corregidos
      usePlaybackHistory.ts  recientes y más escuchadas
      usePlaylists.ts        listas, sus diálogos, el selector y M3U
      useSoundSettings.ts    velocidad, ecualizador, volumen parejo y fundido
      useTrackFiles.ts       compartir, tono, copia de seguridad y letras
      useSelection.ts        selección múltiple
      failure.ts             describeFailure: el texto de un error
  domain/                    reglas de la música, puras y con tests
                             (backup, collections, folders, lyrics, m3u,
                             shuffleQueue, sortTracks, trackEdits)
  services/
    playback/                lo que corre aunque la app esté cerrada
      PlaybackService.ts     botones de la notificación, del widget y del bloqueo
      player.ts              envoltorio de TrackPlayer (saltos, cola, opciones)
      session.ts             cola guardada y detalles (mezcla, origen)
      remoteShuffle.ts       mezcla desde el widget con las pantallas cerradas
      resumePositions.ts     posición guardada de los audios largos
      sleepTimer.ts, playbackErrors.ts
    lyricsSearch.ts          LRCLIB
  native/musicLibrary.ts     puente con el módulo nativo
  screens/                   Inicio (+ HomeShortcuts), Buscar, Biblioteca,
                             detalle, Ajustes (+ SettingsSheets) y SelectionBar
  navigation/TabBar.tsx      barra de pestañas (un aspecto por design.tabs)
  player/                    piezas comunes del reproductor
    PlaybackWindow.tsx       ventana que se abre y se cierra deslizando
    ThemedPlayer.tsx         elige el reproductor del tema activo
    MiniPlayer.tsx           mini-reproductor (un aspecto por design.mini)
    TrackMenu.tsx            menú de una canción
    PlaylistDialogs.tsx      añadir a lista, nombre, borrar y elegir canciones
    sheets/                  una hoja por archivo: temporizador, velocidad,
                             ecualizador, letras, tema y paleta, cola
    PlaybackQueue.tsx, controls.tsx …
    kit/                     lo que comparten los reproductores con tema
      playerKit.tsx          usePlayerKit, SeekArea, DragHeader, useTrackChange
      sceneClock.ts          useSceneClock y formas SVG animadas
      Marquee.tsx            título en una línea que se desplaza
  theme/                     el motor de temas
    types.ts                 ThemeDefinition, ThemeDesign, Palette
    design.ts                themedDesign y baseRadius
    theme.ts                 useColors y createStyles
  themes/                    los temas, uno por carpeta
    catalog.ts               lista y orden de los temas, resolveAppearance
    <id>/theme.ts            nombre, diseño y seis paletas
    <id>/<Nombre>Player.tsx  su reproductor a pantalla completa
    <id>/…                   ayudantes propios (dibujos, datos, lógica pura)
  ui/                        componentes reutilizables
  hooks/                     volumen del teléfono y movimiento reducido
  utils/                     formatos (tiempo, número de canciones)
  types/Track.ts             Track, Playlist y el historial
android/app/src/main/java/com/mymusicapp/player/
  MainActivity.kt, MainApplication.kt
  library/                   módulo de React: MediaStore, archivos y ajustes
    MusicLibraryModule.kt    lo que llama src/native/musicLibrary.ts
    PixelCover.kt            la carátula en pixel art del tema Terminal
  data/PlaylistDatabase.kt   Room: listas, historial, letras y metadatos
  widget/                    el widget de la pantalla de inicio
    PlaybackWidgetProvider.kt  botones, tamaño y estado del reproductor
    WidgetPainter.kt         dibuja el widget al estilo de cada tema
  auto/                      Android Auto (AndroidAutoService, MediaCatalog)
android/kotlin-audio/        copia propia de KotlinAudio
  audio/SoftwareEqualizerAudioProcessor.kt   ecualizador y fábrica de renderers
  audio/CrossfadeAudioProcessor.kt           fundido y PlaybackTuning (ajustes)
  audio/LoudnessMeter.kt                     medidor de sonoridad (BS.1770)
  audio/VolumeLeveler.kt                     analiza canciones y aplica el nivel
  notification/NotificationManager.kt        botones de la notificación
  notification/NotificationExtras.kt         estado de favorita, mezcla y repetir
```

- Un archivo hace una sola cosa y se llama como lo que hace. Si un archivo
  pasa de unas 800 líneas, sepáralo en partes (como `state/music/` o
  `player/sheets/`).
- La lógica pura va en `domain/` con su test; los hooks de `state/` la usan.
- Los textos de error se arman con `describeFailure(error, prefijo, respaldo)`.

### Funciones de la biblioteca y del sonido

- **Selección múltiple:** `selectedIds` vive en `state/music/useSelection.ts`. Las filas
  la reciben con `useTrackSelection()` y la barra es
  `src/screens/SelectionBar.tsx`. Una pulsación larga marca la canción; el menú
  queda en el botón ⋮. La selección se vacía al cambiar de pantalla o con Atrás.
- **Carpetas ocultas** (`excludedFolders`) y **datos corregidos**
  (`trackEdits`) son preferencias en JSON que se aplican en `loadLibrary`. Los
  datos corregidos no tocan el archivo de audio.
- **Audios largos:** `PlaybackService` guarda la posición de los audios de más
  de 20 minutos y la recupera al empezar a sonar.
- **Volumen parejo:** `VolumeLeveler` mide cada canción en segundo plano
  (unas ventanas repartidas, guardadas en `loudness.db`) y aplica el nivel con
  el volumen del reproductor, que actúa al instante. Solo atenúa.
- **Fundido:** `CrossfadeAudioProcessor` retiene siempre los últimos segundos.
  El renderer propio avisa del cambio de canción (`onProcessedStreamChange`) y
  el procesador conserva esa cola durante el `configure → fin de flujo → flush`
  que hace el sink en cada cambio. Un salto o una búsqueda la descartan
  (`cancelBlend`). El temporizador «al terminar la canción» lo suspende.
- **Atrás:** cierra la selección, vuelve de una pantalla de detalle o a
  Inicio. En Inicio pide un segundo toque antes de 2 s («Pulsa atrás otra vez
  para salir»); la música sigue sonando.
- **Cambiar de canción** desde la app, el widget, la notificación o el
  bloqueo siempre la reproduce, aunque estuviera en pausa.

### Los temas

| Carpeta | Reproductor | Idea |
|---|---|---|
| `estandar` | `NowPlaying.tsx` + `PlayerScene.tsx` | Reproductor clásico con escenas animadas |
| `kawaii` | `KawaiiPlayer.tsx` (+ `ShihTzu`, `dogMood`) | Shih tzu que reacciona al volumen y a la música |
| `brutalista` | `BrutalPlayer.tsx` | Cuadrícula de revista con titular que se escribe solo |
| `terminal` | `TerminalPlayer.tsx` | Consola con la carátula en pixel art nativo |
| `tornamesa` | `TurntablePlayer.tsx` | Deck de DJ con scratch, pitch y START·STOP |
| `mixtape` | `MixtapePlayer.tsx` | Walkman con casete y la portada en la etiqueta |
| `taquilla` | `TicketPlayer.tsx` | Boleta con talón que se arranca, sello y foil |
| `pixel` | `PixelPlayer.tsx` | Consola portátil con cartucho |
| `vaporwave` | `VaporwavePlayer.tsx` | Atardecer VHS con portada flotante y reflejo |
| `manga` | `MangaPlayer.tsx` (+ `chapterKanji`) | Página de manga con viñetas y onomatopeyas |
| `naveespacial` | `NaveEspacialPlayer.tsx` | Cabina que viaja entre canciones |
| `constelacion` | `ConstelacionPlayer.tsx` (+ `starFigures`) | Bestiario de animales de estrellas |
| `cyberpunk` | `CyberpunkPlayer.tsx` | Ruta neural por un Neo-Tokio con letreros en japonés |
| `terror` | `TerrorPlayer.tsx` | Linterna que recorre sola una habitación con algo dentro |
| `bloques` | `BloquesPlayer.tsx` (+ `blockPieces`) | La portada se arma con piezas que caen |
| `poder` | `PoderPlayer.tsx` | Esfera de energía que se carga con la canción |

Todos están rediseñados y probados en el teléfono.

### Cómo se pinta un tema

- `theme.ts` exporta un `ThemeDefinition`: `design` y seis paletas.
- `design` (con `themedDesign(player, fuenteTítulos, fuenteTexto, opciones)`)
  elige las fuentes, los radios y el aspecto de cuatro partes de la app:
  - `player`: qué reproductor muestra `src/player/ThemedPlayer.tsx`;
  - `home`: los accesos de `src/screens/HomeScreen.tsx`;
  - `tabs`: la barra de `src/navigation/TabBar.tsx`;
  - `mini`: el mini-reproductor de `src/player/MiniPlayer.tsx`.
- Cada paleta trae los colores generales de la app más `skin`
  (`Record<string,string>`), con los colores propios del tema. Los
  reproductores los leen como `colors.skin` y las fuentes como
  `colors.design.fonts`.
- `src/themes/catalog.ts` rellena lo que falta (`isLight`, `skin`, `scene`) y
  pega el diseño a cada paleta. Si una paleta guardada ya no existe, se usa la
  primera.
- Un reproductor solo dibuja: `usePlayerKit` le da la pista, la posición, las
  acciones, las herramientas y las hojas. Las animaciones usan
  `useSceneClock`, un reloj en el hilo de UI con:
  - `wall`, segundos desde que se ve;
  - `run`, que se detiene en pausa y acelera tras un cambio de canción;
  - `change`, que vale 1 justo al cambiar de canción y baja a 0;
  - `play`, entre 0 (pausa) y 1 (sonando);
  - `progress`, suavizado;
  - `unit`, píxeles por unidad de escena.

  El reloj se apaga solo cuando el reproductor está cerrado, tapado o con
  movimiento reducido.

### Cómo añadir un tema

1. Crea `src/themes/<id>/theme.ts` con su `ThemeDefinition` y añade `<id>` a
   `PlayerStyle` en `src/theme/types.ts`.
2. Regístralo en `src/themes/catalog.ts`, en el orden en que debe salir.
3. Crea `src/themes/<id>/<Nombre>Player.tsx` y regístralo en
   `src/player/ThemedPlayer.tsx`.
4. Si trae un aspecto nuevo de inicio, pestañas o mini-reproductor, añade la
   variante a `ThemeDesign` y dibújala en el archivo correspondiente.
5. Fuentes nuevas: `android/app/src/main/assets/fonts/` con su licencia en
   `licencias/`, solo si son libres y gratuitas.
6. Tests: actualiza `__tests__/themeDesigns.test.ts` (lista de temas, fuentes,
   claves de `skin`) y añade el test de su reproductor en
   `__tests__/App.test.tsx`.

### Nativo

- `src/native/musicLibrary.ts` y `library/MusicLibraryModule.kt`: MediaStore,
  Room, carátulas, archivos y ajustes. `getPixelCover` (en `PixelCover.kt`)
  convierte la carátula en pixel art (recorte cuadrado, Bayer 4×4, 6 tonos,
  PNG en caché); la usa el tema Terminal.
- `src/services/lyricsSearch.ts`: LRCLIB. El User-Agent es genérico y nunca
  debe llevar correos ni datos personales.
- **Notificación y bloqueo:** además de reproducir y saltar, traen favorita,
  mezcla y repetir (`NotificationExtras`). Un audio largo cambia anterior y
  siguiente por ±10 s (`setLongAudioControls`). En Android 13 o posterior el
  sistema solo muestra 2 botones extra.
  - Un toque llega a JS como el evento `notificationAction`. Con las
    pantallas abiertas lo atiende `useMusicController`; cerradas, la mezcla la
    hace `remoteShuffle.ts` en el servicio de reproducción.
  - El botón de mezcla cambia al instante y la app lo confirma o lo corrige
    con `setNotificationShuffle`.
- **Widget** (`widget/`): un solo diseño de 4 × 2 (`widget_music.xml`). Es un
  dibujo de `WidgetPainter` con el estilo del tema y la paleta que
  `AppContext` guarda con `storeWidgetLook`, más zonas táctiles invisibles en
  la misma cuadrícula: el corazón arriba a la derecha y cinco botones abajo.
  - Se redibuja con cada aviso del reproductor (`WIDGET_REFRESH`, que
    KotlinAudio manda con `setPackage`) y cada 5 s mientras suena. La
    carátula se lee una vez por canción.
  - Un `BroadcastReceiver` no puede enlazarse a un servicio con su propio
    contexto: usa siempre `applicationContext`.

## Estado y pendientes

Todo está en `main`. Pasan tsc, eslint (0 errores), 269 tests de jest y los
tests de Kotlin de `:kotlin-audio` y `:app`.

El dueño probó en el teléfono y confirmó que funcionan: el fundido, el volumen
parejo, la selección múltiple, las carpetas ocultas, editar datos, los audios
largos, el tono de llamada, el widget con el estilo de cada tema, los botones
de la notificación y el doble toque de Atrás.

Nunca se probó: una biblioteca de miles de canciones, Bluetooth y Android
Auto.

### Límites conocidos de lo ya hecho

Son decisiones tomadas para no arriesgar, no errores. Cámbialas solo si el
dueño lo pide.

- **Editar datos no escribe en el archivo.** Los cambios se guardan en la
  preferencia `trackEdits` y solo se ven en la app. No se puede cambiar la
  portada. Escribir etiquetas de verdad necesita una librería de etiquetas y
  `MediaStore.createWriteRequest`.
- **Los saltos de 10 s** están en la hoja de Velocidad (`SpeedSheet`) y, solo
  con audios largos, en la notificación y el widget. No hay botones en los
  reproductores.
- **La barra de progreso del widget** avanza cada 5 s, con los avisos de
  progreso del reproductor.
- **El volumen parejo solo baja** las canciones fuertes (`levelingGain` nunca
  pasa de 1). Subir las bajas necesita un limitador dentro del procesador de
  audio.
- **Una canción sin medir** suena al 60 % (`UNKNOWN_GAIN`) hasta que termina
  su análisis, y entonces el volumen se ajusta en 0,4 s.
- **El fundido se aplica siempre** en los cambios automáticos, también entre
  canciones seguidas de un mismo álbum.
- **Eliminar varias canciones a la vez** solo existe en Android 11 o posterior.
- **La pulsación larga** sobre una canción ahora la selecciona; el menú quedó
  en el botón ⋮. En las listas de reproducción sigue abriendo el menú, porque
  ahí las filas se arrastran para reordenar.
- **La copia de seguridad** guarda favoritas y listas, pero no las letras, los
  datos corregidos, las carpetas ocultas ni los ajustes.

### Ideas ofrecidas al dueño, sin decidir

No las empieces sin que las pida. Sus tres preferidas por utilidad son las
primeras.

1. Escribir las etiquetas y la portada en el archivo.
2. Botones de ±10 s a la vista en los reproductores cuando el audio es largo.
3. Listas inteligentes a partir del historial (no escuchadas hace un mes,
   añadidas esta semana).
4. Copia de seguridad completa.
5. Buscar dentro de la cola y de una lista.
6. Ordenar por artista, álbum, duración y año.
7. Número de pista para que los álbumes suenen en su orden.
8. Aviso de canciones duplicadas e información técnica del archivo.
9. Subir las canciones bajas con un limitador.
10. No fundir entre canciones seguidas de un mismo álbum.

### Cómo corregir algo del sonido

- Reproduce primero el fallo con un test en
  `android/kotlin-audio/src/test/`. `CrossfadeAudioProcessorTest` simula lo que
  hace el sink en un cambio de canción: `onStreamChange`, `configure`,
  `queueEndOfStream` y `flush`, en ese orden.
- El código real de ExoPlayer 2.19 que hay que respetar está en
  `DefaultAudioSink.handleBuffer` y `MediaCodecRenderer.onProcessedOutputBuffer`.
- Ningún test puede oír el resultado: después de compilar, pide al dueño que
  escuche y describa en qué momento falla.

## Cómo se trabaja un rediseño

1. Pregunta al dueño qué no le gusta y ofrécele ideas.
2. Haz un prototipo de 360×820. Hasta ahora se dibujaban en un lienzo de diseño
   de claude.ai, en archivos `.dc.html`. Esos archivos solo están en el PC y no
   se suben al repositorio.
3. Repite el prototipo hasta que lo apruebe.
4. Pásalo a la app.
5. Añade un test, y luego corre tsc, eslint y jest.
6. Compila el APK y **pregunta antes de instalarlo**.

## Reglas que salen de errores ya corregidos

**Tamaño:**
- El teléfono del dueño mide **360×820 dp**: 1080×2460 px a 480 dpi.
- Diseña y verifica a ese tamaño; muchos fallos vinieron de diseñar a 390 de
  ancho.
- Suma los anchos fijos de cada fila para que quepan en `360 − márgenes`.
- Reparte el espacio con flex (espaciadores o `space-evenly`) y calcula los
  tamaños con `useWindowDimensions`, sin posiciones absolutas rígidas para toda
  la pantalla.

**Portada y títulos:**
- La portada de la canción debe verse en todos los reproductores. Si una
  canción no tiene portada, muestra un dibujo con los colores de la paleta.
- Los títulos van en una sola línea con `numberOfLines={1}` (elipsis) o en
  marquesina. Si no, se montan sobre la portada.
- Las mayúsculas grandes necesitan `lineHeight` de al menos 1.2 veces el tamaño
  de la fuente.

**Animaciones y rendimiento:**
- Todo va en el hilo de UI con `useSharedValue`, `useAnimatedStyle`,
  `useAnimatedProps` y `useFrameCallback`.
- Nunca re-renderices el reproductor entero en cada fotograma. Un efecto de
  máquina de escribir vive en su propio componente pequeño.
- Usa una sola `Image` por portada. Si hace falta un reflejo, usa la misma URI
  **al mismo tamaño**, para que se decodifique una sola vez.
- Las animaciones de saltos o rebotes deben ser suaves: al dueño no le gusta que
  "salten mucho".
- Un worklet solo puede llamar a otros worklets. Pasarle una función normal de
  JS (por ejemplo, un ayudante `y()` de posiciones) cierra la app; pásale
  números o valores compartidos, y usa `scheduleOnRN` para volver a JS.
- No redibujes SVG grandes en cada fotograma: dibuja las capas fijas una vez y
  anima vistas con `transform` y `opacity`.
- Evita los gestos de arrastre libre dentro del reproductor; el tema Terror los
  cambió por un movimiento automático.

**Android:**
- Un borde punteado en un solo lado no es fiable; dibuja una línea SVG con
  `strokeDasharray`.
- `boxShadow`, incluido `inset`, funciona porque la app usa la nueva
  arquitectura.
- Las vistas enormes (miles de dp) no se pintan: limita su tamaño a unas dos
  pantallas.
- En degradados SVG, `stopColor` debe ir en hexadecimal; `rgb()` no funciona.

**Colores:**
- El texto siempre va sobre su pareja de color: `skin.onHot` sobre `skin.hot`,
  `onControl` sobre `control`, `onAccent` sobre `accent`.
- `__tests__/themes.test.ts` exige estos contrastes:
  - texto y `textSecondary`: 4.5 o más;
  - `accent`: 3 o más;
  - `danger`: 4.5 o más;
  - `onAccent` sobre `accent` y `onControl` sobre `control`: 4.5 o más.
- Cada color de `skin` que lee un reproductor debe existir en sus seis
  paletas; si falta, el color sale vacío sin avisar. `themeDesigns.test.ts`
  lo comprueba para Terror, Cyberpunk, Bloques y Poder.
- Los colores de un tema no deben parecerse a los de otro.

**Audio:**
- Un `AudioProcessor` que retiene audio debe seguir entregando salida mientras
  llena su reserva; si no, la pista se queda sin datos y hay un corte.
- Los cambios hechos dentro de un procesador se oyen con el retraso del búfer
  de la pista (hasta 0,75 s). Lo que deba coincidir con el cambio de canción
  que se oye va por el volumen del reproductor.
- `SoftwareEqualizerAudioProcessor.kt` debe copiar la entrada en su propio
  búfer cuando deja pasar el audio sin procesar. Antes, algunas canciones
  sonaban rotas hasta encender el ecualizador.
- El test `outputSurvivesTheDecoderReusingTheInputBuffer` cubre ese caso.

**Tests:**
- `__tests__/App.test.tsx` usa estas utilidades: `renderApp`, `press(label)`,
  `hasLabel`, `screenText`, `setActive`, `settle` y `makeTrack`.
- Cada reproductor rediseñado tiene su propio test, que comprueba:
  - las etiquetas de accesibilidad;
  - que la portada aparezca;
  - que siga funcionando tras un cambio de canción;
  - el menú "Más".
- Si un tema mueve herramientas al menú "Más", añádelo a la lista de excepción
  de `the %s theme brings its own player`.
- Al añadir una función al puente `src/native/musicLibrary.ts`, añádela también
  al `jest.mock` de ese módulo en `__tests__/App.test.tsx`; si falta, la app
  de prueba falla al llamarla.
- Un test que cambia `getStoredPreference` debe dejarlo al final como estaba
  (`mockResolvedValue(null)`), porque los mocks se comparten entre tests.
- El mock de Reanimated está en `jest.setup.js`; ahí se añadieron
  `Easing.steps`, `withSpring`, `useDerivedValue` y `useAnimatedReaction`.
- Mantén estas etiquetas, porque otros tests las usan:
  - `Cerrar reproductor`;
  - `Canción anterior`;
  - `Siguiente canción`;
  - `Pausar` / `Reproducir`;
  - `Añadir a favoritas` / `Quitar de favoritas`;
  - `Más opciones: temporizador, velocidad, ecualizador y acciones`.

## Preferencias del dueño

**Teléfono:**
- Pregunta antes de instalar en el teléfono.
- No uses el teléfono mientras el dueño lo esté usando.
- Si ves contenido privado en pantalla (chats, por ejemplo), no lo describas.
- No cambies ajustes del teléfono ni del sistema. La rotación automática está
  activada a propósito.

**Git:**
- No hagas commit, push ni merge sin que lo pida.
- Sube solo lo que hace funcionar la app. Nunca subas notas, prototipos
  (`docs/`, `DESIGN.md`, `PRODUCT.md`), configuraciones de herramientas
  (`.claude/`, `.codex/`, `.cursor/`, `.gemini/`, `.impeccable/`, `.vscode/`)
  ni el APK. Ya están en `.gitignore`.
- Los mensajes de commit van en español y en presente ("Rehace…", "Corrige…").

**PC:**
- El disco del PC está casi lleno. No dupliques el proyecto, no crees
  worktrees innecesarios y limpia después de compilar.
- El proyecto vive en `C:\Users\sergio\Desktop\MYMUSICAPP`. Es la única copia;
  ábrelo siempre desde ahí.
