# @connectrpc/playwright

Connect is a family of libraries for building type-safe APIs with different languages and platforms.
[@bufbuild/connect](https://www.npmjs.com/package/@bufbuild/connect) brings them to TypeScript,
the web browser, and to Node.js.

`@connectrpc/playwright` provides utilities for writing end-to-end tests for a Connect-ES application
using [Playwright](https://playwright.dev/).

## Installation

```
npm install @connectrpc/playwright
```

## Usage

`@connectrpc/playwright` is designed to simplify writing Playwright tests for your Connect-ES application by providing
an API to mock unary RPCs.

Unary Connect RPCs can be customized through the usage of the `createMockRouter` function. This function
allows you to modify the behavior of one-to-many RPCs in your service.

Let's walk through an example using the following Protobuf file:

```protobuf
syntax = "proto3";
package example;

message GetUserRequest {
  int32 id = 1;
}

message GetUserResponse {
  int32 id = 1;
  string name = 2;
  string role = 3;
}

message UpdateUserRequest {
  int32 id = 1;
  string name = 2;
  string role = 3;
}

message UpdateUserResponse {}

message DeleteUserRequest {
  int32 id = 1;
}

message DeleteUserResponse {}

service UserService {
  rpc GetUser(GetUserRequest) returns (GetUserResponse) {}
  rpc UpdateUser(UpdateUserRequest) returns (UpdateUserResponse) {}
  rpc DeleteUser(DeleteUserRequest) returns (DeleteUserResponse) {}
}
```

The `createMockRouter` function accepts a Playwright [`BrowserContext`](https://playwright.dev/docs/api/class-browsercontext)
and an options object for specifying the `baseUrl` that your Connect client would typically interact with in a
non-test environment. This function call will return a `MockRouter` object that can be used to specify RPC
behavior.

The `MockRouter` type offers two methods, which allows you to specify mocks at either the service level or the
individual RPC level.

#### Service-Level Mocks

The `service` method provides the ability to mock an entire service in one invocation. It accepts two arguments: the
service definition generated from your Protobuf file and then, one of two values:

- An object containing all the desired mock implementations for your RPCs.
- `mock` - A string that configures the call to simply return the type specified by the RPC, with all default
  values set. This is useful if you don’t care about the response but want it to succeed without hitting the backend.

> **Note: any RPC not specified will simply pass through to the actual implementation.**

For example:

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

Again, note that in the above example, the `updateUser` and `deleteUser` functions will be passed through to the actual implementation
since they were not specified.

If you do not require any custom behavior and simply want to mock all RPCs in your service, you can do this with
the shorthand:

```typescript
await createMockRouter(context, {
  baseUrl: "https://api.myproject.com",
}).service(UserService, "mock");
```

#### RPC-Level Mocks

The `rpc` method provides the ability to mock a single RPC. It accepts three arguments: the service definition
generated from your Protobuf file, the RPC name you would like to mock, and then, one of two values:

- A function containing the desired mock implementation for the RPC.
- `mock` - A string that configures the call to simply return the type specified by the RPC, with all default
  values set.

For example:

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

The same rule regarding unspecified RPCs applies and the `updateUser` function will be passed through to the actual implementation
since it was not specified.

Note that both the `service` and `rpc` methods return a `Promise`, which resolves to the original `MockRouter` object.
This allows you to utilize promise-chaining if you wish.

An example of using all of the above in practice can be found in the [playwright-example](https://github.com/connectrpc/tools/tree/main/packages/playwright-example)
directory.

## Caveats

Currently, only unary requests are able to be mocked. We hope to add streaming support soon.
