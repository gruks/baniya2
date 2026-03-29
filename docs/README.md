# Baniya

Shrewd routing. Zero waste. Your data stays where it belongs.

## Overview

Baniya is a visual AI pipeline builder. Users drag nodes onto a canvas, connect them with edges, and run workflows. The core differentiator is automatic data sensitivity classification — before every LLM call, Baniya reads the payload, detects PII, and routes the prompt to the cheapest model that is legally allowed to see that data. Private data stays local. Public data goes cloud. Every decision is logged.

## Key Features

- **Visual Workflow Builder**: Drag-and-drop interface for creating AI pipelines
- **Automatic Data Classification**: Detects PII and sensitive information before LLM processing
- **Intelligent Model Routing**: Routes requests to appropriate models based on data sensitivity
- **Cost Optimization**: Uses local models when possible to minimize costs
- **Compliance & Audit**: Full audit trail of all data routing decisions
- **Multi-provider Support**: Works with local (Ollama, LM Studio) and cloud (OpenAI, Anthropic, Gemini) LLMs

## Documentation

- [Architecture Overview](ARCHITECTURE.md)
- [API Reference](API.md)
- [Contributing Guide](../CONTRIBUTING.md)
- [Development Setup](DEVELOPMENT.md)

## Getting Started

See the [Development Setup](DEVELOPMENT.md) guide for instructions on how to set up Baniya for development.

## License

MIT