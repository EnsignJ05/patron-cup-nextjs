import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from 'util';
import { Blob } from 'buffer';
import { MessageChannel, MessagePort } from 'worker_threads';
import { ReadableStream, TransformStream, WritableStream } from 'stream/web';

const setGlobal = (key: string, value: unknown) => {
  const globals = globalThis as Record<string, unknown>;
  if (!globals[key]) {
    globals[key] = value;
  }
};

setGlobal('TextDecoder', TextDecoder);
setGlobal('TextEncoder', TextEncoder);
setGlobal('ReadableStream', ReadableStream);
setGlobal('TransformStream', TransformStream);
setGlobal('WritableStream', WritableStream);
setGlobal('Blob', Blob);
setGlobal('MessageChannel', MessageChannel);
setGlobal('MessagePort', MessagePort);

// undici reads TextDecoder at import time, so require after globals are set.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { fetch, Headers, Request, Response } = require('undici');

setGlobal('fetch', fetch);
setGlobal('Headers', Headers);
setGlobal('Request', Request);
setGlobal('Response', Response);
