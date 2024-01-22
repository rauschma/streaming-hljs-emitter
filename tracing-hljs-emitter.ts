import type { Emitter, HLJSOptions } from 'highlight.js';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import xml from 'highlight.js/lib/languages/xml';

const instanceCountKey = Symbol('instanceCountKey');
type CustomOptions = {
  [instanceCountKey]?: number,
};
class TracingHljsEmitter implements Emitter {
  instanceCount;
  constructor(options: HLJSOptions & CustomOptions) {
    // The same options object is passed to all Emitter constructors. Use
    // it to store “session state”.
    this.instanceCount = options[instanceCountKey] ?? 0;
    options[instanceCountKey] = this.instanceCount + 1;
    console.log('⮕ constructor ' + this.instanceCount, options.languages);
  }
  finalize() {
    console.log('⬅︎ finalize ' + this.instanceCount);
  }
  startScope(name: string) {
    console.log('  [%s] startScope', this.instanceCount, name);
  }
  endScope() {
    console.log('  [%s] endScope', this.instanceCount);
  }
  openNode(name: string) {
    console.log('  [%s] openNode', this.instanceCount, name);
  }
  closeNode() {
    console.log('  [%s] closeNode', this.instanceCount);
  }
  addText(text: string) {
    console.log('• [%s] addText %j', this.instanceCount, text);
  }
  toHTML() {
    console.log('  [%s] toHTML', this.instanceCount);
    return 'NOT IMPLEMENTED';
  }
  __addSublanguage(emitter: Emitter, subLanguageName: string) {
    if (!(emitter instanceof TracingHljsEmitter)) {
      throw new Error();
    }
    console.log('  [%s] __addSublanguage', this.instanceCount, emitter.instanceCount, subLanguageName);
  }
}

function highlight(code: string, language: null | string) {
  language ??= 'txt';
  const hljsInst = hljs.newInstance();
  hljsInst.registerLanguage('javascript', javascript);
  hljsInst.registerLanguage('xml', xml);
  hljsInst.configure({
    __emitter: TracingHljsEmitter,
  });
  if (!hljsInst.getLanguage(language)) {
    throw new Error('Unknown language: ' + JSON.stringify(language))
  }
  const result = hljsInst.highlight(code, { ignoreIllegals: true, language });
  if (result.errorRaised) {
    // @ts-ignore
    throw new Error('Exception during highlighting', {
      cause: result.errorRaised
    });
  }
  // const emitterInstance = result._emitter;
}

highlight(
  `
<html>
  <script>
    function add(x, y) { return x + y }
  </script>
</html>
`,
  'html'
);
