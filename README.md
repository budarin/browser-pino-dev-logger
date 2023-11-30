# dev-logger

Version of the service log for development mode.
Allows you to have a color division of logs for `logger.debug`

## Installation

```bash
yarn add @budarin/dev-logger
```

## Usage

```ts
import { DevLogger, LightScheme, SchemaStyles } from '@budarin/dev-logger';

const getStyle = (color: string): string => `color: ${color}; font-weight: bold;`;
const schemasStyles: SchemaStyles = {
    '[APP]': {
        light: getStyle('red'),
        dark: getStyle('blue')
    },
     ...
};


const logger = new DevLogger(schemasStyles);
logger.debug('[APP]', 'Hello world!'); // [APP] Hello world! in browsers light scheme (light or dark)

const darkLogger = new DevLogger(schemasStyles, 'dark');
darkLogger.debug('[APP]', 'Hello world!'); // [APP] Hello world! in dark scheme

const ordinaryLogger = new DevLogger();
ordinaryLogger.debug('[APP]', 'Hello world!'); // [APP] Hello world! in usual not colored output
```

It looks like this
![Devtools console](log.png)
