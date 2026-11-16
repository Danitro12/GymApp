import { useEffect } from 'react';
import { Platform } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

const TAG = 'gymapp-workout';

// Mantiene la pantalla encendida mientras `active` sea true.
// En la web usa la Screen Wake Lock API (en iPhone, iOS 18.4+ con la web
// añadida a la pantalla de inicio). El navegador la suelta al salir de la
// pestaña, así que la volvemos a pedir al volver.
export default function useKeepScreenOn(active) {
  useEffect(() => {
    if (!active) return undefined;

    if (Platform.OS !== 'web') {
      activateKeepAwakeAsync(TAG).catch(() => {});
      return () => { deactivateKeepAwake(TAG).catch?.(() => {}); };
    }

    if (typeof navigator === 'undefined' || !navigator.wakeLock?.request) return undefined;
    let sentinel = null;
    let cancelled = false;
    const request = async () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      try {
        sentinel = await navigator.wakeLock.request('screen');
      } catch {
        // Puede fallar (batería baja, permisos...): no es crítico.
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible' && (!sentinel || sentinel.released)) request();
    };
    request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      sentinel?.release?.().catch(() => {});
    };
  }, [active]);
}
