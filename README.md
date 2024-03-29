# Highlight.js Emitter API

* Documentation for the Emitter API: https://highlightjs.readthedocs.io/en/latest/mode-reference.html

## `streaming-hljs-emitter.ts`

Lets you use Highlight.js via the following interface:

```ts
export interface StreamingHljsEmitter {
  startScope(name: string): void;
  endScope(): void;
  addText(text: string): void;
  startSublanguage(sublanguageName: string): void;
  endSublanguage(): void;
}
```

Its methods are invoked in the order in which scopes, texts and sublanguages appear in the text that is highlighted.

## Tracing what happens

Run TypeScript like this (`tsx` is installed locally):

```
npx tsx tracing-hljs-emitter.ts
```

Output: see [`tracing-output.txt`](tracing-output.txt)

### Observations

* I have to implement `.openNode()` and `.closeNode()` or I get an exception.
* `tracing-output.txt`:
  * Instance #1 is never finalized.
  * It looks like instance #1 and instance #3 are created and thrown away without them ever being used (via `__addSublanguage`).

### Change the API?

I don’t know if that’s possible but the Emitter API would be more versatile if:

* Only a single instance of an Emitter is used.
* That enables: `HLJSOptions.__emitter: Emitter` (an instance, not a class)
  * Benefit: A client of Highlight.js can set up the instance itself and doesn’t have to (ab)use `HLJSOptions` to do so.
* Suggested interface for emitters: see above.

**Why make these changes?** Some clients don’t need to build trees – they only want a stream of changes. Currently such clients have to store the changes somewhere to ensure that they can be processed in order. With the proposed changes that wouldn’t be necessary anymore.
