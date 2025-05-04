# Payload CMS DynamoDB Adapter

A DynamoDB adapter for [Payload CMS](https://payloadcms.com/).

## Installation

```bash
pnpm add @payloadcms/db-dynamo
```

## Configuration

```typescript
import { DynamoDBAdapter } from '@payloadcms/db-dynamo';

const adapter = new DynamoDBAdapter({
  endpoint: 'http://localhost:8000', // Optional, defaults to AWS endpoint
  region: 'us-east-1', // Optional, defaults to 'us-east-1'
  credentials: {
    accessKeyId: 'your-access-key',
    secretAccessKey: 'your-secret-key',
  },
});

// Use with Payload CMS
const payload = await buildConfig({
  // ... other config
  db: adapter,
});
```

## Development

### Prerequisites

- Node.js >= 14
- pnpm >= 8
- AWS DynamoDB (local or cloud)

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

### Running Tests

```bash
pnpm test
```

### Building

```bash
pnpm build
```

## License

MIT
