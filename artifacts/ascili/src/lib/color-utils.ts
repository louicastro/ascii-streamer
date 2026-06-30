export function rgbToLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function adjustPixel(
  r: number,
  g: number,
  b: number,
  brightness: number, // -100 to 100
  contrast: number, // -100 to 100
  gamma: number, // -100 to 100, mapped to 0.1 to 2.0 or so
  saturation: number // -100 to 100
): [number, number, number] {
  // Brightness (-100 to 100 -> -255 to 255)
  let nr = r + (brightness / 100) * 255;
  let ng = g + (brightness / 100) * 255;
  let nb = b + (brightness / 100) * 255;

  // Contrast
  let cFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  nr = cFactor * (nr - 128) + 128;
  ng = cFactor * (ng - 128) + 128;
  nb = cFactor * (nb - 128) + 128;

  // Gamma (map -100 to 100 -> 0.1 to 3.0)
  let gValue = gamma < 0 ? 1 + (gamma / 100) * 0.9 : 1 + (gamma / 100) * 2;
  // Gamma correction: V_out = 255 * (V_in / 255) ^ (1 / gamma)
  let invG = 1 / Math.max(0.1, gValue);
  nr = 255 * Math.pow(Math.max(0, Math.min(255, nr)) / 255, invG);
  ng = 255 * Math.pow(Math.max(0, Math.min(255, ng)) / 255, invG);
  nb = 255 * Math.pow(Math.max(0, Math.min(255, nb)) / 255, invG);

  // Saturation
  let lum = rgbToLuminance(nr, ng, nb);
  let sFactor = 1 + saturation / 100;
  nr = lum + (nr - lum) * sFactor;
  ng = lum + (ng - lum) * sFactor;
  nb = lum + (nb - lum) * sFactor;

  // Clamp
  return [
    Math.max(0, Math.min(255, nr)),
    Math.max(0, Math.min(255, ng)),
    Math.max(0, Math.min(255, nb)),
  ];
}

// Very basic ANSI 16 colors mapped
export function getAnsi16(r: number, g: number, b: number): string {
  const colors = [
    { r: 0, g: 0, b: 0, code: 30 },
    { r: 170, g: 0, b: 0, code: 31 },
    { r: 0, g: 170, b: 0, code: 32 },
    { r: 170, g: 85, b: 0, code: 33 },
    { r: 0, g: 0, b: 170, code: 34 },
    { r: 170, g: 0, b: 170, code: 35 },
    { r: 0, g: 170, b: 170, code: 36 },
    { r: 170, g: 170, b: 170, code: 37 },
    { r: 85, g: 85, b: 85, code: 90 },
    { r: 255, g: 85, b: 85, code: 91 },
    { r: 85, g: 255, b: 85, code: 92 },
    { r: 255, g: 255, b: 85, code: 93 },
    { r: 85, g: 85, b: 255, code: 94 },
    { r: 255, g: 85, b: 255, code: 95 },
    { r: 85, g: 255, b: 255, code: 96 },
    { r: 255, g: 255, b: 255, code: 97 },
  ];
  
  let minDist = Infinity;
  let best = colors[0];
  
  for (const c of colors) {
    const dist = Math.pow(r - c.r, 2) + Math.pow(g - c.g, 2) + Math.pow(b - c.b, 2);
    if (dist < minDist) {
      minDist = dist;
      best = c;
    }
  }
  
  // Mapping to basic CSS classes for demo purposes
  // In a real terminal it would be \x1b[...m
  // Here we'll just return the rgb string for the best matched color
  return `rgb(${best.r},${best.g},${best.b})`;
}

// Basic ANSI 256 mapping
export function getAnsi256(r: number, g: number, b: number): string {
  // To keep it simple and performant, we approximate to the 6x6x6 color cube + 24 grayscale
  if (r === g && g === b) {
    let gray = Math.round((r / 255) * 23);
    let val = 8 + (gray * 10);
    return `rgb(${val},${val},${val})`;
  }
  
  let cr = Math.round((r / 255) * 5);
  let cg = Math.round((g / 255) * 5);
  let cb = Math.round((b / 255) * 5);
  
  return `rgb(${cr * 51},${cg * 51},${cb * 51})`;
}
