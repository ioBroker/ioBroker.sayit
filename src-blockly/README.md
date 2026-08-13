# Blockly block

Source of `admin/blockly.js`, the block ioBroker.javascript's Blockly editor shows in its `sendTo`
category. **`admin/blockly.js` is generated - never edit it directly.**

```bash
npm run build:blockly   # type check + bundle into admin/blockly.js
```

`npm run build` runs it too, so a release always ships a bundle that matches this source.

The bundle stays committed: installations from GitHub do not run `prepublishOnly`, so the built file
has to be in the repository.

## Take the types from `blockly`, the runtime from `window`

`blockly` is a **dev** dependency - it contributes types and nothing else:

```ts
import type { Block } from 'blockly/core';

const Blockly = window.Blockly;
```

Never `import * as Blockly from 'blockly/core'` here. The editor loads this file long after it has
created its own Blockly instance, and an import would bundle a *second*, private one. The block would
register itself on that private instance and stay invisible to the editor - with no error anywhere.

The globals the editor provides (`window.Blockly` including its ioBroker extras `Words`, `Translate`
and `Sendto`, plus `window.main` and `window.systemLang`) are declared in `iobroker-blockly.d.ts`.

## Registering the generator

```ts
Blockly.JavaScript.forBlock.sayit = sayitToJavaScript;
```

Blockly 10 removed the fallback that used to look generators up as `Blockly.JavaScript.<type>`. The
editor migrates that old slot to `forBlock`, but it does so *before* it loads any adapter's
`blockly.js`, so an adapter registering the old way is never migrated and its block fails with
_"generator does not know how to generate code for block type"_. `blockly.ts` therefore writes to
`forBlock` directly and falls back to the old slot only for editors too old to have it.

## The language dropdown

The dropdown is built from `sayitEngines` in `../src/lib/engines.ts` - the same table the adapter
itself uses. It used to be a hand-maintained copy inside `blockly.js`; keep importing it so the two
cannot drift apart.
