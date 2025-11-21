#!/bin/bash

echo 'Waiting for Kafka to be ready...'
cub kafka-ready -b kafka:29092 1 30

echo 'Creating topics...'

# Topic for card requested events
kafka-topics --create --if-not-exists \
  --bootstrap-server kafka:29092 \
  --topic io.card.requested.v1 \
  --partitions 2 \
  --config retention.ms=604800000 \
  --config max.message.bytes=1048576

# Dead Letter Queue for failed messages after all retries
kafka-topics --create --if-not-exists \
  --bootstrap-server kafka:29092 \
  --topic io.card.requested.v1.dlq \
  --partitions 1 \
  --config retention.ms=2592000000

# Topic for successfully processed cards
kafka-topics --create --if-not-exists \
  --bootstrap-server kafka:29092 \
  --topic io.card.processed.v1 \
  --partitions 2 \
  --config retention.ms=604800000 \
  --config max.message.bytes=1048576

echo 'Topics created successfully!'
kafka-topics --list --bootstrap-server kafka:29092

echo 'Creating consumer groups...'

# Create card-processor-group consumer group
# This creates the group by consuming from the beginning and immediately stopping
kafka-console-consumer --bootstrap-server kafka:29092 \
  --topic io.card.requested.v1 \
  --topic io.card.processed.v1 \
  --group card-processor-group \
  --from-beginning \
  --max-messages 0 \
  --timeout-ms 1000 2>/dev/null || true

echo 'Consumer group created successfully!'
kafka-consumer-groups --bootstrap-server kafka:29092 --list
