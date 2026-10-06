export const AI_PROVIDERS = [
  { id: "openai", label: "OpenAI", keyUrl: "https://platform.openai.com/api-keys", models: ["gpt-4o", "gpt-4o-mini", "o4-mini"] },
  { id: "anthropic", label: "Anthropic", keyUrl: "https://console.anthropic.com/settings/keys", models: ["claude-sonnet-4", "claude-haiku-4"] },
  {
    id: "google",
    label: "Google",
    keyUrl: "https://aistudio.google.com/app/apikey",
    models: [
      "gemini-3.1-flash-lite",
      "gemini-3.8-flash",
      "gemini-3.7-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.1-pro-preview",
      "gemini-3-flash-preview",
    ],
  },
  { id: "xai", label: "xAI · Grok", keyUrl: "https://console.x.ai/", models: ["grok-4.7"] },
  { id: "deepseek", label: "DeepSeek", keyUrl: "https://platform.deepseek.com/api_keys", models: ["deepseek-v4-pro", "deepseek-v4-flash"] },
  { id: "openrouter", label: "OpenRouter", keyUrl: "https://openrouter.ai/settings/keys", models: ["auto", "deepseek-v3"] },
  { id: "custom", label: "Personalizado", keyUrl: "", models: [] },
] as const;

export type AIProviderId = (typeof AI_PROVIDERS)[number]["id"];

export type AISettings = {
  provider: AIProviderId | string;
  model: string;
  apiKey: string;
  baseUrl: string;
  temperature: number;
};

class AIProviderResponseError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "AIProviderResponseError";
  }
}

export class AIModelUnavailableError extends Error {
  constructor(message: string, readonly availableModels: string[]) {
    super(message);
    this.name = "AIModelUnavailableError";
  }
}

function chatCompletionsUrl(settings: AISettings) {
  const endpoints: Partial<Record<AIProviderId, string>> = {
    openai: "https://api.openai.com/v1/chat/completions",
    xai: "https://api.x.ai/v1/chat/completions",
    deepseek: "https://api.deepseek.com/chat/completions",
    openrouter: "https://openrouter.ai/api/v1/chat/completions",
  };

  if (settings.provider === "custom") {
    const baseUrl = settings.baseUrl.trim().replace(/\/+$/, "");
    if (!baseUrl) throw new Error("Informe a URL base do provedor personalizado.");
    return baseUrl.endsWith("/chat/completions") ? baseUrl : `${baseUrl}/chat/completions`;
  }

  const endpoint = endpoints[settings.provider as AIProviderId];
  if (!endpoint) throw new Error("Provedor não reconhecido.");
  return endpoint;
}

async function responseJson(response: Response) {
  const data = (await response.json().catch(() => ({}))) as {
    error?: { message?: string } | string;
  };
  if (!response.ok) {
    const detail = typeof data.error === "string" ? data.error : data.error?.message;
    throw new AIProviderResponseError(detail || `O provedor respondeu com status ${response.status}.`, response.status);
  }
  return data as Record<string, any>;
}

function isModelUnavailable(error: AIProviderResponseError, model: string) {
  const message = error.message.toLowerCase();
  const mentionsModel = message.includes("model") || message.includes(model.toLowerCase());
  return error.status === 404 || (
    mentionsModel &&
    (error.status === 400 || error.status === 403 || error.status === 422) &&
    /not found|not available|unavailable|does not exist|unknown|not supported|no access|permission|access denied/.test(message)
  );
}

async function fetchAvailableModels(settings: AISettings, signal: AbortSignal): Promise<string[]> {
  const key = settings.apiKey.trim();
  const headers: Record<string, string> = {};
  let url = "";

  if (settings.provider === "google") {
    url = "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000";
    headers["x-goog-api-key"] = key;
  } else if (settings.provider === "anthropic") {
    url = "https://api.anthropic.com/v1/models?limit=100";
    headers["x-api-key"] = key;
    headers["anthropic-version"] = "2023-06-01";
    headers["anthropic-dangerously-allow-browser"] = "true";
  } else {
    const endpoints: Partial<Record<AIProviderId, string>> = {
      openai: "https://api.openai.com/v1/models",
      xai: "https://api.x.ai/v1/language-models",
      deepseek: "https://api.deepseek.com/models",
      openrouter: "https://openrouter.ai/api/v1/models/user",
    };
    url = endpoints[settings.provider as AIProviderId] ?? "";
    headers.Authorization = `Bearer ${key}`;
    if (settings.provider === "openrouter") {
      headers["HTTP-Referer"] = window.location.origin;
      headers["X-Title"] = "StudioOS";
    }
  }

  if (!url) return [];
  const response = await fetch(url, { headers, signal });
  if (!response.ok) return [];
  const data = (await response.json().catch(() => ({}))) as Record<string, any>;
  let models: string[] = [];

  if (settings.provider === "google") {
    models = (data.models ?? [])
      .filter((item: any) => item.supportedGenerationMethods?.includes("generateContent"))
      .map((item: any) => item.baseModelId || item.name?.replace(/^models\//, ""))
      .filter((id: string) => Boolean(id) && /^(gemini-|gemma-)/.test(id))
      .filter((id: string) => !/(?:-tts|-live|image|audio|transcribe|video|embedding|robotics|deep-research)/i.test(id))
      .filter((id: string) => !/^gemini-2\.5-/.test(id));
  } else {
    const items = data.data ?? data.models ?? [];
    models = items.flatMap((item: any) => [item.id, ...(settings.provider === "xai" ? item.aliases ?? [] : [])]);
  }

  const currentModel = settings.model.trim().toLowerCase();
  const chatModels = settings.provider === "openai"
    ? models.filter((id) => /^(gpt-|chatgpt-|o[134](?:-|$))/.test(id))
    : models;

  const distinctModels = [...new Set(chatModels)]
    .filter((id) => typeof id === "string" && id.trim() && id.toLowerCase() !== currentModel)
  if (settings.provider === "google") {
    const preferred = [
      "gemini-3.8-flash",
      "gemini-3.7-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
      "gemini-3.1-pro-preview",
      "gemini-3-flash-preview",
      "gemini-flash-latest",
      "gemini-flash-lite-latest",
      "gemini-pro-latest",
    ];
    distinctModels.sort((a, b) => {
      const rankA = preferred.indexOf(a);
      const rankB = preferred.indexOf(b);
      return (rankA < 0 ? Number.MAX_SAFE_INTEGER : rankA) - (rankB < 0 ? Number.MAX_SAFE_INTEGER : rankB);
    });
  }
  return distinctModels.slice(0, 24);
}

export async function listAvailableModels(settings: AISettings): Promise<string[]> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15_000);
  try {
    return await fetchAvailableModels(settings, controller.signal);
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function requestAI(settings: AISettings, systemPrompt: string, prompt: string) {
  if (!settings.model.trim()) throw new Error("Informe o modelo que deseja usar.");
  if (!settings.apiKey.trim() && settings.provider !== "custom") {
    throw new Error("Informe a chave de API deste provedor.");
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30_000);

  try {
    if (settings.provider === "google") {
      const model = encodeURIComponent(settings.model.trim());
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(settings.apiKey.trim())}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: settings.temperature, maxOutputTokens: 24 },
          }),
        }
      );
      const data = await responseJson(response);
      const text = data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("");
      if (!text) throw new Error("O Google não retornou texto para esse modelo.");
      return text as string;
    }

    if (settings.provider === "anthropic") {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": settings.apiKey.trim(),
          "anthropic-version": "2023-06-01",
          "anthropic-dangerously-allow-browser": "true",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: settings.model.trim(),
          max_tokens: 24,
          system: systemPrompt,
          messages: [{ role: "user", content: prompt }],
          temperature: settings.temperature,
        }),
      });
      const data = await responseJson(response);
      const text = data.content?.map((part: { text?: string }) => part.text ?? "").join("");
      if (!text) throw new Error("A Anthropic não retornou texto para esse modelo.");
      return text as string;
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (settings.apiKey.trim()) headers.Authorization = `Bearer ${settings.apiKey.trim()}`;
    if (settings.provider === "openrouter") {
      headers["HTTP-Referer"] = window.location.origin;
      headers["X-Title"] = "StudioOS";
    }

    const response = await fetch(chatCompletionsUrl(settings), {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: settings.model.trim(),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: settings.temperature,
        max_tokens: 24,
      }),
    });
    const data = await responseJson(response);
    const text = data.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) throw new Error("O provedor não retornou texto para esse modelo.");
    return text as string;
  } catch (error) {
    if (error instanceof AIProviderResponseError && isModelUnavailable(error, settings.model)) {
      try {
        const availableModels = await fetchAvailableModels(settings, controller.signal);
        if (availableModels.length) throw new AIModelUnavailableError(error.message, availableModels);
      } catch (suggestionError) {
        if (suggestionError instanceof AIModelUnavailableError) throw suggestionError;
      }
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("A conexão excedeu 30 segundos. Confira o modelo e tente novamente.");
    }
    if (error instanceof TypeError) {
      throw new Error("Falha de rede ou CORS. Confira a URL do provedor e se ele aceita chamadas no navegador.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
