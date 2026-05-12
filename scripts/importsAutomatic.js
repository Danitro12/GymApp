const fs = require('fs');
const path = require('path');

// Configuración de rutas
const directoryPath = path.join(__dirname, '../assets/workout-api-images'); // Asegúrate que esta ruta sea correcta
const outputFile = path.join(__dirname, '../assets/index_exercises.js');

// Función para convertir nombres de archivo (snake-case o kebab-case) a camelCase
// Ejemplo: seated-calf-raises.svg -> seatedCalfRaises
const toCamelCase = (str) => {
  return str
    .replace('.svg', '')
    .replace(/[-_](.)/g, (_, char) => char.toUpperCase());
};

fs.readdir(directoryPath, (err, files) => {
  if (err) return console.log('Error al leer la carpeta: ' + err);

  const svgFiles = files.filter(file => file.endsWith('.svg'));
  
  let importStatements = "";
  let objectEntries = "export const WorkoutIcons = {\n";

  svgFiles.forEach(file => {
    const componentName = toCamelCase(file);
    const importPath = `./workout-api-images/${file}`;
    
    importStatements += `import ${componentName} from '${importPath}';\n`;
    objectEntries += `  ${componentName},\n`;
  });

  objectEntries += "};";

  const finalContent = `${importStatements}\n${objectEntries}`;

  fs.writeFileSync(outputFile, finalContent);
  console.log(`✅ ¡Listo! Se han procesado ${svgFiles.length} iconos.`);
  console.log(`📂 Copia el contenido de: ${outputFile}`);
});