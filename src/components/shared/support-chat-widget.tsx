"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { io, type Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  MessageCircle,
  X,
  Send,
  Paperclip,
  ImageIcon,
  Loader2,
  Bot,
  User,
  Camera,
  Headset,
  Sparkles,
  CheckCheck,
  Clock,
} from "lucide-react";

type Mode = "ai" | "human";

interface ChatMessage {
  id?: string;
  role: "user" | "assistant" | "admin" | "system";
  content: string;
  fileUrl?: string;
  fileName?: string;
  timestamp: number;
  senderName?: string;
}

interface VoterIdentity {
  voterId: string;
  voterName: string;
  electionId?: string;
}

export interface SupportChatWidgetProps {
  electionId?: string;
  /** If a voter identity is supplied, the widget supports live human chat. */
  voter?: VoterIdentity;
}

const AI_GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hello! 👋 I'm the Votewise AI assistant. I can help with verification, OTP issues, voting guidance, and election questions. Type your question below — or tap the headset icon to chat with a live support agent.",
  timestamp: Date.now(),
};

export function SupportChatWidget({ electionId, voter }: SupportChatWidgetProps) {
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<Mode>("ai");
  const [messages, setMessages] = React.useState<ChatMessage[]>([AI_GREETING]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [photoRequested, setPhotoRequested] = React.useState(false);
  const [adminName, setAdminName] = React.useState<string | null>(null);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [waitingForAgent, setWaitingForAgent] = React.useState(false);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const socketRef = React.useRef<Socket | null>(null);

  // Auto-scroll
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // ─── Live chat socket connection (only when mode = human and voter identity exists) ───
  React.useEffect(() => {
    if (mode !== "human" || !voter) return;
    if (socketRef.current) return;

    const s = io("/?XTransformPort=3004", {
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    socketRef.current = s;

    s.on("connect", () => {
      s.emit("voter:join", {
        voterId: voter.voterId,
        voterName: voter.voterName,
        electionId: voter.electionId ?? electionId,
      });
    });

    s.on("session:created", (data: { sessionId: string }) => {
      setSessionId(data.sessionId);
    });

    s.on("messages:history", (hist: any[]) => {
      const mapped: ChatMessage[] = hist.map((m) => ({
        id: m.id,
        role: m.senderType === "voter" ? "user" : m.senderType === "admin" ? "admin" : "system",
        content: m.body,
        fileUrl: m.fileUrl ?? undefined,
        fileName: m.fileName ?? undefined,
        senderName: m.senderName ?? undefined,
        timestamp: new Date(m.createdAt).getTime(),
      }));
      if (mapped.length > 0) setMessages(mapped);
    });

    s.on("message:new", (msg: any) => {
      setMessages((prev) => [
        ...prev,
        {
          id: msg.id,
          role: msg.senderType === "voter" ? "user" : msg.senderType === "admin" ? "admin" : "system",
          content: msg.body,
          fileUrl: msg.fileUrl ?? undefined,
          fileName: msg.fileName ?? undefined,
          senderName: msg.senderName ?? undefined,
          timestamp: new Date(msg.createdAt).getTime(),
        },
      ]);
      if (msg.senderType === "admin") {
        setWaitingForAgent(false);
        setAdminName(msg.senderName ?? "Support Agent");
      }
    });

    s.on("admin:joined", (data: { adminName: string }) => {
      setAdminName(data.adminName);
      setWaitingForAgent(false);
      toast.success("Support agent connected", {
        description: `${data.adminName} will assist you now.`,
      });
    });

    s.on("admin:left", (data: { message: string }) => {
      setAdminName(null);
      setWaitingForAgent(true);
      toast.info("Agent unavailable", { description: data.message });
    });

    s.on("session:reopened", () => {
      setAdminName(null);
      setWaitingForAgent(true);
    });

    s.on("session:closed", () => {
      setAdminName(null);
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: "This conversation has been closed by the support team.",
          timestamp: Date.now(),
        },
      ]);
    });

    s.on("photo:request", (data: { message: string }) => {
      setPhotoRequested(true);
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: data.message,
          timestamp: Date.now(),
        },
      ]);
      toast.info("Photo requested", { description: data.message });
    });

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [mode, voter?.voterId]);

  // ─── AI mode: send to /api/support/ai-chat ───
  async function sendAiMessage(text: string) {
    const userMessage: ChatMessage = {
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const res = await fetch("/api/support/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role === "admin" || m.role === "system" ? "assistant" : m.role,
            content: m.content,
          })),
          electionId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.data.response,
            timestamp: Date.now(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "I'm having trouble right now. Please try again or contact support@votewise.com.ng",
            timestamp: Date.now(),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Connection error. Please check your internet and try again.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // ─── Human mode: send via socket.io ───
  function sendHumanMessage(text: string) {
    const s = socketRef.current;
    if (!s || !sessionId) return;
    s.emit("voter:message", { body: text });
    // Optimistic local display; the server will broadcast back.
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: text,
        timestamp: Date.now(),
        senderName: voter?.voterName ?? "You",
      },
    ]);
  }

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    setInput("");
    if (mode === "ai") {
      await sendAiMessage(trimmed);
    } else {
      sendHumanMessage(trimmed);
    }
  }

  async function handleFileUpload(file: File) {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/support/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (data.success) {
        if (mode === "human" && sessionId && socketRef.current) {
          // Send photo via socket.io (so the assigned admin sees it)
          socketRef.current.emit("voter:photo", {
            fileUrl: data.data.fileUrl,
            fileName: data.data.filename,
          });
          setMessages((prev) => [
            ...prev,
            {
              role: "user",
              content: "[Photo]",
              fileUrl: data.data.fileUrl,
              fileName: data.data.filename,
              timestamp: Date.now(),
              senderName: voter?.voterName ?? "You",
            },
          ]);
        } else {
          // AI mode — share file with AI
          setMessages((prev) => [
            ...prev,
            {
              role: "user",
              content: `📎 Shared a file: ${data.data.filename}`,
              fileUrl: data.data.fileUrl,
              fileName: data.data.filename,
              timestamp: Date.now(),
            },
          ]);
          // Ask AI about the file
          setLoading(true);
          const aiRes = await fetch("/api/support/ai-chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: [
                ...messages,
                {
                  role: "user",
                  content: `I've shared a file: ${data.data.filename}. Please help me with my issue.`,
                },
              ],
              electionId,
            }),
          });
          const aiData = await aiRes.json();
          if (aiData.success) {
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: aiData.data.response,
                timestamp: Date.now(),
              },
            ]);
          }
          setLoading(false);
        }
        setPhotoRequested(false);
      } else {
        toast.error("Upload failed", { description: data.error?.message });
      }
    } catch {
      toast.error("Upload failed", { description: "Network error" });
    } finally {
      setUploading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function switchMode(newMode: Mode) {
    if (newMode === "human" && !voter) {
      toast.error("Live chat unavailable", {
        description: "You must verify your voter identity first before chatting with a live agent.",
      });
      return;
    }
    if (newMode === mode) return;

    // Reset for the new mode
    setMessages([
      newMode === "ai"
        ? AI_GREETING
        : {
            role: "system",
            content:
              "You're now connected to a live support agent. An agent will join shortly — please describe your issue and they'll respond.",
            timestamp: Date.now(),
          },
    ]);
    setMode(newMode);
    setAdminName(null);
    setWaitingForAgent(newMode === "human");
  }

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow transition-transform hover:scale-110"
            aria-label="Open support chat"
          >
            <MessageCircle className="h-6 w-6" />
            {waitingForAgent && (
              <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                !
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 flex h-[min(34rem,calc(100dvh-3rem))] w-[calc(100vw-3rem)] max-w-sm flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b bg-primary p-3 text-primary-foreground">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-white/20">
                  {mode === "ai" ? <Bot className="h-4 w-4" /> : <Headset className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {mode === "ai" ? "Votewise Assistant" : adminName ?? "Live Support"}
                  </p>
                  <p className="flex items-center gap-1 text-[10px] opacity-80">
                    {mode === "ai" ? (
                      <>
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-emerald-300 opacity-75" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-300" />
                        </span>
                        AI Online
                      </>
                    ) : adminName ? (
                      <>
                        <CheckCheck className="size-3" /> {adminName} is assisting you
                      </>
                    ) : (
                      <>
                        <Clock className="size-3 animate-pulse" /> Connecting to an agent…
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Mode toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => switchMode(mode === "ai" ? "human" : "ai")}
                  className="h-9 gap-1 px-2 text-[10px] text-primary-foreground hover:bg-white/10"
                  title={mode === "ai" ? "Switch to live agent" : "Switch to AI assistant"}
                >
                  {mode === "ai" ? (
                    <>
                      <Headset className="size-3" /> Live
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3" /> AI
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpen(false)}
                  className="h-9 w-9 text-primary-foreground hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Mode indicator banner */}
            {mode === "human" && (
              <div className="border-b bg-amber-50 px-3 py-1.5 text-center text-[10px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                {adminName
                  ? `Connected with ${adminName}. Private conversation — recorded for quality.`
                  : "Waiting for the next available agent. Your messages will appear in real-time to support staff."}
              </div>
            )}

            {/* Photo request banner */}
            {photoRequested && (
              <div className="border-b bg-blue-50 px-3 py-2 text-center text-[11px] text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                <Camera className="mr-1 inline size-3" />
                Support requested a photo. Tap the camera icon below to capture & send.
              </div>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 scroll-area-custom" ref={scrollRef as never}>
              <div className="space-y-3 p-3">
                {messages.map((msg, i) => (
                  <MessageBubble key={msg.id ?? i} msg={msg} />
                ))}
                {loading && (
                  <div className="flex gap-2">
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input area */}
            <div className="border-t p-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-8 shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  aria-label="Attach file"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                </Button>

                {/* Camera button — always available, highlights when admin requested */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-9 w-8 shrink-0", photoRequested && "animate-pulse bg-blue-100 dark:bg-blue-950")}
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={uploading}
                  aria-label="Take photo"
                  title="Take a photo"
                >
                  <Camera className="h-4 w-4" />
                </Button>

                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={mode === "ai" ? "Ask the AI assistant…" : "Type a message to support…"}
                  className="flex-1"
                  disabled={loading}
                />

                <Button
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.txt,.doc,.docx"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f);
                e.target.value = "";
              }}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f);
                e.target.value = "";
              }}
              className="hidden"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  const isSystem = msg.role === "system";
  const isImage = msg.content === "[Photo]" || msg.content === "[Image]";

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="rounded-full bg-muted px-3 py-1 text-center text-[10px] text-muted-foreground">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10">
          {msg.role === "admin" ? (
            <Headset className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Bot className="h-3.5 w-3.5 text-primary" />
          )}
        </div>
      )}
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
          isUser ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted"
        )}
      >
        {msg.role === "admin" && msg.senderName && (
          <p className="mb-0.5 text-[10px] font-semibold opacity-70">{msg.senderName}</p>
        )}
        {isImage && msg.fileUrl ? (
          <a href={msg.fileUrl} target="_blank" rel="noopener">
            <img src={msg.fileUrl} alt={msg.fileName ?? "photo"} className="max-h-40 rounded-lg" />
          </a>
        ) : (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        )}
        {msg.fileUrl && !isImage && (
          <a
            href={msg.fileUrl}
            target="_blank"
            rel="noopener"
            className="mt-1 flex items-center gap-1 text-xs underline opacity-80"
          >
            <ImageIcon className="h-3 w-3" /> {msg.fileName ?? "View file"}
          </a>
        )}
      </div>
      {isUser && (
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10">
          <User className="h-3.5 w-3.5 text-primary" />
        </div>
      )}
    </div>
  );
}
