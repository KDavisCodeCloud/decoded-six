// node --experimental-strip-types --test src/lib/map-layers.test.ts   (npm run test:map)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tileUrl, layerBounds, metersToTile, orderLayers, metersToLatLng } from './map-layers.ts'

// gtadb yanis,18 @ 8b1dc4f06, zoom 0 and 5 ranges as uploaded
const layer = {
  tile_url_template: 'https://x.supabase.co/storage/v1/object/public/map-tiles/gtadb-yanis-v18/{z}/{z},{y},{x}.jpg',
  tile_ranges: { '0': [[0, 0], [3, 3]], '5': [[50, 40], [90, 100]] } as Record<string, [[number, number], [number, number]]>,
}

test('tileUrl keeps gtadb {z},{y},{x} naming (row before column)', () => {
  assert.equal(tileUrl(layer, 5, 59, 64),
    'https://x.supabase.co/storage/v1/object/public/map-tiles/gtadb-yanis-v18/5/5,64,59.jpg')
})

test('tileUrl returns null outside the tile ranges and for unknown zooms', () => {
  assert.equal(tileUrl(layer, 5, 49, 64), null)
  assert.equal(tileUrl(layer, 5, 59, 101), null)
  assert.equal(tileUrl(layer, 6, 0, 0), null)
})

test('zoom 5 is 1 px/m and the world is centred: (0,0) m sits on the corner of tiles 63/64', () => {
  assert.deepEqual(metersToTile(0, 0, 5), { x: 64, y: 64 })
  assert.deepEqual(metersToTile(-0.5, 0.5, 5), { x: 63, y: 63 })
  assert.deepEqual(metersToTile(-16384, 16384, 0), { x: 0, y: 0 })
  assert.deepEqual(metersToTile(16383, -16383, 0), { x: 3, y: 3 })
})

test('+x east, +y north: Vice City region marker lands in its gtadb tile', () => {
  // (-1106, -106) m -> px 15278, py 16490 at z5
  assert.deepEqual(metersToTile(-1106, -106, 5), { x: 59, y: 64 })
})

test('LatLng in the meter CRS is [y, x]', () => {
  assert.deepEqual(metersToLatLng(-1106, -106), [-106, -1106])
})

test('layerBounds covers exactly the ranged tiles', () => {
  // z0: 4x4 tiles of 8192 m
  assert.deepEqual(layerBounds(layer, 0), [[-16384, -16384], [16384, 16384]])
  // z5: 256 m tiles; cols 50..90 -> x [-3584, 6912], rows 40..100 -> y [-9472, 6144]
  assert.deepEqual(layerBounds(layer, 5), [[-9472, -3584], [6144, 6912]])
})

test('orderLayers puts the default first, then sort_order', () => {
  const out = orderLayers([
    { id: 'a', is_default: false, sort_order: 1 },
    { id: 'b', is_default: true, sort_order: 9 },
    { id: 'c', is_default: false, sort_order: 0 },
  ])
  assert.deepEqual(out.map(l => l.id), ['b', 'c', 'a'])
})
