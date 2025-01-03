// Copyright 2023-2025 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import type { BrowserContext, Request, Route } from "@playwright/test";
import type { MethodImpl, ServiceImpl } from "@connectrpc/connect";
import { createConnectRouter } from "@connectrpc/connect";
import type {
  BinaryReadOptions,
  BinaryWriteOptions,
  DescMethod,
  DescService,
  JsonReadOptions,
  JsonValue,
  JsonWriteOptions,
} from "@bufbuild/protobuf";
import type {
  UniversalHandler,
  UniversalServerRequest,
} from "@connectrpc/connect/protocol";
import {
  readAllBytes,
  createAsyncIterable,
} from "@connectrpc/connect/protocol";

export interface MockRouter {
  service: <S extends DescService>(
    service: S,
    handler: "mock" | Partial<ServiceImpl<S>>,
  ) => Promise<this>;
  rpc<M extends DescMethod>(
    method: M,
    impl: "mock" | MethodImpl<M>,
  ): Promise<this>;
}

interface Options {
  /**
   * The base URL of the api server to match routes against.
   */
  baseUrl: string;
  /**
   * Options for the JSON format.
   * By default, unknown fields are ignored.
   */
  jsonOptions?: Partial<JsonReadOptions & JsonWriteOptions>;
  /**
   * Options for the binary wire format.
   */
  binaryOptions?: Partial<BinaryReadOptions & BinaryWriteOptions>;
}

// Builds a regular expression for matching paths by appending the suffix onto
// base and escaping forward slashes and periods
function buildPathRegex(base: string, suffix: string) {
  const sanitized = base
    .replace(/\/?$/, suffix)
    .replace(/\./g, "\\.")
    .replace(/\//g, "\\/");

  return new RegExp(sanitized);
}

export function createMockRouter(
  context: BrowserContext,
  options: Options,
): MockRouter {
  const { baseUrl, jsonOptions, binaryOptions } = options;

  const routerOptions = {
    jsonOptions,
    binaryOptions,
  };

  function addMethodRoute<M extends DescMethod>(
    method: M,
    handler: MethodImpl<M> | "mock",
  ) {
    if (method.methodKind !== "unary") {
      throw new Error("Cannot add non-unary method.");
    }

    const pathRegex = buildPathRegex(
      baseUrl,
      `/${method.parent.typeName}/${method.name}`,
    );

    return context.route(pathRegex, async (route, request) => {
      if (handler !== "mock") {
        const router = createConnectRouter(routerOptions).rpc(method, handler);

        const routeHandler = router.handlers[0];
        return universalHandlerToRouteResponse({
          route,
          request,
          routeHandler,
        });
      }
      const router = createConnectRouter(routerOptions).rpc(
        method,
        (() => ({})) as unknown as MethodImpl<M>,
      );

      const routeHandler = router.handlers[0];

      return universalHandlerToRouteResponse({
        routeHandler,
        request,
        route,
      });
    });
  }
  const mock: MockRouter = {
    service: async (service, handler) => {
      const applyHandlers = async () => {
        if (handler !== "mock") {
          return Promise.all(
            Object.entries(handler).map(([methodName, methodHandler]) => {
              const method = service.method[methodName];
              if (methodHandler === undefined) {
                throw new Error(`No method handler found for ${methodName}`);
              }
              return addMethodRoute(
                method,
                methodHandler as MethodImpl<DescMethod>,
              );
            }),
          );
        }
        const pathRegex = buildPathRegex(baseUrl, `/${service.typeName}/*`);

        return context.route(pathRegex, async (route, request) => {
          const remainingPath = new URL(request.url()).pathname.replace(
            new RegExp(`^/${service.typeName}/`),
            "",
          );
          const associatedMethod = Object.values(service.methods).find(
            (method) => method.name === remainingPath,
          );

          if (associatedMethod === undefined) {
            throw new Error(
              `No associated method found for url ${request.url()}`,
            );
          }
          // Automatically pass-through all non-unary methods
          if (associatedMethod.methodKind !== "unary") {
            return route.continue();
          }
          const router = createConnectRouter(routerOptions).rpc(
            associatedMethod,
            // By returning an empty object, the response will be a default-constructed mock object.
            (() => ({})) as unknown as MethodImpl<DescMethod>,
          );

          const routeHandler = router.handlers[0];

          return universalHandlerToRouteResponse({
            routeHandler,
            request,
            route,
          });
        });
      };

      await applyHandlers();
      return Promise.resolve(mock);
    },
    rpc: async (method, handler) => {
      await addMethodRoute(method, handler);
      return Promise.resolve(mock);
    },
  };

  return mock;
}

async function universalHandlerToRouteResponse({
  route,
  routeHandler,
  request,
}: {
  route: Route;
  request: Request;
  routeHandler: UniversalHandler;
}) {
  const headers = await request.allHeaders();
  const abortSignal = new AbortController().signal;

  // Default body to an empty byte stream
  let body: UniversalServerRequest["body"];

  if (headers["content-type"] === "application/json") {
    // If content type headers are present and set to JSON, this is a POST
    // request with a JSON body
    body = request.postDataJSON() as JsonValue;
  } else {
    const buffer = request.postDataBuffer();
    if (buffer !== null) {
      // If postDataBuffer returns a non-null body, this is a POST
      // request with a binary body
      body = createAsyncIterable<Uint8Array>([buffer]);
    } else {
      body = createAsyncIterable<Uint8Array>([]);
    }
  }

  const response = await routeHandler({
    body,
    url: request.url(),
    header: new Headers(headers),
    httpVersion: "2.0",
    method: request.method(),
    signal: abortSignal,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Need this for handling headers
  const responseHeaders: Record<string, any> = {};
  response.header?.forEach((value, key) => {
    responseHeaders[key] = value;
  });
  if (response.body === undefined) {
    throw new Error("No response");
  }

  const finalUint8Array = await readAllBytes(response.body, 0xffffffff, null);
  return route.fulfill({
    body: Buffer.from(finalUint8Array), // Assumes non-stream for now.
    headers: responseHeaders,
    status: response.status,
  });
}
