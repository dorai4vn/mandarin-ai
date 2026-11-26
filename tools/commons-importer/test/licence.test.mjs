import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyLicence } from '../src/licence.mjs';
for (const [n, id] of [
  ['CC0', 'CC0'],
  ['Public domain', 'PD'],
  ['PD-old-100', 'PD'],
  ['CC BY 4.0', 'CC-BY'],
  ['CC BY-SA 3.0', 'CC-BY-SA'],
  ['CC BY-SA 2.5', 'CC-BY-SA'],
]) {
  test(`allow ${n}`, () => {
    const r = classifyLicence(n);
    assert.equal(r.ok, true);
    assert.equal(r.id, id);
  });
}
for (const n of [
  '',
  undefined,
  'CC BY-NC 4.0',
  'CC BY-ND 4.0',
  'GFDL',
  'Fair use',
  'Custom licence',
  'CC BY-NC-SA 3.0',
  'CC BY 4.0 NC',
  'CC BY',
  'CC BY 9.9',
  'CC BY-SA 3.0 de',
  'CC-BY-SA-2.5',
  'cc by 4.0',
]) {
  test(`reject ${JSON.stringify(n)}`, () => assert.equal(classifyLicence(n).ok, false));
}
test('flags attribution/share-alike', () => {
  assert.deepEqual(
    [classifyLicence('CC BY-SA 4.0').attribution, classifyLicence('CC BY-SA 4.0').shareAlike],
    [true, true],
  );
  assert.equal(classifyLicence('CC0').attribution, false);
});
