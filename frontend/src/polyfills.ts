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


