import { NodeProps } from "@xyflow/react";

export type NodeType = "analysis" | "conditional" | "prompt";

interface CustomInfo {
  id: string;
  name: string;
}

export interface BaseNodeData {
  label: string;
  type: NodeType;
  onLabelChange?: (nodeId: string, newLabel: string) => void;
}

export interface AnalysisNodeData extends BaseNodeData {
  type: "analysis";
  childId?: string;
  selectedStates: string[];
  onStatesChange?: (nodeId: string, stateIds: string[]) => void;
  graphId: string;
  statePrompts: {
    stateId: string;
    prompt: string;
    llmConfig?: LLMConfig;
  }[];
  onStatePromptChange?: (nodeId: string, stateId: string, prompt: string, llmConfig?: LLMConfig) => void;
}

export interface ConditionalNodeData extends BaseNodeData {
  type: "conditional";
  trueChildId?: string;
  falseChildId?: string;
  conditions?: {
    stateId: string;
    operator:
      | "equals"
      | "notEquals"
      | "greaterThan"
      | "lessThan"
      | "contains"
      | "notContains";
    value: string;
  }[];
  operator?: "and" | "or";
  onConditionalChange?: (nodeId: string, data: ConditionalNodeData) => void;
  graphId: string;
}

export interface LLMConfig {
  model: "gpt-4" | "gpt-4o-mini";
  temperature: number;
  maxTokens: number;
  frequencyPenalty: number;
  presencePenalty: number;
  topP: number;
}

export interface PromptNodeData extends BaseNodeData {
  type: "prompt";
  prompt?: string;
  graphId: string;
  llmConfig?: LLMConfig;
  onPromptChange?: (nodeId: string, newData: PromptNodeData) => void;
}

export type CustomNodeData =
  | AnalysisNodeData
  | ConditionalNodeData
  | PromptNodeData;

export interface CustomNode {
  id: string;
  position: { x: number; y: number };
  data: CustomNodeData;
  type: NodeType;
}

export interface NodePropsWithData {
  id: string;
  data: CustomNodeData;
  selected?: boolean;
  isConnectable?: boolean;
  width?: number;
  height?: number;
  sourcePosition?: string;
  targetPosition?: string;
  dragHandle?: string;
  parentId?: string;
} 