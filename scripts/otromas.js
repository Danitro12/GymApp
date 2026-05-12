const fs = require('fs');
const path = require('path');

const catalog = [
  { id: 'ex-1', file: 'dumbbell-shrugs.svg' },
  { id: 'ex-2', file: 'front-raise-with-dumbbells.svg' },
  { id: 'ex-3', file: 'dumbbell-shoulder-press.svg' },
  { id: 'ex-4', file: 'barbell-shoulder-press.svg' },
  { id: 'ex-5', file: 'lateral-raise-with-dumbbells.svg' },
  { id: 'ex-6', file: 'cable-lateral-raise.svg' },
  { id: 'ex-7', file: 'arnold-dumbbell-press.svg' },
  { id: 'ex-8', file: 'upright-row.svg' },
  { id: 'ex-9', file: 'cable-front-raise.svg' },
  { id: 'ex-10', file: 'reverse-fly-on-incline-bench.svg' },
  { id: 'ex-11', file: 'incline-dumbbell-reverse-fly.svg' },
  { id: 'ex-12', file: 'cable-reverse-fly.svg' },
  { id: 'ex-13', file: 'face-pull.svg' },
  { id: 'ex-14', file: 'reverse-butterfly.svg' },
  { id: 'ex-15', file: 'dumbbell-biceps-curl.svg' },
  { id: 'ex-16', file: 'dumbbell-hammer-grip-curl.svg' },
  { id: 'ex-17', file: 'barbell-curl.svg' },
  { id: 'ex-18', file: 'biceps-curl-machine.svg' },
  { id: 'ex-19', file: 'reverse-barbell-curl.svg' },
  { id: 'ex-20', file: 'spider-curl.svg' },
  { id: 'ex-21', file: 'biceps-cable-curl.svg' },
  { id: 'ex-22', file: 'high-cable-curls.svg' },
  { id: 'ex-23', file: 'supinated-grip-pull-ups.svg' },
  { id: 'ex-24', file: 'dips.svg' },
  { id: 'ex-25', file: 'lying-barbell-extensions.svg' },
  { id: 'ex-26', file: 'close-grip-chest-press.svg' },
  { id: 'ex-27', file: 'bench-dips.svg' },
  { id: 'ex-28', file: 'dumbbell-kickback.svg' },
  { id: 'ex-29', file: 'dumbbell-overhead-triceps-extension.svg' },
  { id: 'ex-30', file: 'rope-triceps-extension.svg' },
  { id: 'ex-31', file: 'overhead-triceps-extension.svg' },
  { id: 'ex-32', file: 'close-grip-push-ups.svg' },
  { id: 'ex-33', file: 'barbell-bench-press.svg' },
  { id: 'ex-34', file: 'incline-barbell-bench-press.svg' },
  { id: 'ex-35', file: 'decline-barbell-bench-press.svg' },
  { id: 'ex-36', file: 'dumbbell-bench-press.svg' },
  { id: 'ex-37', file: 'incline-dumbbell-bench-press.svg' },
  { id: 'ex-38', file: 'decline-dumbbell-bench-press.svg' },
  { id: 'ex-39', file: 'dumbbell-chest-flys.svg' },
  { id: 'ex-40', file: 'push-ups.svg' },
  { id: 'ex-41', file: 'pec-deck-butterfly.svg' },
  { id: 'ex-42', file: 'seated-chest-press.svg' },
  { id: 'ex-43', file: 'high-cable-chest-fly.svg' },
  { id: 'ex-44', file: 'low-cable-chest-fly.svg' },
  { id: 'ex-45', file: 'incline-chest-press-machine.svg' },
  { id: 'ex-46', file: 'pronated-grip-pull-ups.svg' },
  { id: 'ex-47', file: 'horizontal-row-machine.svg' },
  { id: 'ex-48', file: 'pull-down.svg' },
  { id: 'ex-49', file: 'barbell-bent-over-row.svg' },
  { id: 'ex-50', file: 'bent-over-dumbbell-row.svg' },
  { id: 'ex-51', file: 'unilateral-bent-over-row.svg' },
  { id: 'ex-52', file: 'australian-pull-ups.svg' },
  { id: 'ex-53', file: 't-bar-row.svg' },
  { id: 'ex-54', file: 'deadlift.svg' },
  { id: 'ex-55', file: 'back-extensions.svg' },
  { id: 'ex-56', file: 'pushdown-straight-arm.svg' },
  { id: 'ex-57', file: 'low-cable-row.svg' },
  { id: 'ex-58', file: 'trx-row.svg' },
  { id: 'ex-59', file: 'pullover.svg' },
  { id: 'ex-60', file: 'crunches.svg' },
  { id: 'ex-61', file: 'rotation-crunches.svg' },
  { id: 'ex-62', file: 'leg-raises.svg' },
  { id: 'ex-63', file: 'plank.svg' },
  { id: 'ex-64', file: 'lateral-plank.svg' },
  { id: 'ex-65', file: 'mountain-climbers.svg' },
  { id: 'ex-66', file: 'russian-twist.svg' },
  { id: 'ex-67', file: 'v-ups.svg' },
  { id: 'ex-68', file: 'scissors.svg' },
  { id: 'ex-69', file: 'roman-chair-leg-raises.svg' },
  { id: 'ex-70', file: 'heel-touches.svg' },
  { id: 'ex-71', file: 'cable-crunches.svg' },
  { id: 'ex-72', file: 'ab-wheel.svg' },
  { id: 'ex-73', file: 'hanging-leg-raises.svg' },
  { id: 'ex-74', file: 'squat.svg' },
  { id: 'ex-75', file: 'pistol-squat.svg' },
  { id: 'ex-76', file: 'front-squat.svg' },
  { id: 'ex-77', file: 'leg-extension.svg' },
  { id: 'ex-78', file: 'jump-squat.svg' },
  { id: 'ex-79', file: 'jumping-jacks.svg' },
  { id: 'ex-80', file: 'lunges.svg' },
  { id: 'ex-81', file: 'jumping-lunges.svg' },
  { id: 'ex-82', file: 'leg-press.svg' },
  { id: 'ex-83', file: 'hack-squat.svg' },
  { id: 'ex-84', file: 'wall-sit.svg' },
  { id: 'ex-85', file: 'burpees.svg' },
  { id: 'ex-86', file: 'goblet-squat.svg' },
  { id: 'ex-87', file: 'leg-curl.svg' },
  { id: 'ex-88', file: 'stiff-leg-deadlift.svg' },
  { id: 'ex-89', file: 'kettlebell-swing.svg' },
  { id: 'ex-90', file: 'adductor-machine.svg' },
  { id: 'ex-91', file: 'abductors-machine.svg' },
  { id: 'ex-92', file: 'standing-calf-raises.svg' },
  { id: 'ex-93', file: 'seated-calf-raises.svg' },
  { id: 'ex-94', file: 'calf-press-leg-press.svg' },
];

// Corregimos la ruta: Subimos un nivel (..) desde "scripts" para llegar a la raíz y luego entrar a "assets"
const outputFilePath = path.join(__dirname, '..', 'assets', 'index_exercises.js');

// La ruta de importación relativa DENTRO del archivo generado seguirá siendo hacia la carpeta de imágenes
const imagesImportPath = './workout-api-images/';

let content = '';

// 1. Generar los imports
catalog.forEach(item => {
  if (item.file) {
    const varName = item.id.replace('-', ''); // ex-1 -> ex1
    content += `import ${varName} from '${imagesImportPath}${item.file}';\n`;
  }
});

content += '\nexport const WorkoutIcons = {\n';

// 2. Generar el objeto exportable
catalog.forEach(item => {
  if (item.file) {
    const varName = item.id.replace('-', '');
    content += `  '${item.id}': ${varName},\n`;
  }
});

content += '};\n';

// Verificar si la carpeta assets existe antes de escribir
const assetsDir = path.dirname(outputFilePath);
if (!fs.existsSync(assetsDir)) {
    console.error(`Error: La carpeta ${assetsDir} no existe. Por favor créala primero.`);
} else {
    fs.writeFileSync(outputFilePath, content);
    console.log('¡Perfecto! Archivo generado en: ' + outputFilePath);
}