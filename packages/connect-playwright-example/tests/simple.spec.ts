import { expect, Locator, test } from "@playwright/test";

import { ElizaService } from "../src/gen/connectrpc/eliza/v1/eliza_connect.js";
import type { SayRequest } from "../src/gen/connectrpc/eliza/v1/eliza_pb.js";
import { createMockRouter, MockRouter } from "@connectrpc/connect-playwright";
import { Code, ConnectError } from "@bufbuild/connect";

test.describe("mocking Eliza", () => {
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

  test("correctly mocks a unary response", async ({ page }, { project }) => {
    await mock.service(ElizaService, {
      say() {
        return {
          sentence: "Mock response",
        };
      },
    });

    await page.goto(project.use.baseURL ?? "");

    // Type a name and send
    await statementInput.type("Hello");
    await sendButton.click();

    // This should be the mocked response we return from say() above
    await expect(respText).toHaveText("Mock response");
  });

  test("mocking a default response", async ({ page }, { project }) => {
    await mock.service(ElizaService, "mock");

    await page.goto(project.use.baseURL ?? "");

    // Type a name and send
    await statementInput.type("Hello");
    await sendButton.click();

    // This should be empty text, because we configured the service with "mock" above,
    // which returns the default response.
    await expect(respText).toHaveText("");
  });

  test("mocking an error raises an error", async ({ page }, { project }) => {
    await mock.service(ElizaService, {
      say(request: SayRequest) {
        throw new ConnectError(
          `You said "${request.sentence}", but I don't like that`,
          Code.FailedPrecondition,
        );
      },
    });

    await page.goto(project.use.baseURL ?? "");

    // Type a name and send
    await statementInput.type("Hello");
    await sendButton.click();

    // In the app, calling say() rejected with a ConnectError.
    await expect(respText).toHaveText(
      `[failed_precondition] You said "Hello", but I don't like that`,
    );
  });

  test("methods that are not implemented are passed through to the server", async ({
    page,
  }, { project }) => {
    await mock.service(ElizaService, {
      // We don't implement say() here
    });

    await page.goto(project.use.baseURL ?? "");

    // Type a name and send
    await statementInput.type("Hello");
    await sendButton.click();

    // This should NOT be the mocked response and instead should be passed through
    await expect(respText).not.toBeEmpty();
    await expect(respText).not.toHaveText("Mock response");
  });
});
