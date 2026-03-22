"use client";

import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  modelName?: string;
  isStreaming?: boolean;
}

export function ChatMessage({
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
          "max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
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
              dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }}
            />
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
}

// Simple markdown to HTML (handles bold, italic, code, lists, headers)
function formatMarkdown(text: string): string {
  if (!text) return "";

  return (
    text
      // Code blocks
      .replace(
        /```(\w+)?\n([\s\S]*?)```/g,
        '<pre><code class="language-$1">$2</code></pre>'
      )
      // Inline code
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      // Bold
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      // Headers
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      // Unordered lists
      .replace(/^[*-] (.+)$/gm, "<li>$1</li>")
      .replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>")
      // Ordered lists
      .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
      // Tables (simple)
      .replace(/\|(.+)\|/g, (match) => {
        const cells = match
          .split("|")
          .filter(Boolean)
          .map((c) => c.trim());
        if (cells.every((c) => /^-+$/.test(c))) return "";
        return (
          "<tr>" + cells.map((c) => `<td>${c}</td>`).join("") + "</tr>"
        );
      })
      // Line breaks
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br/>")
      // Wrap in paragraph if not already wrapped
      .replace(/^(?!<[huptol])/i, "<p>")
      .replace(/(?<![>])$/i, "</p>")
  );
}
