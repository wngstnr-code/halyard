import { colors as baseColors } from '@/theme/base/colors'

export const colors = {
  ...baseColors,
  base: {
    light: 'background.level1',
    hslLight: '210,17%,94%',
    dark: 'hsla(213,30%,7%,1)',
    hslDark: '213,30%,7%',
  },
}

export const primaryTextColor = `linear-gradient(45deg, ${colors.primary['800']} 0%, ${colors.primary['600']} 100%)`
