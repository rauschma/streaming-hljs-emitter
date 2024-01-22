export function assertTrue(value: boolean, message = ''): asserts value {
  if (!value) {
    throw new Error(message);
  }
}

export class UnsupportedValueError extends Error {
  constructor(value: never, message = `Unsupported value: ${value}`) {
    super(message)
  }
}
