declare module 'dagre' {
  interface Graph {
    setDefaultEdgeLabel(callback: () => any): void;
    setGraph(options: { rankdir?: string }): void;
    setNode(id: string, options: { width: number; height: number }): void;
    setEdge(source: string, target: string): void;
    node(id: string): { x: number; y: number };
  }

  interface Graphlib {
    Graph: new () => Graph;
  }

  function layout(graph: Graph): void;

  const graphlib: Graphlib;
  const dagre: {
    graphlib: Graphlib;
    layout: (graph: Graph) => void;
  };
  export default dagre;
}
