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

import { useCallback, useState, FormEvent, FC } from "react";
import { ConnectError, createPromiseClient } from "@connectrpc/connect";
import {
  createGrpcWebTransport,
  createConnectTransport,
} from "@connectrpc/connect-web";
import { ElizaService } from "./gen/connectrpc/eliza/v1/eliza_connect.js";

interface ChatMessage {
  text: string;
  sender: "eliza" | "user";
}

// Read the transport and format parameters from the URL
const params = new URLSearchParams(window.location.search);
const transportParam = params.get("transport");
const format = params.get("format");

let useBinaryFormat;
let transportFn;
if (transportParam === "grpcweb") {
  transportFn = createGrpcWebTransport;
  // gRPC-web uses the binary format by default
  useBinaryFormat = format ? format === "binary" : true;
} else {
  transportFn = createConnectTransport;
  // Connect uses the JSON format by default
  useBinaryFormat = format ? format === "binary" : false;
}

const elizaClient = createPromiseClient(
  ElizaService,
  transportFn({
    baseUrl: "https://demo.connectrpc.com",
    useBinaryFormat,
  }),
);

const UnaryExample: FC = () => {
  const [inputValue, setInputValue] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      setChatMessages((resp) => [
        ...resp,
        { text: inputValue, sender: "user" },
      ]);
      setInputValue("");
      elizaClient
        .say({
          sentence: inputValue,
        })
        .then(
          (response) => {
            setChatMessages((resp) => [
              ...resp,
              { text: response.sentence, sender: "eliza" },
            ]);
          },
          (reason) => {
            setChatMessages((resp) => [
              ...resp,
              { text: ConnectError.from(reason).message, sender: "eliza" },
            ]);
          },
        );
    },
    [inputValue],
  );

  return (
    <div>
      <header className="app-header">
        <h1>Eliza</h1>
      </header>
      <div className="container">
        {chatMessages.map((resp, i) => {
          return (
            <div
              key={`${i}`}
              className={
                resp.sender === "eliza"
                  ? "eliza-resp-container"
                  : "user-resp-container"
              }
            >
              <p className="resp-text">{resp.text}</p>
            </div>
          );
        })}
        <form onSubmit={handleSubmit}>
          <input
            id="statement-input"
            type="text"
            className="text-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            name="chat-message"
          />
          <button id="send" className="send-button" type="submit">
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default UnaryExample;
