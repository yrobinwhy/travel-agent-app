"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  modelName?: string;
  isStreaming?: boolean;
}

export const ChatMessage = memo(function ChatMessage({
  role,
  content,
  modelName,
  isStreaming,
}: ChatMessageProps) {
  return (
    <div
      className={cn(
        "flex gap-3 px-4 py-4",
        role === "user" ? "justify-end" : "justify-start"
      )}
    >
      {role === "assistant" && (
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Bot className="w-4 h-4 text-emerald-500" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          role === "user"
            ? "bg-emerald-600 text-white rounded-br-sm"
            : "bg-muted/50 border border-border/50 rounded-bl-sm"
        )}
      >
        {role === "assistant" ? (
          <div className="space-y-2">
            <div
              className={cn(
                "prose prose-sm dark:prose-invert max-w-none",
                "[&_p]:mb-2 [&_p:last-child]:mb-0",
                "[&_ul]:my-1 [&_ol]:my-1",
                "[&_li]:my-0.5",
                "[&_pre]:bg-background/50 [&_pre]:border [&_pre]:rounded-lg [&_pre]:p-3",
                "[&_code]:text-emerald-400 [&_code]:text-xs",
                "[&_table]:text-xs [&_th]:px-2 [&_td]:px-2",
                "[&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm"
              )}
            >
              <ReactMarkdown skipHtml>{content || ""}</ReactMarkdown>
            </div>
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-emerald-500 animate-pulse rounded-sm" />
            )}
            {!isStreaming && modelName && (
              <p className="text-[10px] text-muted-foreground/50 mt-2">
                {modelName}
              </p>
            )}
          </div>
        ) : (
          <p className="whitespace-pre-wrap">{content}</p>
        )}
      </div>

      {role === "user" && (
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
          <User className="w-4 h-4 text-emerald-400" />
        </div>
      )}
    </div>
  );
});
