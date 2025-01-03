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

import { expect, Locator, test } from "@playwright/test";

import { ElizaService } from "../src/gen/connectrpc/eliza/v1/eliza_pb.js";
import { createMockRouter, MockRouter } from "@connectrpc/connect-playwright";

test.describe("more mocking", () => {
  let respText: Locator;
  let statementInput: Locator;
  let sendButton: Locator;
  let mock: MockRouter;

  test.beforeEach(({ page, context }) => {
    respText = page.locator(".eliza-resp-container p");
    statementInput = page.locator("#statement-input");
    sendButton = page.locator("#send");

    mock = createMockRouter(context, {
      baseUrl: "https://demo.connectrpc.com",
    });
  });

  test("not mocking anything passes all calls through to the server", async ({
    page,
  }, { project }) => {
    await page.goto(project.use.baseURL ?? "");

    // Type some text and send
    await statementInput.fill("Hello");
    await sendButton.click();

    // This should NOT be the mocked response and instead should be passed through
    await expect(respText).not.toBeEmpty();
    await expect(respText).not.toHaveText("Mock response");
  });

  test.describe("mocking just individual RPCs", () => {
    test("default mocks a unary response", async ({ page }, { project }) => {
      await mock.rpc(ElizaService.method.say, "mock");

      await page.goto(project.use.baseURL ?? "");

      // Type a name and send
      await statementInput.fill("Hello");
      await sendButton.click();

      // This should be empty text, because we configured the service with "mock" above,
      // which returns the default response.
      await expect(respText).toHaveText("");
    });
  });

  test.describe("mocking the same service multiple times", () => {
    test("services overrides a previous default service mock", async ({
      page,
    }, { project }) => {
      await mock.service(ElizaService, "mock");
      await mock.service(ElizaService, {
        // Any methods we do not implement here will still be caught by the mocked
        // service above, and return empty default responses.
        say() {
          return {
            sentence: "Mock response",
          };
        },
      });

      // This has no effect, and does not override any of the above
      await mock.service(ElizaService, {});

      await page.goto(project.use.baseURL ?? "");

      // Type a name and send
      await statementInput.fill("Hello");
      await sendButton.click();

      // This should be the mocked response we set in our call to mock.rpc()
      await expect(respText).toHaveText("Mock response");
    });

    test("default service mock overrides previous one", async ({ page }, {
      project,
    }) => {
      await mock.service(ElizaService, {
        // This method - and any others we would implement - are overridden
        // by the mocked service below, and return empty default responses.
        say() {
          return {
            sentence: "Mock response",
          };
        },
      });
      await mock.service(ElizaService, "mock");

      await page.goto(project.use.baseURL ?? "");

      // Type a name and send
      await statementInput.fill("Hello");
      await sendButton.click();

      // This should be empty text, because we configured the service with "mock" above,
      // which returns the default response.
      await expect(respText).toHaveText("");
    });
  });

  test.describe("mocking the same RPC multiple times", () => {
    test("implementation overrides a previous default mock", async ({ page }, {
      project,
    }) => {
      await mock.rpc(ElizaService.method.say, "mock");
      await mock.rpc(ElizaService.method.say, () => {
        return {
          sentence: "Mock response",
        };
      });

      await page.goto(project.use.baseURL ?? "");

      // Type a name and send
      await statementInput.fill("Hello");
      await sendButton.click();

      // This should be the mocked response we set in our call to mock.rpc()
      await expect(respText).toHaveText("Mock response");
    });

    test("default mock overrides a previous implementations", async ({ page }, {
      project,
    }) => {
      await mock.rpc(ElizaService.method.say, () => {
        return {
          sentence: "Mock response",
        };
      });
      await mock.rpc(ElizaService.method.say, "mock");

      await page.goto(project.use.baseURL ?? "");

      // Type a name and send
      await statementInput.fill("Hello");
      await sendButton.click();

      // This should be empty text, because we configured the RPC with "mock" above,
      // which returns the default response.
      await expect(respText).toHaveText("");
    });
  });
});
