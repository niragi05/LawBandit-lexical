import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

interface HighlightTagsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  highlightId: string | null;
  highlightTitle: string | null;
  tags: Tag[];
  highlightTags: string[]; // Array of tag IDs associated with the highlight
  onAssignTag: (highlightId: string, tagId: string) => void;
  onUnassignTag: (highlightId: string, tagId: string) => void;
}

export const HighlightTagsDialog: React.FC<HighlightTagsDialogProps> = ({
  isOpen,
  onClose,
  highlightId,
  highlightTitle,
  tags,
  highlightTags,
  onAssignTag,
  onUnassignTag,
}) => {
  const handleToggleTag = useCallback((tagId: string) => {
    if (!highlightId) return;

    if (highlightTags.includes(tagId)) {
      onUnassignTag(highlightId, tagId);
    } else {
      onAssignTag(highlightId, tagId);
    }
  }, [highlightId, highlightTags, onAssignTag, onUnassignTag]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[70vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Assign Tags</DialogTitle>
          <DialogDescription>
            {highlightTitle ? `Select tags for: "${highlightTitle}"` : 'Select tags to assign to this highlight'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Available Tags Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Available Tags ({tags.length})</h3>
            {tags.length === 0 ? (
              <div className="text-center text-gray-500 py-8 border rounded-lg">
                <p>No tags available.</p>
                <p className="text-xs mt-1">Create tags using the "Manage Tags" button in the highlights panel.</p>
              </div>
            ) : (
              <ScrollArea className="h-48 border rounded-lg p-3">
                <div className="space-y-2">
                  {tags.map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`tag-${tag.id}`}
                          checked={highlightTags.includes(tag.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleTag(tag.id);
                          }}
                          className="rounded cursor-pointer"
                        />
                        <label 
                          htmlFor={`tag-${tag.id}`}
                          className="cursor-pointer flex-1"
                        >
                          <Badge
                            variant="outline"
                            style={{ 
                              backgroundColor: tag.color + '20', 
                              borderColor: tag.color,
                              color: tag.color 
                            }}
                            className="font-medium"
                          >
                            {tag.name}
                          </Badge>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Assigned Tags for Current Highlight */}
          {highlightId && highlightTags.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Assigned Tags ({highlightTags.length})</h3>
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
                {highlightTags.map((tagId) => {
                  const tag = tags.find(t => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <Badge
                      key={tagId}
                      style={{ 
                        backgroundColor: tag.color + '20', 
                        borderColor: tag.color,
                        color: tag.color 
                      }}
                      className="font-medium"
                    >
                      {tag.name}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HighlightTagsDialog;
