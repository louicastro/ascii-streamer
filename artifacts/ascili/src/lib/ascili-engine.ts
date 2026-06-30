import { ColorMode } from "./presets";
import { adjustPixel, getAnsi16, getAnsi256, rgbToLuminance } from "./color-utils";

export class AsciliEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContextType | null;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContextType | null;
  }

  public captureFrame(
    video: HTMLVideoElement,
    cols: number
  ): { imageData: ImageData; rows: number } | null {
    if (!this.ctx || video.videoWidth === 0 || video.videoHeight === 0) return null;

    const aspect = video.videoHeight / video.videoWidth;
    // Terminal characters are usually roughly 2:1 height:width, so adjust aspect ratio
    const charAspectAdjust = 0.5;
    const rows = Math.max(1, Math.floor(cols * aspect * charAspectAdjust));

    this.canvas.width = cols;
    this.canvas.height = rows;

    this.ctx.drawImage(video, 0, 0, cols, rows);
    
    return {
      imageData: this.ctx.getImageData(0, 0, cols, rows),
      rows
    };
  }

  public renderToAscii(
    imageData: ImageData,
    cols: number,
    rows: number,
    colorMode: ColorMode,
    charSet: string,
    invertChars: boolean,
    brightness: number,
    contrast: number,
    gamma: number,
    saturation: number
  ): string {
    const data = imageData.data;
    let output = "";
    
    const chars = invertChars ? charSet.split("").reverse().join("") : charSet;
    const charLen = chars.length;

    let r, g, b, a;
    let lum;
    let charIndex;
    let char;
    let colorStyle = "";

    // Iterate through pixels
    for (let y = 0; y < rows; y++) {
      let line = "";
      for (let x = 0; cols > x; x++) {
        const offset = (y * cols + x) * 4;
        r = data[offset];
        g = data[offset + 1];
        b = data[offset + 2];
        a = data[offset + 3];

        if (a < 128) {
          // Transparent pixel
          line += " ";
          continue;
        }

        if (brightness !== 0 || contrast !== 0 || gamma !== 0 || saturation !== 0) {
          [r, g, b] = adjustPixel(r, g, b, brightness, contrast, gamma, saturation);
        }

        lum = rgbToLuminance(r, g, b);
        charIndex = Math.max(0, Math.min(charLen - 1, Math.floor((lum / 255) * charLen)));
        char = chars[charIndex] || " ";

        // Escape HTML
        if (char === "<") char = "&lt;";
        else if (char === ">") char = "&gt;";
        else if (char === "&") char = "&amp;";
        else if (char === " ") char = "&nbsp;";

        if (colorMode === "Monochrome") {
          line += char;
        } else {
          if (colorMode === "Grayscale") {
            const val = Math.round(lum);
            colorStyle = `rgb(${val},${val},${val})`;
          } else if (colorMode === "ANSI 16") {
            colorStyle = getAnsi16(r, g, b);
          } else if (colorMode === "ANSI 256") {
            colorStyle = getAnsi256(r, g, b);
          } else if (colorMode === "True Color") {
            colorStyle = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
          }
          line += `<span style="color:${colorStyle}">${char}</span>`;
        }
      }
      output += line + "<br/>";
    }

    return output;
  }
}
