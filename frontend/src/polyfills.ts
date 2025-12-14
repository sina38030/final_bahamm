// Guard some browser-like globals for server runtime bundles in Next.js
// This prevents ReferenceError: self is not defined in server vendors bundle
const g: any = globalThis as any;

if (typeof g.self === 'undefined') {
  // Point self to globalThis on the server
  g.self = globalThis as any;
}

if (typeof g.window === 'undefined') {
  // Minimal window shim for libraries that check for its existence
  g.window = globalThis as any;
}

if (typeof g.document === 'undefined') {
  // Create a tiny stub so that strict existence checks pass; do not provide DOM
  g.document = {} as any;
}

// Polyfill for Array.prototype.at() for older Android WebViews
// Android Chrome < 92 doesn't support .at()
if (typeof Array.prototype.at === 'undefined') {
  Array.prototype.at = function(index: number) {
    const arr = this as unknown[];
    const n = index >= 0 ? index : arr.length + index;
    return n >= 0 && n < arr.length ? arr[n] : undefined;
  };
}

// Polyfill for String.prototype.at() for older Android WebViews
if (typeof String.prototype.at === 'undefined') {
  (String.prototype as any).at = function(index: number) {
    const str = this as unknown as string;
    const n = index >= 0 ? index : str.length + index;
    return n >= 0 && n < str.length ? str.charAt(n) : undefined;
  };
}

// Polyfill for String.prototype.replaceAll() for older Android WebViews
// Android Chrome < 85 doesn't support .replaceAll()
if (typeof String.prototype.replaceAll === 'undefined') {
  (String.prototype as any).replaceAll = function(search: string | RegExp, replacement: string) {
    const str = this as unknown as string;
    if (search instanceof RegExp) {
      if (!search.global) {
        throw new TypeError('replaceAll must be called with a global RegExp');
      }
      return str.replace(search, replacement);
    }
    return str.split(search).join(replacement);
  };
}

// Polyfill for Object.fromEntries for older Android WebViews
// Android Chrome < 73 doesn't support Object.fromEntries
if (typeof Object.fromEntries === 'undefined') {
  (Object as any).fromEntries = function<T = any>(iterable: Iterable<[string, T]>): Record<string, T> {
    const obj: Record<string, T> = {};
    for (const [key, value] of iterable) {
      obj[key] = value;
    }
    return obj;
  };
}


