import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Upload, 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Download, 
  Printer, 
  Maximize, 
  Move, 
  Palette,
  Trash2,
  MessageCircle,
  Paperclip,
  FileText,
  Tags,
  Filter,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { generateAIResponse } from "@/lib/api";
import GlobalTagsDialog, { type Tag } from './GlobalTagsDialog';
import HighlightTagsDialog from './HighlightTagsDialog';
import { HIGHLIGHT_COLORS } from '@/lib/colors';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

// Types
interface Highlight {
  id: string;
  pageNumber: number;
  color: string;
  text: string;
  title: string;
  rects: Array<{
    left: number;
    top: number;
    right: number;
    bottom: number;
  }>;
  baseScale: number; // Store the scale at which highlight was created
  timestamp: number;
  tags?: string[]; // Array of tag IDs
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isInitialContext?: boolean;
  isError?: boolean;
  canRegenerate?: boolean;
}

interface PdfViewerState {
  file: File | null;
  numPages: number;
  currentPage: number;
  scale: number;
  highlights: Highlight[];
  selectedColor: string;
  isSelecting: boolean;
  // AI Chat state
  isSheetOpen: boolean;
  currentHighlight: Highlight | null;
  messages: Message[];
  currentMessage: string;
  isLoading: boolean;
  // Notes state
  attachedNotes: { [highlightId: string]: Message[] };
  isNotesDialogOpen: boolean;
  selectedHighlightForNotes: Highlight | null;
  // Tags state
  tags: Tag[];
  isGlobalTagsDialogOpen: boolean;
  isHighlightTagsDialogOpen: boolean;
  selectedHighlightForTags: Highlight | null;
  // Filter state
  filterByTags: string[]; // Array of tag IDs to filter by
  filterByPage: number | null; // Page number to filter by, null means all pages
  showHighlights: boolean;
}

// Using unified colors from the colors library - these are already optimized for highlights

const PdfViewer: React.FC = () => {
  const [state, setState] = useState<PdfViewerState>({
    file: null,
    numPages: 0,
    currentPage: 1,
    scale: 1.0,
    highlights: [],
    selectedColor: HIGHLIGHT_COLORS[0].value,
    isSelecting: false,
    // AI Chat state
    isSheetOpen: false,
    currentHighlight: null,
    messages: [],
    currentMessage: '',
    isLoading: false,
    // Notes state
    attachedNotes: {},
    isNotesDialogOpen: false,
    selectedHighlightForNotes: null,
    // Tags state
    tags: [],
    isGlobalTagsDialogOpen: false,
    isHighlightTagsDialogOpen: false,
    selectedHighlightForTags: null,
    // Filter state
    filterByTags: [],
    filterByPage: null,
    showHighlights: true
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [pageInputValue, setPageInputValue] = useState('1');
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState('');

  // File handling
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setState(prev => ({ 
        ...prev, 
        file, 
        currentPage: 1, 
        highlights: [] 
      }));
      setPageInputValue('1');
      toast.success('PDF loaded successfully');
    } else {
      toast.error('Please select a valid PDF file');
    }
  }, []);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setState(prev => ({ ...prev, numPages }));
  }, []);

  // Navigation
  const goToPage = useCallback((page: number) => {
    const newPage = Math.max(1, Math.min(page, state.numPages));
    setState(prev => ({ ...prev, currentPage: newPage }));
    setPageInputValue(newPage.toString());
  }, [state.numPages]);

  const handlePageInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInputValue(e.target.value);
  }, []);

  const handlePageInputSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInputValue, 10);
    if (!isNaN(page)) {
      goToPage(page);
    }
  }, [pageInputValue, goToPage]);

  // Zoom controls
  const zoomIn = useCallback(() => {
    setState(prev => ({ ...prev, scale: Math.min(prev.scale * 1.2, 3.0) }));
  }, []);

  const zoomOut = useCallback(() => {
    setState(prev => ({ ...prev, scale: Math.max(prev.scale / 1.2, 0.5) }));
  }, []);

  const fitToWidth = useCallback(() => {
    setState(prev => ({ ...prev, scale: 1.0 }));
  }, []);

  const fitToPage = useCallback(() => {
    setState(prev => ({ ...prev, scale: 0.8 }));
  }, []);

  // Text selection highlighting
  const handleTextSelection = useCallback(() => {
    console.log('handleTextSelection called, isSelecting:', state.isSelecting);
    
    if (!state.isSelecting) {
      console.log('Not in selecting mode, returning');
      return;
    }

    const selection = window.getSelection();
    console.log('Selection object:', selection);
    console.log('Selection is collapsed:', selection?.isCollapsed);
    console.log('Selection range count:', selection?.rangeCount);

    if (!selection || selection.isCollapsed) {
      console.log('No selection or selection is collapsed, returning');
      return;
    }

    // Double-check that the selection is within the PDF container
    const range = selection.getRangeAt(0);
    const pdfContainer = pdfCanvasRef.current;
    
    if (!pdfContainer || !pdfContainer.contains(range.commonAncestorContainer)) {
      console.log('Selection is not within PDF container, ignoring');
      return;
    }

    const selectedText = selection.toString().trim();
    console.log('Selected text:', `"${selectedText}"`);
    
    if (!selectedText) {
      console.log('No selected text, returning');
      return;
    }

    try {
      const range = selection.getRangeAt(0);
      const rects = Array.from(range.getClientRects());
      
      // Find the actual PDF page element (canvas or SVG)
      const pdfPageElement = pdfCanvasRef.current?.querySelector('.react-pdf__Page__canvas') || 
                            pdfCanvasRef.current?.querySelector('.react-pdf__Page__svg');
      
      // Also find the text content layer for coordinate reference
      const textContentLayer = pdfCanvasRef.current?.querySelector('.react-pdf__Page__textContent');
      
      if (!pdfPageElement) {
        console.log('Could not find PDF page element');
        return;
      }

      const pdfPageRect = pdfPageElement.getBoundingClientRect();
      const containerRect = pdfCanvasRef.current?.getBoundingClientRect();
      const textLayerRect = textContentLayer?.getBoundingClientRect();
      
      console.log('=== DEBUG INFO ===');
      console.log('Range rects count:', rects.length);
      console.log('PDF page element rect:', pdfPageRect);
      console.log('Container rect:', containerRect);
      console.log('Text layer rect:', textLayerRect);
      console.log('First selection rect:', rects[0]);
      console.log('PDF page element type:', pdfPageElement.tagName);
      console.log('PDF page element classes:', pdfPageElement.className);
      
      // Use text layer rect if it exists and is different from page rect
      const referenceRect = (textLayerRect && 
                           (Math.abs(textLayerRect.left - pdfPageRect.left) > 1 || 
                            Math.abs(textLayerRect.top - pdfPageRect.top) > 1)) 
                           ? textLayerRect : pdfPageRect;
                           
      console.log('Using reference rect:', referenceRect === textLayerRect ? 'TEXT_LAYER' : 'PDF_PAGE');
      
      if (rects.length === 0) {
        console.log('No selection rects, returning');
        return;
      }

      // Convert client rects to PDF-relative coordinates using the reference rect
      const highlightRects = rects.map(rect => {
        const relativeRect = {
          left: rect.left - referenceRect.left,
          top: rect.top - referenceRect.top,
          right: rect.right - referenceRect.left,
          bottom: rect.bottom - referenceRect.top
        };
        console.log('Original rect:', rect, 'Reference rect offset:', {x: referenceRect.left, y: referenceRect.top}, 'Final relative rect:', relativeRect);
        return relativeRect;
      });

      console.log('Creating highlight with rects:', highlightRects);

      const highlight: Highlight = {
        id: `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        pageNumber: state.currentPage,
        color: state.selectedColor,
        text: selectedText,
        title: `Highlight ${state.highlights.length + 1}`,
        rects: highlightRects,
        baseScale: state.scale, // Store the current scale when highlight was created
        timestamp: Date.now(),
        tags: [] // Initialize with empty tags array
      };

      setState(prev => ({
        ...prev,
        highlights: [...prev.highlights, highlight]
      }));

      // Clear selection after creating highlight
      selection.removeAllRanges();
      toast.success(`Text highlighted: "${selectedText.substring(0, 30)}..."`);
    } catch (error) {
      console.error('Error creating highlight:', error);
      toast.error('Failed to create highlight');
    }
  }, [state.isSelecting, state.currentPage, state.selectedColor, state.scale]);

  // Handle mouse up to capture text selection
  const handleMouseUp = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!state.isSelecting) return;
    
    // Check if the mouse event happened within the PDF container
    const target = e.target as Element;
    const pdfContainer = pdfCanvasRef.current;
    
    if (!pdfContainer || !pdfContainer.contains(target)) {
      console.log('Mouse up outside PDF container, ignoring');
      return;
    }
    
    // Prevent default to avoid interference
    e.preventDefault?.();
    
    // Multiple attempts with different delays to catch selection
    setTimeout(() => {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();
      console.log('Text selection attempt 1:', selectedText ? `"${selectedText}"` : 'none');
      
      if (selectedText) {
        handleTextSelection();
      } else {
        // Try again with longer delay
        setTimeout(() => {
          const selection2 = window.getSelection();
          const selectedText2 = selection2?.toString().trim();
          console.log('Text selection attempt 2:', selectedText2 ? `"${selectedText2}"` : 'none');
          if (selectedText2) {
            handleTextSelection();
          }
        }, 100);
      }
    }, 10);
  }, [handleTextSelection, state.isSelecting]);


  // Debug effect for highlighting mode changes
  useEffect(() => {
    console.log('Highlighting mode changed to:', state.isSelecting);
    if (state.isSelecting) {
      console.log('Text selection enabled - look for yellow background on PDF text layer');
      console.log('PDF page ref:', pdfCanvasRef.current);
    }
  }, [state.isSelecting]);

  // Global event listeners for text selection
  useEffect(() => {
    if (!state.isSelecting) return;

    console.log('Setting up global event listeners for text selection');

    const handleGlobalMouseUp = (e: MouseEvent) => {
      console.log('Global mouseup event triggered');
      handleMouseUp(e);
    };

    const handleSelectionChange = () => {
      if (!state.isSelecting) return;
      
      setTimeout(() => {
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim();
        console.log('Selection change detected:', selectedText ? `"${selectedText}"` : 'none');
        
        // Don't auto-highlight on selection change, only on mouseup
        // This is just for debugging
      }, 10);
    };

    // Add global event listeners
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      console.log('Cleaning up global event listeners');
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [state.isSelecting, handleMouseUp]);

  // Delete highlight
  const deleteHighlight = useCallback((highlightId: string) => {
    setState(prev => ({
      ...prev,
      highlights: prev.highlights.filter(h => h.id !== highlightId)
    }));
    toast.success('Highlight removed');
  }, []);

  // Change highlight color
  const changeHighlightColor = useCallback((highlightId: string, newColor: string) => {
    setState(prev => ({
      ...prev,
      highlights: prev.highlights.map(h => 
        h.id === highlightId ? { ...h, color: newColor } : h
      )
    }));
    toast.success('Highlight color changed');
  }, []);

  // Update highlight title
  const updateHighlightTitle = useCallback((highlightId: string, newTitle: string) => {
    setState(prev => ({
      ...prev,
      highlights: prev.highlights.map(h => 
        h.id === highlightId ? { ...h, title: newTitle } : h
      )
    }));
  }, []);

  // Start editing title
  const startEditingTitle = useCallback((highlightId: string, currentTitle: string) => {
    setEditingTitle(highlightId);
    setTempTitle(currentTitle);
  }, []);

  // Save title changes
  const saveTitle = useCallback((highlightId: string) => {
    if (tempTitle.trim()) {
      updateHighlightTitle(highlightId, tempTitle.trim());
      toast.success('Highlight title updated');
    }
    setEditingTitle(null);
    setTempTitle('');
  }, [tempTitle, updateHighlightTitle]);

  // Cancel title editing
  const cancelEditingTitle = useCallback(() => {
    setEditingTitle(null);
    setTempTitle('');
  }, []);

  // Navigate to highlight
  const goToHighlight = useCallback((highlight: Highlight) => {
    goToPage(highlight.pageNumber);
  }, [goToPage]);

  // Download and print
  const downloadPdf = useCallback(() => {
    if (state.file) {
      const url = URL.createObjectURL(state.file);
      const a = document.createElement('a');
      a.href = url;
      a.download = state.file.name;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF download started');
    }
  }, [state.file]);

  const printPdf = useCallback(() => {
    if (state.file) {
      const url = URL.createObjectURL(state.file);
      const printWindow = window.open(url, '_blank');
      printWindow?.focus();
      toast.success('PDF opened for printing');
    }
  }, [state.file]);

  // AI Chat functionality
  const openInterpreterSheet = useCallback((highlight: Highlight) => {
    setState(prev => ({
      ...prev,
      isSheetOpen: true,
      currentHighlight: highlight,
      messages: [{
        id: '1',
        role: 'assistant',
        content: `I've loaded the highlighted text as context. You can now ask me questions about it:\n\n"${highlight.text}"`,
        timestamp: new Date(),
        isInitialContext: true,
      }],
      currentMessage: '',
      isLoading: false
    }));
  }, []);

  const sendMessage = useCallback(async (regenerateMessageId?: string) => {
    let messageContent = state.currentMessage;
    let userMessage: Message;

    // If regenerating, find the original user message
    if (regenerateMessageId) {
      const errorMessage = state.messages.find(m => m.id === regenerateMessageId);
      if (errorMessage) {
        // Find the user message that preceded this error message
        const errorIndex = state.messages.findIndex(m => m.id === regenerateMessageId);
        const userMsg = state.messages[errorIndex - 1];
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
      if (!state.currentMessage.trim() || !state.currentHighlight) return;

      userMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: state.currentMessage,
        timestamp: new Date(),
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, userMessage],
        currentMessage: ''
      }));
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const prompt = `Context: "${state.currentHighlight!.text}"

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

        setState(prev => ({
          ...prev,
          messages: regenerateMessageId 
            ? prev.messages.map(m => m.id === regenerateMessageId ? assistantMessage : m)
            : [...prev.messages, assistantMessage],
          isLoading: false
        }));
      } else {
        const errorMessage: Message = {
          id: regenerateMessageId || (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.error || 'Sorry, I encountered an error processing your request.',
          timestamp: new Date(),
          isError: true,
          canRegenerate: true,
        };

        setState(prev => ({
          ...prev,
          messages: regenerateMessageId 
            ? prev.messages.map(m => m.id === regenerateMessageId ? errorMessage : m)
            : [...prev.messages, errorMessage],
          isLoading: false
        }));
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

      setState(prev => ({
        ...prev,
        messages: regenerateMessageId 
          ? prev.messages.map(m => m.id === regenerateMessageId ? errorMessage : m)
          : [...prev.messages, errorMessage],
        isLoading: false
      }));
    }
  }, [state.currentMessage, state.currentHighlight, state.messages]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.messages]);

  // Notes functionality
  const attachAsNote = useCallback((message: Message) => {
    if (state.currentHighlight) {
      setState(prev => ({
        ...prev,
        attachedNotes: {
          ...prev.attachedNotes,
          [state.currentHighlight!.id]: [
            ...(prev.attachedNotes[state.currentHighlight!.id] || []),
            message
          ]
        }
      }));
      toast.success('Response attached as note to highlight');
    }
  }, [state.currentHighlight]);

  const openNotesDialog = useCallback((highlight: Highlight) => {
    setState(prev => ({
      ...prev,
      isNotesDialogOpen: true,
      selectedHighlightForNotes: highlight
    }));
  }, []);

  const closeNotesDialog = useCallback(() => {
    setState(prev => ({
      ...prev,
      isNotesDialogOpen: false,
      selectedHighlightForNotes: null
    }));
  }, []);

  // Tags functionality
  const openGlobalTagsDialog = useCallback(() => {
    setState(prev => ({
      ...prev,
      isGlobalTagsDialogOpen: true
    }));
  }, []);

  const closeGlobalTagsDialog = useCallback(() => {
    setState(prev => ({
      ...prev,
      isGlobalTagsDialogOpen: false
    }));
  }, []);

  const openHighlightTagsDialog = useCallback((highlight: Highlight) => {
    setState(prev => ({
      ...prev,
      isHighlightTagsDialogOpen: true,
      selectedHighlightForTags: highlight
    }));
  }, []);

  const closeHighlightTagsDialog = useCallback(() => {
    setState(prev => ({
      ...prev,
      isHighlightTagsDialogOpen: false,
      selectedHighlightForTags: null
    }));
  }, []);

  const createTag = useCallback((name: string, color: string) => {
    const newTag: Tag = {
      id: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      color,
      createdAt: Date.now()
    };
    setState(prev => ({
      ...prev,
      tags: [...prev.tags, newTag]
    }));
  }, []);

  const updateTag = useCallback((tagId: string, name: string, color: string) => {
    setState(prev => ({
      ...prev,
      tags: prev.tags.map(tag => 
        tag.id === tagId ? { ...tag, name, color } : tag
      )
    }));
  }, []);

  const deleteTag = useCallback((tagId: string) => {
    setState(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag.id !== tagId),
      highlights: prev.highlights.map(highlight => ({
        ...highlight,
        tags: highlight.tags?.filter(id => id !== tagId) || []
      }))
    }));
  }, []);

  const assignTagToHighlight = useCallback((highlightId: string, tagId: string) => {
    setState(prev => ({
      ...prev,
      highlights: prev.highlights.map(highlight => 
        highlight.id === highlightId 
          ? { 
              ...highlight, 
              tags: [...(highlight.tags || []), tagId].filter((id, index, arr) => arr.indexOf(id) === index)
            }
          : highlight
      )
    }));
  }, []);

  const unassignTagFromHighlight = useCallback((highlightId: string, tagId: string) => {
    setState(prev => ({
      ...prev,
      highlights: prev.highlights.map(highlight => 
        highlight.id === highlightId 
          ? { 
              ...highlight, 
              tags: (highlight.tags || []).filter(id => id !== tagId)
            }
          : highlight
      )
    }));
  }, []);

  // Filter functionality
  const toggleTagFilter = useCallback((tagId: string) => {
    setState(prev => ({
      ...prev,
      filterByTags: prev.filterByTags.includes(tagId)
        ? prev.filterByTags.filter(id => id !== tagId)
        : [...prev.filterByTags, tagId]
    }));
  }, []);

  const setPageFilter = useCallback((page: number | null) => {
    setState(prev => ({
      ...prev,
      filterByPage: page
    }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      filterByTags: [],
      filterByPage: null
    }));
  }, []);

  // Get filtered highlights
  const filteredHighlights = useCallback(() => {
    let filtered = state.highlights;

    // Filter by tags
    if (state.filterByTags.length > 0) {
      filtered = filtered.filter(highlight => 
        highlight.tags && highlight.tags.some(tagId => state.filterByTags.includes(tagId))
      );
    }

    // Filter by page
    if (state.filterByPage !== null) {
      filtered = filtered.filter(highlight => highlight.pageNumber === state.filterByPage);
    }

    return filtered;
  }, [state.highlights, state.filterByTags, state.filterByPage]);

  // Get unique page numbers from highlights
  const getUniquePages = useCallback(() => {
    const pages = [...new Set(state.highlights.map(h => h.pageNumber))];
    return pages.sort((a, b) => a - b);
  }, [state.highlights]);


  return (
    <TooltipProvider>
      <div className="min-h-screen bg-cream">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">PDF Viewer</h1>
          <p className="text-gray-600">Upload and view PDF files with highlighting capabilities</p>
        </div>

        {/* Upload Section */}
        {!state.file && (
          <Card className="">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload PDF File
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Click to upload or drag and drop
                </p>
                <p className="text-gray-500">PDF files only</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main PDF Viewer */}
        {state.file && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* PDF Display Area */}
            <div className="lg:col-span-2">
              <Card className="overflow-hidden">
                {/* Toolbar */}
                <div className="bg-white border-b p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* Navigation Controls */}
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => goToPage(1)}
                            disabled={state.currentPage <= 1}
                          >
                            <ChevronsLeft className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Go to first page</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => goToPage(state.currentPage - 1)}
                            disabled={state.currentPage <= 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Previous page</p>
                        </TooltipContent>
                      </Tooltip>
                      
                      <form onSubmit={handlePageInputSubmit} className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          max={state.numPages}
                          value={pageInputValue}
                          onChange={handlePageInputChange}
                          className="w-10 text-center"
                        />
                        <span className="text-sm text-gray-500">of {state.numPages}</span>
                      </form>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => goToPage(state.currentPage + 1)}
                            disabled={state.currentPage >= state.numPages}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Next page</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => goToPage(state.numPages)}
                            disabled={state.currentPage >= state.numPages}
                          >
                            <ChevronsRight className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Go to last page</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Zoom Controls */}
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={zoomOut}
                          >
                            <ZoomOut className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Zoom out</p>
                        </TooltipContent>
                      </Tooltip>
                      <span className="text-sm font-medium px-2">
                        {Math.round(state.scale * 100)}%
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={zoomIn}
                          >
                            <ZoomIn className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Zoom in</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={fitToWidth}
                          >
                            <Maximize className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Fit to width</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={fitToPage}
                          >
                            <Move className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Fit to page</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={downloadPdf}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Download PDF file</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={printPdf}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Print PDF file</p>
                        </TooltipContent>
                      </Tooltip>
                      {/* <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Upload a new PDF file</p>
                        </TooltipContent>
                      </Tooltip> */}
                    </div>
                  </div>

                  {/* Highlighting Toolbar */}
                  <Separator className="my-4" />
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium">Highlight:</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {HIGHLIGHT_COLORS.map((color) => (
                        <Tooltip key={color.value}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setState(prev => ({ ...prev, selectedColor: color.value }))}
                              className={`w-8 h-8 rounded-full border-2 ${color.bg} ${
                                state.selectedColor === color.value 
                                  ? 'border-gray-800 ring-2 ring-gray-300' 
                                  : 'border-gray-300'
                              } hover:scale-110 transition-transform`}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Select {color.name} highlight color</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={state.isSelecting ? "default" : "outline"}
                          size="sm"
                          onClick={() => setState(prev => ({ ...prev, isSelecting: !prev.isSelecting }))}
                        >
                          {state.isSelecting ? 'Stop Highlighting' : 'Start Highlighting'}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{state.isSelecting ? 'Disable text highlighting mode' : 'Enable text highlighting mode'}</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    {state.isSelecting && (
                      <div className="flex items-center gap-2 ml-2">
                        <span className="text-sm text-gray-600">
                          Select text to highlight it
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* PDF Content */}
                <CardContent className="p-0">
                  <div 
                    ref={containerRef}
                    className="relative bg-gray-100 min-h-[600px] flex justify-center"
                  >
                    <div 
                      ref={pdfCanvasRef}
                      className={`relative ${state.isSelecting ? 'text-selectable' : ''}`}
                      style={{ 
                        cursor: state.isSelecting ? 'text' : 'default',
                        userSelect: state.isSelecting ? 'text' : 'none'
                      }}
                    >
                      <Document
                        file={state.file}
                        onLoadSuccess={onDocumentLoadSuccess}
                        loading={
                          <div className="flex items-center justify-center h-96">
                            <div className="text-gray-500">Loading PDF...</div>
                          </div>
                        }
                        error={
                          <div className="flex items-center justify-center h-96">
                            <div className="text-red-500">Failed to load PDF</div>
                          </div>
                        }
                      >
                        <Page
                          pageNumber={state.currentPage}
                          scale={state.scale}
                          renderTextLayer={true}
                          renderAnnotationLayer={false}
                          className="shadow-lg"
                        />
                      </Document>

                      {/* Highlight Overlays */}
                      {state.showHighlights && state.highlights
                        .filter(h => h.pageNumber === state.currentPage)
                        .map((highlight) => {
                          // Calculate scale ratio to adjust highlight coordinates
                          const scaleRatio = state.scale / highlight.baseScale;
                          
                          return (
                            <React.Fragment key={highlight.id}>
                              {highlight.rects.map((rect, index) => (
                                <div
                                  key={`${highlight.id}-${index}`}
                                  className="absolute pointer-events-none"
                                  style={{
                                    left: rect.left * scaleRatio,
                                    top: rect.top * scaleRatio,
                                    width: (rect.right - rect.left) * scaleRatio,
                                    height: (rect.bottom - rect.top) * scaleRatio,
                                    backgroundColor: highlight.color,
                                    opacity: 0.3,
                                    borderRadius: '2px',
                                    mixBlendMode: 'multiply'
                                  }}
                                />
                              ))}
                            </React.Fragment>
                          );
                        })
                      }
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Highlights Panel */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Highlights</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={openGlobalTagsDialog}
                        className="text-purple-600 hover:text-purple-700"
                      >
                        <Tags className="h-4 w-4 mr-1" />
                        Manage Tags
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Filter className="h-4 w-4 mr-1" />
                            Filters
                            <ChevronDown className="h-3 w-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Filter Options</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          
                          {/* Show/Hide Toggle */}
                          <DropdownMenuCheckboxItem
                            checked={state.showHighlights}
                            onCheckedChange={(checked) => setState(prev => ({ ...prev, showHighlights: checked }))}
                          >
                            Show Highlights
                          </DropdownMenuCheckboxItem>
                          
                          <DropdownMenuSeparator />
                          
                          {/* Tag Filters */}
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <Tags className="h-4 w-4 mr-2" />
                              Filter by Tags
                              {state.filterByTags.length > 0 && (
                                <Badge className="ml-auto text-xs">
                                  {state.filterByTags.length}
                                </Badge>
                              )}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {state.tags.length === 0 ? (
                                <DropdownMenuItem disabled>
                                  No tags available
                                </DropdownMenuItem>
                              ) : (
                                <>
                                  {state.tags.map((tag) => (
                                    <DropdownMenuCheckboxItem
                                      key={tag.id}
                                      checked={state.filterByTags.includes(tag.id)}
                                      onCheckedChange={() => toggleTagFilter(tag.id)}
                                    >
                                      <Badge
                                        variant="outline"
                                        style={{ 
                                          backgroundColor: tag.color + '15', 
                                          borderColor: tag.color,
                                          color: tag.color 
                                        }}
                                        className="text-xs font-medium"
                                      >
                                        {tag.name}
                                      </Badge>
                                    </DropdownMenuCheckboxItem>
                                  ))}
                                  {state.filterByTags.length > 0 && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => setState(prev => ({ ...prev, filterByTags: [] }))}>
                                        Clear tag filters
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </>
                              )}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          
                          {/* Page Filters */}
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <FileText className="h-4 w-4 mr-2" />
                              Filter by Page
                              {state.filterByPage !== null && (
                                <Badge variant="secondary" className="ml-auto text-xs">
                                  Page {state.filterByPage}
                                </Badge>
                              )}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuCheckboxItem
                                checked={state.filterByPage === null}
                                onCheckedChange={() => setPageFilter(null)}
                              >
                                All Pages
                              </DropdownMenuCheckboxItem>
                              <DropdownMenuSeparator />
                              {getUniquePages().map((page) => (
                                <DropdownMenuCheckboxItem
                                  key={page}
                                  checked={state.filterByPage === page}
                                  onCheckedChange={() => setPageFilter(page)}
                                >
                                  Page {page}
                                </DropdownMenuCheckboxItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          
                          {/* Clear All Filters */}
                          {(state.filterByTags.length > 0 || state.filterByPage !== null) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={clearAllFilters}>
                                Clear All Filters
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-96">
                    {state.highlights.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        No highlights yet. Click "Start Highlighting" and select text to create highlights!
                      </div>
                    ) : filteredHighlights().length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        No highlights match the current filters.
                        <br />
                        <Button 
                          variant="link" 
                          size="sm" 
                          onClick={clearAllFilters}
                          className="p-0 h-auto text-blue-600 hover:text-blue-700"
                        >
                          Clear filters
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2 p-2">
                        {filteredHighlights().map((highlight) => (
                          <div
                            key={highlight.id}
                            className="border rounded-lg p-3 hover:bg-gray-50"
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <Badge variant="outline" className="h-8">
                                Page {highlight.pageNumber}
                              </Badge>
                              <div className="flex gap-1">
                                {state.attachedNotes[highlight.id] && state.attachedNotes[highlight.id].length > 0 && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openNotesDialog(highlight);
                                        }}
                                        className="h-8 w-8 p-1 border hover:bg-green-50"
                                      >
                                        <FileText className="h-3 w-3 text-green-600" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>View Notes ({state.attachedNotes[highlight.id].length})</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openInterpreterSheet(highlight);
                                      }}
                                      className="h-8 w-8 p-1 border hover:bg-blue-50"
                                    >
                                      <MessageCircle className="h-3 w-3 text-blue-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Chat with AI about this highlight</p>
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openHighlightTagsDialog(highlight);
                                      }}
                                      className="h-8 w-8 p-1 border hover:bg-purple-50"
                                    >
                                      <Tags className="h-3 w-3 text-purple-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Assign tags to this highlight</p>
                                  </TooltipContent>
                                </Tooltip>
                                <Select
                                  value={highlight.color}
                                  onValueChange={(color) => changeHighlightColor(highlight.id, color)}
                                >
                                  <SelectTrigger className="w-14 h-4 p-1 border" size="sm">
                                    <div 
                                      className={`w-4 h-4 rounded-full border ${
                                        HIGHLIGHT_COLORS.find(c => c.value === highlight.color)?.bg || 'bg-gray-200'
                                      }`}
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {HIGHLIGHT_COLORS.map((color) => (
                                      <SelectItem key={color.value} value={color.value}>
                                        <div className="flex items-center gap-2">
                                          <div 
                                            className={`w-4 h-4 rounded-full border ${color.bg}`}
                                          />
                                          {color.name}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteHighlight(highlight.id);
                                  }}
                                  className="h-8 w-8 p-1 border"
                                >
                                  <Trash2 className="h-3 w-3 text-red-600" />
                                </Button>
                              </div>
                            </div>
                            
                            {/* Editable Title */}
                            {editingTitle === highlight.id ? (
                              <div className="flex items-center gap-2 mb-2">
                                <Input
                                  value={tempTitle}
                                  onChange={(e) => setTempTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      saveTitle(highlight.id);
                                    } else if (e.key === 'Escape') {
                                      cancelEditingTitle();
                                    }
                                  }}
                                  className="text-sm h-6"
                                  autoFocus
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => saveTitle(highlight.id)}
                                  className="h-6 w-6 p-0 text-green-500 hover:text-green-500"
                                >
                                  ✓
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={cancelEditingTitle}
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-500"
                                >
                                  ✕
                                </Button>
                              </div>
                            ) : (
                              <div 
                                className="flex items-center justify-between mb-2 cursor-pointer"
                                onClick={() => startEditingTitle(highlight.id, highlight.title)}
                              >
                                <h4 className="text-sm font-medium text-gray-900">
                                  {highlight.title}
                                </h4>
                                <span className="text-xs text-gray-400">Click to edit</span>
                              </div>
                            )}

                            <p 
                              className="text-sm text-gray-700 line-clamp-2 cursor-pointer"
                              onClick={() => goToHighlight(highlight)}
                            >
                              {highlight.text}
                            </p>
                            
                            {/* Display assigned tags */}
                            {highlight.tags && highlight.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {highlight.tags.map((tagId) => {
                                  const tag = state.tags.find(t => t.id === tagId);
                                  if (!tag) return null;
                                  return (
                                    <Badge
                                      key={tagId}
                                      variant="outline"
                                      style={{ 
                                        backgroundColor: tag.color + '15', 
                                        borderColor: tag.color,
                                        color: tag.color 
                                      }}
                                      className="text-xs px-1.5 py-0.5 font-medium"
                                    >
                                      {tag.name}
                                    </Badge>
                                  );
                                })}
                              </div>
                            )}
                            
                            <div className="text-xs text-gray-500 mt-1">
                              {highlight.rects.length} highlight area{highlight.rects.length > 1 ? 's' : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        
        {/* Hidden file input for re-upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
      </div>

      {/* AI Chat Sheet */}
      <Sheet open={state.isSheetOpen} onOpenChange={(open) => setState(prev => ({ ...prev, isSheetOpen: open }))}>
        <SheetContent side="right" className="!w-[1000px] w-3/4 sm:max-w-none">
          <SheetHeader>
            <SheetTitle>AI Interpreter</SheetTitle>
            <SheetDescription>
              Ask questions about the highlighted text: "{state.currentHighlight?.title}"
            </SheetDescription>
          </SheetHeader>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto space-y-4 p-4 pr-8 pb-24" style={{ maxHeight: 'calc(100vh - 150px)' }}>
            {state.messages.map((message) => (
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
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => attachAsNote(message)}
                              className="text-xs h-6 px-2 bg-white text-black border-gray-300 hover:bg-gray-50"
                            >
                              <Paperclip className="w-3 h-3 mr-1" />
                              Attach as Note
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Attach this response as a note to the current highlight</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      
                      {/* Regenerate button - only show for error responses */}
                      {message.isError && message.canRegenerate && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.preventDefault();
                                sendMessage(message.id);
                              }}
                              className="text-xs h-6 px-2 bg-white text-black border-gray-300 hover:bg-gray-50"
                              disabled={state.isLoading}
                            >
                              <RefreshCw className={`w-3 h-3 mr-1 ${state.isLoading ? 'animate-spin' : ''}`} />
                              Regenerate
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Regenerate Response</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {state.isLoading && (
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
                value={state.currentMessage}
                onChange={(e) => setState(prev => ({ ...prev, currentMessage: e.target.value }))}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question about the highlighted text..."
                className="flex-1"
                disabled={state.isLoading}
              />
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                disabled={state.isLoading || !state.currentMessage.trim()}
              >
                Send
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Notes Dialog */}
      <Dialog open={state.isNotesDialogOpen} onOpenChange={closeNotesDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Notes for "{state.selectedHighlightForNotes?.title}"</DialogTitle>
            {/* <DialogDescription>
              Notes attached to: "{state.selectedHighlightForNotes?.title}"
            </DialogDescription> */}
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {state.selectedHighlightForNotes && 
               state.attachedNotes[state.selectedHighlightForNotes.id] && 
               state.attachedNotes[state.selectedHighlightForNotes.id].length > 0 ? (
                state.attachedNotes[state.selectedHighlightForNotes.id].map((note, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-cream">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="text-xs">
                        Note {index + 1}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {note.timestamp.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          code: ({ children }) => <code className="bg-gray-200 px-1 py-0.5 rounded text-xs">{children}</code>,
                          pre: ({ children }) => <pre className="bg-gray-200 p-2 rounded text-xs overflow-x-auto mb-2">{children}</pre>,
                          ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                          li: ({ children }) => <li>{children}</li>,
                          h1: ({ children }) => <h1 className="text-base font-bold mb-2">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-sm font-bold mb-2">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-xs font-bold mb-1">{children}</h3>,
                          blockquote: ({ children }) => <blockquote className="border-l-2 border-gray-400 pl-4 italic mb-2">{children}</blockquote>,
                        }}
                      >
                        {note.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No notes attached to this highlight yet.
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Global Tags Management Dialog */}
      <GlobalTagsDialog
        isOpen={state.isGlobalTagsDialogOpen}
        onClose={closeGlobalTagsDialog}
        tags={state.tags}
        onCreateTag={createTag}
        onUpdateTag={updateTag}
        onDeleteTag={deleteTag}
      />

      {/* Highlight Tags Assignment Dialog */}
      <HighlightTagsDialog
        isOpen={state.isHighlightTagsDialogOpen}
        onClose={closeHighlightTagsDialog}
        highlightId={state.selectedHighlightForTags?.id || null}
        highlightTitle={state.selectedHighlightForTags?.title || null}
        tags={state.tags}
        highlightTags={state.selectedHighlightForTags?.tags || []}
        onAssignTag={assignTagToHighlight}
        onUnassignTag={unassignTagFromHighlight}
      />
    </TooltipProvider>
  );
};

export default PdfViewer;
