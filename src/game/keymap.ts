export interface KeyMap {
  [key: string]: number; // key -> number (1-9)
}

export const DEFAULT_KEYMAP: KeyMap = {
  '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
};

export const AZERTY_KEYMAP: KeyMap = {
  '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'a': 1, 'z': 2, 'e': 3,
  'q': 4, 's': 5, 'd': 6,
  'w': 7, 'x': 8, 'c': 9,
};

export const QWERTY_KEYMAP: KeyMap = {
  '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
};

export function getKeyMap(profile: string, customMap?: Record<string, string>): KeyMap {
  switch (profile) {
    case 'azerty': return AZERTY_KEYMAP;
    case 'qwerty': return QWERTY_KEYMAP;
    case 'custom':
      if (customMap) {
        const map: KeyMap = { ...DEFAULT_KEYMAP };
        for (const [num, key] of Object.entries(customMap)) {
          const n = parseInt(num, 10);
          if (n >= 1 && n <= 9) {
            map[key.toLowerCase()] = n;
          }
        }
        return map;
      }
      return DEFAULT_KEYMAP;
    default: return DEFAULT_KEYMAP;
  }
}

export function mapKeyToNumber(key: string, keymap: KeyMap): number | null {
  const lower = key.toLowerCase();
  return keymap[lower] ?? null;
}
