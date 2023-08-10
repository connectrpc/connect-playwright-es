import { createMockRouter } from "./create-mock-router.js";
import type { MockRouter } from "./create-mock-router.js";
import { chromium } from "@playwright/test";
import { MethodKind, Int32Value, StringValue } from "@bufbuild/protobuf";

const TestService = {
  typeName: "test.v1.TestService",
  methods: {
    unaryOne: {
      name: "UnaryOne",
      I: Int32Value,
      O: StringValue,
      kind: MethodKind.Unary,
    },
    unaryTwo: {
      name: "UnaryTwo",
      I: Int32Value,
      O: StringValue,
      kind: MethodKind.Unary,
    },
    serverStreaming: {
      name: "ServerStreaming",
      I: Int32Value,
      O: StringValue,
      kind: MethodKind.ServerStreaming,
    },
  },
} as const;

// eslint-disable-next-line @typescript-eslint/require-await
async function* mockFn() {
  yield {
    value: "fail",
  };
}

describe("createMockRouter()", () => {
  let mock: MockRouter;
  beforeEach(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
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
  });
});
