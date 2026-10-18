// SELECT SHOP WOMEN ORIGINAL — freeze visual layout after owner explicitly rejected Glass redesign.
// This guard protects only presentation sources. It deliberately permits order/cart adapter changes.
// Update the expected baseline only after explicit owner authorization for a visual redesign.
import { execFileSync } from 'node:child_process';
const baseline = Object.freeze({
  'preview/women/index.html': '9381af23aa8071441144c72eac9fd448862a42d1',
  'preview/women/css/styles.css': '6682fdb75e6b0bddd147621b11f6ee4951a6d0fb',
  'preview/women/css/fonts.css': 'a410d158c6feb2e66e6dddc89dba21ad797eaad8',
});
let failed = false;
for (const [path, expected] of Object.entries(baseline)) {
  const actual = execFileSync('git', ['hash-object', '--', path], { encoding: 'utf8' }).trim();
  const ok = actual === expected;
  console.log((ok ? 'PASS ' : 'FAIL ') + path + ' | ' + actual.slice(0, 12));
  if (!ok) failed = true;
}
if (failed) { console.error('WOMEN original visual design changed without the owner approving a visual redesign.'); process.exitCode = 1; }
else console.log('PASS WOMEN original storefront HTML and CSS are unchanged.');
