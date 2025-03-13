import * as Sentry from '@sentry/node';
import { buildContainer, buildConfig } from '.';

export const config = buildConfig();

Sentry.init({
  dsn: config.sentryDsn,
  enabled: config.sentryEnabled,
});

const defaultContainer = buildContainer(config);

export default defaultContainer;
