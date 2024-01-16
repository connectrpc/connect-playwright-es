// Copyright 2023-2024 The Connect Authors
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

import { ElizaService } from "../src/gen/connectrpc/eliza/v1/eliza_connect.js";
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

  test("treats no params as connect with JSON and correctly mocks", async ({
    page,
  }) => {
    await page.goto(baseURL);

    // Type a name and send
    await statementInput.fill("Hello");
    await sendButton.click();

    // This should be the mocked response we return from say() above
    await expect(respText).toHaveText("Mock response");
  });

  test("correctly mocks a connect transport in JSON format", async ({
    page,
  }) => {
    await page.goto(baseURL + "?transport=connect");

    // Type a name and send
    await statementInput.fill("Hello");
    await sendButton.click();

    // This should be the mocked response we return from say() above
    await expect(respText).toHaveText("Mock response");
  });

  test("correctly mocks a connect transport in binary format", async ({
    page,
  }) => {
    await page.goto(baseURL + "?transport=connect&format=binary");

    // Type a name and send
    await statementInput.fill("Hello");
    await sendButton.click();

    // This should be the mocked response we return from say() above
    await expect(respText).toHaveText("Mock response");
  });

  test("correctly mocks a grpc web transport in binary format", async ({
    page,
  }) => {
    await page.goto(baseURL + "?transport=grpcweb");

    // Type a name and send
    await statementInput.fill("Hello");
    await sendButton.click();

    // This should be the mocked response we return from say() above
    await expect(respText).toHaveText("Mock response");
  });

  test("correctly mocks a grpc web transport in JSON format", async ({
    page,
  }) => {
    await page.goto(baseURL + "?transport=grpcweb&format=json");

    // Type a name and send
    await statementInput.fill("Hello");
    await sendButton.click();

    // This should be the mocked response we return from say() above
    await expect(respText).toHaveText("Mock response");
  });
});
