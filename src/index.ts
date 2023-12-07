import { pino, Level, LogEvent } from 'pino';

const DEBUG = 'debug';
const noop = (): void => {};

interface LoggerService {
    info: (...data: unknown[]) => void;
    warn: (...data: unknown[]) => void;
    error: (...data: unknown[]) => void;
    debug: (...data: unknown[]) => void;
    child: (binding: Record<string, string>) => LoggerService;
}

export type LightSchemeType = 'light' | 'dark';
export type LightScheme = {
    [key: string]: {
        light: string;
        dark: string;
    };
};

function getLightScheme(): LightSchemeType {
    const darkMode = 'matchMedia' in globalThis ? globalThis.matchMedia('(prefers-color-scheme: dark)').matches : false;
    return darkMode ? 'dark' : 'light';
}

function getFormatedBindings(
    colorSchema: LightScheme,
    defaultLightSchema: LightSchemeType | undefined,
    bindings: pino.Bindings[],
): string[] {
    const lightScheme = getLightScheme();

    const bindingMessages =
        bindings.length > 0
            ? bindings
                  .map((b) => Object.values(b))
                  .flat()
                  .map((b) => `%c${b}`)
                  .join('')
            : '';
    const bindingStyles =
        bindings.length > 0
            ? bindings
                  .map((b) => Object.values(b))
                  .flat()
                  .map(
                      (b) =>
                          `color: ${
                              colorSchema[b]?.[defaultLightSchema || lightScheme] || 'black'
                          }; font-weight: bold;`,
                  )
            : '';

    return [bindingMessages, ...bindingStyles].filter(Boolean);
}

const { info, warn, error, debug } = console;

const logFunctions = {
    debug,
    info,
    warn,
    error,
};

type LogFunctions = typeof logFunctions;
type KeyOfLogFunctions = keyof LogFunctions;

function logMessage(level: string, binds: string[], messages: string[]): void {
    const logFunction = logFunctions[level as KeyOfLogFunctions];

    if (logFunction) {
        if (binds.length > 0) {
            logFunction(...binds, ...messages);
        } else {
            logFunction(...messages);
        }
    }
}

const lightSchemaTypes = ['light', 'dark'];
export class PinoDevLogger implements LoggerService {
    private pinoInstance: pino.Logger;

    private colorSchema: LightScheme;

    private defaultLightSchema: LightSchemeType | undefined;

    constructor(
        bindings: Record<string, string> = {},
        colorSchema: LightScheme = {},
        defaultLightSchema: LightSchemeType | undefined = undefined,
        pinoInstance: pino.Logger | undefined = undefined,
    ) {
        this.colorSchema = colorSchema;
        this.defaultLightSchema = defaultLightSchema;

        this.pinoInstance =
            pinoInstance ||
            pino({
                browser: {
                    serialize: false,
                    asObject: false,
                    transmit: {
                        level: DEBUG,
                        send: (level: Level, logEvent: LogEvent): void => {
                            const pinoInstanceLevel = pino.levels.values[this.pinoInstance.level];

                            if (pino.levels.values[level] >= pinoInstanceLevel) {
                                const messages = logEvent.messages.flat();
                                const binds = getFormatedBindings(
                                    this.colorSchema,
                                    this.defaultLightSchema,
                                    logEvent.bindings,
                                );

                                logMessage(level, binds, messages);
                            }
                        },
                    },
                    write: noop,
                },
            }).child(bindings);

        (this.pinoInstance as pino.Logger).level = DEBUG;
    }

    // использовать для получение значения дефолтной схемы из стора
    info(...data: unknown[]): void {
        this.pinoInstance.info(data);
    }

    warn(...data: unknown[]): void {
        this.pinoInstance.warn(data);
    }

    error(...data: unknown[]): void {
        this.pinoInstance.error(data);
    }

    debug(...data: unknown[]): void {
        this.pinoInstance.debug(data);
    }

    child(bindings: Record<string, string>): LoggerService {
        const childLogger = this.pinoInstance.child(bindings);

        return new PinoDevLogger(bindings, this.colorSchema, this.defaultLightSchema, childLogger);
    }
}
