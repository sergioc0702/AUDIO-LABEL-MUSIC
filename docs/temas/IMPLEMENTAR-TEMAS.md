# Encargo: implementar los seis temas de Mi Música

Sergio aprobó seis temas nuevos para la app. Hoy solo existe el tema Estándar. Este documento dice qué construir; los prototipos dicen cómo se ve y cómo se mueve.

## Material de referencia

- `docs/temas/prototipos/`: los 14 prototipos. Son HTML con plantilla propia (`.dc.html`), no código para copiar. Cada archivo tiene arriba el marcado y abajo la lógica de la animación y sus paletas en `PALETTES`.
- `docs/temas/capturas/`: cómo se ven, incluidas las paletas nuevas.
- Lienzo original: https://claude.ai/artifact/7SGyUdjgAm5vkpHhSdQKAA. Es privado y solo Sergio puede abrirlo. Si cambió algo allí después de esta copia, él lo avisará.

Las canciones, artistas y carátulas de los prototipos son inventados. En la app se usan los datos reales.

## Antes de empezar

1. Deja a salvo el trabajo sin commit actual (letras, widget, Android Auto, reproductor con Reanimated) en una rama propia, y pregunta a Sergio si no está terminado.
2. Crea una rama para los temas a partir de ese trabajo. No unas nada a `main` sin que Sergio lo confirme.
3. Lee `PRODUCT.md` y `DESIGN.md`. Estándar sigue existiendo y debe verse igual que hoy.

## Modelo de temas

- Un **tema** es el diseño de toda la app: reproductor, Inicio, Buscar, Biblioteca, colecciones, Ajustes, hojas, mini-reproductor, pestañas y avisos.
- Una **paleta** solo cambia colores, y cada tema tiene las suyas.
- Tema y paleta se eligen únicamente en Ajustes, en el grupo Apariencia, y se guardan entre sesiones.
- Amplía `appThemes` en `src/theme/themes.ts`. Si un tema guardado ya no existe, debe caer en el primero, como hace hoy `resolveAppearance`.
- Las claves de `PALETTES` de los prototipos no coinciden con el tipo `Palette` de la app. Tradúcelas a sus papeles (`background`, `surface`, `text`, `accent`...) y añade papeles solo si un tema los necesita de verdad.
- Si cambias de tema, la app pasa a la paleta inicial de ese tema, indicada en la tabla de abajo. Ponla primera en la lista del tema, porque `resolveAppearance` recurre a la primera paleta.

## Los seis temas

| Tema | Prototipo del reproductor | Prototipo de Inicio | Tipografía de referencia | Paleta inicial |
|---|---|---|---|---|
| Kawaii | `Circulo.dc.html` | `Inicio-Kawaii.dc.html` | Fredoka | Algodón |
| Brutalista | `Main.dc.html` | `Inicio-Brutalista.dc.html` | Anton, Archivo | Ácido |
| Terminal | `Onda.dc.html` | `Inicio-Terminal.dc.html` | JetBrains Mono | Ámbar |
| Tornamesa | `Vinilo.dc.html` | `Inicio-Tornamesa.dc.html` | Bricolage Grotesque | Nogal |
| Mixtape | `Casete.dc.html` | `Inicio-Mixtape.dc.html` | Reenie Beanie, Barlow Condensed | Naranja |
| Taquilla | `Boleta.dc.html` | `Inicio-Taquilla.dc.html` | Alfa Slab One, Courier Prime | Taquilla rosa |

Cada tema tiene seis paletas, definidas en el `PALETTES` de su prototipo. Las tipografías deben ir dentro del APK, porque la app funciona sin internet; revisa su licencia al incluirlas.

Solo hay prototipo del reproductor y de Inicio. Las demás pantallas deben seguir el mismo lenguaje de cada tema, sin perder ninguna función.

## Animación especial de cada tema

- **Kawaii:** el shih tzu (abajo). Además, tocarlo lo alegra un momento.
- **Brutalista:** movimiento a saltos, sin suavizado. Al pausar o cambiar de canción, la imagen se parte en franjas que se desplazan, los colores se invierten un instante y el título golpea. Barras que saltan con la música y texto corrido.
- **Terminal:** estética de consola estilo PowerShell, sin su logo. Cada acción se escribe como comando letra por letra, con cursor parpadeante. Barra de progreso de texto y onda dibujada con caracteres, que se agita cerca de la posición actual.
- **Tornamesa:** el disco gira y frena poco a poco al pausar, la aguja avanza con la canción y se levanta al pausar, los discos se intercambian al cambiar de canción y el medidor de aguja se mueve.
- **Mixtape:** los carretes giran y cambian de tamaño con el avance, la cinta se rebobina con sacudida al cambiar de canción, el título se escribe a mano y las figuras geométricas flotan.
- **Taquilla:** al cambiar de canción, la boleta se rasga por la perforación, entra una nueva y cae el sello "ADMITIDO". El código de barras se imprime con el avance.

## El shih tzu del tema Kawaii

Referencia: `Perrito.dc.html` y `Estados.dc.html`. Debe ser un componente propio con `react-native-svg`, animado en el hilo de interfaz con Reanimated.

| Estado | Condición | Comportamiento |
|---|---|---|
| Triste | Música en pausa | Cabeza baja, orejas caídas, lágrimas, globo "¿Y la música?" |
| Ansioso | Sonando con volumen menor de 35 % | Mira el control de volumen, golpetea con las patas, suda, globo "¡Súbele!" |
| Tranquilo | Volumen de 35 a 70 % | Mueve la cabeza y la cola con calma |
| Muy feliz | Volumen mayor de 70 % | Salta, saca la lengua, corazones, globo "¡Guau, guau!" |

Las transiciones entre estados deben ser suaves, como en el prototipo. También va, en pequeño, en el mini-reproductor.

### Volumen

Se refiere al volumen multimedia del teléfono.

- Leerlo: `AudioManager.getStreamVolume(STREAM_MUSIC)` y `getStreamMaxVolume(STREAM_MUSIC)`, expuestos en `MusicLibraryModule.kt`.
- El control con forma de hueso cambia ese mismo volumen con `setStreamVolume`. Comprueba `isVolumeFixed()`: en esos equipos el perrito se queda en Tranquilo y el control se desactiva.
- Detectar cambios: Android no ofrece un listener público para esto, así que se usan dos capas, y la lectura con `getStreamVolume` es siempre la única fuente del valor.
  1. **Aviso inmediato:** un `BroadcastReceiver` dinámico para `android.media.VOLUME_CHANGED_ACTION`, registrado con `ContextCompat.registerReceiver` y `RECEIVER_NOT_EXPORTED`. Es una acción oculta y sin garantía, así que úsala solo como señal para volver a leer `getStreamVolume`. No leas sus extras.
  2. **Red de seguridad:** consulta `getStreamVolume` cada segundo mientras el reproductor Kawaii esté visible y la app en primer plano. Si el aviso deja de llegar en otra versión de Android, el perrito reacciona igual, con hasta un segundo de retraso.
- Registra y quita el receiver junto con esa pantalla, para no gastar batería en segundo plano. Emite el valor a JavaScript como evento del módulo nativo, en porcentaje.
- No uses un `ContentObserver` sobre `Settings.System`: hay informes de que no avisa de los cambios hechos con `setStreamVolume` y de que falla en algunos equipos.
- Prueba en el teléfono los botones físicos, el control con forma de hueso y unos audífonos Bluetooth. Comprueba también que el perrito siga reaccionando si desactivas el receiver, para validar la red de seguridad.

## Requisitos

- Ningún tema quita funciones: cola, letras, temporizador, velocidad, ecualizador, favoritas, mezcla, repetición y menú de la canción.
- Controles táctiles de al menos 48 dp y etiquetas de accesibilidad en español.
- Contraste de 4,5:1 en texto y 3:1 en elementos grandes, en todas las paletas. Amplía `__tests__/themes.test.ts` para cubrirlas.
- Las animaciones se detienen con la música en pausa o el reproductor cerrado, salvo la reacción de pausa, y respetan la opción de reducir movimiento.
- Sin marcas ni logotipos de terceros.
- Mide la fluidez en el teléfono real, sobre todo Vinilo, Casete y el shih tzu.
- La onda del tema Terminal es decorativa, igual que en el prototipo. No analices el audio real.

## Orden sugerido

1. Estructura de temas, tipografías y selector en Ajustes.
2. Un tema completo de punta a punta, Kawaii, para validar la estructura y el volumen.
3. Los otros cinco.
4. Pruebas, documentación (`README.md`, `DESIGN.md`, `PRODUCT.md`) y compilación del APK.

## Verificación

- `npx tsc --noEmit`, `npx eslint App.tsx src __tests__ --ext .ts,.tsx` y `npx jest`.
- APK: `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-apk.ps1 -UseDebugSigningForPersonalRelease`.
- Teléfono: TECNO KJ8s con Android 14. Pide a Sergio que confirme que está libre antes de instalar, porque instalar corta la reproducción. Comprueba antes de cada toque que la app sigue en primer plano.
- Para cada tema, confirma en el teléfono el reproductor, Inicio, la cola y el cambio de paleta. Para Kawaii, los cuatro estados del perrito.
