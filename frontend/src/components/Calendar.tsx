import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { type AssignmentData } from '@/lib/api';

interface CalendarProps {
  assignments: AssignmentData[];
  onDateSelect?: (date: Date) => void;
}

type ViewMode = 'month' | 'week' | 'day';

export const Calendar: React.FC<CalendarProps> = ({ assignments, onDateSelect }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  // Group assignments by date for quick lookup, handling date ranges
  const assignmentsByDate = useMemo(() => {
    const grouped: Record<string, AssignmentData> = {};
    assignments.forEach(assignment => {
      if (assignment.startDate) {
        const startDate = new Date(assignment.startDate);
        const endDate = assignment.endDate ? new Date(assignment.endDate) : startDate;

        // Create a copy of the assignment for each day in the range
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          const dateKey = currentDate.toISOString().split('T')[0];
          if (!grouped[dateKey]) {
            grouped[dateKey] = {
              ...assignment,
              startDate: dateKey,
              endDate: dateKey === assignment.startDate && assignment.endDate ? assignment.endDate : null
            };
          } else {
            // If date already exists, add assignments to existing entry
            if (!grouped[dateKey].assignments.some(a => a.title === assignment.assignments[0]?.title)) {
              grouped[dateKey].assignments.push(...assignment.assignments);
            }
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
    });
    return grouped;
  }, [assignments]);

  // Get assignments for a specific date
  const getAssignmentsForDate = (date: Date): AssignmentData | null => {
    const dateString = date.toISOString().split('T')[0];
    return assignmentsByDate[dateString] || null;
  };

  // Handle date selection - switch to day view
  const handleDateSelect = (date: Date) => {
    setCurrentDate(date);
    setViewMode('day');
    onDateSelect?.(date);
  };

  // Navigation functions
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      if (direction === 'prev') {
        newDate.setDate(newDate.getDate() - 7);
      } else {
        newDate.setDate(newDate.getDate() + 7);
      }
      return newDate;
    });
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      if (direction === 'prev') {
        newDate.setDate(newDate.getDate() - 1);
      } else {
        newDate.setDate(newDate.getDate() + 1);
      }
      return newDate;
    });
  };

  // Render month view
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Get first day of month and last day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay())); // End on Saturday

    const days = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return (
      <div className="grid grid-cols-7 gap-1 p-4">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center font-semibold text-gray-600">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {days.map((day, index) => {
          const isCurrentMonth = day.getMonth() === month;
          const isToday = day.toDateString() === new Date().toDateString();
          const dayAssignments = getAssignmentsForDate(day);

          return (
            <div
              key={index}
              className={`min-h-[100px] p-2 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                isCurrentMonth ? 'bg-color-cream' : 'bg-gray-50 text-gray-400'
              } ${isToday ? 'ring-2 ring-color-black' : ''}`}
              onClick={() => handleDateSelect(day)}
            >
              <div className="text-sm font-medium mb-1">{day.getDate()}</div>
              {dayAssignments && (
                <div className="space-y-1">
                  {dayAssignments.assignments.slice(0, 2).map((assignment, idx) => (
                    <div
                      key={idx}
                      className={`text-xs p-1 rounded ${
                        assignment.tag === 'read' ? 'bg-blue-100 text-blue-800' :
                        assignment.tag === 'write' ? 'bg-green-100 text-green-800' :
                        assignment.tag === 'oral' ? 'bg-purple-100 text-purple-800' :
                        assignment.tag === 'evaluation' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <div className="truncate font-medium">{assignment.title}</div>
                      {/* {dayAssignments.location && (
                        <div className="text-xs opacity-75 truncate">📍 {dayAssignments.location}</div>
                      )} */}
                    </div>
                  ))}
                  {dayAssignments.assignments.length > 2 && (
                    <div className="text-xs text-gray-500">
                      +{dayAssignments.assignments.length - 2} more
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Render week view
  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDays.push(day);
    }

    return (
      <div className="p-4">
        {/* Week Header */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {weekDays.map((day, index) => {
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <div
                key={`header-${index}`}
                className={`text-center p-3 font-semibold text-sm ${
                  isToday
                    ? 'bg-color-black text-cream rounded-lg'
                    : 'bg-gray-100 text-gray-700 rounded-lg'
                }`}
              >
                <div className="text-xs uppercase tracking-wide">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={`text-lg font-bold ${isToday ? 'text-white' : 'text-gray-900'}`}>
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Week Content - Column Layout */}
        <div className="grid grid-cols-7 gap-2 min-h-[500px]">
          {weekDays.map((day, index) => {
            const dayAssignments = getAssignmentsForDate(day);
            const isToday = day.toDateString() === new Date().toDateString();

            return (
              <div
                key={index}
                className={`bg-color-cream rounded-lg border-2 p-3 min-h-[400px] cursor-pointer transition-all hover:shadow-md ${
                  isToday ? 'border-color-black' : 'border-gray-200'
                }`}
                onClick={() => handleDateSelect(day)}
              >
                {/* Day content */}
                <div className="h-full flex flex-col">
                  {dayAssignments && dayAssignments.assignments.length > 0 ? (
                    <div className="space-y-2 flex-1">
                      {dayAssignments.assignments.map((assignment, idx) => (
                        <div
                          key={idx}
                          className={`p-2 rounded text-xs border ${
                            assignment.tag === 'read' ? 'bg-blue-50 border-blue-200 text-blue-800' :
                            assignment.tag === 'write' ? 'bg-green-50 border-green-200 text-green-800' :
                            assignment.tag === 'oral' ? 'bg-purple-50 border-purple-200 text-purple-800' :
                            assignment.tag === 'evaluation' ? 'bg-orange-50 border-orange-200 text-orange-800' :
                            'bg-gray-50 border-gray-200 text-gray-800'
                          }`}
                        >
                          <div className="font-medium truncate" title={assignment.title}>
                            {assignment.title}
                          </div>
                          {dayAssignments.location && (
                            <div className="text-xs opacity-75 truncate mt-1">📍 {dayAssignments.location}</div>
                          )}
                          <div className={`text-xs mt-1 px-1 py-0.5 rounded-full inline-block font-medium ${
                            assignment.tag === 'read' ? 'bg-blue-100 text-blue-700' :
                            assignment.tag === 'write' ? 'bg-green-100 text-green-700' :
                            assignment.tag === 'oral' ? 'bg-purple-100 text-purple-700' :
                            assignment.tag === 'evaluation' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {assignment.tag}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-gray-400 text-sm text-center">No assignments</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render day view
  const renderDayView = () => {
    const dayAssignments = getAssignmentsForDate(currentDate);

    return (
      <div className="p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold">
            {currentDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </h2>
        </div>

        {dayAssignments ? (
          <div className="space-y-4">
            {dayAssignments.assignments.map((assignment, idx) => (
              <Card key={idx} className="p-4">
                <div className="flex items-start space-x-4">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                    assignment.tag === 'read' ? 'bg-blue-100' :
                    assignment.tag === 'write' ? 'bg-green-100' :
                    assignment.tag === 'oral' ? 'bg-purple-100' :
                    assignment.tag === 'evaluation' ? 'bg-orange-100' :
                    'bg-gray-100'
                  }`}>
                    <span className={`text-lg ${
                      assignment.tag === 'read' ? 'text-blue-600' :
                      assignment.tag === 'write' ? 'text-green-600' :
                      assignment.tag === 'oral' ? 'text-purple-600' :
                      assignment.tag === 'evaluation' ? 'text-orange-600' :
                      'text-gray-600'
                    }`}>
                      {assignment.tag === 'read' ? '📖' :
                       assignment.tag === 'write' ? '✍️' :
                       assignment.tag === 'oral' ? '🎤' :
                       assignment.tag === 'evaluation' ? '📊' :
                       '📝'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{assignment.title}</h3>
                    <div className="space-y-2">
                      {dayAssignments.location && (
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="mr-2">📍</span>
                          <span>{dayAssignments.location}</span>
                        </div>
                      )}
                      {dayAssignments.startTime && (
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="mr-2">🕐</span>
                          <span>{dayAssignments.startTime}</span>
                          {dayAssignments.endTime && <span> - {dayAssignments.endTime}</span>}
                        </div>
                      )}
                      <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                        assignment.tag === 'read' ? 'bg-blue-100 text-blue-800' :
                        assignment.tag === 'write' ? 'bg-green-100 text-green-800' :
                        assignment.tag === 'oral' ? 'bg-purple-100 text-purple-800' :
                        assignment.tag === 'evaluation' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {assignment.tag.charAt(0).toUpperCase() + assignment.tag.slice(1)}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Assignments</h3>
            <p className="text-gray-500">No assignments are scheduled for this day.</p>
          </Card>
        )}
      </div>
    );
  };

  // Navigation function based on view mode
  const navigate = (direction: 'prev' | 'next') => {
    switch (viewMode) {
      case 'month':
        navigateMonth(direction);
        break;
      case 'week':
        navigateWeek(direction);
        break;
      case 'day':
        navigateDay(direction);
        break;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-color-black text-color-cream p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <CalendarIcon className="h-8 w-8 text-cream" />
            <div>
              <h1 className="text-2xl font-bold text-cream">LexiCal Assignments</h1>
              <p className="text-blue-100">
                {currentDate.toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('prev')}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              Today
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('next')}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex space-x-1 mt-4">
          {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
            <Button
              key={mode}
              variant={viewMode === mode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode(mode)}
              className={`capitalize ${
                viewMode === mode
                  ? 'bg-white text-blue-600'
                  : 'bg-white/10 text-white border-white/30 hover:bg-white/20'
              }`}
            >
              {mode}
            </Button>
          ))}
        </div>
      </div>

      {/* Calendar Content */}
      <div className="min-h-[600px]">
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
      </div>
    </div>
  );
};
