// Sustituye {clave} en un texto traducido: fmt('Ejercicio {i} de {n}', { i: 1, n: 5 })
export const fmt = (str, vars = {}) =>
  String(str ?? '').replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));

// Acepta coma o punto decimal y descarta cualquier otro carácter.
export const sanitizeNumberInput = (value) => {
  const v = String(value ?? '').replace(',', '.').replace(/[^0-9.]/g, '');
  const [int, ...rest] = v.split('.');
  return rest.length ? `${int}.${rest.join('')}` : int;
};
