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
  const [error, setError] = useState<string | null>(null);
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
        setError(null); // Clear previous errors
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
        setError(null); // Clear previous errors
        toast.success(`File "${file.name}" selected successfully!`);
      } else {
        toast.error('Please select a PDF file only.');
      }
    }
  };

  const processFile = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null); // Clear previous errors
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
          setError(null); // Clear any previous errors
          toast.success(`Successfully extracted ${response.data.length} assignments!`, { id: 'processing' });
        } else {
          console.error('Invalid response format:', response.data);
          console.error('Response type:', typeof response.data);
          const errorMsg = 'Invalid response format from server';
          setError(errorMsg);
          toast.error(errorMsg, { id: 'processing' });
        }
      } else {
        console.error('API response error:', response.error);
        const errorMsg = response.error || 'Failed to process syllabus';
        setError(errorMsg);
        toast.error(errorMsg, { id: 'processing' });
      }
    } catch (err: any) {
      console.error('File processing error:', err);
      const errorMsg = err.message || 'Failed to process the PDF file. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg, { id: 'processing' });
    } finally {
      setIsProcessing(false);
      onProcessingEnd?.();
    }
  };

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
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
            } ${!selectedFile ? 'cursor-pointer' : 'cursor-default'}`}
            onDragEnter={!selectedFile ? handleDrag : undefined}
            onDragLeave={!selectedFile ? handleDrag : undefined}
            onDragOver={!selectedFile ? handleDrag : undefined}
            onDrop={!selectedFile ? handleDrop : undefined}
            onClick={!selectedFile ? handleClick : undefined}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />

            {selectedFile ? (
              <div className="space-y-2">
                <div className="text-green-600 text-2xl">📄</div>
                <p className="text-sm text-gray-600">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <div className="flex gap-2 justify-center">
                  <Button 
                    onClick={processFile} 
                    disabled={isProcessing}
                    className="bg-white hover:bg-green-50 text-green-600 border-green-500 hover:border-green-600 border-2 cursor-pointer disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
                    variant="outline"
                  >
                    {isProcessing ? 'Processing...' : 'Process Syllabus'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={clearFile}
                    className="bg-white hover:bg-red-50 text-red-600 border-red-500 hover:border-red-600 border-2 cursor-pointer disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-gray-400 text-4xl">📎</div>
                <div>
                  <span className="text-blue-600 hover:text-blue-800 font-medium">
                    Click to upload
                  </span>
                  <span className="text-gray-600"> or drag and drop</span>
                </div>
                <p className="text-sm text-gray-500">PDF files only</p>
              </div>
            )}
          </div>
          
          {/* Error Display */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="text-red-500 text-lg">⚠️</div>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700 font-medium">Error processing file</p>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignment Type Legend - Only show after successful processing */}
      {result && result.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-lg">Assignment Types Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 border border-blue-200">
                <div className="w-2 h-2 rounded bg-blue-300 flex-shrink-0"></div>
                <div>
                  <div className="text-xs font-medium text-blue-800">Reading</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 border border-green-200">
                <div className="w-2 h-2 rounded bg-green-300 flex-shrink-0"></div>
                <div>
                  <div className="text-xs font-medium text-green-800">Writing</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-50 border border-purple-200">
                <div className="w-2 h-2 rounded bg-purple-300 flex-shrink-0"></div>
                <div>
                  <div className="text-xs font-medium text-purple-800">Oral</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-50 border border-orange-200">
                <div className="w-2 h-2 rounded bg-orange-300 flex-shrink-0"></div>
                <div>
                  <div className="text-xs font-medium text-orange-800">Evaluation</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200">
                <div className="w-2 h-2 rounded bg-gray-300 flex-shrink-0"></div>
                <div>
                  <div className="text-xs font-medium text-gray-800">Other</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
