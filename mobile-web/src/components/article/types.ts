import type { Block } from "@/lib/content/published-schema";

export type ExtractBlock<Type extends Block["type"]> = Extract<Block, { type: Type }>;
