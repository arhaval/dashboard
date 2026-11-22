/**
 * Katmanı (şeffaf çizim) zeminin üstüne birleştirir.
 *
 * Arhaval görsel sisteminin kalite hattı (gorsel/BENIOKU.md, "Birleştirme"):
 *   1. Çizim teslim boyutundan büyükse Lanczos ile küçültülür (sharp, alfa ön
 *      çarpımlı) ve ön çarpımlı katmana hafif keskinleştirme (σ 0.7, miktar 0.6)
 *      uygulanır. Çizim zaten teslim boyutundaysa ikisi de yapılmaz.
 *   2. Zemin keskinleştirilmez, böylece gren bozulmaz.
 *   3. Katman zeminin üstüne "over" ile konur, sRGB profiliyle PNG yazılır.
 */

const KESKINLIK_SIGMA = 0.7;
const KESKINLIK_MIKTAR = 0.6;

function gaussCekirdek(sigma: number): Float32Array {
  const r = Math.ceil(3 * sigma), k = new Float32Array(2 * r + 1);
  let t = 0;
  for (let i = -r; i <= r; i++) { k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma)); t += k[i + r]; }
  for (let i = 0; i < k.length; i++) k[i] /= t;
  return k;
}

/** Tek kanal ayrılabilir Gauss bulanıklığı, kenarda tekrar ile. */
function bulaniklastir(src: Float32Array, w: number, h: number, k: Float32Array): Float32Array {
  const r = (k.length - 1) / 2, ara = new Float32Array(w * h), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const s = y * w;
    for (let x = 0; x < w; x++) {
      let t = 0;
      for (let i = -r; i <= r; i++) t += k[i + r] * src[s + Math.min(w - 1, Math.max(0, x + i))];
      ara[s + x] = t;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let t = 0;
      for (let i = -r; i <= r; i++) t += k[i + r] * ara[Math.min(h - 1, Math.max(0, y + i)) * w + x];
      out[y * w + x] = t;
    }
  }
  return out;
}

export async function birlestir(katmanPng: Buffer, zeminPng: Buffer, genislik: number, yukseklik: number): Promise<Buffer> {
  // Dinamik: sharp yüklenemezse hata route'ta yakalanıp kullanıcıya gösterilebilsin.
  const { default: sharp } = await import('sharp');
  const n = genislik * yukseklik;
  const kaynak = await sharp(katmanPng).metadata();
  const kucult = (kaynak.width ?? genislik) > genislik;
  const katman = await sharp(katmanPng).ensureAlpha().resize(genislik, yukseklik, { kernel: 'lanczos3', fit: 'fill' }).raw().toBuffer();
  const zemin = await sharp(zeminPng).removeAlpha().resize(genislik, yukseklik, { fit: 'fill' }).raw().toBuffer();

  const out = Buffer.alloc(n * 3);
  const yaz = () => sharp(out, { raw: { width: genislik, height: yukseklik, channels: 3 } })
    .withIccProfile('srgb')
    .png({ compressionLevel: 9 })
    .toBuffer();

  // Çizim teslim boyutundaysa (HD) keskinleştirme yok: doğrudan "over".
  if (!kucult) {
    for (let p = 0; p < n; p++) {
      const a = katman[p * 4 + 3] / 255;
      for (let c = 0; c < 3; c++) out[p * 3 + c] = Math.round(zemin[p * 3 + c] * (1 - a) + katman[p * 4 + c] * a);
    }
    return yaz();
  }

  // ön çarpımlı kanallar
  const kanal = [0, 1, 2, 3].map(() => new Float32Array(n));
  for (let p = 0; p < n; p++) {
    const a = katman[p * 4 + 3] / 255;
    kanal[0][p] = (katman[p * 4] / 255) * a; kanal[1][p] = (katman[p * 4 + 1] / 255) * a;
    kanal[2][p] = (katman[p * 4 + 2] / 255) * a; kanal[3][p] = a;
  }
  const k = gaussCekirdek(KESKINLIK_SIGMA);
  for (const c of kanal) {
    const b = bulaniklastir(c, genislik, yukseklik, k);
    for (let p = 0; p < n; p++) c[p] += KESKINLIK_MIKTAR * (c[p] - b[p]);
  }

  for (let p = 0; p < n; p++) {
    const a = Math.min(1, Math.max(0, kanal[3][p]));
    for (let c = 0; c < 3; c++) {
      const renk = Math.min(a, Math.max(0, kanal[c][p]));
      out[p * 3 + c] = Math.round(Math.min(1, Math.max(0, (zemin[p * 3 + c] / 255) * (1 - a) + renk)) * 255);
    }
  }
  return yaz();
}
