---
name: Mi Música
description: Reproductor de música local para Android, oscuro y convencional, donde la carátula es la protagonista.
colors:
  background: "#121214"
  navigation: "#19191c"
  surface: "#1d1d21"
  surface-high: "#2b2b31"
  outline: "#3b3b43"
  text: "#ffffff"
  text-secondary: "#b6b6be"
  accent: "#ff7a59"
  on-accent: "#2a0a03"
  danger: "#ff9c9c"
  scrim: "#000000b3"
  ripple: "#ffffff1f"
typography:
  display:
    fontFamily: "Roboto, sans-serif"
    fontSize: "30px"
    fontWeight: 700
  headline:
    fontFamily: "Roboto, sans-serif"
    fontSize: "22px"
    fontWeight: 700
  title:
    fontFamily: "Roboto, sans-serif"
    fontSize: "17px"
    fontWeight: 600
  body:
    fontFamily: "Roboto, sans-serif"
    fontSize: "15px"
    fontWeight: 400
  body-strong:
    fontFamily: "Roboto, sans-serif"
    fontSize: "15px"
    fontWeight: 600
  secondary:
    fontFamily: "Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 400
  label:
    fontFamily: "Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 600
  caption:
    fontFamily: "Roboto, sans-serif"
    fontSize: "12px"
    fontWeight: 400
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  sheet: "20px"
  full: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  button-filled:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "48px"
  button-tonal:
    backgroundColor: "{colors.surface-high}"
    textColor: "{colors.text}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "48px"
  icon-button:
    size: "48px"
  play-button:
    backgroundColor: "{colors.text}"
    textColor: "{colors.background}"
    rounded: "{rounded.full}"
    size: "72px"
  chip:
    backgroundColor: "{colors.surface-high}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "36px"
  chip-selected:
    backgroundColor: "{colors.text}"
    textColor: "{colors.background}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "36px"
  text-field:
    backgroundColor: "{colors.surface-high}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "48px"
  track-row:
    textColor: "{colors.text}"
    typography: "{typography.body}"
    padding: "0 8px 0 16px"
    height: "64px"
  shortcut:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    height: "56px"
  genre-tile:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "12px"
    height: "88px"
  mini-player:
    backgroundColor: "{colors.surface-high}"
    textColor: "{colors.text}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.md}"
    height: "60px"
  tab-bar:
    backgroundColor: "{colors.navigation}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.caption}"
    height: "56px"
  tab-indicator-selected:
    backgroundColor: "{colors.surface-high}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    height: "32px"
    width: "64px"
  sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sheet}"
  sheet-action:
    textColor: "{colors.text}"
    typography: "{typography.body}"
    padding: "0 24px"
    height: "52px"
  dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sheet}"
    padding: "24px"
    width: "420px"
  snackbar:
    backgroundColor: "{colors.text}"
    textColor: "{colors.background}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 4px 0 16px"
    height: "48px"
---

# Design System: Mi Música

## Overview

**Creative North Star: "La convención bien hecha"**

Mi Música se ve y se usa como una app de música estándar, y su identidad está en la calidad de la ejecución, no en un disfraz. Nada en el sistema pide que se aprenda: tres pestañas abajo, mini-reproductor encima, filas limpias y una carátula grande cuando algo suena.

La interfaz es un fondo casi negro y silencioso para que el color lo pongan las carátulas de la propia persona. La densidad es la de una lista de música: filas de 64 px, márgenes de 16 px y objetivos táctiles de 48 px, pensados para usarse con una mano. El único color de la interfaz es un coral, y solo aparece cuando algo suena, cuando algo está activado o en la acción principal de la pantalla.

Se rechaza cualquier rareza añadida. El sistema toma el nivel de acabado y la forma de uso de las grandes apps de música, sin usar sus marcas ni copiar sus diseños.

**Key Characteristics:**
- Oscuro, plano y tonal: la profundidad nace del gris, no de líneas.
- Un solo acento coral, con reglas estrictas de uso.
- Tipografía del sistema, con jerarquía por tamaño y peso, sin mayúsculas forzadas.
- Una sola familia de iconos (Lucide), de trazo, rellenos solo en los controles de transporte y en favoritos activos.
- Movimiento breve y sin rebote, que respeta la opción de quitar animaciones de Android.

## Colors

Una escala de grises fríos casi negros, blanco y gris para el texto, y un solo coral cálido que resalta sobre todos ellos.

### Primary
- **Coral Sonando** (#ff7a59): la canción actual (título y barras animadas), la barra de progreso del reproductor, modos activados (mezcla, repetición, temporizador, ecualizador encendido), favoritos, marcas de inclusión, cursor de texto y el botón relleno de la acción principal. Contraste de 5.48:1 o más sobre todas las superficies.
- **Tinta sobre Coral** (#2a0a03): texto e iconos encima del coral (7.16:1). Un marrón casi negro, nunca blanco.

### Secondary
- **Rosa Aviso** (#ff9c9c): acciones destructivas (eliminar, quitar) y errores de formulario. Claro a propósito para leerse sobre superficies oscuras (8.39:1 sobre Superficie).

### Neutral
- **Fondo Noche** (#121214): fondo de todas las pantallas y del reproductor completo.
- **Navegación** (#19191c): solo la barra de pestañas.
- **Superficie** (#1d1d21): hojas inferiores, diálogos, accesos rápidos y mosaicos de género.
- **Superficie Alta** (#2b2b31): lo que está encima de una superficie o flota sobre el contenido: mini-reproductor, botones tonales, chips, campos de texto, indicador de pestaña, carátula vacía y fila arrastrada.
- **Riel** (#3b3b43): pistas de deslizadores y de progreso, y asa de las hojas. Contraste de 1.69:1 sobre el fondo, así que nunca lleva información por sí solo.
- **Blanco** (#ffffff): texto principal, iconos, controles de transporte y estado elegido.
- **Gris Texto** (#b6b6be): texto secundario, iconos de apoyo y pestañas en reposo. Mínimo de 6.98:1, también sobre Superficie Alta.
- **Velo** (#000000b3): detrás de hojas y diálogos.
- **Onda** (#ffffff1f): la onda táctil de Android en todo elemento pulsable.

### Named Rules

**La Regla del Coral.** El coral significa "sonando", "activado" o "acción principal". Si un elemento no cumple una de las tres, va en blanco o gris.

**La Regla del Blanco Elegido.** Lo elegido en filtros y preajustes se invierte: fondo blanco y texto Fondo Noche. La elección de vista no es lo que suena, así que no usa coral.

**La Regla de la Carátula.** El reproductor completo no lleva relleno de color: el botón de reproducir es blanco y el fondo es Fondo Noche, para que la carátula sea lo único vivo en pantalla.

## Typography

**Fuente:** la del sistema Android, Roboto en el dispositivo de prueba. El código no declara ninguna familia.

**Character:** Neutra y familiar, como el resto del teléfono. Toda la personalidad tipográfica viene del contraste entre tamaños y pesos, porque las carátulas ya aportan la expresión.

### Hierarchy
- **Display** (700, 30 px): título de cada pestaña principal, como el saludo de Inicio o "Biblioteca".
- **Headline** (700, 22 px): encabezados de sección, título de la canción en el reproductor y título de colección.
- **Title** (600, 17 px): títulos de hojas y diálogos.
- **Body** (400, 15 px): título de canción en listas, opciones de hojas y texto de campos.
- **Body Strong** (600, 15 px): etiquetas de botones y título en el mini-reproductor.
- **Secondary** (400, 14 px): artista en listas y descripciones, en Gris Texto.
- **Label** (600, 13 px): chips, títulos bajo carátulas, accesos rápidos, grupos de ajustes y el origen de la cola.
- **Caption** (400, 12 px): artista bajo carátulas, pestañas, tiempos y frecuencias, en Gris Texto.

El sistema no fija alturas de línea ni espaciado entre letras: usa los valores por defecto de la plataforma.

### Named Rules

**La Regla de la Caja Natural.** El texto se muestra como se escribió: sin mayúsculas forzadas ni tracking. Los títulos en mayúsculas de las etiquetas de la persona se respetan tal cual.

**La Regla del Tiempo Quieto.** Tiempos y posiciones usan cifras tabulares para que nada tiemble mientras avanza la canción.

**La Regla de la Línea Única.** Títulos y artistas de fila se cortan a una línea con puntos suspensivos. Las etiquetas reales son largas e incompletas, y la fila no cambia de altura por ellas.

## Layout

Una sola columna de teléfono, con desplazamiento vertical y filas horizontales de carátulas. No hay puntos de corte: lo que se adapta se calcula desde el tamaño de la ventana. La rejilla de álbumes tiene dos columnas con carátulas de `(ancho - 44) / 2`, y la carátula del reproductor mide el menor entre `ancho - 48` y el 42 % del alto.

El ritmo sale de una escala de 4, 8, 12, 16, 24 y 32 px. Los márgenes de pantalla son de 16 px, el reproductor completo usa 20 px y las opciones de hojas 24 px. Las secciones se separan con 24 px arriba y 12 px abajo, y las filas de carátulas con 12 px entre elementos. Los accesos rápidos forman dos columnas con 8 px entre sí.

La estructura fija, de abajo arriba, es la barra de tres pestañas, el mini-reproductor (con 8 px a cada lado) y el contenido. El aviso flotante se sitúa encima de ambos, y hojas y reproductor completo cubren todo. Cada capa respeta las áreas seguras del sistema.

**La Regla del Margen Óptico.** Las columnas de iconos usan 4 px de margen más un objetivo de 48 px, de forma que un icono de 24 px queda alineado con el margen de 16 px del texto.

**La Regla de los 48.** Ningún objetivo táctil baja de 48 px. Si la forma visible es menor, como los chips de 36 px, la zona de toque se amplía hasta alcanzarlos.

## Elevation & Depth

El sistema es plano y tonal. La profundidad se comunica subiendo de Fondo Noche a Superficie y a Superficie Alta, y las capas modales se apoyan en Velo. No hay bordes, degradados ni desenfoques. Solo existe una sombra, y aparece en lo que se separa de verdad de la página.

### Shadow Vocabulary
- **Flotante** (`elevation: 6`, de Android): aviso flotante y fila que se está arrastrando.

### Named Rules

**La Regla de la Sombra Ganada.** Solo lleva sombra lo que flota de forma temporal sobre el contenido. Hojas, diálogos y mini-reproductor se separan por tono y por el velo.

**La Regla Sin Líneas.** Las filas y superficies se separan con espacio y tono, nunca con bordes ni divisores.

## Shapes

Las esquinas son suaves y crecen con el tamaño del objeto: 6 px en carátulas pequeñas, accesos rápidos e iconos cuadrados, 10 px en carátulas desde 120 px, campos, mini-reproductor y avisos, y 20 px en hojas y diálogos. Los botones, chips y el botón de reproducir son píldoras o círculos completos. El indicador de pestaña usa 16 px, la mitad de su alto.

Los artistas se reconocen por su forma: su imagen siempre es circular, y las carátulas de álbumes y listas son cuadradas. Pistas, asas y barras usan un radio igual a la mitad de su grosor.

## Components

### Buttons
Discretos, con forma de píldora y una respuesta rápida al dedo.

- **Shape:** píldora completa (999 px), 48 px de alto y 24 px de relleno lateral, con icono opcional de 18 px a 8 px de la etiqueta.
- **Filled:** coral con Tinta sobre Coral. Es la acción principal de la vista, como "Reproducir" o "Guardar", y se usa una vez por grupo.
- **Tonal:** Superficie Alta con texto blanco. Es la acción de apoyo, como "Mezclar" o "Cancelar".
- **Press:** escala a 0.97 con resorte rápido sin rebote, más la onda táctil.
- **Disabled:** opacidad de 0.45.
- **Icon Button:** objetivo de 48 px sin fondo, iconos de 20 a 26 px, onda sin límites de 24 px de radio y escala a 0.9.

### Chips
- **Style:** píldora de 36 px en Superficie Alta con tipografía Label y 16 px de relleno lateral. Los preajustes del ecualizador usan la misma forma con 48 px de alto.
- **State:** el elegido se invierte a blanco con texto Fondo Noche. Se desplazan en horizontal con 8 px entre sí.

### Cards / Containers
- **Filas:** las listas de canciones no llevan contenedor. La fila es el contenido directamente sobre el fondo.
- **Carátula con texto:** la carátula sin caja, con título en Label y subtítulo en Caption a 8 px. Mide 136 px en Inicio y 120 px en colecciones.
- **Acceso rápido:** Superficie, radio de 6 px y 56 px de alto, con icono de 20 px en un bloque de 56 px de Superficie Alta pegado a la izquierda.
- **Mosaico de género:** Superficie, radio de 10 px, 88 px de alto mínimo y 12 px de relleno, con el texto abajo.

### Inputs / Fields
- **Style:** Superficie Alta, sin borde, radio de 10 px, 48 px de alto, texto Body y marcador en Gris Texto. La búsqueda lleva lupa de 20 px y botón de borrar cuando hay texto.
- **Focus:** cursor y selección en coral. No hay anillo ni cambio de fondo.
- **Error:** mensaje debajo en Rosa Aviso a 14 px.

### Navigation
- **Barra inferior:** tres pestañas (Inicio, Buscar, Biblioteca) sobre Navegación, con icono de 22 px y etiqueta Caption. Mide 56 px de alto mínimo más el área segura.
- **Reposo:** icono y etiqueta en Gris Texto.
- **Seleccionada:** píldora de 64 × 32 px en Superficie Alta detrás del icono, y etiqueta blanca a 600. No usa coral.
- **Cambio de vista:** fundido de opacidad de 200 ms con la curva de entrada.

### Track Row
La pieza más repetida de la app.

- **Estructura:** carátula de 48 px, 12 px de separación, título en Body, artista en Secondary y menú de tres puntos con objetivo de 48 px. Mide 64 px de alto mínimo.
- **Canción actual:** título en coral a 600 y tres barras animadas de 16 px. En pausa las barras se detienen y bajan a opacidad 0.55.
- **Press:** escala a 0.985 con onda táctil. La pulsación larga abre el mismo menú.

### Mini Player
- **Style:** Superficie Alta, radio de 10 px, 60 px de alto, con 8 px a cada lado y carátula de 44 px. Muestra título en Body Strong y artista en Caption.
- **Progreso:** línea de 2 px en el borde inferior, con relleno blanco sobre Riel.
- **Gestos:** deslizar a los lados cambia de canción y deslizar hacia arriba abre el reproductor.

### Now Playing
- **Style:** pantalla completa en Fondo Noche con los bloques repartidos a lo alto. Muestra carátula grande, título en Headline, progreso, transporte y cuatro herramientas (Cola, Dormir, velocidad, Ecualizador).
- **Transporte:** círculo blanco de 72 px con icono Fondo Noche de 30 px, flanqueado por saltos blancos rellenos de 30 px y por mezcla y repetición de 24 px, que pasan a coral al activarse.
- **Progreso:** pista de 4 px en Riel, relleno coral y pulgar de 14 px. Al arrastrar, el pulgar crece y aparece una burbuja con el tiempo.
- **Movimiento:** la carátula se reduce levemente en pausa y sigue al dedo al deslizar para cambiar de canción.

### Sheets, Dialogs and Snackbar
- **Hoja inferior:** Superficie, radio superior de 20 px, 88 % de alto máximo y asa de 36 × 4 px en Riel. Entra en 320 ms con la curva de entrada, sale en 200 ms con la de salida, y se cierra con Atrás, con el velo o arrastrando.
- **Opción de hoja:** 52 px de alto mínimo, icono de 22 px y 16 px de separación. Lo destructivo va en Rosa Aviso y lo elegido sube a 700.
- **Diálogo:** Superficie, radio de 20 px, 24 px de relleno y 420 px de ancho máximo, centrado sobre Velo, con botones alineados a la derecha.
- **Aviso flotante:** invertido en blanco con texto Fondo Noche, radio de 10 px y sombra Flotante. Lleva como máximo una acción, como "Deshacer" o "Reintentar".

## Do's and Don'ts

### Do:
- **Haz** que todo color de interfaz distinto de gris o blanco cumpla la Regla del Coral.
- **Haz** que cada acción destructiva use Rosa Aviso (#ff9c9c) en su opción de menú.
- **Haz** que las transiciones usen 200 ms para cambios de estado y salidas, y 320 ms para entradas, con las curvas de entrada y salida del sistema.
- **Haz** que toda animación de posición o bucle se detenga si Android tiene las animaciones quitadas.
- **Haz** que el estado desactivado use opacidad de 0.45.
- **Haz** que toda carátula ausente muestre el icono de nota sobre Superficie Alta, sin imágenes de relleno.
- **Haz** que los iconos sean de Lucide, de trazo en reposo, y rellenos solo en transporte y favorito activo.

### Don't:
- **No** envuelvas filas de canciones en tarjetas ni pongas divisores entre ellas.
- **No** uses bordes para separar superficies: sube un nivel de tono.
- **No** uses coral para pestañas, chips o preajustes elegidos.
- **No** añadas una segunda familia de iconos ni uses caracteres de texto como iconos.
- **No** añadas degradados ni desenfoques.
- **No** uses rebote en toques, hojas o transiciones: solo lo admiten los objetos agarrados con el dedo, como el pulgar de progreso o la fila arrastrada.
- **No** uses Riel (#3b3b43) para texto ni como único indicador de un valor.
- **No** uses marcas ni copies diseños de otras apps de música.
