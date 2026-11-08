// Casino Run palette: the single source of truth for sprites, the font, CSS vars and the 3DS port.
// Sprite grids use the one-character keys; '.' is transparent.
export const PALETTE = {
  ink:         { key: "k", hex: "#0E0C17" },
  cabinet:     { key: "K", hex: "#191727" },
  panel:       { key: "x", hex: "#29263A" },
  panelHi:     { key: "X", hex: "#3B3752" },
  purple:      { key: "p", hex: "#6944B8" },
  purpleLight: { key: "P", hex: "#9B7BF0" },
  gold:        { key: "g", hex: "#F4C34E" },
  goldDark:    { key: "G", hex: "#B8862B" },
  cyan:        { key: "c", hex: "#37D9E8" },
  cyanDark:    { key: "C", hex: "#1E8FA0" },
  red:         { key: "r", hex: "#F45B58" },
  redDark:     { key: "R", hex: "#A8323A" },
  redLight:    { key: "l", hex: "#FF7A72" },
  green:       { key: "n", hex: "#7EDD65" },
  greenDark:   { key: "N", hex: "#3F9447" },
  cream:       { key: "e", hex: "#FFF0CE" },
  creamDark:   { key: "E", hex: "#D9C49A" },
  orange:      { key: "o", hex: "#FF9E45" },
  orangeDark:  { key: "O", hex: "#C4621E" },
  pink:        { key: "i", hex: "#FF8CC6" },
  pinkDark:    { key: "I", hex: "#C9558F" },
  blue:        { key: "b", hex: "#3A7BD5" },
  blueDark:    { key: "B", hex: "#24508F" },
  felt:        { key: "f", hex: "#2E7D4F" },
  brown:       { key: "h", hex: "#8A5A3B" },
  brownDark:   { key: "H", hex: "#5E3A24" },
  grey:        { key: "s", hex: "#8B87A3" },
  greyDark:    { key: "S", hex: "#5B5772" },
  white:       { key: "w", hex: "#FFFFFF" },
};

export const KEY_TO_HEX = Object.fromEntries(Object.values(PALETTE).map((c) => [c.key, c.hex]));
export const NAME_TO_KEY = Object.fromEntries(Object.entries(PALETTE).map(([name, c]) => [name, c.key]));

export function hexToRgba(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), 255];
}
