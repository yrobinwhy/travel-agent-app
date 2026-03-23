"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
                // Paragraphs
                "[&_p]:mb-2 [&_p:last-child]:mb-0",
                // Lists
                "[&_ul]:my-1 [&_ol]:my-1",
                "[&_li]:my-0.5",
                // Code
                "[&_pre]:bg-background/50 [&_pre]:border [&_pre]:rounded-lg [&_pre]:p-3",
                "[&_code]:text-emerald-400 [&_code]:text-xs",
                // Headings
                "[&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_h1]:mt-3 [&_h2]:mt-2 [&_h3]:mt-2",
                // Tables — proper styling for GFM tables
                "[&_table]:w-full [&_table]:text-xs [&_table]:border-collapse [&_table]:my-2",
                "[&_table]:rounded-lg [&_table]:overflow-hidden",
                "[&_thead]:bg-muted/80 [&_thead]:dark:bg-muted/40",
                "[&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-medium [&_th]:border-b [&_th]:border-border/50",
                "[&_td]:px-3 [&_td]:py-2 [&_td]:border-b [&_td]:border-border/30",
                "[&_tr:last-child_td]:border-b-0",
                "[&_tr:hover]:bg-muted/30",
                // Blockquotes
                "[&_blockquote]:border-l-2 [&_blockquote]:border-emerald-500/50 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground",
                // Horizontal rules
                "[&_hr]:border-border/50 [&_hr]:my-3",
                // Strong
                "[&_strong]:font-semibold"
              )}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
                {content || ""}
              </ReactMarkdown>
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
