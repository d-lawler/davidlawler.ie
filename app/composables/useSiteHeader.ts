// The header's name is shared between the header itself and the home page,
// which hands "David Lawler" over to it on the way out and takes it back on
// the way in.
//
//   hidden  on the home page, where the page's own text shows the name
//   name    "David Lawler", in the same place the home page draws it
//   short   "DL"
export type HeaderName = 'hidden' | 'name' | 'short'

// Resolves when the header has finished growing "DL" back into the full name.
let grown: Promise<void> = Promise.resolve()

export function useSiteHeader() {
    const name = useState<HeaderName>('header-name', () => useRoute().path === '/' ? 'hidden' : 'short')
    return {
        name,
        whenGrown: () => grown,
        growing: (done: Promise<void>) => { grown = done },
    }
}
