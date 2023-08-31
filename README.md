<img src=".github/connect-logo.png" width="15%" />

Playwright for Connect-ES
============

[![License](https://img.shields.io/github/license/connectrpc/connect-playwright-es?color=blue)](./LICENSE) [![Build](https://github.com/connectrpc/connect-playwright-es/actions/workflows/ci.yaml/badge.svg?branch=main)](https://github.com/connectrpc/connect-playwright-es/actions/workflows/ci.yaml)

e2e utilities designed to simplify writing [Playwright](https://playwright.dev) tests for your Connect-ES application by providing
an API to mock unary RPCs defined in your service.

## Installation

```
npm install @connectrpc/connect-playwright
```

## Usage

Unary Connect RPCs can be customized through the usage of the `createMockRouter` function. This function allows you to
write mocks at the service-level as well as mocks at the individual RPC level.

For example, to write mocks at the service level, use the `service` function on the mock router:

```typescript
test("mock RPCs at service level", async ({ context }) => {
  const mock = createMockRouter(context, {
    baseUrl: "https://api.myproject.com",
  });

  await mock.service(UserService, {
    // Mock getUser to return a custom response.
    getUser() {
      return {
        id: 1,
        name: "Homer Simpson",
        role: "Safety Inspector",
      };
    },
  });
  // ...
});
```

If you do not require any custom behavior and simply want to mock all RPCs in your service, you can do this with
the shorthand:

```typescript
await createMockRouter(context, {
  baseUrl: "https://api.myproject.com",
}).service(UserService, "mock");
```

If you wish to write mocks at the individual RPC level, you can do so with the `rpc` function on your mock router:

```typescript
test("mock RPCs at rpc level", async ({ context }) => {
  const mock = createMockRouter(context, {
    baseUrl: "https://api.myproject.com",
  });

  // Mock getUser with a custom response
  await mock.rpc(UserService, UserService.methods.getUser, () => {
    return {
      id: 1,
      name: "Homer Simpson",
      role: "Safety Inspector",
    };
  });

  // Just return a default-constructed DeleteUserResponse without hitting the actual RPC.
  await mock.rpc(UserService, UserService.methods.deleteUser, "mock");
});
```

Full documentation can be found in the package [README](packages/connect-playwright).

In addition, an example of using all of the above in practice can be found in the [connect-playwright-example](https://github.com/connectrpc/connect-playwright-es/tree/main/packages/connect-playwright-example)
directory.

## Packages

- [@connectrpc/connect-playwright](https://www.npmjs.com/package/@connectrpc/connect-playwright):
  Utilities for writing end-to-end tests for a Connect-ES application using Playwright ([source code](packages/connect-playwright)).

## Ecosystem

* [connect-es](https://github.com/connectrpc/connect-es):
  Connect, gRPC, and gRPC-Web support for Protobuf and TypeScript.
* [connect-query-es](https://github.com/connectrpc/connect-query-es):
  TypeScript-first expansion pack for TanStack Query that gives you Protobuf superpowers
* [connect-swift](https://github.com/bufbuild/connect-swift):
  Idiomatic gRPC & Connect RPCs for Swift.
* [connect-go](https://github.com/connectrpc/connect-go):
  Go implementation of gRPC, gRPC-Web, and Connect
* [examples-go](https://github.com/connectrpc/examples-go):
  Example RPC service powering https://demo.connectrpc.com and built with connect-go
* [connect-conformance](https://github.com/connectrpc/conformance):
  gRPC-Web and Connect interoperability tests
* [Buf Studio](https://buf.build/studio): web UI for ad-hoc RPCs

## Status

This project is in beta, which means we may make a few changes as we gather feedback from early adopters.
Join us on [Slack](https://buf.build/links/slack) to stay updated on future releases.

## Legal

Offered under the [Apache 2 license](./LICENSE).
