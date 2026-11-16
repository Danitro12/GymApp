import { useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useWorkout } from '../context/WorkoutContext';
import { confirmAsync, notify } from '../utils/dialogs';
import { fmt } from '../utils/text';

// Empieza una rutina. Si ya hay un entreno en curso:
//  - de la misma rutina → simplemente vuelve a él;
//  - de otra → pregunta antes de descartarlo.
export default function useStartWorkout(navigation) {
  const { t } = useLanguage();
  const { session, startWorkout, discardWorkout } = useWorkout();

  return useCallback(async (routine) => {
    if (!routine?.exercises?.length) {
      notify(routine?.name || t.routine, t.emptyRoutine);
      return;
    }
    if (session) {
      if (session.routine.id === routine.id) {
        navigation.navigate('ActiveWorkout');
        return;
      }
      const ok = await confirmAsync(
        t.replaceWorkoutQ,
        fmt(t.replaceWorkoutMsg, { name: session.routine.name }),
        { confirmText: t.start, cancelText: t.cancel, destructive: true },
      );
      if (!ok) return;
      await discardWorkout();
    }
    startWorkout(routine);
    navigation.navigate('ActiveWorkout');
  }, [session, startWorkout, discardWorkout, navigation, t]);
}
