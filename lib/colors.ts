const DEFAULT_CHIP_BACKGROUND = '#232428'; // A default background color
const DEFAULT_TEXT_COLOR = '#ffffff';

/**
 * Checks if a given string is a valid hex color code.
 * @param color The string to check.
 * @returns True if it's a valid hex color, false otherwise.
 */
const isValidHex = (color: string): boolean => {
  if (!color || typeof color !== 'string') return false;
  return /^#([0-9A-F]{3}){1,2}$/i.test(color);
};

/**
 * A simple list of supported named colors and their hex values.
 * Extend this list as needed.
 */
const namedColors: { [key: string]: string } = {
  red: '#FF0000',
  green: '#00FF00',
  blue: '#0000FF',
  yellow: '#FFFF00',
  cyan: '#00FFFF',
  magenta: '#FF00FF',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#808080',
  grey: '#808080',
  // Theme specific colors
  primary: '#176c3a', 
  surface: '#232428',
  // Add more colors as needed from your theme or common usage
};

/**
 * Tries to return a valid color string. 
 * If the input is a known named color, its hex value is returned.
 * If the input is a valid hex color, it's returned as is.
 * Otherwise, a default background color is returned.
 * 
 * @param colorInput The color string (e.g., "red", "#FF0000").
 * @param defaultColor The default color to return if validation fails.
 * @returns A valid color string or the default background color.
 */
export const getValidChipColors = (colorInput?: string | null, defaultBackgroundColor: string = DEFAULT_CHIP_BACKGROUND, defaultTextColor: string = DEFAULT_TEXT_COLOR): { backgroundColor: string; textColor: string } => {
  if (!colorInput) {
    return { backgroundColor: defaultBackgroundColor, textColor: defaultTextColor };
  }

  const lowerColorInput = colorInput.toLowerCase();

  if (namedColors[lowerColorInput]) {
    const hexColor = namedColors[lowerColorInput];
    // Basic contrast check (very simplified)
    // White text for dark backgrounds, black text for light backgrounds
    const brightness = कथितBrightness(hexColor);
    return { backgroundColor: hexColor, textColor: brightness < 128 ? DEFAULT_TEXT_COLOR : '#000000' };
  }

  if (isValidHex(colorInput)) {
    const brightness = कथितBrightness(colorInput);
    return { backgroundColor: colorInput, textColor: brightness < 128 ? DEFAULT_TEXT_COLOR : '#000000' };
  }
  
  // If color is not a known name or valid hex, return defaults
  return { backgroundColor: defaultBackgroundColor, textColor: defaultTextColor };
};

/**
 * Calculates perceived brightness of a hex color.
 * @param hexColor Hex color string (e.g., "#RRGGBB")
 * @returns A brightness value (0-255).
 */
function कथितBrightness(hexColor: string): number {
  try {
    let r, g, b;
    if (hexColor.length === 4) { // #RGB
      r = parseInt(hexColor[1] + hexColor[1], 16);
      g = parseInt(hexColor[2] + hexColor[2], 16);
      b = parseInt(hexColor[3] + hexColor[3], 16);
    } else { // #RRGGBB
      r = parseInt(hexColor.substring(1, 3), 16);
      g = parseInt(hexColor.substring(3, 5), 16);
      b = parseInt(hexColor.substring(5, 7), 16);
    }
    // Standard formula for perceived brightness
    return Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
  } catch (e) {
    return 128; // Default to medium brightness on error
  }
} 