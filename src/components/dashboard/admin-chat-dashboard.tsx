"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatRelative, initials } from "@/lib/utils";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";
import {
  MessageCircle,
  Send,
  Camera,
  Paperclip,
  Loader2,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface ChatSession {
  id: string;
  voterId: string;
  voterName: string;
  status: string;
  adminName: string | null;
  lastMessage: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ChatMessage {
  id: string;
  sessionId: string;
  senderType: string;
  senderName: string;
  body: string;
  fileUrl: string | null;
  fileName: string | null;
  createdAt: string;
}

export function AdminChatDashboard({ adminId, adminName }: { adminId: string; adminName: string }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Connect to socket.io
  useEffect(() => {
    const s = io("/?XTransformPort=3004", {
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    setSocket(s);

    s.on("connect", () => {
      s.emit("admin:join", { adminId, adminName });
    });

    s.on("sessions:update", (data: ChatSession[]) => {
      setSessions(data);
    });

    s.on("messages:history", (data: ChatMessage[]) => {
      setMessages(data);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    s.on("message:new", (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    s.on("claim:success", () => {
      toast.success("Session claimed", { description: "You are now assisting this voter." });
    });

    s.on("claim:failed", (data: { reason: string }) => {
      toast.error("Cannot claim", { description: data.reason });
    });

    s.on("session:reassigned", () => {
      toast.info("Session reassigned", { description: "Another agent took over this session." });
      setActiveSession(null);
      setMessages([]);
    });

    s.on("admin:left", (data: { message: string }) => {
      toast.info("Agent left", { description: data.message });
    });

    return () => { s.disconnect(); };
  }, [adminId, adminName]);

  const claimSession = useCallback((sessionId: string) => {
    if (!socket) return;
    socket.emit("admin:claim", { sessionId });
    setActiveSession(sessionId);
    setMessages([]);
  }, [socket]);

  const sendMessage = useCallback(() => {
    if (!socket || !activeSession || !input.trim()) return;
    socket.emit("admin:message", { sessionId: activeSession, body: input.trim() });
    setInput("");
  }, [socket, activeSession, input]);

  const uploadFile = useCallback(async (file: File) => {
    if (!socket || !activeSession) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/support/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        socket.emit("admin:message", {
          sessionId: activeSession,
          body: file.type.startsWith("image/") ? "[Image]" : "[File]",
          fileUrl: data.data.fileUrl,
          fileName: data.data.filename,
        });
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }, [socket, activeSession]);

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      {/* ─── Session List ─── */}
      <Card className="h-[calc(100vh-12rem)] overflow-hidden">
        <CardHeader className="border-b pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <MessageCircle className="h-4 w-4 text-primary" />
            Support Inbox
            {sessions.length > 0 && (
              <Badge variant="outline" className="text-[10px]">{sessions.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-16rem)] scroll-area-custom">
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <MessageCircle className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">No active conversations</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => claimSession(s.id)}
                    className={cn(
                      "w-full rounded-lg border p-2.5 text-left transition-all hover:border-primary/30 hover:bg-accent/30",
                      activeSession === s.id ? "border-primary bg-primary/5" : "border-border/60"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                          {initials(s.voterName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold">{s.voterName}</p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {s.lastMessage ?? "No messages yet"}
                        </p>
                      </div>
                      <StatusBadge status={s.status} />
                    </div>
                    <p className="mt-1 text-[9px] text-muted-foreground/60">
                      {formatRelative(s.updatedAt)} · {s.messageCount} msg
                    </p>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* ─── Active Chat ─── */}
      <Card className="h-[calc(100vh-12rem)] overflow-hidden">
        {activeSession ? (
          <div className="flex h-full flex-col">
            {/* Chat header */}
            <div className="border-b p-3">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-xs text-primary">
                    {initials(sessions.find(s => s.id === activeSession)?.voterName ?? "?")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold">{sessions.find(s => s.id === activeSession)?.voterName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {sessions.find(s => s.id === activeSession)?.status === "assigned" ? "You are assisting" : "Waiting for claim"}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 scroll-area-custom">
              <div className="space-y-3 p-4">
                {messages.map((msg) => (
                  <div key={msg.id} className={cn("flex gap-2", msg.senderType === "admin" ? "justify-end" : "justify-start")}>
                    {msg.senderType === "voter" && (
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarFallback className="bg-muted text-[9px]">{initials(msg.senderName)}</AvatarFallback>
                      </Avatar>
                    )}
                    <div className={cn(
                      "max-w-[70%] rounded-2xl px-3 py-2 text-sm",
                      msg.senderType === "admin" ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted"
                    )}>
                      <p>{msg.body}</p>
                      {msg.fileUrl && (
                        <a href={msg.fileUrl} target="_blank" rel="noopener" className="mt-1 block">
                          {msg.body === "[Photo]" || msg.body === "[Image]" ? (
                            <img src={msg.fileUrl} alt={msg.fileName ?? "file"} className="max-h-40 rounded-lg" />
                          ) : (
                            <span className="text-xs underline opacity-80">📎 {msg.fileName}</span>
                          )}
                        </a>
                      )}
                      <span className="mt-0.5 block text-[9px] opacity-50">{formatRelative(msg.createdAt)}</span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="border-t p-2">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => cameraInputRef.current?.click()} disabled={uploading}>
                  <Camera className="h-4 w-4" />
                </Button>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                  placeholder="Type your reply…"
                  className="flex-1"
                />
                <Button size="icon" className="h-8 w-8" onClick={sendMessage} disabled={!input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-muted">
              <MessageCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Select a conversation</p>
              <p className="text-sm text-muted-foreground">Choose a voter from the list to start chatting</p>
            </div>
          </div>
        )}
      </Card>

      <input ref={fileInputRef} type="file" accept="image/*,.pdf,.txt,.doc,.docx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    assigned: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    timeout: "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
    closed: "border-zinc-300 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400",
  };
  return (
    <Badge variant="outline" className={cn("text-[9px] capitalize", styles[status] ?? "")}>
      {status}
    </Badge>
  );
}
