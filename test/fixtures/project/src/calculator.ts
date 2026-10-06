export function add(left: number, right: number): number {
  return left + right
}

export function sign(value: number): string {
  if (value > 0) {
    return 'positive'
  }
  if (value < 0) {
    return 'negative'
  }

  return 'zero'
}

export function unused(): string {
  return 'never called'
}
