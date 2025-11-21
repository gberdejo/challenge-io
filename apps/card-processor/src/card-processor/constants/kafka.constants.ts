export const KAFKA_SERVICE = 'KAFKA_SERVICE';

// Kafka Topics
export const KAFKA_TOPICS = {
  CARD_REQUESTED: 'io.card.requested.v1',
  CARD_REQUESTED_DLQ: 'io.card.requested.v1.dlq',
  CARD_PROCESSED: 'io.card.processed.v1',
};

// Retry Configuration
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  DELAYS: [1000, 2000, 4000], // 1s, 2s, 4s
};
