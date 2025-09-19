import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { extractAssignments, type AssignmentData } from '@/lib/api';
import { toast } from 'sonner';

interface SyllabusUploadProps {
  onProcessingStart?: () => void;
  onProcessingEnd?: () => void;
  onResult?: (result: AssignmentData[]) => void;
}

export const SyllabusUpload: React.FC<SyllabusUploadProps> = ({
  onProcessingStart,
  onProcessingEnd,
  onResult
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<AssignmentData[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
        toast.success(`File "${file.name}" selected successfully!`);
      } else {
        toast.error('Please select a PDF file only.');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
        toast.success(`File "${file.name}" selected successfully!`);
      } else {
        toast.error('Please select a PDF file only.');
      }
    }
  };

  const processFile = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    onProcessingStart?.();

    try {
      toast.loading('Processing syllabus...', { id: 'processing' });

      // Send file directly to DeepSeek for processing
      const response = await extractAssignments(selectedFile);

      if (response.success && response.data) {
        // Ensure data is an array
        if (Array.isArray(response.data)) {
          console.log('Assignment extraction result:', response.data);
          setResult(response.data);
          onResult?.(response.data);
          toast.success(`Successfully extracted ${response.data.length} assignments!`, { id: 'processing' });
        } else {
          console.error('Invalid response format:', response.data);
          console.error('Response type:', typeof response.data);
          toast.error('Invalid response format from server', { id: 'processing' });
        }
      } else {
        console.error('API response error:', response.error);
        toast.error(response.error || 'Failed to process syllabus', { id: 'processing' });
      }
    } catch (err) {
      console.error('File processing error:', err);
      toast.error('Failed to process the PDF file. Please try again.', { id: 'processing' });
    } finally {
      setIsProcessing(false);
      onProcessingEnd?.();
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Syllabus</CardTitle>
          <CardDescription>
            Upload your course syllabus PDF to extract assignments and create your study calendar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />

            {selectedFile ? (
              <div className="space-y-2">
                <div className="text-green-600 text-2xl">📄</div>
                <p className="text-sm text-gray-600">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={processFile} disabled={isProcessing}>
                    {isProcessing ? 'Processing...' : 'Process Syllabus'}
                  </Button>
                  <Button variant="outline" onClick={clearFile}>
                    Clear
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-gray-400 text-4xl">📎</div>
                <div>
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Click to upload
                  </label>
                  <span className="text-gray-600"> or drag and drop</span>
                </div>
                <p className="text-sm text-gray-500">PDF files only</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
