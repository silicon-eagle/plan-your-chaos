import { randomUUID } from "node:crypto";

type LogLevel = "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

function serializeError(error: unknown) {
  if (!(error instanceof Error)) {
    return error;
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
}

function writeLog(
  level: LogLevel,
  event: string,
  context: LogContext = {},
) {
  if (
    process.env.NODE_ENV === "test" &&
    process.env.ENABLE_TEST_LOGS !== "true"
  ) {
    return;
  }

  const record = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...context,
    ...(context.error ? { error: serializeError(context.error) } : {}),
  });

  if (level === "error") {
    console.error(record);
  } else if (level === "warn") {
    console.warn(record);
  } else {
    console.info(record);
  }
}

export const logger = {
  info(event: string, context?: LogContext) {
    writeLog("info", event, context);
  },
  warn(event: string, context?: LogContext) {
    writeLog("warn", event, context);
  },
  error(event: string, context?: LogContext) {
    writeLog("error", event, context);
  },
};

export async function withDatabaseLogging<T>(
  operation: string,
  context: LogContext,
  callback: () => Promise<T>,
): Promise<T> {
  const startedAt = performance.now();
  logger.info("database.operation.started", { operation, ...context });

  try {
    const result = await callback();
    logger.info("database.operation.completed", {
      operation,
      ...context,
      durationMs: Math.round(performance.now() - startedAt),
    });
    return result;
  } catch (error) {
    logger.error("database.operation.failed", {
      operation,
      ...context,
      durationMs: Math.round(performance.now() - startedAt),
      error,
    });
    throw error;
  }
}

export type RouteHandler<Arguments extends unknown[]> = (
  request: Request,
  ...args: Arguments
) => Promise<Response>;

export function withRequestLogging<Arguments extends unknown[]>(
  route: string,
  handler: RouteHandler<Arguments>,
): RouteHandler<Arguments> {
  return async (request, ...args) => {
    const requestId = request.headers.get("x-request-id") ?? randomUUID();
    const startedAt = performance.now();
    const context = {
      requestId,
      method: request.method,
      path: new URL(request.url).pathname,
      route,
    };

    logger.info("http.request.started", context);

    try {
      const response = await handler(request, ...args);
      const result = {
        ...context,
        status: response.status,
        durationMs: Math.round(performance.now() - startedAt),
      };

      if (response.status >= 400) {
        logger.warn("http.request.completed", result);
      } else {
        logger.info("http.request.completed", result);
      }

      return response;
    } catch (error) {
      logger.error("http.request.failed", {
        ...context,
        durationMs: Math.round(performance.now() - startedAt),
        error,
      });
      throw error;
    }
  };
}
