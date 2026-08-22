import { describe, expect, it, vi } from "vitest";
import { createHttpClient } from "./client.js";
import { HttpParseError } from "./errors.js";
import {
  iterateLines,
  iterateStream,
  parseEventStream,
  parseJsonEventStream,
} from "./streaming.js";

function createByteStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

describe("Streaming & Web Streams Iteration (H6)", () => {
  it("iterates raw byte chunks with iterateStream", async () => {
    const stream = createByteStream(["chunk-1", "chunk-2"]);
    const collected: string[] = [];
    const decoder = new TextDecoder();

    for await (const chunk of iterateStream(stream)) {
      collected.push(decoder.decode(chunk));
    }

    expect(collected).toEqual(["chunk-1", "chunk-2"]);
  });

  it("handles line splitting across arbitrary chunk boundaries in iterateLines", async () => {
    const stream = createByteStream(["line1\nli", "ne2\r\nline3\nli", "ne4"]);

    const lines: string[] = [];
    for await (const line of iterateLines(stream)) {
      lines.push(line);
    }

    expect(lines).toEqual(["line1", "line2", "line3", "line4"]);
  });

  it("cancels reader cleanly when loop exits early with break", async () => {
    let cancelCalled = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
        controller.enqueue(new Uint8Array([4, 5, 6]));
      },
      cancel() {
        cancelCalled = true;
      },
    });

    for await (const _chunk of iterateStream(stream)) {
      break;
    }

    expect(cancelCalled).toBe(true);
  });
});

describe("Server-Sent Events (SSE) Parser (H6)", () => {
  it("parses standard single-line and multi-line SSE events", async () => {
    const sseRaw =
      ": keep-alive comment\n" +
      "data: simple message\n\n" +
      "event: update\n" +
      "id: 101\n" +
      "retry: 3000\n" +
      "data: first line\n" +
      "data: second line\n\n";

    const stream = createByteStream([sseRaw]);
    const events = [];

    for await (const event of parseEventStream(stream)) {
      events.push(event);
    }

    expect(events).toEqual([
      {
        event: "message",
        data: "simple message",
      },
      {
        event: "update",
        id: "101",
        retry: 3000,
        data: "first line\nsecond line",
      },
    ]);
  });

  it("flushes trailing SSE event when stream ends without double newline", async () => {
    const sseRaw = "id: 99\nevent: final\ndata: trailing payload";
    const stream = createByteStream([sseRaw]);

    const events = [];
    for await (const event of parseEventStream(stream)) {
      events.push(event);
    }

    expect(events).toEqual([
      {
        event: "final",
        id: "99",
        data: "trailing payload",
      },
    ]);
  });

  it("parses JSON-encoded SSE events via parseJsonEventStream", async () => {
    interface MetricsUpdate {
      cpu: number;
      memory: number;
    }

    const sseRaw =
      "event: metrics\n" +
      'data: {"cpu":45,"memory":70}\n\n' +
      "event: metrics\n" +
      'data: {"cpu":50,"memory":72}\n\n';

    const stream = createByteStream([sseRaw]);
    const metrics: MetricsUpdate[] = [];

    for await (const sse of parseJsonEventStream<MetricsUpdate>(stream)) {
      expect(sse.event).toBe("metrics");
      metrics.push(sse.data);
    }

    expect(metrics).toEqual([
      { cpu: 45, memory: 70 },
      { cpu: 50, memory: 72 },
    ]);
  });

  it("throws HttpParseError on malformed JSON payload in parseJsonEventStream", async () => {
    const sseRaw = "event: bad\ndata: {unquoted:json}\n\n";
    const stream = createByteStream([sseRaw]);

    const runner = async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of parseJsonEventStream(stream)) {
        // noop
      }
    };

    await expect(runner()).rejects.toThrow(HttpParseError);
  });
});

describe("HttpClient Streaming Methods (H6)", () => {
  it("streams lines using client.streamLines()", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("row1\nrow2\n"));
        controller.close();
      },
    });

    const mockFetch = vi.fn().mockResolvedValue(new Response(stream, { status: 200 }));

    const client = createHttpClient({
      baseURL: "https://api.example.com",
      fetch: mockFetch,
    });

    const lines: string[] = [];
    for await (const line of await client.streamLines("/export.csv")) {
      lines.push(line);
    }

    expect(lines).toEqual(["row1", "row2"]);
  });

  it("streams SSE events using client.streamEvents() with Accept header", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("event: delta\ndata: token1\n\n"));
        controller.close();
      },
    });

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );

    const client = createHttpClient({
      baseURL: "https://api.example.com",
      fetch: mockFetch,
    });

    const events = [];
    for await (const event of await client.streamEvents("/live-feed")) {
      events.push(event);
    }

    expect(events).toEqual([
      {
        event: "delta",
        data: "token1",
      },
    ]);

    const [, sentInit] = mockFetch.mock.calls[0]!;
    const sentHeaders = new Headers(sentInit.headers);
    expect(sentHeaders.get("accept")).toBe("text/event-stream");
  });
});
