/**
 * The spawn cap: when threads outnumber astronauts, who gets a body.
 *
 * The regression these guard is the chips lying — a status counted at the top of the screen
 * with no astronaut on the surface to click, because the cut was positional and the loudest
 * thread sorted last.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import { capRoster, STATUS_ORDER } from '../src/game/roster.js'

let n = 0
const entry = (status) => ({ id: `t${n++}`, status })
const many = (count, status) => Array.from({ length: count }, () => entry(status))
const ids = (list) => list.map((e) => e.id)

test('a roster under the cap is returned untouched, in order', () => {
  const entries = [entry('idle'), entry('working'), entry('sleeping')]
  assert.equal(capRoster(entries, 10), entries)
})

test('the one working thread spawns even when it sorts last — the reported bug', () => {
  const entries = [...many(200, 'idle'), entry('working')]
  const crew = capRoster(entries, 90)
  assert.equal(crew.length, 90)
  assert.ok(crew.some((e) => e.status === 'working'))
})

test('every urgent thread spawns before any idle one when they fit', () => {
  const entries = [...many(100, 'idle'), ...many(51, 'blocked'), ...many(7, 'waiting'), entry('working')]
  const crew = capRoster(entries, 90)
  assert.equal(crew.filter((e) => e.status === 'blocked').length, 51)
  assert.equal(crew.filter((e) => e.status === 'waiting').length, 7)
  assert.equal(crew.filter((e) => e.status === 'working').length, 1)
  assert.equal(crew.filter((e) => e.status === 'idle').length, 90 - 59)
})

test('incoming order is preserved within a status', () => {
  const idles = many(50, 'idle')
  const crew = capRoster([...idles, ...many(5, 'working')], 30)
  const kept = crew.filter((e) => e.status === 'idle')
  assert.deepEqual(ids(kept), ids(idles).slice(0, kept.length))
})

test('one loud status cannot crowd every other status out entirely', () => {
  const entries = [...many(200, 'blocked'), entry('working'), entry('waiting'), entry('idle')]
  const crew = capRoster(entries, 90)
  for (const status of ['blocked', 'waiting', 'working', 'idle']) {
    assert.ok(crew.some((e) => e.status === status), `${status} has a representative`)
  }
})

test('a status’s lone representative is never evicted to seat another', () => {
  // Cap of 2 cannot hold all three statuses; the two loudest win and neither loses its
  // only body to the third.
  const crew = capRoster([entry('blocked'), entry('waiting'), entry('working')], 2)
  assert.deepEqual(crew.map((e) => e.status), ['blocked', 'waiting'])
})

test('the same scan twice yields the same crew — nobody walks home for nothing', () => {
  const entries = [...many(40, 'idle'), ...many(10, 'blocked'), ...many(40, 'sleeping'), entry('working')]
  assert.deepEqual(ids(capRoster(entries, 30)), ids(capRoster([...entries], 30)))
})

test('statuses cover STATUS_ORDER — a new status must pick a spawn priority', () => {
  // capRoster ranks unknown statuses last silently; this trips instead when someone adds a
  // status to statusFor without deciding where it sits in the cut.
  assert.deepEqual(STATUS_ORDER, ['blocked', 'waiting', 'working', 'celebrating', 'idle', 'sleeping'])
})
