import { useCallback, useState, FormEvent, FC } from "react";
import { ConnectError, createPromiseClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { ElizaService } from "./gen/connectrpc/eliza/v1/eliza_connect.js";

interface ChatMessage {
  text: string;
  sender: "eliza" | "user";
}

const elizaClient = createPromiseClient(
  ElizaService,
  createConnectTransport({
    baseUrl: "https://demo.connectrpc.com",
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
