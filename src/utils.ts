export function upperFirst(source: any): string {
  if (typeof source !== 'string' || !source.length) {
    return source
  }

  return source[0].toUpperCase() + source.slice(1)
}

export function get<T>(target: any, path: string): T {
  const tokens = path.split('.').map(t => t.trim())

  for (const token of tokens) {
    if (typeof target === 'undefined' || target === null) {
      // We're supposed to be still iterating, but the chain is over - Return undefined
      target = undefined
      break
    }

    const index = token.match(/^(\d+)|\[(\d+)]$/)
    target = index ? target[Number.parseInt(index[1] ?? index[2], 10)] : target[token]
  }

  return target
}
