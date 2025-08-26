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

import { createMockRouter } from "./create-mock-router.js";
import type { MockRouter } from "./create-mock-router.js";
import { type BrowserContext, chromium } from "@playwright/test";
import { TestService } from "./testdata/gen/test_pb.js";

// eslint-disable-next-line @typescript-eslint/require-await
async function* mockFn() {
  yield {
    value: "fail",
  };
}

describe("createMockRouter()", () => {
  let mock: MockRouter;
  let context: BrowserContext;
  beforeEach(async () => {
    const browser = await chromium.launch();
    context = await browser.newContext();
    mock = createMockRouter(context, {
      baseUrl: "http://localhost:8080",
    });
  });
  describe("service()", () => {
    it("works as intended", async () => {
      await mock.service(TestService, {
        unaryOne: () => {
          return {
            value: "custom response",
          };
        },
      });

      await mock.service(TestService, {
        unaryTwo: () => {
          return {
            value: "custom response",
          };
        },
      });
    });

    it("allows await chaining", async () => {
      await (
        await mock.service(TestService, {
          unaryOne: () => {
            return {
              value: "custom response",
            };
          },
        })
      ).service(TestService, {
        unaryTwo: () => {
          return {
            value: "custom response",
          };
        },
      });
    });

    it("allows promise chaining", () => {
      void mock
        .service(TestService, {
          unaryOne: () => {
            return {
              value: "custom response",
            };
          },
        })
        .then((handler) => {
          void handler.service(TestService, {
            unaryTwo: () => {
              return {
                value: "custom response",
              };
            },
          });
        });
    });

    it("throws when trying to mock a non-unary method", async () => {
      try {
        await mock.service(TestService, {
          serverStreaming: mockFn,
        });
        fail("expected error");
      } catch (e) {
        expect((e as Error).message).toEqual("Cannot add non-unary method.");
      }
    });

    it("ensures only the exact mock is used", async () => {
      await mock.rpc(TestService.method.unaryExampleSecondary, () => {
        return {
          value: "unary example secondary",
        };
      });
      await mock.rpc(TestService.method.unaryExample, () => {
        return {
          value: "unary example",
        };
      });
      const page = await context.newPage();

      const results = await page.evaluate(
        async ({
          serviceTypeName,
          firstMethodName,
          secondMethodName,
        }: {
          serviceTypeName: string;
          firstMethodName: string;
          secondMethodName: string;
        }) => {
          /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
          // We're manually creating a request here so we don't have to include
          // a dependency in the testing environment.
          const response1 = await fetch(
            `http://localhost:8080/${serviceTypeName}/${firstMethodName}`,
            {
              method: "POST",
              body: JSON.stringify({}),
              headers: {
                "content-type": "application/json",
              },
            },
          ).then((response) => response.json());
          const response2 = await fetch(
            `http://localhost:8080/${serviceTypeName}/${secondMethodName}`,
            {
              method: "POST",
              body: JSON.stringify({}),
              headers: {
                "content-type": "application/json",
              },
            },
          ).then((response) => response.json());
          return {
            response1,
            response2,
          };
          /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        },
        {
          serviceTypeName: TestService.typeName,
          firstMethodName: TestService.method.unaryExample.name,
          secondMethodName: TestService.method.unaryExampleSecondary.name,
        },
      );

      expect(results.response1).toBe("unary example");
      expect(results.response2).toBe("unary example secondary");
    });
  });
});
