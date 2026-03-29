export class LocalProviderUnavailableError extends Error {
  constructor(message?: string) {
    super(message ?? 'No local model is running. Start Ollama (`ollama serve`) or LM Studio, or change this node\'s route override to \'cloud\'.');
    this.name = 'LocalProviderUnavailableError';
  }
}

export class HardBlockError extends Error {
  constructor(message?: string) {
    super(message ?? 'Critical data cannot be routed to cloud. Set BANIYA_BLOCK_CLOUD_FOR=critical.');
    this.name = 'HardBlockError';
  }
}

export class CloudProviderUnavailableError extends Error {
  constructor(message?: string) {
    super(message ?? 'No cloud provider API key configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_API_KEY.');
    this.name = 'CloudProviderUnavailableError';
  }
}
