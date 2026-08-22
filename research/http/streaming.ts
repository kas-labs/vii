/**
 * Vii HTTP Client & Transport Research — Streaming & SSE Parser (H6 Baseline)
 *
 * Research Prototype: Not a production package.
 */

import { HttpParseError } from "./errors.js";

export interface ServerSentEvent {
  readonly id?: string | undefined;
  readonly event?: string | undefined;
  readonly data: string;
  readonly retry?: number | undefined;
}

export interface JsonServerSentEvent<T = unknown> {
  readonly id?: string | undefined;
  readonly event: string;
  readonly data: T;
  readonly retry?: number | undefined;
}

/**
 * Iterate raw byte chunks from a ReadableStream with backpressure and cleanup.
 */
export async function* iterateStream(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<Uint8Array, void, unknown> {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (value !== undefined) {
        yield value;
      }
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // Stream cancellation error ignored on cleanup
    }
    reader.releaseLock();
  }
}

/**
 * Iterate line by line from a binary ReadableStream, handling multi-chunk boundary splits.
 */
export async function* iterateLines(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<string, void, unknown> {
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  for await (const chunk of iterateStream(stream)) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      yield line;
    }
  }

  buffer += decoder.decode();
  if (buffer.length > 0) {
    yield buffer;
  }
}

/**
 * Parse an SSE (text/event-stream) byte stream into structured ServerSentEvent objects.
 * Follows WHATWG HTML Server-Sent Events standard.
 */
export async function* parseEventStream(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<ServerSentEvent, void, unknown> {
  let eventName: string | undefined;
  let eventId: string | undefined;
  let retryMs: number | undefined;
  const dataLines: string[] = [];

  for await (const line of iterateLines(stream)) {
    // Comment line
    if (line.startsWith(":")) {
      continue;
    }

    // Blank line indicates dispatch boundary
    if (line === "") {
      if (dataLines.length > 0 || eventName !== undefined || eventId !== undefined) {
        yield {
          data: dataLines.join("\n"),
          event: eventName ?? "message",
          ...(eventId !== undefined ? { id: eventId } : {}),
          ...(retryMs !== undefined ? { retry: retryMs } : {}),
        };
        dataLines.length = 0;
        eventName = undefined;
        eventId = undefined;
        retryMs = undefined;
      }
      continue;
    }

    // Field parsing
    const colonIdx = line.indexOf(":");
    let field = line;
    let value = "";

    if (colonIdx !== -1) {
      field = line.slice(0, colonIdx);
      value = line.slice(colonIdx + 1);
      if (value.startsWith(" ")) {
        value = value.slice(1);
      }
    }

    if (field === "data") {
      dataLines.push(value);
    } else if (field === "event") {
      eventName = value;
    } else if (field === "id") {
      eventId = value;
    } else if (field === "retry") {
      const parsed = parseInt(value, 10);
      if (!Number.isNaN(parsed)) {
        retryMs = parsed;
      }
    }
  }

  // Flush trailing event if stream ends without trailing empty line
  if (dataLines.length > 0 || eventName !== undefined || eventId !== undefined) {
    yield {
      data: dataLines.join("\n"),
      event: eventName ?? "message",
      ...(eventId !== undefined ? { id: eventId } : {}),
      ...(retryMs !== undefined ? { retry: retryMs } : {}),
    };
  }
}

/**
 * Parse an SSE stream where data payloads are JSON formatted.
 */
export async function* parseJsonEventStream<T = unknown>(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<JsonServerSentEvent<T>, void, unknown> {
  for await (const sse of parseEventStream(stream)) {
    let parsedData: T;
    try {
      parsedData = JSON.parse(sse.data) as T;
    } catch (err) {
      throw new HttpParseError(
        `Failed to parse SSE event data as JSON for event "${sse.event ?? "message"}"`,
        {
          response: new Response(sse.data),
          request: new Request("https://vii.local/sse"),
          rawText: sse.data,
          cause: err,
        },
      );
    }

    yield {
      data: parsedData,
      event: sse.event ?? "message",
      ...(sse.id !== undefined ? { id: sse.id } : {}),
      ...(sse.retry !== undefined ? { retry: sse.retry } : {}),
    };
  }
}
