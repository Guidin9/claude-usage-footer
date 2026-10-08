import { atom, read, update } from 'claude-code'
import type { Register, SessionRateLimit } from 'claude-code'

import type { Limits } from '../types'

const limits = atom({ plugin: 'usage-footer', key: 'limits' } as const, null)

const labels = {
  en: {
    left: (n: number) => `5h: ${n}% left`,
    resets: (t: string) => `resets ${t}`,
    week: (n: number) => `week: ${n}%`,
  },
  tr: {
    left: (n: number) => `5s: %${n} kaldı`,
    resets: (t: string) => `${t} sıfırlanır`,
    week: (n: number) => `hafta: %${n}`,
  },
}

const remaining = (w: SessionRateLimit) => Math.max(0, Math.round(100 - w.percentUsed))

const toLimits = (windows: SessionRateLimit[]): Limits | null => {
  const five = windows.find(w => w.kind === 'five_hour')
  if (!five) return null
  const week = windows.find(w => w.kind === 'seven_day')
  return {
    fiveLeft: remaining(five),
    fiveResetsAt: five.resetsAt,
    weekLeft: week ? remaining(week) : undefined,
  }
}

const hhmm = (iso: string) => {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export const register: Register = (on, options) => {
  const t = labels[options.language === 'tr' ? 'tr' : 'en']
  const showWeekly = options.showWeekly !== false

  on('session.start', async ($, e, next) => {
    const result = await next(e)
    const { rateLimits } = await $.session.usage()
    await update($, limits, () => toLimits(rateLimits))
    return result
  })

  on('session.measure', async ($, e, next) => {
    await update($, limits, () => toLimits(e.rateLimits))
    return next(e)
  })

  // SessionMode is the dim label slot at the right of the prompt footer
  // (same row as "auto mode on"); keep the engine's labels and append ours.
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    const l = await read($, limits)
    if (!l) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const color = l.fiveLeft <= 20 ? 'error' : l.fiveLeft <= 50 ? 'warning' : 'success'
    const rest = [
      l.fiveResetsAt ? t.resets(hhmm(l.fiveResetsAt)) : null,
      showWeekly && l.weekLeft !== undefined ? t.week(l.weekLeft) : null,
    ].filter(Boolean)

    return (
      <Box>
        {e.props.modes.length > 0 ? <Text dimColor>{e.props.modes.join(' & ')} · </Text> : null}
        <Text color={color}>{t.left(l.fiveLeft)}</Text>
        {rest.length > 0 ? <Text dimColor> · {rest.join(' · ')}</Text> : null}
      </Box>
    )
  })
}
