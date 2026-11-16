import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// ── base64 (para guardar/leer en el móvil) ──
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const bytesToBase64 = (bytes) => {
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i] << 16;
    out += `${B64[(n >> 18) & 63]}${B64[(n >> 12) & 63]}==`;
  } else if (rest === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += `${B64[(n >> 18) & 63]}${B64[(n >> 12) & 63]}${B64[(n >> 6) & 63]}=`;
  }
  return out;
};

const base64ToBytes = (b64) => {
  const clean = String(b64).replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n = (B64.indexOf(clean[i]) << 18) | (B64.indexOf(clean[i + 1]) << 12)
      | ((B64.indexOf(clean[i + 2]) & 63) << 6) | (B64.indexOf(clean[i + 3]) & 63);
    out[o++] = (n >> 16) & 255;
    if (i + 2 < clean.length) out[o++] = (n >> 8) & 255;
    if (i + 3 < clean.length) out[o++] = n & 255;
  }
  return out.subarray(0, o);
};

/** Descarga (web) o comparte (móvil) un archivo binario. */
export const saveFile = async (bytes, filename, mimeType = XLSX_MIME) => {
  if (Platform.OS === 'web') {
    const blob = new Blob([bytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return true;
  }
  const FileSystem = await import('expo-file-system/legacy');
  const Sharing = await import('expo-sharing');
  const path = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, bytesToBase64(bytes), { encoding: FileSystem.EncodingType.Base64 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType, dialogTitle: filename, UTI: 'org.openxmlformats.spreadsheetml.sheet' });
  }
  return true;
};

/** Abre el selector de archivos y devuelve { name, bytes } o null si se cancela. */
export const pickFile = async () => {
  const res = await DocumentPicker.getDocumentAsync({
    type: [
      XLSX_MIME,
      'application/vnd.ms-excel',
      'text/csv',
      'text/comma-separated-values',
      'text/tab-separated-values',
      'text/plain',
      'application/json',
      '*/*',
    ],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];
  let bytes;
  if (Platform.OS === 'web') {
    if (asset.file) bytes = new Uint8Array(await asset.file.arrayBuffer());
    else bytes = new Uint8Array(await (await fetch(asset.uri)).arrayBuffer());
  } else {
    const FileSystem = await import('expo-file-system/legacy');
    const b64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
    bytes = base64ToBytes(b64);
  }
  return { name: asset.name || 'file', bytes };
};

export const bytesToText = (bytes) => {
  if (typeof TextDecoder !== 'undefined') return new TextDecoder('utf-8').decode(bytes);
  // Hermes sin TextDecoder: decodificación UTF-8 simple
  let s = '';
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i]);
  try { return decodeURIComponent(escape(s)); } catch { return s; }
};

export const isZip = (bytes) => bytes?.length > 3 && bytes[0] === 0x50 && bytes[1] === 0x4b;
