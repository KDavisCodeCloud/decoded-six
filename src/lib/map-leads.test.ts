import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseLeadLines } from './map-leads.ts'

const CATS = [{ key: 'money_spot', label: 'Money Spots' }, { key: 'fence', label: 'Fences' }]

test('parses pipe, tab and name-only lines; commas stay in the name', () => {
  const r = parseLeadLines(
    'Hidden briefcase | money_spot | Port Gellhorn\nPawn shop\tFences\tLittle Cuba\nAmmu-Nation, Little Cuba\n\n# comment',
    CATS)
  assert.deepEqual(r.errors, [])
  assert.deepEqual(r.leads, [
    { name: 'Hidden briefcase', category: 'money_spot', area: 'Port Gellhorn' },
    { name: 'Pawn shop', category: 'fence', area: 'Little Cuba' },
    { name: 'Ammu-Nation, Little Cuba', category: null, area: null },
  ])
})

test('refuses coordinates, unknown categories and duplicates', () => {
  const r = parseLeadLines('Cash stash | money spot | -1234, 5678\nThing | weapons\nA b | money_spot\nA b | money_spot', CATS)
  assert.equal(r.leads.length, 1)
  assert.equal(r.errors.length, 2)
  assert.match(r.errors[0].error, /coordinates/)
  assert.match(r.errors[1].error, /unknown category/)
})
