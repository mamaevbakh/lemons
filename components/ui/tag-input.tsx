"use client";

import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

type TagInputProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
};

export function TagInput({ value, onChange, placeholder }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (!tag) return;
    if (value.includes(tag)) return;
    onChange([...value, tag]);
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleAddClick = () => {
    addTag(inputValue);
    setInputValue("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAddClick();
    } else if (event.key === "Backspace" && inputValue === "" && value.length) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div className="space-y-2">
      {/* Input + Kbd + plus button */}
      <div className="flex gap-2">
      <InputGroup>
        <InputGroupInput
          placeholder={placeholder ?? "Add a tag"}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <InputGroupAddon align="inline-end">
  
</InputGroupAddon>

      </InputGroup>
<Button
    type="button"
    size="sm"
    variant="outline"
    className="h-auto gap-1 pr-2"
    disabled={!inputValue.trim()}
    onClick={handleAddClick}
  >
    Add
    <Kbd>⏎</Kbd>
  </Button></div>
      {/* Below: either empty state OR tags list */}
      {value.length === 0 ? (
        <Empty className="border rounded-md p-4 md:p-6">
          <EmptyContent>
            <EmptyDescription className="text-xs">
              No tags yet. Add your first tag above.
            </EmptyDescription>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="flex items-center gap-1"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="rounded-full p-0.5 hover:bg-muted"
                aria-label={`Remove tag ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
