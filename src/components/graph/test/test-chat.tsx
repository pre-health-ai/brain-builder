import { useState, useRef, useEffect } from "react";

import { Send } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Database } from "@/types/supabase";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface TestChatProps {
  id: string;
  isOpen: boolean;
}

export function TestChat({ id, isOpen }: TestChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [jwt, setJwt] = useState<string | null>(null);
  const [currentGraphNodes, setCurrentGraphNodes] = useState<
    Database["public"]["Tables"]["graph_nodes"]["Row"][]
  >([]);
  const [states, setStates] = useState<
    Database["public"]["Tables"]["graph_states"]["Row"][]
  >([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const fetchJwt = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setJwt(session?.access_token || null);
    };

    const fetchGraphNodes = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("graph_nodes")
        .select("*")
        .eq("graph_id", id);
      setCurrentGraphNodes(data || []);
    };

    const fetchStates = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("graph_states")
        .select("*")
        .eq("graph_id", id);
      setStates(data || []);
    };

    fetchGraphNodes();
    fetchStates();
    fetchJwt();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  useEffect(() => {
    if (currentGraphNodes.length > 0) {
      console.log(currentGraphNodes[1].data);
    }
  }, [currentGraphNodes]);

  if (!isOpen) return null;

  const findAnalysisNode = () => {
    return currentGraphNodes.find(
      (node) =>
        typeof node.data === "object" &&
        node.data !== null &&
        "type" in node.data &&
        node.data.type === "analysis"
    );
  };

  const findNegativityState = () => {
    return states.find((state) => state.name === "negativity");
  };

  const analyzeMessage = async (messages: Message[]) => {
    const negativityState = findNegativityState();
    if (!negativityState || !jwt) return;

    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          messages: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          graphId: id,
          stateId: negativityState.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze message");
      }

      if (typeof data.score !== "number") {
        throw new Error("Invalid score received from server");
      }

      setStates((prev) =>
        prev.map((state) =>
          state.id === negativityState.id
            ? { ...state, starting_value: data.score.toString() }
            : state
        )
      );
    } catch (error) {
      console.error("Error analyzing message:", error);
      // We don't need to show an error to the user since this is a background analysis
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !jwt) return;

    const userMessage: Message = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);
    setStreamingContent("");

    try {
      const response = await fetch("/api/ai/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          prompt: input,
          messages: updatedMessages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      let accumulatedContent = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        accumulatedContent += text;
        setStreamingContent(accumulatedContent);
      }

      const assistantMessage = { role: "assistant" as const, content: accumulatedContent };
      const newMessages = [...updatedMessages, assistantMessage];
      setMessages(newMessages);
      setStreamingContent("");
      
      await analyzeMessage(newMessages);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
      setStreamingContent("");
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  return (
    <Card className="fixed right-4 top-4 h-[calc(100vh-2rem)] w-96 shadow-lg bg-card text-card-foreground">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Test Chat</h2>
          <div className="flex gap-2">
            {states.map((state) => (
              <Badge key={state.id} variant="secondary">
                {state.name}: {state.starting_value || "null"}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground ml-auto"
                      : "bg-muted text-muted-foreground"
                  } max-w-[80%] ${
                    message.role === "user" ? "ml-auto" : "mr-auto"
                  }`}
                >
                  {message.content}
                </div>
              ))}
              {streamingContent && (
                <div className="bg-muted text-muted-foreground p-3 rounded-lg max-w-[80%] mr-auto">
                  {streamingContent}
                </div>
              )}
              {isLoading && !streamingContent && (
                <div className="bg-muted text-muted-foreground p-3 rounded-lg max-w-[80%] mr-auto">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>
        <div className="p-4 border-t">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 p-2 border rounded-md bg-background/80 backdrop-blur-[2px] text-foreground border-input focus:outline-none focus:ring-2 focus:ring-ring h-10"
              disabled={!jwt}
            />
            <Button type="submit" disabled={isLoading || !jwt} className="h-10">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </Card>
  );
}
