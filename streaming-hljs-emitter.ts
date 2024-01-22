import type { Emitter, HLJSOptions } from 'highlight.js';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import xml from 'highlight.js/lib/languages/xml';

//#################### Public API ####################

export interface StreamingHljsEmitter {
  startScope(name: string): void;
  endScope(): void;
  addText(text: string): void;
  __addSublanguage(subLanguageName: string): void;
}

function highlight(code: string, language: null | string, emitter: StreamingHljsEmitter) {
  language ??= 'txt';
  const hljsInst = hljs.newInstance();
  hljsInst.registerLanguage('javascript', javascript);
  hljsInst.registerLanguage('xml', xml);
  const configOptions = {
    __emitter: StreamingEmitterAdapter,
    [streamingEmitterKey]: emitter,
  };
  hljsInst.configure(configOptions);
  if (!hljsInst.getLanguage(language)) {
    throw new Error('Unknown language: ' + JSON.stringify(language))
  }
  const result = hljsInst.highlight(
    code,
    {
      ignoreIllegals: true, // don’t throw an exception
      language,
    }
  );
  if (result.errorRaised) {
    // @ts-ignore
    throw new Error('Exception during highlighting', {
      cause: result.errorRaised
    });
  }
}

//#################### Internal adapter ####################

type Operation =
  | OperationStartScope
  | OperationEndScope
  | OperationAddText
  | OperationAddSublanguage
  ;
interface OperationStartScope {
  kind: 'OperationStartScope',
  name: string,
}
interface OperationEndScope {
  kind: 'OperationEndScope',
}
interface OperationAddText {
  kind: 'OperationAddText',
  text: string,
}
interface OperationAddSublanguage {
  kind: 'OperationAddSublanguage',
  subLanguageName: string,
}

const instanceCountKey = Symbol('instanceCountKey');
// This key is copied from the options we provide. Therefore it can’t be a
// symbol (which Highlight.js doesn’t copy).
const streamingEmitterKey = '##streamingEmitterKey##';
type CustomOptions = {
  [instanceCountKey]?: number,
  [streamingEmitterKey]?: StreamingHljsEmitter,
};
class StreamingEmitterAdapter implements Emitter {
  storedOperations = new Array<Operation>();
  streamingEmitter: null | StreamingHljsEmitter = null;
  constructor(options: HLJSOptions & CustomOptions) {
    // The same options object is passed to all Emitter constructors. Use
    // it to store “session state”.
    options[instanceCountKey] = (options[instanceCountKey] ?? 0) + 1;
    // The very first instance of this class is in control
    if (options[instanceCountKey] === 1) {
      if (!options[streamingEmitterKey]) {
        throw new Error('No StreamingEmitter specified via options');
      }
      this.streamingEmitter = options[streamingEmitterKey];
    }
  }
  startScope(name: string) {
    if (this.streamingEmitter) {
      this.streamingEmitter.startScope(name);
    } else {
      this.storedOperations.push({
        kind: 'OperationStartScope',
        name,
      });
    }
  }
  openNode(name: string) {
    if (this.streamingEmitter) {
      this.streamingEmitter.startScope(name);
    } else {
      this.storedOperations.push({
        kind: 'OperationStartScope',
        name,
      });
    }
  }
  endScope() {
    if (this.streamingEmitter) {
      this.streamingEmitter.endScope();
    } else {
      this.storedOperations.push({
        kind: 'OperationEndScope',
      });
    }
  }
  closeNode() {
    if (this.streamingEmitter) {
      this.streamingEmitter.endScope();
    } else {
      this.storedOperations.push({
        kind: 'OperationEndScope',
      });
    }
  }
  addText(text: string) {
    if (this.streamingEmitter) {
      this.streamingEmitter.addText(text);
    } else {
      this.storedOperations.push({
        kind: 'OperationAddText',
        text,
      });
    }
  }
  __addSublanguage(emitter: Emitter, subLanguageName: string) {
    assertTrue(emitter instanceof StreamingEmitterAdapter);
    if (this.streamingEmitter) {
      this.streamingEmitter.__addSublanguage(subLanguageName);
      for (const op of emitter.storedOperations) {
        switch (op.kind) {
          case 'OperationStartScope':
            this.streamingEmitter.startScope(op.name);
            break;
          case 'OperationEndScope':
            this.streamingEmitter.endScope();
            break;
          case 'OperationAddText':
            this.streamingEmitter.addText(op.text);
            break;
          case 'OperationAddSublanguage':
            this.streamingEmitter.__addSublanguage(op.subLanguageName);
            break;
          default:
            throw new UnsupportedValueError(op);
        }
      }
    } else {
      this.storedOperations.push({
        kind: 'OperationAddSublanguage',
        subLanguageName
      });
      this.storedOperations.push(...emitter.storedOperations);
    }
  }
  toHTML() {
    return '';
  }
  finalize() { }
}

//#################### Helpers ####################

function assertTrue(value: boolean, message = ''): asserts value {
  if (!value) {
    throw new Error(message);
  }
}

class UnsupportedValueError extends Error {
  constructor(value: never, message = `Unsupported value: ${value}`) {
    super(message)
  }
}

//#################### Main ####################

import * as url from 'node:url';

const html = `
<html>
  <script>
    function add(x, y) { return x + y }
  </script>
</html>
`.trimStart();

if (import.meta.url.startsWith('file:')) {
  const modulePath = url.fileURLToPath(import.meta.url);
  if (process.argv[1] === modulePath) {
    // Main ESM module
    highlight(
      html,
      'html',
      {
        startScope(name: string): void {
          console.log('startScope %j', name);
        },
        endScope(): void {
          console.log('endScope');
        },
        addText(text: string): void {
          console.log('addText %j', text);
        },
        __addSublanguage(subLanguageName: string): void {
          console.log('__addSublanguage %j', subLanguageName);
        },
      }
    );
  }
}
