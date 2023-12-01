import { pino, Level, LogEvent } from 'pino';

const getSend = (endpoint: string) =>
    async function (_: Level, logEvent: LogEvent) {
        return await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify([logEvent]),
        });
    };

export function createLogger(endpoint: string) {
    return pino({
        browser: {
            serialize: true,
            asObject: true,
            transmit: {
                send: getSend(endpoint),
            },
        },
    });
}
