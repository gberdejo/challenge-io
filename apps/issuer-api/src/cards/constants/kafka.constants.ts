export const KAFKA_SERVICE = 'KAFKA_SERVICE';

// Kafka Topics
export const KAFKA_TOPICS = {
  CARD_REQUESTED: 'io.card.requested.v1',
  CARD_REQUESTED_DLQ: 'io.card.requested.v1.dlq',
  CARD_PROCESSED: 'io.card.processed.v1',
} as const;

// Tracking Status
export const TRACKING_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  RETRY: 'retry',
  SUCCESS: 'success',
  FAILED: 'failed',
  SENT_TO_DLQ: 'sent_to_dlq',
} as const;

// Processed By
export const PROCESSED_BY = {
  ISSUER_API: 'issuer-api',
  CARD_PROCESSOR: 'card-processor',
} as const;

// Retry Configuration
export const INITIAL_RETRY_COUNT = 0;

// Response Messages
export const RESPONSE_MESSAGES = {
  CARD_ISSUANCE_RECEIVED: 'Card issuance request received',
} as const;
