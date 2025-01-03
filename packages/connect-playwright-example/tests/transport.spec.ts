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

test.describe("transports", () => {
  let respText: Locator;
  let statementInput: Locator;
  let sendButton: Locator;
  let mock: MockRouter;
  let baseURL = "";

  test.beforeEach(async ({ page, context }, { project }) => {
    respText = page.locator(".eliza-resp-container p");
    statementInput = page.locator("#statement-input");
    sendButton = page.locator("#send");

    baseURL = project.use.baseURL ?? "";

    mock = createMockRouter(context, {
      baseUrl: "https://demo.connectrpc.com",
    });

    await mock.service(ElizaService, {
      say() {
        return {
          sentence: "Mock response",
        };
      },
    });
  });

  [
    baseURL,
    baseURL + "?transport=connect",
    baseURL + "?transport=connect&useHttpGet=true",
    baseURL + "?transport=connect&format=binary",
    baseURL + "?transport=connect&format=binary&useHttpGet=true",
    baseURL + "?transport=grpcweb",
    baseURL + "?transport=grpcweb&format=json",
  ].forEach((url) => {
    test(`correctly mocks with params ${url}`, async ({ page }) => {
      await page.goto(url);

      // Type a name and send
      await statementInput.fill("Hello");
      await sendButton.click();

      // This should be the mocked response we return from say() above
      await expect(respText).toHaveText("Mock response");
    });
  });
});
