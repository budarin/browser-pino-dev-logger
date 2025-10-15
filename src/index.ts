import pino, { type Level, type LogEvent } from 'pino';

const noop = (): void => {};

interface LoggerService {
    info: (...data: unknown[]) => void;
    warn: (...data: unknown[]) => void;
    error: (...data: unknown[]) => void;
    debug: (...data: unknown[]) => void;
    child: (binding: Record<string, string>) => LoggerService;
    setLevel(level: pino.Level): void;
    disable(): void;
    enable(): void;
}

export type LightSchemeType = 'light' | 'dark';
export type LightScheme = {
    [key: string]: {
        light: string;
        dark: string;
    };
};

// Глобальный реестр логгеров
const loggerRegistry = new Map<string, PinoDevLogger>();

// Proxy для window.logger с динамическими свойствами
const createLoggerProxy = () => {
    return new Proxy({}, {
        get(_, prop) {
            if (prop === 'disable' || prop === 'enable') {
                return new Proxy({}, {
                    get(_, loggerName) {
                        // Обработка специальных методов all()
                        if (loggerName === 'all') {
                            return prop === 'disable'
                                ? () => {
                                    // Отключаем все логгеры в реестре
                                    loggerRegistry.forEach(logger => logger.disable());
                                }
                                : () => {
                                    // Включаем все логгеры в реестре
                                    loggerRegistry.forEach(logger => logger.enable());
                                };
                        }

                        const logger = loggerRegistry.get(loggerName as string);
                        if (logger) {
                            return prop === 'disable'
                                ? () => logger.disable()
                                : () => logger.enable();
                        }

                        // Если логгер не найден, возвращаем noop функцию вместо undefined
                        return noop;
                    },
                    ownKeys() {
                        // Добавляем 'all' к списку доступных методов
                        return ['all', ...Array.from(loggerRegistry.keys())];
                    },
                    has(_, prop) {
                        return prop === 'all' || loggerRegistry.has(prop as string);
                    }
                });
            }
            return undefined;
        }
    });
};

function getLightScheme(): LightSchemeType {
    const darkMode = 'matchMedia' in globalThis ? globalThis.matchMedia('(prefers-color-scheme: dark)').matches : false;
    return darkMode ? (lightSchemaTypes[1] as LightSchemeType) : (lightSchemaTypes[0] as LightSchemeType);
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

    private logLevel: pino.Level = 'debug';

    private isEnabled: boolean = true;

    private loggerName?: string;

    constructor(
        bindings: Record<string, string> = {},
        colorSchema: LightScheme = {},
        defaultLightSchema: LightSchemeType | undefined = undefined,
        pinoInstance: pino.Logger | undefined = undefined,
    ) {
        this.colorSchema = colorSchema;
        this.defaultLightSchema = defaultLightSchema;

        if (pinoInstance) {
            this.pinoInstance = pinoInstance;
        } else {
            const logger = pino({
                browser: {
                    serialize: false,
                    asObject: false,
                    transmit: {
                        send: (level: Level, logEvent: LogEvent): void => {
                            const pinoInstanceLevel = pino.levels.values[this.logLevel];

                            if (pino.levels.values[level] && pinoInstanceLevel &&pino.levels.values[level] >= pinoInstanceLevel) {
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
            });

            this.pinoInstance = bindings ? logger.child(bindings) : logger;
        }

        this.pinoInstance.level = this.logLevel;

        // Создаем глобальный logger в window только для корневого логгера
        if (typeof window !== 'undefined' && !pinoInstance) {
            (window as any).logger = createLoggerProxy();
        }
    }

    setLevel(level: pino.Level): void {
        this.logLevel = level;
        this.pinoInstance.level = level;
    }

    disable(): void {
        this.isEnabled = false;
    }

    enable(): void {
        this.isEnabled = true;
    }

    getLoggerName(): string | undefined {
        return this.loggerName;
    }

    // использовать для получение значения дефолтной схемы из стора
    info(...data: unknown[]): void {
        if (this.isEnabled) {
            this.pinoInstance.info(data);
        }
    }

    warn(...data: unknown[]): void {
        if (this.isEnabled) {
            this.pinoInstance.warn(data);
        }
    }

    error(...data: unknown[]): void {
        if (this.isEnabled) {
            this.pinoInstance.error(data);
        }
    }

    debug(...data: unknown[]): void {
        if (this.isEnabled) {
            this.pinoInstance.debug(data);
        }
    }

    child(bindings: Record<string, string>): LoggerService {
        const childLogger = this.pinoInstance.child(bindings);

        // Генерируем имя логгера из первого значения bindings, убираем пробелы и скобки
        const rawLoggerName = Object.values(bindings)[0] || 'default';
        const loggerName = rawLoggerName.replace(/[\[\]\s]/g, '');

        const child = new PinoDevLogger(bindings, this.colorSchema, this.defaultLightSchema, childLogger);
        child.loggerName = loggerName;

        // Регистрируем в глобальном реестре
        loggerRegistry.set(loggerName, child);

        return child;
    }
}
