/** Render one argv value as a POSIX-shell literal. */
export function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`
}

/** Render a program plus argv without letting paths or remote values become shell syntax. */
export function shellCommand(program: string, args: readonly string[]): string {
  return [program, ...args].map(shellQuote).join(' ')
}
