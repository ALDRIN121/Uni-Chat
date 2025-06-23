
"use client";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiKeyInput: string;
  setApiKeyInput: (value: string) => void;
  handleConfigureLlm: () => void;
}

export function ConfigDialog({
  open,
  onOpenChange,
  apiKeyInput,
  setApiKeyInput,
  handleConfigureLlm,
}: ConfigDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure LLM</DialogTitle>
          <DialogDescription>
            Enter your API key to connect to your Large Language Model. Your key is stored only in your browser.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            id="apiKey"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="Your API Key"
            type="password"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfigureLlm}>Save Configuration</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
