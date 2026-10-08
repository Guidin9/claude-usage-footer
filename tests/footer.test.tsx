import { test, expect } from 'claude-code/testing'

const engineDefault = (on: any) =>
  on('ui.render', { component: 'SessionMode' }, ($: any, e: any) => {
    const { Text } = $.ui.resolve(e)
    return <Text dimColor>{e.props.modes.join(' & ')}</Text>
  })

const measure = ($: any, on: any) => {
  on('session.measure', ($: any, e: any) => ({ changed: e.changed }))
  return $.session.measure({
    context: { percent: 10 } as any,
    rateLimits: [
      { kind: 'five_hour', percentUsed: 38.4, resetsAt: '2026-10-09T05:30:00Z' },
      { kind: 'seven_day', percentUsed: 61 },
    ],
    changed: ['rateLimits'],
  })
}

const mount = ($: any, surface: 'terminal' | 'desktop', modes: string[] = []) =>
  $.ui.mount({ plugin: 'usage-footer', surface, component: 'SessionMode', props: { modes } })

test('English by default, beside existing modes, on every surface', async ($, on) => {
  engineDefault(on)
  await measure($, on)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await mount($, surface, ['focus'])
    expect(await ui.find({ type: 'Text', text: /5h: 62% left/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /week: 39%/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /focus/ })).toBeDefined()
    await ui.unmount()
  }
})

test('Turkish labels', { options: { language: 'tr' } }, async ($, on) => {
  engineDefault(on)
  await measure($, on)
  const ui = await mount($, 'terminal')
  expect(await ui.find({ type: 'Text', text: /5s: %62 kaldı/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /hafta: %39/ })).toBeDefined()
  await ui.unmount()
})

test('weekly limit can be hidden', { options: { showWeekly: false } }, async ($, on) => {
  engineDefault(on)
  await measure($, on)
  const ui = await mount($, 'terminal')
  expect(await ui.find({ type: 'Text', text: /5h: 62% left/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /week/ })).toBeUndefined()
  await ui.unmount()
})

test('no reading yet leaves the footer to the engine', async ($, on) => {
  engineDefault(on)
  const ui = await mount($, 'terminal')
  expect(await ui.find({ type: 'Text', text: /left|kaldı/ })).toBeUndefined()
  await ui.unmount()
})
