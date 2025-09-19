// Unified color system for the application
export interface ColorOption {
  name: string;
  value: string;
  bg: string; // Tailwind background class for lighter version
  text: string; // Text color for contrast
}

export const UNIFIED_COLORS: ColorOption[] = [
  { 
    name: 'Blue', 
    value: '#3B82F6', 
    bg: 'bg-blue-500', 
    text: 'text-white' 
  },
  { 
    name: 'Green', 
    value: '#10B981', 
    bg: 'bg-green-500', 
    text: 'text-white' 
  },
  { 
    name: 'Purple', 
    value: '#8B5CF6', 
    bg: 'bg-purple-500', 
    text: 'text-white' 
  },
  { 
    name: 'Red', 
    value: '#EF4444', 
    bg: 'bg-red-500', 
    text: 'text-white' 
  },
  { 
    name: 'Orange', 
    value: '#F97316', 
    bg: 'bg-orange-500', 
    text: 'text-white' 
  },
  { 
    name: 'Pink', 
    value: '#EC4899', 
    bg: 'bg-pink-500', 
    text: 'text-white' 
  },
  { 
    name: 'Yellow', 
    value: '#EAB308', 
    bg: 'bg-yellow-500', 
    text: 'text-black' 
  },
  { 
    name: 'Gray', 
    value: '#6B7280', 
    bg: 'bg-gray-500', 
    text: 'text-white' 
  },
];

// For highlight overlays (lighter versions with opacity)
export const HIGHLIGHT_COLORS = UNIFIED_COLORS.map(color => ({
  ...color,
  // Use lighter versions for highlights
  value: color.value === '#EAB308' ? '#FBBF24' : // Yellow highlight
          color.value === '#3B82F6' ? '#60A5FA' : // Blue highlight  
          color.value === '#10B981' ? '#34D399' : // Green highlight
          color.value === '#8B5CF6' ? '#A78BFA' : // Purple highlight
          color.value === '#EF4444' ? '#F87171' : // Red highlight
          color.value === '#F97316' ? '#FB923C' : // Orange highlight
          color.value === '#EC4899' ? '#F472B6' : // Pink highlight
          '#9CA3AF', // Gray highlight
  bg: color.value === '#EAB308' ? 'bg-yellow-200' :
      color.value === '#3B82F6' ? 'bg-blue-200' :
      color.value === '#10B981' ? 'bg-green-200' :
      color.value === '#8B5CF6' ? 'bg-purple-200' :
      color.value === '#EF4444' ? 'bg-red-200' :
      color.value === '#F97316' ? 'bg-orange-200' :
      color.value === '#EC4899' ? 'bg-pink-200' :
      'bg-gray-200'
}));

export default UNIFIED_COLORS;
