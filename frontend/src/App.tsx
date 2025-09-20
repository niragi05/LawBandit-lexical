import { useState } from "react";
import { SyllabusUpload } from "@/components/SyllabusUpload";
import { Calendar } from "@/components/Calendar";
import { type AssignmentData } from "@/lib/api";

function App() {
  const [assignments, setAssignments] = useState<AssignmentData[]>([]);

  const handleAssignmentResult = (result: AssignmentData[]) => {
    console.log('Assignment extraction result:', result);
    setAssignments(result);
  };

  return (
    <>
      {/* Main Content - Two Column Layout */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-200px)]">
          {/* Left Column - Upload Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 h-full">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-black mb-2">Upload Syllabus</h2>
                <p className="text-gray-600 text-sm">
                  Upload your course syllabus PDF and we'll extract all assignments, readings, and deadlines
                </p>
              </div>

              <SyllabusUpload
                onResult={handleAssignmentResult}
              />
            </div>
          </div>

          {/* Right Column - Calendar Section */}
          <div className="lg:col-span-2">
            <Calendar
              assignments={assignments}
              onDateSelect={(date) => console.log('Selected date:', date)}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default App