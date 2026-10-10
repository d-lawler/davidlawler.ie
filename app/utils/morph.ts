// Splits copy into word tokens and diffs one version against the next, so
// words shared between versions keep their identity (and stay on screen)
// while only the new words animate in.

export type TokenKind = 'text' | 'rad' | 'email'

export interface Token {
    kind: TokenKind
    text: string
    // Whether a space follows this token.
    space: boolean
}

export interface KeyedToken extends Token {
    id: number
    // True when the token is new in this version and should animate in.
    fresh: boolean
    // Position among the fresh tokens, for staggering.
    order: number
}

let nextId = 0

// `{rad}` and `{email}` mark link tokens; their display text is supplied.
export function tokenize(source: string, links: Record<'rad' | 'email', string>): Token[] {
    const tokens: Token[] = []
    for (const part of source.split(/(\{rad\}|\{email\})/)) {
        if (part === '{rad}' || part === '{email}') {
            const kind = part === '{rad}' ? 'rad' : 'email'
            tokens.push({ kind, text: links[kind], space: false })
            continue
        }
        for (const chunk of part.split(/(\s+)/)) {
            if (!chunk) continue
            if (/^\s+$/.test(chunk)) {
                const last = tokens[tokens.length - 1]
                if (last) last.space = true
            } else {
                tokens.push({ kind: 'text', text: chunk, space: false })
            }
        }
    }
    return tokens
}

function same(a: Token, b: Token) {
    return a.kind === b.kind && a.text === b.text
}

// Longest-common-subsequence match: tokens in `next` that line up with
// `prev` reuse its ids; the rest get new ids and are marked fresh.
export function morph(prev: KeyedToken[], next: Token[]): KeyedToken[] {
    const n = prev.length
    const m = next.length
    const table: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
    for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
            table[i]![j] = same(prev[i]!, next[j]!)
                ? table[i + 1]![j + 1]! + 1
                : Math.max(table[i + 1]![j]!, table[i]![j + 1]!)
        }
    }

    const matched = new Array<number | undefined>(m)
    let i = 0
    let j = 0
    while (i < n && j < m) {
        if (same(prev[i]!, next[j]!)) {
            matched[j] = prev[i]!.id
            i++
            j++
        } else if (table[i + 1]![j]! >= table[i]![j + 1]!) {
            i++
        } else {
            j++
        }
    }

    let order = 0
    return next.map((token, k) => {
        const id = matched[k]
        if (id !== undefined) return { ...token, id, fresh: false, order: 0 }
        return { ...token, id: nextId++, fresh: true, order: order++ }
    })
}
