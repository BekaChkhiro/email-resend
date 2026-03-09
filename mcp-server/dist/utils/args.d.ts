/**
 * CLI argument parsing utilities
 */
export interface ParsedArgs {
    mode: "stdio" | "http";
    port?: number;
    help?: boolean;
}
export declare function parseArgs(args: string[]): ParsedArgs;
//# sourceMappingURL=args.d.ts.map