# dev-logger

Version of the service log for development mode.
Allows you to have a color division of logs for `logger.debug`

## Installation

```bash
yarn add @budarin/browser-pino-dev-logger
```

## Usage

```ts
import { PinoDevLogger, LightScheme, SchemaStyles } from '@budarin/browser-pino-dev-logger';

const colorSchema: LightScheme = {
    '[APP]': {
        light: 'blue',
        dark: 'lightblue',
    },
    '[DOMAIN]': {
        light: 'red',
        dark: 'coral',
    },
    '[SERVICE]': {
        light: 'green',
        dark: 'lime',
    },
};

const appLogger = new PinoDevLogger({ layer: '[APP]' }, colorSchema);
appLogger.info('Hello world!'); // [APP] Hello world! in browsers light scheme (light or dark)

const domainLogger = appLogger.child({ layer: '[DOMAIN]' });
domainLogger.info('Hello world!'); // [APP][DOMAIN] Hello world! in browsers light scheme (light or dark)

const darkServiceLogger = new PinoDevLogger({ layer: '[SERVICE]' }, colorSchema, 'dark');
darkServiceLogger.info('Hello world in dark light theme!'); // [SERVICE] Hello world! in dark scheme

const ordinaryLogger = new PinoDevLogger();
ordinaryLogger.info('Hello world in default color fro current light scheme!'); // Hello world! in usual not colored output
```

If you need to set the default scheme stored in the Cache during logger initialization, you need to use the asynchronous static method `PinoDevLogger.createInstance`

```ts
try {
    const appLogger = await PinoDevLogger.createInstance({ layer: '[APP]' }, colorSchema);

    // [APP] Hello world! in browsers light scheme (light or dark) from Cache store
    appLogger.info('Hello world!');

    const anotherAppLogger = await PinoDevLogger.createInstance(
        { layer: '[APP]' },
        colorSchema,
        'kv-store',
        'lightSchema',
    );

    // [APP] Hello world! in light scheme (light or dark) from Cache 'kv-store' from 'lightSchema' item
    anotherAppLogger.info('Hello world!');
} catch (error) {
    console.error(error);
}
```

It looks like this

![Devtools console](log.png)
