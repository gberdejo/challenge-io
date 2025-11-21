export const TRACKING_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  RETRY: 'retry',
  SUCCESS: 'success',
  FAILED: 'failed',
  SENT_TO_DLQ: 'sent_to_dlq',
  CARD_CREATED: 'card_created',
} as const;

export const PROCESSED_BY = {
  ISSUER_API: 'issuer-api',
  CARD_PROCESSOR: 'card-processor',
} as const;
