import type { PersonaData } from '../../types';

/** Only explicit skill-list entries qualify for the fast path; prose needs context. */
export function resolveListedLlmTools(question: string, persona: PersonaData): string | undefined {
  if (!/\b(?:llms?|large language models?)\b/i.test(question)
    || !/\b(?:apis?|frameworks?|tools?)\b/i.test(question)
    || !/\b(?:which|what|list|name)\b/i.test(question)) return undefined;
  const supported = /^(?:openai(?: api| sdk)?|anthropic(?: api| sdk)?|claude api|gemini api|google (?:gemini|generative ai)(?: api| sdk)?|azure openai(?: api)?|langchain|langgraph|llamaindex|ollama|hugging face transformers|transformers|vllm|llama\.cpp|semantic kernel|dspy|haystack|litellm|crewai|autogen)$/i;
  const entries = [...(persona.techStack || []), ...(persona.skills || [])];
  const matches = entries.map(entry => entry.trim()).filter(entry => supported.test(entry));
  const unique = matches.filter((entry, index) => matches.findIndex(other => other.toLowerCase() === entry.toLowerCase()) === index);
  return unique.length ? unique.join(', ') : undefined;
}
