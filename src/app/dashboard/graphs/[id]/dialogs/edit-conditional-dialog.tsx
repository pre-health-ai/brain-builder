import { useState, useEffect } from "react";

import { z } from "zod";
import { toast } from "sonner";
import { PencilIcon, Plus } from "lucide-react";

import { Tables } from "@/types/supabase";
import { useAuth } from "@/lib/hooks/use-auth";

import { createClient } from "@/lib/supabase/client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { EditPromptDialog } from "@/app/dashboard/prompts/edit-prompt-dialog";

import { useGraph } from "../layout";

export function EditConditionalDialog({ node_id }: { node_id: string }) {
  const { user } = useAuth();
  const { graphId } = useGraph();

  const [open, setOpen] = useState(false);
  const [conditionalEvaluator, setConditionalEvaluator] = useState<string>("and");
  const [conditionals, setConditionals] = useState<Tables<"graph_conditional_node_conditions">[]>([]);
  const [usedStates, setUsedStates] = useState<Tables<"graph_states">[]>([]);
  const [availableStates, setAvailableStates] = useState<Tables<"graph_states">[]>([]);

  const updateConditional = async (id: string, updates: Partial<Tables<"graph_conditional_node_conditions">>) => {
    //update conditionals useState and dont update the database 
    setConditionals(conditionals.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const fetchConditionals = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("graph_conditional_node_conditions")
      .select("*")
      .eq("graph_conditional_node_id", node_id);

    if (error) {
      console.error(error);
      return;
    }

    setConditionals(data);
  }

  const fetchStates = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("graph_states")
      .select("*")
      .in("id", conditionals.map(c => c.state_id));

    if (error) {
      console.error(error);
      return;
    }

    setUsedStates(data);
  }

  const fetchAvailableStates = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("graph_states")
      .select("*")
      .eq("graph_id", graphId);

    if (error) {
      console.error(error);
      return;
    }

    setAvailableStates(data);
  }

  useEffect(() => {
    fetchConditionals();
  }, [node_id]);

  useEffect(() => {
    if (conditionals.length > 0) {
      fetchStates();
    }
    fetchAvailableStates();
  }, [conditionals]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <PencilIcon />
          Edit Conditional
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Conditional</DialogTitle>
          <DialogDescription>
            Edit the conditional for the node.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Conditional Evaluator: </Label>
            <Select value={conditionalEvaluator} onValueChange={setConditionalEvaluator}>
              <SelectTrigger>
                <SelectValue placeholder="" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="and">And</SelectItem>
                <SelectItem value="or">Or</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            {conditionals.map((conditional) => {
              const state = usedStates.find(s => s.id === conditional.state_id);
              return (
                <div key={conditional.id} className="flex flex-row items-center gap-2">
                  <Label>{state?.name}</Label>
                  <Select
                    value={conditional.state_id}
                    onValueChange={(value) => {
                      updateConditional(conditional.id, { state_id: value });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStates.map((state) => (
                        <SelectItem key={state.id} value={state.id}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={conditional.conditional_operator}
                    onValueChange={(value: "EQUALS" | "NOT_EQUALS" | "LESS_THAN" | "LESS_THAN_OR_EQUAL_TO" | "MORE_THAN" | "MORE_THAN_OR_EQUAL_TO") => {
                      updateConditional(conditional.id, { conditional_operator: value });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select operator" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EQUALS">Equals</SelectItem>
                      <SelectItem value="NOT_EQUALS">Not Equals</SelectItem>
                      <SelectItem value="LESS_THAN">Less Than</SelectItem>
                      <SelectItem value="LESS_THAN_OR_EQUAL_TO">Less Than or Equal To</SelectItem>
                      <SelectItem value="MORE_THAN">More Than</SelectItem>
                      <SelectItem value="MORE_THAN_OR_EQUAL_TO">More Than or Equal To</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
          <div className="flex justify-center mt-4">
            <Button variant="outline" className="w-full" >
              <Plus className="size-4 mr-2" />
              Add Conditional
            </Button>
          </div>
          <DialogFooter>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}