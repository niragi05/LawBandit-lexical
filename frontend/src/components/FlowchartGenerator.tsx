import React, { useState, useCallback } from 'react';
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react';
import dagre from 'dagre';
import { generateFlowchart, refineFlowchart, type FlowchartData, type FlowchartNode as ApiFlowchartNode } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Download, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import '@xyflow/react/dist/style.css';

// Custom node components
const StartEndNode = ({ data, type }: { data: any; type: string }) => (
  <div className="px-4 py-2 shadow-md rounded-full bg-green-500 text-white border-2 border-green-600 min-w-[120px] text-center">
    {type === 'start' && <Handle type="source" position={Position.Bottom} />}
    {type === 'end' && <Handle type="target" position={Position.Top} />}
    <div className="font-medium text-sm">{data.label}</div>
  </div>
);

const ProcessNode = ({ data }: { data: any }) => (
  <div className="px-4 py-2 shadow-md rounded-lg bg-blue-500 text-white border-2 border-blue-600 min-w-[150px] text-center">
    <Handle type="target" position={Position.Top} />
    <Handle type="source" position={Position.Bottom} />
    <div className="font-medium text-sm">{data.label}</div>
  </div>
);

const DecisionNode = ({ data }: { data: any }) => (
  <div className="px-4 py-2 shadow-md bg-yellow-500 text-white border-2 border-yellow-600 min-w-[120px] text-center" 
       style={{
         clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
         width: '120px',
         height: '80px',
         display: 'flex',
         alignItems: 'center',
         justifyContent: 'center'
       }}>
    <Handle type="target" position={Position.Top} />
    <Handle type="source" position={Position.Bottom} />
    <Handle type="source" position={Position.Right} id="yes" />
    <Handle type="source" position={Position.Left} id="no" />
    <div className="font-medium text-sm text-center">{data.label}</div>
  </div>
);

const InputOutputNode = ({ data }: { data: any }) => (
  <div className="px-4 py-2 shadow-md bg-purple-500 text-white border-2 border-purple-600 min-w-[140px] text-center" 
       style={{
         clipPath: 'polygon(20% 0%, 100% 0%, 80% 100%, 0% 100%)',
         width: '140px',
         height: '50px',
         display: 'flex',
         alignItems: 'center',
         justifyContent: 'center'
       }}>
    <Handle type="target" position={Position.Top} />
    <Handle type="source" position={Position.Bottom} />
    <div className="font-medium text-sm text-center">{data.label}</div>
  </div>
);

const nodeTypes: NodeTypes = {
  start: StartEndNode,
  end: StartEndNode,
  process: ProcessNode,
  decision: DecisionNode,
  input: InputOutputNode,
  output: InputOutputNode,
};

const edgeTypes: EdgeTypes = {};

// Get dimensions for each node type
const getNodeDimensions = (nodeType: string) => {
  switch (nodeType) {
    case 'start':
    case 'end':
      return { width: 130, height: 60 }; // min-width 120px + padding
    case 'process':
      return { width: 160, height: 60 }; // min-width 150px + padding
    case 'decision':
      return { width: 140, height: 100 }; // fixed 120px + padding, 80px + padding
    case 'input':
    case 'output':
      return { width: 160, height: 70 }; // fixed 140px + padding, 50px + padding
    default:
      return { width: 160, height: 60 };
  }
};

// Layout function using dagre
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  // @ts-ignore - dagre types are not properly defined
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Configure dagre with better spacing
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 80,  // Increased horizontal spacing between nodes
    ranksep: 100, // Increased vertical spacing between ranks
    edgesep: 50,  // Spacing between edges
    marginx: 20,  // Horizontal margin
    marginy: 20,  // Vertical margin
  } as any);

  nodes.forEach((node) => {
    const dimensions = getNodeDimensions(node.type || '');
    dagreGraph.setNode(node.id, {
      width: dimensions.width,
      height: dimensions.height
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // @ts-ignore - dagre types are not properly defined
  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const dimensions = getNodeDimensions(node.type || '');

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - dimensions.width / 2,
        y: nodeWithPosition.y - dimensions.height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

export const FlowchartGenerator: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [prompt, setPrompt] = useState('');
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [currentFlowchart, setCurrentFlowchart] = useState<FlowchartData | null>(null);
  const [flowchartTitle, setFlowchartTitle] = useState('');
  const [flowchartDescription, setFlowchartDescription] = useState('');

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const convertApiNodesToReactFlow = useCallback((apiNodes: ApiFlowchartNode[]): Node[] => {
    return apiNodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: { x: node.x || 0, y: node.y || 0 },
      data: { label: node.label, type: node.type },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    }));
  }, []);

  const convertApiEdgesToReactFlow = useCallback((apiEdges: any[]): Edge[] => {
    return apiEdges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label || '',
      type: 'smoothstep',
      style: {
        stroke: '#3b82f6',
        strokeWidth: 2,
      },
      markerEnd: {
        type: 'arrowclosed',
        color: '#3b82f6',
      },
    }));
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a description for your flowchart');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateFlowchart(prompt);
      
      if (result.success && result.data) {
        const reactFlowNodes = convertApiNodesToReactFlow(result.data.nodes);
        const reactFlowEdges = convertApiEdgesToReactFlow(result.data.edges);
        
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
          reactFlowNodes,
          reactFlowEdges
        );
        
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
        setCurrentFlowchart(result.data);
        setFlowchartTitle(result.data.title);
        setFlowchartDescription(result.data.description);
        
        toast.success('Flowchart generated successfully!');
      } else {
        // Provide specific error messages for rate limiting
        const errorMessage = result.error || 'Failed to generate flowchart';
        if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
          toast.error('API rate limit exceeded. Please wait a moment before trying again.', {
            duration: 5000,
          });
        } else if (errorMessage.includes('temporarily unavailable')) {
          toast.error('AI service is temporarily unavailable. Please try again in a few minutes.', {
            duration: 5000,
          });
        } else {
          toast.error(errorMessage);
        }
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      
      // Handle network or other errors
      if (error?.response?.status === 429) {
        toast.error('Too many requests. Please wait a moment before trying again.', {
          duration: 5000,
        });
      } else if (error?.message?.includes('rate limit')) {
        toast.error('API rate limit exceeded. Please wait a moment before trying again.', {
          duration: 5000,
        });
      } else {
        toast.error('Failed to generate flowchart. Please check your connection and try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async () => {
    if (!currentFlowchart || !refinementPrompt.trim()) {
      toast.error('Please enter your refinement request');
      return;
    }

    setIsRefining(true);
    try {
      const result = await refineFlowchart(currentFlowchart, refinementPrompt);
      
      if (result.success && result.data) {
        const reactFlowNodes = convertApiNodesToReactFlow(result.data.nodes);
        const reactFlowEdges = convertApiEdgesToReactFlow(result.data.edges);
        
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
          reactFlowNodes,
          reactFlowEdges
        );
        
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
        setCurrentFlowchart(result.data);
        setFlowchartTitle(result.data.title);
        setFlowchartDescription(result.data.description);
        setRefinementPrompt('');
        
        toast.success('Flowchart refined successfully!');
      } else {
        // Provide specific error messages for rate limiting
        const errorMessage = result.error || 'Failed to refine flowchart';
        if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
          toast.error('API rate limit exceeded. Please wait a moment before trying again.', {
            duration: 5000,
          });
        } else if (errorMessage.includes('temporarily unavailable')) {
          toast.error('AI service is temporarily unavailable. Please try again in a few minutes.', {
            duration: 5000,
          });
        } else {
          toast.error(errorMessage);
        }
      }
    } catch (error: any) {
      console.error('Refinement error:', error);
      
      // Handle network or other errors
      if (error?.response?.status === 429) {
        toast.error('Too many requests. Please wait a moment before trying again.', {
          duration: 5000,
        });
      } else if (error?.message?.includes('rate limit')) {
        toast.error('API rate limit exceeded. Please wait a moment before trying again.', {
          duration: 5000,
        });
      } else {
        toast.error('Failed to refine flowchart. Please check your connection and try again.');
      }
    } finally {
      setIsRefining(false);
    }
  };

  const downloadFlowchart = useCallback(() => {
    // Create a simple text representation for download
    const flowchartText = `
# ${flowchartTitle}

${flowchartDescription}

## Nodes:
${nodes.map(node => `- ${node.data.label} (${node.type})`).join('\n')}

## Connections:
${edges.map(edge => {
  const sourceNode = nodes.find(n => n.id === edge.source);
  const targetNode = nodes.find(n => n.id === edge.target);
  return `- ${sourceNode?.data.label} → ${targetNode?.data.label}${edge.label ? ` (${edge.label})` : ''}`;
}).join('\n')}
    `;

    const blob = new Blob([flowchartText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${flowchartTitle.replace(/\s+/g, '_')}_flowchart.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Flowchart downloaded!');
  }, [nodes, edges, flowchartTitle, flowchartDescription]);

  const examplePrompts = [
    "Create a flowchart for the software development lifecycle",
    "Diagram the steps for troubleshooting a computer problem",
  ];

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-cream border-b p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            <Sparkles className="inline-block w-8 h-8 mr-2 text-blue-500" />
            AI Flowchart Generator
          </h1>
          <p className="text-gray-600">
            Describe any process, workflow, or concept and we'll create a beautiful flowchart for you
          </p>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar */}
        <div className="w-80 bg-cream border-r p-6 overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Generate Flowchart</CardTitle>
              <CardDescription>
                Describe what you want to create a flowchart about
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="e.g., Create a flowchart for the customer onboarding process..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="resize-none"
              />
              
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Flowchart
                  </>
                )}
              </Button>

              {/* Example prompts */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Try these examples:</p>
                {examplePrompts.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setPrompt(example)}
                    className="text-left text-sm text-blue-600 hover:text-blue-800 hover:underline block"
                  >
                    "{example}"
                  </button>
                ))}
              </div>
              
              {/* Rate limit notice */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                  <strong>Note:</strong> This service uses AI APIs which may have rate limits. 
                  If you encounter a "rate limit exceeded" error, please wait a moment and try again.
                </p>
              </div>
            </CardContent>
          </Card>

          {currentFlowchart && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Refine Flowchart</CardTitle>
                <CardDescription>
                  Request changes to improve your flowchart
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="e.g., Add more detail to step 3, remove the decision node..."
                  value={refinementPrompt}
                  onChange={(e) => setRefinementPrompt(e.target.value)}
                />
                
                <Button
                  onClick={handleRefine}
                  disabled={isRefining || !refinementPrompt.trim()}
                  variant="outline"
                  className="w-full"
                >
                  {isRefining ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Refining...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refine Flowchart
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Legend */}
          
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {flowchartTitle && (
            <div className="bg-white border-b p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{flowchartTitle}</h2>
                  <p className="text-gray-600 mt-1">{flowchartDescription}</p>
                </div>
                <Button onClick={downloadFlowchart} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}
          
          <div className="flex-1 bg-gray-100 h-full">
            {nodes.length > 0 ? (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                className="bg-teal-50 h-full w-full"
              >
                <Controls />
                <MiniMap />
                <Background gap={12} size={1} />
              </ReactFlow>
            ) : (
              <div className="flex items-center justify-center h-full w-full">
                <div className="text-center">
                  <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">
                    Ready to Create Your Flowchart
                  </h3>
                  <p className="text-gray-600 max-w-md">
                    Enter a description of the process or workflow you want to visualize,
                    and our AI will generate a professional flowchart for you.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
