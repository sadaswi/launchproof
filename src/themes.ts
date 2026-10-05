/** LaunchProof uses one deliberate theme across the public page and workspace. */
export const THEMES = [
  {
    id: 'notebook',
    label: 'Notebook',
    description: 'Warm paper and green ink.',
  },
] as const
export type ThemeId = (typeof THEMES)[number]['id']
export function getActiveTheme(): ThemeId {
  return 'notebook'
}
export function getTheme(_id: string) {
  return THEMES[0]
}
