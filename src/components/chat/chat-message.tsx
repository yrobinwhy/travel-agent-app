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
  // Don't render empty assistant messages (e.g. when flight results replace content)
  if (role === "assistant" && !content && !isStreaming) return null;

  return (
    <div
      className={cn(
        "flex gap-3 px-4 py-3",
        role === "user" ? "justify-end" : "justify-start"
      )}
    >
      {role === "assistant" && (
        <div className="flex-shrink-0 w-7 h-7 mt-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Bot className="w-3.5 h-3.5 text-emerald-500" />
        </div>
      )}

      <div
        className={cn(
          "rounded-2xl text-sm leading-relaxed",
          role === "user"
            ? "max-w-[85%] md:max-w-[70%] bg-emerald-600 text-white rounded-br-sm px-4 py-2.5"
            : "max-w-[90%] md:max-w-[85%] bg-muted/40 border border-border/40 rounded-bl-sm px-5 py-4"
        )}
      >
        {role === "assistant" ? (
          <div>
            <div
              className={cn(
                "prose prose-sm dark:prose-invert max-w-none",
                // Base text
                "text-[13.5px] leading-[1.7]",
                // Paragraphs — better spacing
                "[&_p]:mb-3 [&_p:last-child]:mb-0",
                // Lists
                "[&_ul]:my-2 [&_ol]:my-2 [&_ul]:pl-4 [&_ol]:pl-4",
                "[&_li]:my-1 [&_li]:leading-relaxed",
                // Code
                "[&_pre]:bg-background/50 [&_pre]:border [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:my-3",
                "[&_code]:text-emerald-400 [&_code]:text-xs [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded",
                // Headings — clear hierarchy
                "[&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2",
                "[&_h2]:text-[14px] [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-1.5",
                "[&_h3]:text-[13.5px] [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1",
                // Tables — clean, spacious
                "[&_table]:w-full [&_table]:text-xs [&_table]:border-collapse [&_table]:my-3",
                "[&_table]:rounded-lg [&_table]:border [&_table]:border-border/40 [&_table]:overflow-hidden",
                "[&_thead]:bg-muted/60 [&_thead]:dark:bg-muted/30",
                "[&_th]:px-4 [&_th]:py-2.5 [&_th]:text-left [&_th]:font-semibold [&_th]:text-xs [&_th]:border-b [&_th]:border-border/40",
                "[&_td]:px-4 [&_td]:py-2 [&_td]:border-b [&_td]:border-border/20 [&_td]:align-middle",
                "[&_tr:last-child_td]:border-b-0",
                "[&_tr:hover]:bg-muted/20",
                "[&_td:first-child]:font-medium",
                // Blockquotes — tip/callout style
                "[&_blockquote]:border-l-2 [&_blockquote]:border-emerald-500/40 [&_blockquote]:pl-4 [&_blockquote]:py-1 [&_blockquote]:my-3",
                "[&_blockquote]:bg-emerald-500/5 [&_blockquote]:rounded-r-lg [&_blockquote]:text-muted-foreground",
                // Horizontal rules — section breaks
                "[&_hr]:border-border/30 [&_hr]:my-4",
                // Strong / emphasis
                "[&_strong]:font-semibold",
                "[&_em]:text-muted-foreground"
              )}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
                {content || ""}
              </ReactMarkdown>
            </div>
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-emerald-500 animate-pulse rounded-sm mt-1" />
            )}
            {!isStreaming && modelName && (
              <p className="text-[10px] text-muted-foreground/40 mt-3 pt-2 border-t border-border/20">
                {modelName}
              </p>
            )}
          </div>
        ) : (
          <p className="whitespace-pre-wrap">{content}</p>
        )}
      </div>

      {role === "user" && (
        <div className="flex-shrink-0 w-7 h-7 mt-1 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
          <User className="w-3.5 h-3.5 text-emerald-400" />
        </div>
      )}
    </div>
  );
});
