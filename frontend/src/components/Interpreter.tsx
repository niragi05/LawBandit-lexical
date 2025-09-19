import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateAIResponse } from "@/lib/api";
import { Paperclip, RefreshCw } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isInitialContext?: boolean;
  isError?: boolean;
  canRegenerate?: boolean;
}

const Interpreter: React.FC = () => {
  const [selectedText, setSelectedText] = useState<string>('');
  const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [attachedNotes, setAttachedNotes] = useState<{ [text: string]: Message[] }>({});
  const textRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sampleText = `The Constitution of the United States is the supreme law of the United States of America. The Constitution, originally comprising seven articles, delineates the national frame of government. Its first three articles entrench the doctrine of the separation of powers, whereby the federal government is divided into three branches: the legislative, the executive, and the judicial.

The legislative branch is Congress, which is bicameral, consisting of the Senate and the House of Representatives. The executive branch is headed by the President, who is both head of state and head of government. The judicial branch is headed by the Supreme Court.

Article I of the Constitution establishes the legislative branch. It vests all legislative powers in Congress and outlines its composition and powers. Congress has the power to lay and collect taxes, duties, imposts and excises, to pay the debts and provide for the common defence and general welfare of the United States.

Article II establishes the executive branch and vests executive power in the President. The President is elected to a four-year term and can serve no more than two terms. The President has the power to make treaties (with Senate approval), appoint judges and other officials (with Senate confirmation), and serve as Commander-in-Chief of the armed forces.

Article III establishes the judicial branch and the Supreme Court. It provides that the judicial power shall extend to all cases arising under the Constitution, federal laws, and treaties. Judges serve during good behavior and receive compensation that cannot be diminished during their service.`;

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      setSelectedText(selection.toString().trim());
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      setSelectedText(selection.toString().trim());
    } else {
      e.preventDefault(); // Prevent default context menu if no text is selected
    }
  };

  const openInterpreterSheet = () => {
    if (selectedText) {
      setIsSheetOpen(true);
      // Add initial context message
      const initialMessage: Message = {
        id: '1',
        role: 'assistant',
        content: `I've loaded the selected text as context. You can now ask me questions about it:\n\n"${selectedText}"`,
        timestamp: new Date(),
        isInitialContext: true,
      };
      setMessages([initialMessage]);
    }
  };

  const sendMessage = async (regenerateMessageId?: string) => {
    let messageContent = currentMessage;
    let userMessage: Message;

    // If regenerating, find the original user message
    if (regenerateMessageId) {
      const errorMessage = messages.find(m => m.id === regenerateMessageId);
      if (errorMessage) {
        // Find the user message that preceded this error message
        const errorIndex = messages.findIndex(m => m.id === regenerateMessageId);
        const userMsg = messages[errorIndex - 1];
        if (userMsg && userMsg.role === 'user') {
          messageContent = userMsg.content;
          userMessage = userMsg;
        } else {
          return; // Can't find original user message
        }
      } else {
        return; // Error message not found
      }
    } else {
      if (!currentMessage.trim()) return;

      userMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: currentMessage,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, userMessage]);
      setCurrentMessage('');
    }

    setIsLoading(true);

    try {
      const prompt = `Context: "${selectedText}"

User question: ${messageContent}

Please provide a helpful response based on the provided context.`;

      const response = await generateAIResponse(prompt);

      if (response.success) {
        const assistantMessage: Message = {
          id: regenerateMessageId || (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.content,
          timestamp: new Date(),
        };

        if (regenerateMessageId) {
          // Replace the error message with the new response
          setMessages(prev => prev.map(m => 
            m.id === regenerateMessageId ? assistantMessage : m
          ));
        } else {
          setMessages(prev => [...prev, assistantMessage]);
        }
      } else {
        const errorMessage: Message = {
          id: regenerateMessageId || (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.error || 'Sorry, I encountered an error processing your request.',
          timestamp: new Date(),
          isError: true,
          canRegenerate: true,
        };

        if (regenerateMessageId) {
          // Replace the previous error message with new error message
          setMessages(prev => prev.map(m => 
            m.id === regenerateMessageId ? errorMessage : m
          ));
        } else {
          setMessages(prev => [...prev, errorMessage]);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Parse error response if it's from the API
      let errorContent = 'Sorry, I encountered an error. Please try again.';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        if (axiosError.response?.data?.error) {
          errorContent = axiosError.response.data.error;
        }
      }

      const errorMessage: Message = {
        id: regenerateMessageId || (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date(),
        isError: true,
        canRegenerate: true,
      };

      if (regenerateMessageId) {
        setMessages(prev => prev.map(m => 
          m.id === regenerateMessageId ? errorMessage : m
        ));
      } else {
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const attachAsNote = (message: Message) => {
    if (selectedText) {
      setAttachedNotes(prev => ({
        ...prev,
        [selectedText]: [...(prev[selectedText] || []), message]
      }));
    }
  };

  const renderTextWithHighlights = (text: string) => {
    // Check if this text has attached notes
    const hasNotes = attachedNotes[text];

    if (!hasNotes) {
      return <span>{text}</span>;
    }

    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          <span className="underline decoration-2 decoration-blue-400 cursor-pointer hover:bg-blue-100 px-1 rounded">
            {text}
          </span>
        </HoverCardTrigger>
        <HoverCardContent className="w-80 max-h-60 overflow-y-auto">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Attached Notes</h4>
            {attachedNotes[text].map((note, index) => (
              <div key={index} className="border-l-2 border-blue-400 pl-3 py-2">
                <div className="text-xs text-gray-500 mb-1">
                  {note.timestamp.toLocaleString()}
                </div>
                <div className="text-sm text-gray-700">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{children}</code>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-1 space-y-0.5">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside mb-1 space-y-0.5">{children}</ol>,
                      li: ({ children }) => <li className="text-xs">{children}</li>,
                    }}
                  >
                    {note.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  };

  return (
    <div className="min-h-screen bg-color-cream">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h1 className="text-3xl font-bold text-black mb-6">Interpreter</h1>

          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div
                ref={textRef}
                className="text-gray-700 leading-relaxed cursor-text select-text border border-gray-200 rounded-lg p-6 bg-gray-50 min-h-[400px]"
                onMouseUp={handleTextSelection}
                onContextMenu={handleContextMenu}
              >
                <h2 className="text-xl font-semibold mb-4 text-gray-900">U.S. Constitution Overview</h2>
                <div className="space-y-4">
                  {sampleText.split('\n\n').map((paragraph, index) => (
                    <p key={index} className="text-base">
                      {(() => {
                        const attachedTexts = Object.keys(attachedNotes);

                        // Sort by length (longest first) to handle overlapping matches
                        attachedTexts.sort((a, b) => b.length - a.length);

                        let hasReplacements = false;
                        const elements: (string | React.ReactElement)[] = [];
                        let remainingText = paragraph;

                        // Process each attached text
                        attachedTexts.forEach(attachedText => {
                          if (remainingText.includes(attachedText)) {
                            hasReplacements = true;
                            const parts = remainingText.split(attachedText);

                            parts.forEach((part, partIndex) => {
                              if (part) {
                                elements.push(part);
                              }
                              if (partIndex < parts.length - 1) {
                                elements.push(
                                  <span key={`highlight-${attachedText}-${partIndex}`}>
                                    {renderTextWithHighlights(attachedText)}
                                  </span>
                                );
                              }
                            });

                            // Update remaining text for next iteration
                            remainingText = parts[parts.length - 1];
                          }
                        });

                        // If no replacements were made, return the original paragraph
                        if (!hasReplacements) {
                          return paragraph;
                        }

                        return elements;
                      })()}
                    </p>
                  ))}
                </div>
              </div>
            </ContextMenuTrigger>

            <ContextMenuContent className="w-48">
              <ContextMenuItem
                onClick={openInterpreterSheet}
                disabled={!selectedText}
              >
                💬 Interpreter
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>

          {!selectedText && (
            <p className="text-sm text-gray-500 mt-4">
              Select some text above and right-click to open the Interpreter.
            </p>
          )}
        </div>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="!w-[1000px] w-3/4 sm:max-w-none">
          <SheetHeader>
            <SheetTitle>AI Interpreter</SheetTitle>
            <SheetDescription>
              Ask questions about the selected text
            </SheetDescription>
          </SheetHeader>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto space-y-4 p-4 pr-8 pb-24" style={{ maxHeight: 'calc(100vh - 150px)' }}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-color-cream text-black'
                      : message.isError
                        ? 'bg-red-100 text-red-900'
                        : 'bg-black text-cream'
                  }`}
                >
                  {message.role === 'user' ? (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <div className={`text-sm ${message.isError ? 'text-red-900' : 'text-color-cream'}`}>
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          code: ({ children }) => <code className="bg-gray-800 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                          pre: ({ children }) => <pre className="bg-gray-800 p-2 rounded text-xs font-mono overflow-x-auto mb-2">{children}</pre>,
                          ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                          li: ({ children }) => <li>{children}</li>,
                          h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                          blockquote: ({ children }) => <blockquote className="border-l-2 border-color-cream pl-4 italic mb-2">{children}</blockquote>,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  )}
                  <span className="text-xs opacity-70 mt-1 block">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                  {message.role === 'assistant' && (
                    <div className="mt-2 flex gap-2">
                      {/* Attach as Note button - only show for successful responses (not initial context or errors) */}
                      {!message.isInitialContext && !message.isError && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => attachAsNote(message)}
                                className="text-xs h-6 px-2 bg-white text-black border-gray-300 hover:bg-gray-50"
                              >
                                <Paperclip className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Attach as Notes</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      
                      {/* Regenerate button - only show for error responses */}
                      {message.isError && message.canRegenerate && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => sendMessage(message.id)}
                                className="text-xs h-6 px-2 bg-white text-black border-gray-300 hover:bg-gray-50"
                                disabled={isLoading}
                              >
                                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Regenerate Response</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-black text-color-cream rounded-lg px-4 py-2 max-w-[80%]">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-color-cream"></div>
                    <span className="text-sm text-cream">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            {/* Invisible element to scroll to */}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Container - Fixed at bottom */}
          <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-white p-4">
            <div className="flex space-x-2">
              <Input
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question about the selected text..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                disabled={isLoading || !currentMessage.trim()}
              >
                Send
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Interpreter;
