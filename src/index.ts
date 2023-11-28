const { log, warn, error, debug } = console;

type LoggerMethod = (...data: unknown[]) => void;

export type LightScheme = 'light' | 'dark';
export type SchemaStyles = {
    [key: string]: { light: string; dark: string };
};

export class DevLogger {
    private preferScheme?: LightScheme;

    private schemaStyles: SchemaStyles;

    constructor(schemaStyles: SchemaStyles, preferScheme?: LightScheme) {
        this.schemaStyles = schemaStyles;
        this.preferScheme = preferScheme;
    }

    private getLightScheme(): LightScheme {
        if (this.preferScheme) {
            return this.preferScheme;
        }

        if (!('matchMedia' in globalThis)) {
            return 'light';
        }

        const darkMode = globalThis.matchMedia('(prefers-color-scheme: dark)').matches;
        return darkMode ? 'dark' : 'light';
    }

    private getStylesForLog(str: string, lightSchema: LightScheme): string {
        return this.schemaStyles[str][lightSchema] || 'color: black; font-weight: bold;';
    }

    private logColored(data: unknown[], logger: LoggerMethod): void {
        const [str, ...rest] = data;
        const lightSchema = this.getLightScheme();

        if (typeof str === 'string') {
            const match = str.match(/(\[\s*.*?\s*\])\s*(.*)$/);

            if (match && match[1]) {
                const styles = this.getStylesForLog(match[1], lightSchema);
                const args = [`%c${match[1]}`, styles];

                if (match[2]) {
                    args.push(match[2]);
                }

                logger(...args, ...rest);
            } else {
                logger(...data);
            }
        }
    }

    // eslint-disable-next-line class-methods-use-this
    error(...data: unknown[]): void {
        error(...data);
    }

    // eslint-disable-next-line class-methods-use-this
    warn(...data: unknown[]): void {
        warn(...data);
    }

    // eslint-disable-next-line class-methods-use-this
    info(...data: unknown[]): void {
        log(...data);
    }

    debug(...data: unknown[]): void {
        this.logColored(data, debug);
    }
}
