const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'data', 'workout_api_exercises.json');
const jsPath = path.join(__dirname, '..', 'data', 'exercises.js');

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const descByName = new Map();
const normalize = (s) => s
  .replace(/\u2019/g, "'")
  .replace(/\u2018/g, "'")
  .replace(/\u201C|\u201D/g, '"')
  .replace(/\u2013|\u2014/g, '-')
  .replace(/\u00B0/g, ' deg')
  .replace(/\u00A0/g, ' ')
  .replace(/\r\n/g, '\n');

for (const ex of json) {
  if (ex.name && ex.description) {
    const desc = normalize(ex.description).replace(/\s+/g, ' ').trim();
    descByName.set(ex.name, desc);
  }
}

const lines = fs.readFileSync(jsPath, 'utf8').split(/\r?\n/);
const updated = lines.map((line) => {
  if (!line.includes("name: '") || !line.includes('image: require(')) return line;
  const nameMatch = line.match(/name: '([^']+)'/);
  if (!nameMatch) return line;
  const name = nameMatch[1];
  const desc = descByName.get(name);
  if (!desc) return line;
  const escaped = desc.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  if (line.includes('description:')) return line;
  return line.replace(' image: require', ` description: '${escaped}', image: require`);
});

fs.writeFileSync(jsPath, updated.join('\n'));
