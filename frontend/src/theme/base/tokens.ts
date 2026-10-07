import tinycolor from 'tinycolor2'
import { createBackgroundOpacity } from '@/theme/theme-helpers'

export function getTokens(colors: any, primaryTextColor: string) {
  return {
    colors: {
      light: {
        background: {
          // Background colors
          level0: '#E2E6EA',
          level1: '#ECEFF2',
          level2: '#F3F5F8',
          level3: '#F8FAFC',
          level4: '#FFFFFF',
          base: colors.base.light,
          baseWithOpacity: createBackgroundOpacity(colors.base.hslLight, 0.5),
          level0WithOpacity: 'rgba(226, 230, 234, 0.5)',
          special: colors.gradient.dawnLight,
          specialAlpha15: colors.gradient.dawnLightAlpha15,
          specialSecondary: colors.gradient.sunsetLight,
          highlight: colors.primary['800'],
          gold: colors.gradient.goldLight,
          warning: colors.gradient.warningLight,
        },
        border: {
          base: '#FFFFFF',
          divider: '#D6DBE3',
          highlight: colors.primary['800'],
          subduedZen: 'rgba(15, 53, 98, 0.06)',
          zen: 'rgba(15, 53, 98, 0.12)',
          special: colors.gradient.special,
        },
        // Button colors
        button: {
          background: {
            primary: colors.gradient.dawnDark,
            secondary: colors.gradient.sandLight,
            tertiary: 'linear-gradient(180deg, #FFFFFF 0%, #F1F4F7 100%)',
          },
          border: {
            tertiary: '#CBCED1',
            disabled: 'gray.400',
          },
          text: {
            tertiary: colors.gray['600'],
            disabled: 'gray.400',
          },
        },
        // Font colors
        text: {
          primary: '#141B24',
          secondary: '#4E5661',
          secondaryAlpha50: tinycolor('#4E5661').setAlpha(0.5),
          primaryGradient: primaryTextColor,
          secondaryGradient: 'linear-gradient(45deg, #4E5661 0%, #6A6F76 100%)',
          special: colors.gradient.dawnLight,
          specialSecondary: colors.gradient.sunsetLight,
          gold: colors.gradient.goldLight,
          link: colors.primary['700'],
          linkHover: colors.primary['900'],
          maxContrast: '#000',
          maxContrastOpposite: '#fff',
          highlight: colors.primary['700'],
          warning: colors.orange['500'],
          error: colors.red['600'],
        },
        // Input colors
        input: {
          labelFocus: colors.primary['800'], // Not implemented
          labelError: colors.red['600'], // Not implemented
          fontDefault: '#141B24',
          fontFocus: '#0A0E12',
          fontPlaceholder: tinycolor('#4E5661').setAlpha(0.6),
          fontError: colors.red['900'],
          fontHint: '#4E5661',
          fontHintError: colors.red['600'],
          caret: colors.primary['800'],
          bgDefault: '#E5E8EB',
          bgHover: '#F3F5F8',
          bgHoverDisabled: 'rgba(234, 98, 73, 0.2)',
          bgFocus: '#ffffff',
          bgError: 'rgba(254, 244, 242, 0.5)',
          bgErrorFocus: 'tinycolor(colors.base.light).lighten(8)',
          borderDefault: '#CBCED1',
          borderHover: colors.primary['600'],
          borderFocus: colors.primary['800'],
          borderError: colors.red['500'],
          borderErrorFocus: colors.red['600'],
          borderDisabled: 'gray.300',
          clearIcon: tinycolor(colors.base.light).lighten(5),
          clearHover: tinycolor(colors.base.light).lighten(1),
          clearError: colors.red['500'],
          clearErrorHover: colors.red['600'],
        },
        icon: {
          base: '#4E5661',
        },
      },
      dark: {
        // Background colors
        background: {
          level0: '#0D1218',
          level1: '#12171E',
          level2: '#161C24',
          level3: '#1B2129',
          level4: '#222932',
          base: colors.base.dark,
          baseWithOpacity: createBackgroundOpacity(colors.base.hslDark, 0.97),
          level0WithOpacity: 'rgba(13, 18, 24, 0.96)',
          special: colors.gradient.dawnDark,
          specialAlpha15: colors.gradient.dawnDarkAlpha15,
          specialSecondary: colors.gradient.sunsetDark,
          highlight: '#88B6E6',
          gold: colors.gradient.goldDark,
          warning: colors.gradient.warningDark,
        },
        // Border colors
        border: {
          base: '#293038',
          divider: colors.gray['800'],
          highlight: '#88B6E6',
          zen: 'rgba(41, 48, 56, 0.50)',
          subduedZen: 'rgba(235, 239, 242, 0.05)',
          special: colors.gradient.special,
        },
        // Button colors
        button: {
          background: {
            primary: colors.gradient.dawnDark,
            secondary: colors.gradient.sandDark,
            tertiary: `linear-gradient(180deg, ${tinycolor(colors.base.dark).lighten(8)} 0%, ${
              colors.base.dark
            } 100%)`,
          },
          border: {
            tertiary: tinycolor(colors.base.dark).lighten(15),
            disabled: 'gray.500',
          },
          text: {
            tertiary: colors.gray['300'],
            disabled: 'gray.500',
          },
        },
        // Font colors
        text: {
          primary: '#EBEFF2',
          secondary: colors.gray['400'],
          secondaryAlpha50: tinycolor(colors.gray['400']).setAlpha(0.15),
          primaryGradient: 'linear-gradient(45deg, #FFFFFF 0%, #CDDEF4 100%)',
          secondaryGradient: 'linear-gradient(45deg, #909BAD 0%, #728097 100%)',
          special: 'linear-gradient(90deg, #CDDEF4 0%, #ADC6E8 50%, #85A7D3 100%)',
          specialSecondary: 'linear-gradient(180deg, #ADC6E8 0%, #5B82B5 100%)',
          gold: colors.gradient.goldDark,
          link: '#88B6E6',
          linkHover: colors.primary['200'],
          maxContrast: '#fff',
          maxContrastOpposite: '#000',
          highlight: '#88B6E6',
          warning: colors.orange['300'],
          error: colors.red['400'],
        },
        input: {
          labelFocus: '#88B6E6',
          labelError: colors.red['400'],

          fontDefault: '#EBEFF2',
          fontFocus: 'white',
          fontPlaceholder: tinycolor(colors.gray['500']).setAlpha(0.8),
          fontError: colors.red['200'],
          fontHint: 'gray.400',
          fontHintError: colors.red['400'],
          caret: 'green.400',
          bgDefault: tinycolor(colors.base.dark).darken(2),
          bgHover: tinycolor(colors.base.dark).darken(4),
          bgHoverDisabled: tinycolor(colors.red[500]).setAlpha(0.2),
          bgFocus: tinycolor(colors.base.dark).darken(8),
          bgError: '#2A1A1C',
          bgErrorFocus: tinycolor(colors.base.dark).darken(8),
          borderDefault: '#293038',
          borderHover: colors.primary['400'],
          borderFocus: '#88B6E6',
          borderError: colors.red['400'],
          borderErrorFocus: colors.red['300'],
          borderDisabled: 'gray.600',
          clearIcon: tinycolor(colors.base.dark).lighten(5),
          clearHover: tinycolor(colors.base.light).lighten(1),
          clearError: colors.red['400'],
          clearErrorHover: colors.red['500'],
        },
        icon: {
          base: 'gray.400',
        },
      },
    },
    shadows: {
      light: {
        sm: '0px 0px 0px 1px #1A263805, 1px 1px 1px -0.5px #1A26380F, 3px 3px 3px -1.5px #1A26380F',
        md: '0px 0px 0px 1px #1A263805, 1px 1px 1px -0.5px #1A26380F, 3px 3px 3px -1.5px #1A26380F, 6px 6px 6px -3px #1A26380F, -0.5px -0.5px 0px 0px #FFFFFF',
        lg: '0px 0px 0px 1px #1A263805, 1px 1px 1px -0.5px #1A26380F, 3px 3px 3px -1.5px #1A26380F, 6px 6px 6px -3px #1A26380F, 12px 12px 12px -6px #1A26380F, -0.5px -1px 0px 0px #FFFFFF',
        xl: '0px 0px 0px 1px #1A263805, 1px 1px 1px -0.5px #1A26380F, 3px 3px 3px -1.5px #1A26380F, 6px 6px 6px -3px #1A26380F, 12px 12px 12px -6px #1A26380F, 24px 24px 24px -12px #1A26380F, -0.5px -1px 0px 0px #FFFFFF',
        '2xl':
          '0px 0px 0px 1px #1A263805, 1px 1px 1px -0.5px #1A26380F, 3px 3px 3px -1.5px #1A26380F, 6px 6px 6px -3px #1A26380F, 12px 12px 12px -6px #1A26380F, 24px 24px 24px -12px #1A26380F, 42px 42px 42px -24px #1A26380F, -0.5px -1px 0px 0px #FFFFFF',
        '3xl':
          '0px 0px 0px 1px #1A263805, 1px 1px 1px -0.5px #1A26380F, 3px 3px 3px -1.5px #1A26380F, 6px 6px 6px -3px #1A26380F, 12px 12px 12px -6px #1A26380F, 24px 24px 24px -12px #1A26380F, 42px 42px 42px -24px #1A26380F, 0px 42px 84px 0 #1A26380F, -0.5px -1px 0px 0px #FFFFFF',

        shadowInnerBase:
          '0px 2px 4px 0px rgba(0, 0, 0, 0.05) inset, 0px 4px 8px 0px rgba(0, 0, 0, 0.05) inset, 0px 10px 20px 0px rgba(0, 0, 0, 0.05) inset',
        btnDefault:
          '0.1rem 0.1rem 0.1rem 0px rgba(255, 255, 255, 0.5) inset, -0.1rem -0.1rem 0.1rem 0px rgba(0, 0, 0, 0.15) inset, 0.125rem 0.125rem 0.125rem 0px rgba(0, 0, 0, 0.15)',
        btnDefaultActive:
          '0px 0px 8px 0px rgba(0, 0, 0, 0.1) inset, 0px 0px 2px 0px rgba(0, 0, 0, 0.1) inset',
        btnTertiary:
          '0.1rem 0.1rem 0.1rem 0px rgba(255, 255, 255, 0.5) inset, -0.1rem -0.1rem 0.1rem 0px rgba(0, 0, 0, 0.15) inset, 0.1rem 0.1rem 0.1rem 0px rgba(0, 0, 0, 0.07)',
        fontDefault: '0px -1px 0px rgba(255, 255, 255, 0.05), 0px 1px 2px rgba(0, 0, 0, 0.2)',
        fontLight: '0px -1px 0px rgba(255, 255, 255, 0.30), 0px 1px 2px rgba(0, 0, 0, 0.20)',
        fontDark: '0px -1px 0px rgba(255, 255, 255, 0.30), 0px 1px 2px rgba(0, 0, 0, 0.05)',
        input: {
          innerBase:
            '0px 2px 4px 0px rgba(0, 0, 0, 0.05) inset, 0px 4px 8px 0px rgba(0, 0, 0, 0.05) inset, 0px 10px 20px 0px rgba(0, 0, 0, 0.05) inset, 0px -1px 0px 0px rgba(255, 255, 255, 0.8) inset',
          innerFocus: `0px 2px 4px 0px ${tinycolor(colors.primary['800']).setAlpha(
            0.1
          )} inset, 0px 4px 8px 0px ${tinycolor(colors.primary['800']).setAlpha(
            0.2
          )} inset, 0 0 0 1px ${colors.primary['800']}, 0px 0px 10px 0px rgba(255, 255, 255, 1) inset`,
          innerError: `0px 2px 4px 0px ${tinycolor(colors.red['500']).setAlpha(
            0.1
          )} inset, 0px 4px 8px 0px ${tinycolor(colors.red['500']).setAlpha(
            0.1
          )} inset, 0 0 0 1px ${colors.red['500']}`,
        },
        innerLg:
          '1px 1px 2px 0px rgba(0, 0, 0, 0.05) inset, 2px 2px 4px 0px rgba(0, 0, 0, 0.06) inset, 10px 10px 20px 0px rgba(0, 0, 0, 0.03) inset, -0.75px -1px 1px 0px rgba(255, 255, 255, 1) inset',
        innerXl:
          '4px 4px 4px 0px rgba(0, 0, 0, 0.02) inset, 7px 6px 12px 0px rgba(0, 0, 0, 0.06) inset, 40px 40px 80px 0px rgba(0, 0, 0, 0.03) inset, -0.75px -1px 1px 0px rgba(255, 255, 255, 1) inset',
        innerRockShadow:
          '-2px -2px 4px 0px rgba(0, 0, 0, 0.08) inset, -4px -4px 8px 0px rgba(0, 0, 0, 0.08) inset, 1px 1px 2px 0px rgba(255, 255, 255, 1) inset, 4px 4px 8px 0px rgba(255, 255, 255, 0.80) inset, 2px 2px 4px 0px rgba(255, 255, 255, 0.80) inset',
        innerRockShadowSm:
          '-2px -2px 4px 0px rgba(0, 0, 0, 0.04) inset, -4px -4px 8px 0px rgba(0, 0, 0, 0.04) inset, 1px 1px 2px 0px rgba(255, 255, 255, 0.5) inset, 4px 4px 8px 0px rgba(255, 255, 255, 0.40) inset, 2px 2px 4px 0px rgba(255, 255, 255, 0.40) inset',
        chartIconInner:
          'drop-shadow(0px 0px 0px rgba(26, 38, 56, 0.02)) drop-shadow(1px 1px 1px rgba(26, 38, 56, 0.06)) drop-shadow(3px 3px 3px rgba(26, 38, 56, 0.06)) drop-shadow(-0.5px -1px 0px #FFF)',
        chartIconOuter:
          'drop-shadow(0px 0px 0px rgba(26, 38, 56, 0.02)) drop-shadow(1px 1px 1px rgba(26, 38, 56, 0.06)) drop-shadow(3px 3px 3px rgba(26, 38, 56, 0.06)) drop-shadow(-0.5px -1px 0px #FFF)',
        chart:
          'drop-shadow(0px 0px 0px rgba(26, 38, 56, 0.4)) drop-shadow(1px 1px 1px rgba(26, 38, 56, 0.09)) drop-shadow(5px 3px 15px rgba(26, 38, 56, 0.3)) drop-shadow(4px -2px 4px rgba(26, 38, 56, 0.2)) drop-shadow(-0.5px -1px 0px #FFF)',
        zen: '0px 4px 4px 0px rgba(0, 0, 0, 0.03);',
      },
      dark: {
        sm: '0px 0px 0px 1px #00000005, 1px 1px 1px -0.5px #0000000F, 3px 3px 3px -1.5px #0000000F',
        md: '0px 0px 0px 1px #00000005, 1px 1px 1px -0.5px #0000000F, 3px 3px 3px -1.5px #0000000F, 6px 6px 6px -3px #0000001A, -0.5px -1px 0px 0px #FFFFFF25',
        lg: '0px 0px 0px 1px #00000005, 1px 1px 1px -0.5px #0000000F, 3px 3px 3px -1.5px #0000000F, 6px 6px 6px -3px #0000000F, 12px 12px 12px -6px #0000001A, 0px -1px 0px 0px #FFFFFF26',
        xl: '0px 0px 0px 1px #00000005, 1px 1px 1px -0.5px #0000000F, 3px 3px 3px -1.5px #0000000F, 6px 6px 6px -3px #0000000F, 12px 12px 12px -6px #0000000F, 24px 24px 24px -12px #0000001A, -0.5px -1px 0px 0px #FFFFFF26',
        '2xl':
          '0px 0px 0px 1px #00000005, 1px 1px 1px -0.5px #0000000F, 3px 3px 3px -1.5px #0000000F, 6px 6px 6px -3px #0000000F, 12px 12px 12px -6px #0000000F, 24px 24px 24px -12px #0000000F, 42px 42px 42px -24px #0000000F, -0.5px -0.5px 0px 0px #FFFFFF26',
        '3xl':
          '0px 0px 0px 1px #00000005, 1px 1px 1px -0.5px #0000000F, 3px 3px 3px -1.5px #0000000F, 6px 6px 6px -3px #0000000F, 12px 12px 12px -6px #0000000F, 24px 24px 24px -12px #0000000F, 42px 42px 42px -24px #0000000F, 0px 42px 84px 0 rgba(0,0,0,0.3), -0.5px -0.5px 0px 0px #FFFFFF26',
        shadowInnerBase:
          '0px 2px 4px 0px rgba(0, 0, 0, 0.10) inset, 0px 4px 8px 0px rgba(0, 0, 0, 0.10) inset, 0px 10px 20px 0px rgba(0, 0, 0, 0.10) inset',
        btnDefault:
          '0.1rem 0.1rem 0.1rem 0px rgba(255, 255, 255, 0.75) inset, -0.1rem -0.1rem 0.1rem 0px rgba(0, 0, 0, 0.3) inset, 0.125rem 0.125rem 0.125rem 0px rgba(0, 0, 0, 0.25)',
        btnDefaultActive:
          '0px 0px 8px 0px rgba(0, 0, 0, 0.50) inset, 0px 0px 4px 0px rgba(0, 0, 0, 0.70) inset',
        btnTertiary:
          '0.1rem 0.1rem 0.1rem 0px rgba(255, 255, 255, 0.05) inset, -0.1rem -0.1rem 0.1rem 0px rgba(0, 0, 0, 0.15) inset, 0.125rem 0.125rem 0.125rem 0px rgba(0, 0, 0, 0.09)',
        fontDefault: '0px -1px 0px rgba(255, 255, 255, 0.30), 0px 1px 2px rgba(0, 0, 0, 0.20)',
        fontLight: '0px -1px 0px rgba(255, 255, 255, 0.30), 0px 1px 2px rgba(0, 0, 0, 0.20)',
        fontDark: '0px -1px 0px rgba(255, 255, 255, 0.30), 0px 1px 2px rgba(0, 0, 0, 0.20)',
        input: {
          innerBase:
            '0px 2px 4px 0px rgba(0, 0, 0, 0.10) inset, 0px 4px 8px 0px rgba(0, 0, 0, 0.10) inset, 0px 10px 20px 0px rgba(0, 0, 0, 0.10) inset, 0px -1px 0px 0px rgba(255, 255, 255, 0.15) inset',
          innerFocus: `0px 2px 4px 0px ${tinycolor(colors.primary['300']).setAlpha(
            0.1
          )} inset, 0px 4px 8px 0px ${tinycolor(colors.primary['300']).setAlpha(
            0.2
          )} inset, 0 0 0 1px ${colors.primary['300']}, 0px 0px 20px 0px rgba(0, 0, 0, 0.5) inset`,
          innerError: `0px 2px 4px 0px ${tinycolor(colors.red['500']).setAlpha(
            0.2
          )} inset, 0px 4px 8px 0px ${tinycolor(colors.red['500']).setAlpha(
            0.2
          )} inset, 0 0 0 1px ${colors.red['500']}`,
        },
        innerLg:
          '10px 10px 20px 0px rgba(0, 0, 0, 0.08) inset, 5px 5px 10px 0px rgba(0, 0, 0, 0.08) inset, 2px 2px 4px 0px rgba(0, 0, 0, 0.08) inset, -0.5px -1px 1px 0px rgba(255, 255, 255, 0.15) inset',
        innerXl:
          '20px 20px 50px 0px rgba(0, 0, 0, 0.25) inset, 10px 10px 25px 0px rgba(0, 0, 0, 0.18) inset, 2px 2px 11px 0px rgba(0, 0, 0, 0.19) inset, 0px -1px 1px 0px #FFFFFF40 inset',
        innerRockShadow:
          '-2px -2px 4px 0px rgba(0, 0, 0, 0.65) inset, -4px -4px 8px 0px rgba(0, 0, 0, 0.65) inset, 1px 1px 2px 0px rgba(255, 255, 255, 0.08) inset, 4px 4px 8px 0px rgba(255, 255, 255, 0.20) inset, 2px 2px 4px 0px rgba(255, 255, 255, 0.08) inset',
        innerRockShadowSm:
          '-2px -2px 4px 0px rgba(0, 0, 0, 0.3) inset, -4px -4px 8px 0px rgba(0, 0, 0, 0.3) inset, 1px 1px 2px 0px rgba(255, 255, 255, 0.04) inset, 4px 4px 8px 0px rgba(255, 255, 255, 0.10) inset, 2px 2px 4px 0px rgba(255, 255, 255, 0.04) inset',

        chartIconInner:
          'drop-shadow(0px 0px 0px rgba(0, 0, 0, 0.02)) drop-shadow(1px 1px 1px rgba(0, 0, 0, 0.06)) drop-shadow(3px 3px 3px rgba(0, 0, 0, 0.06))',
        chartIconOuter:
          'drop-shadow(0px 0px 0px rgba(0, 0, 0, 0.2)) drop-shadow(1px 1px 1px rgba(0, 0, 0, 0.1)) drop-shadow(3px 5px 5px rgba(0, 0, 0, 0.2))',
        chart:
          'drop-shadow(0px 0px 0px rgba(0, 0, 0, 0.02)) drop-shadow(1px 1px 1px rgba(0, 0, 0, 0.1)) drop-shadow(3px 3px 3px rgba(0, 0, 0, 0.1)) drop-shadow(6px 6px 6px rgba(0, 0, 0, 0.1)) drop-shadow(12px 12px 12px rgba(0, 0, 0, 0.06)) drop-shadow(42px 42px 42px rgba(0, 0, 0, 0.06))',
        zen: '0px 4px 4px 0px rgba(0, 0, 0, 0.10)',
      },
    },
    transition: {
      default: 'all 0.3s ease-in-out',
      fast: 'all 0.2s ease-in-out',
      slow: 'all 0.5s ease-in-out',
    },
  }
}
