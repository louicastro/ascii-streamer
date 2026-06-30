export type ColorMode = 'Monochrome' | 'Grayscale' | 'ANSI 16' | 'ANSI 256' | 'True Color';

export const CHARACTER_SETS: Record<string, string> = {
  Standard: " .:-=+*#%@",
  Extended: " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  Block: " ░▒▓█",
  Minimal: " .oO0",
  Braille: " ⠁⠃⠇⡇⣇⣧⣷⣿",
};

export interface AppPreset {
  id: string;
  name: string;
  settings: {
    characterSet: string;
    customCharSet: string;
    colorMode: ColorMode;
    cols: number;
    fps: number;
    brightness: number;
    contrast: number;
    gamma: number;
    saturation: number;
    invertChars: boolean;
    fontSize: number;
  };
}

export const PRESETS: AppPreset[] = [
  {
    id: "classic-green",
    name: "Classic Green",
    settings: {
      characterSet: "Standard",
      customCharSet: "",
      colorMode: "Monochrome",
      cols: 80,
      fps: 30,
      brightness: 0,
      contrast: 20,
      gamma: 0,
      saturation: 0,
      invertChars: false,
      fontSize: 10,
    }
  },
  {
    id: "matrix-rain",
    name: "Matrix Rain",
    settings: {
      characterSet: "Extended",
      customCharSet: "",
      colorMode: "Monochrome",
      cols: 120,
      fps: 30,
      brightness: -10,
      contrast: 50,
      gamma: 10,
      saturation: 0,
      invertChars: false,
      fontSize: 8,
    }
  },
  {
    id: "true-color",
    name: "True Color",
    settings: {
      characterSet: "Block",
      customCharSet: "",
      colorMode: "True Color",
      cols: 100,
      fps: 30,
      brightness: 0,
      contrast: 0,
      gamma: 0,
      saturation: 20,
      invertChars: false,
      fontSize: 10,
    }
  },
  {
    id: "braille-art",
    name: "Braille Art",
    settings: {
      characterSet: "Braille",
      customCharSet: "",
      colorMode: "Grayscale",
      cols: 150,
      fps: 30,
      brightness: 10,
      contrast: 30,
      gamma: -10,
      saturation: 0,
      invertChars: false,
      fontSize: 6,
    }
  },
  {
    id: "block-pixels",
    name: "Block Pixels",
    settings: {
      characterSet: "Block",
      customCharSet: "",
      colorMode: "ANSI 256",
      cols: 60,
      fps: 15,
      brightness: 0,
      contrast: 10,
      gamma: 0,
      saturation: 10,
      invertChars: false,
      fontSize: 14,
    }
  }
];
