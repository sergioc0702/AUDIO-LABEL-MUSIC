# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

## Users

Personas que guardan su música en el teléfono como archivos propios: el dueño de la app y sus amigos y familia, que la reciben como APK. Nadie recibe formación: la app debe explicarse sola.

Su forma de escuchar combina dos cosas: explorar su colección (álbumes, artistas, listas) y dejar el reproductor a la vista mientras suena.

## Product Purpose

Reproducir la música local del teléfono sin cuentas, sin suscripción y sin depender de internet, de forma completa y agradable. Tiene éxito cuando alguien sin experiencia encuentra y reproduce lo que busca sin ayuda, y cuando el reproductor es algo que dan ganas de dejar a la vista.

## Positioning

Todo ocurre en el teléfono y sobre los archivos de la propia persona: su biblioteca, sus listas y su historial no salen del dispositivo.

## Operating Context

Se usa con una mano, a menudo con audífonos y en segundo plano, y también con el teléfono apoyado mostrando el reproductor. Bibliotecas reales con etiquetas incompletas y muchos álbumes de una sola canción (la colección del dueño: 36 canciones, 33 álbumes). Probada en un TECNO KJ8s con Android 14.

## Capabilities and Constraints

- React Native 0.88 con TypeScript. Solo Android.
- Reproducción con `react-native-track-player` y una copia local de KotlinAudio en `android/kotlin-audio`.
- Biblioteca desde MediaStore con caché de etiquetas en Room. Listas e historial en Room; favoritos y ajustes en SharedPreferences.
- Ecualizador por software de cinco bandas en el procesador de audio.
- Se distribuye como APK fuera de Google Play.
- Temas adicionales: por ahora solo existe Estándar, con sus seis paletas de colores; la estructura ya admite más.
- Nombre: la app se llama "Mi Música" y el repositorio "AUDIO-LABEL-MUSIC". Sin confirmar si el nombre cambia.

## Brand Commitments

El dueño eligió el estándar de la categoría: un aspecto limpio y convencional, con el nivel de acabado y la forma de uso de Spotify, Apple Music y YouTube Music, sin usar sus marcas ni copiar sus diseños.

## Evidence on Hand

La música y las carátulas son las del usuario; la app no incluye contenido propio.

## Product Principles

1. Encontrar y reproducir debe ser obvio: la navegación nunca hace pensar.
2. La carátula y la música son el contenido; la interfaz les da protagonismo.
3. Convención bien hecha: quien use otras apps de música debe saber dónde está todo sin pensarlo.
4. Lo local es la promesa: todo funciona sin cuenta y sin conexión.
5. Comportamiento honesto: lo que se muestra es lo que suena, y nada se pierde al cerrar la app.
