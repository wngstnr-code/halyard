import { ThemeTypings, extendTheme } from '@chakra-ui/react'
import { colors, primaryTextColor } from './brand'
import { getComponents } from './base/components'
import { fonts, styles } from './base/foundations'
import { getSemanticTokens } from './base/semantic-tokens'
import { getTokens } from './base/tokens'

const tokens = getTokens(colors, primaryTextColor)

export const theme = extendTheme({
  fonts,
  styles,
  colors,
  semanticTokens: getSemanticTokens(tokens, colors),
  components: getComponents(tokens, primaryTextColor),
}) as ThemeTypings
