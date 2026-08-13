/** Render one argv value as a POSIX-shell literal. */
export declare function shellQuote(value: string): string;
/** Render a program plus argv without letting paths or remote values become shell syntax. */
export declare function shellCommand(program: string, args: readonly string[]): string;
