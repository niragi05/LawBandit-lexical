import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Trash2, Plus, Edit2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { HIGHLIGHT_COLORS } from '@/lib/colors';

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

interface GlobalTagsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tags: Tag[];
  onCreateTag: (name: string, color: string) => void;
  onUpdateTag: (tagId: string, name: string, color: string) => void;
  onDeleteTag: (tagId: string) => void;
}

export const GlobalTagsDialog: React.FC<GlobalTagsDialogProps> = ({
  isOpen,
  onClose,
  tags,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
}) => {
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(HIGHLIGHT_COLORS[0].value);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState('');
  const [editingTagColor, setEditingTagColor] = useState('');

  const handleCreateTag = useCallback(() => {
    if (!newTagName.trim()) {
      toast.error('Please enter a tag name');
      return;
    }

    if (tags.some(tag => tag.name.toLowerCase() === newTagName.trim().toLowerCase())) {
      toast.error('A tag with this name already exists');
      return;
    }

    onCreateTag(newTagName.trim(), newTagColor);
    setNewTagName('');
    setNewTagColor(HIGHLIGHT_COLORS[0].value);
    toast.success('Tag created successfully');
  }, [newTagName, newTagColor, tags, onCreateTag]);

  const handleUpdateTag = useCallback((tagId: string) => {
    if (!editingTagName.trim()) {
      toast.error('Please enter a tag name');
      return;
    }

    if (tags.some(tag => tag.id !== tagId && tag.name.toLowerCase() === editingTagName.trim().toLowerCase())) {
      toast.error('A tag with this name already exists');
      return;
    }

    onUpdateTag(tagId, editingTagName.trim(), editingTagColor);
    setEditingTagId(null);
    setEditingTagName('');
    setEditingTagColor('');
    toast.success('Tag updated successfully');
  }, [editingTagName, editingTagColor, tags, onUpdateTag]);

  const handleDeleteTag = useCallback((tagId: string) => {
    onDeleteTag(tagId);
    toast.success('Tag deleted successfully');
  }, [onDeleteTag]);

  const startEditingTag = useCallback((tag: Tag) => {
    setEditingTagId(tag.id);
    setEditingTagName(tag.name);
    setEditingTagColor(tag.color);
  }, []);

  const cancelEditingTag = useCallback(() => {
    setEditingTagId(null);
    setEditingTagName('');
    setEditingTagColor('');
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Manage All Tags</DialogTitle>
          <DialogDescription>
            Create, update, and delete tags that can be assigned to highlights
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create New Tag Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Create New Tag</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Enter tag name..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateTag();
                  }
                }}
                className="flex-1 h-8"
              />
              <Button onClick={handleCreateTag} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Create
              </Button>
            </div>
            <div className="flex gap-1">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setNewTagColor(color.value)}
                  className={`w-8 h-8 rounded-full ${color.bg} border-2 ${
                    newTagColor === color.value ? 'border-gray-800 ring-2 ring-gray-300' : 'border-gray-300'
                  } hover:scale-110 transition-transform`}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Existing Tags Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">All Tags ({tags.length})</h3>
            <ScrollArea className="h-64 border rounded-lg p-2">
              {tags.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No tags created yet. Create your first tag above!
                </div>
              ) : (
                <div className="space-y-2">
                  {tags.map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        {editingTagId === tag.id ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              value={editingTagName}
                              onChange={(e) => setEditingTagName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleUpdateTag(tag.id);
                                } else if (e.key === 'Escape') {
                                  cancelEditingTag();
                                }
                              }}
                              className="h-8 text-sm"
                              autoFocus
                            />
                            <Select
                              value={editingTagColor}
                              onValueChange={setEditingTagColor}
                            >
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue>
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className={`w-4 h-4 rounded-full border ${
                                        HIGHLIGHT_COLORS.find(c => c.value === editingTagColor)?.bg || 'bg-gray-200'
                                      }`}
                                    />
                                    <span className="text-sm">
                                      {HIGHLIGHT_COLORS.find(c => c.value === editingTagColor)?.name || 'Color'}
                                    </span>
                                  </div>
                                </SelectValue>
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
                          </div>
                        ) : (
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
                        )}
                      </div>

                      <div className="flex gap-1">
                        {editingTagId === tag.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdateTag(tag.id)}
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEditingTag}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditingTag(tag)}
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTag(tag.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalTagsDialog;
