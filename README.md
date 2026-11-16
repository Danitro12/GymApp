# GymApp

Proyecto universitario de entrenamiento (React Native + Expo, también como web).

## Funcionalidades

- **Rutinas** con días de la semana, series y repeticiones objetivo.
- **Entreno en curso persistente**: el cronómetro se calcula con marcas de tiempo,
  así que sigue avanzando aunque salgas de la web o bloquees el móvil. La sesión
  se guarda en cada cambio y, si recargas o cierras la app, vuelve a abrirse
  donde lo dejaste. Mientras hay un entreno activo aparece una barra sobre las
  pestañas para volver a él.
- **Ejercicios**: pestaña con todo el catálogo (búsqueda y filtros por categoría
  y músculo) y opción de **crear ejercicios propios** con imagen opcional,
  categoría y reparto muscular en porcentajes (debe sumar 100%). Se comportan
  igual que los del catálogo: rutinas, mapa muscular, historial y récords.
- **Mapa muscular** por rutina y por ejercicio.
- **Historial** con calendario y récords por serie.
- Español / inglés.

Todos los datos se guardan en el dispositivo (AsyncStorage; `localStorage` en la web).

## Requisitos
- Node.js LTS (18 o 20)
- npm
- Para móvil: Expo Go en el teléfono
- Para emulador Android: Android Studio y SDK
- Para simulador iOS: macOS con Xcode

## Instalación

```bash
npm install
```

## Ejecutar

```bash
npx expo start        # móvil (escanea el QR con Expo Go) / "a" para Android
npx expo start --web  # navegador
```

## Despliegue web (Vercel)

El repo está conectado a Vercel:

- Cada push a `main` se despliega automáticamente en producción.
- Cada push a otra rama (o PR) genera un despliegue de **Preview** con su propia URL.

La configuración está en `vercel.json` (`npx expo export -p web` → carpeta `dist`).
Para probar el build web en local:

```bash
npx expo export -p web
npx serve dist
```

## Build nativo (EAS)

```bash
npm install -g eas-cli
eas build -p ios      # o -p android
```

También existe el workflow manual `.github/workflows/ios-build.yml`.

## Estructura

```
App.js                    Proveedores (idioma, ejercicios, entreno activo, pestañas)
navigation/TabNavigator   Pestañas deslizables + pantallas apiladas
context/                  LanguageContext, ExercisesContext, WorkoutContext, TabContext
screens/                  Pantallas
components/               Piezas reutilizables (BodyMap, ExerciseBrowser, ExerciseThumb…)
data/                     Catálogo de ejercicios, traducciones, tema y storage
utils/                    Fechas, diálogos y formato
```

## Solución rápida de problemas
- Limpiar caché: `npx expo start -c`
- Si hay errores raros: borra `node_modules`, reinstala y verifica la versión de Node.
