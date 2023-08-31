// Copyright 2021-2023 Buf Technologies, Inc.
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
  MethodInfo,
  ServiceType,
  BinaryReadOptions,
  BinaryWriteOptions,
  JsonReadOptions,
  JsonWriteOptions,
} from "@bufbuild/protobuf";
import { MethodKind } from "@bufbuild/protobuf";
import type { UniversalHandler } from "@connectrpc/connect/protocol";
import { readAllBytes } from "@connectrpc/connect/protocol";

export interface MockRouter {
  service: <S extends ServiceType>(
    service: S,
    handler: "mock" | Partial<ServiceImpl<S>>,
  ) => Promise<this>;
  rpc<M extends MethodInfo>(
    service: ServiceType,
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

export function createMockRouter(
  context: BrowserContext,
  options: Options,
): MockRouter {
  const { baseUrl, jsonOptions, binaryOptions } = options;

  const routerOptions = {
    jsonOptions,
    binaryOptions,
  };

  function addMethodRoute<S extends ServiceType, M extends MethodInfo>(
    service: S,
    method: M,
    handler: MethodImpl<M> | "mock",
  ) {
    if (method.kind !== MethodKind.Unary) {
      throw new Error("Cannot add non-unary method.");
    }
    const requestPath = baseUrl
      .toString()
      .replace(/\/?$/, `/${service.typeName}/${method.name}`);

    return context.route(requestPath, async (route, request) => {
      if (handler !== "mock") {
        const router = createConnectRouter(routerOptions).rpc(
          service,
          method,
          handler,
        );

        const routeHandler = router.handlers[0];
        return universalHandlerToRouteResponse({
          route,
          request,
          routeHandler,
        });
      }
      const router = createConnectRouter(routerOptions).rpc(
        service,
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
              const method = service.methods[methodName];
              if (methodHandler === undefined) {
                throw new Error(`No method handler found for ${methodName}`);
              }
              return addMethodRoute(service, method, methodHandler);
            }),
          );
        }
        const requestPath = baseUrl
          .toString()
          .replace(/\/?$/, `/${service.typeName}/**`);

        return context.route(requestPath, async (route, request) => {
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
          if (associatedMethod.kind !== MethodKind.Unary) {
            return route.continue();
          }
          const router = createConnectRouter(routerOptions).rpc(
            service,
            associatedMethod,
            // By returning an empty object, the response will be a default-constructed mock object.
            () => ({}),
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
    rpc: async (service, method, handler) => {
      await addMethodRoute(service, method, handler);
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- The Serializable type isn't exposed by Playwright
  let body: any;
  if (headers["content-type"] === "application/json") {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    body = request.postDataJSON();
  } else {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    body = request.postDataBuffer();
  }

  const response = await routeHandler({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- No current way around this, we just have no idea what this returns
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
