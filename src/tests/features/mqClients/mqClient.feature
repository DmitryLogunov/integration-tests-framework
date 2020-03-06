Feature: MQ Client tests

  Scenario: Checking publishing messages if messagingProvider eq kafka
    When messagingProvider eq 'kafka' message should be published to kafka

  Scenario: Checking publishing messages if messagingProvider eq nats
    When messagingProvider eq 'nats' message should be published to nats

  Scenario: Checking subscribing messages if messagingProvider eq kafka
    When create nats and kafka cunsumers
    When publish message to check kafka consumer
    Then if messagingProvider set as 'kafka' message should be handled by Kafka handler and NOT handled by Nats handler

  Scenario: Checking subscribing messages if messagingProvider eq nats
    When create nats and kafka cunsumers
    When publish message to check nats consumer
    Then if messagingProvider set as 'nats' message should NOT be handled by Kafka handler and handled by Nats handler

  Scenario: Checking unsubscribing from topic if messagingProvider eq kafka
    When create kafka consumers
    When publish messages to check kafka consumer
    Then message should be handled by kafka handlers of all consumers
    When unsubscribe kafka topics
    When publish messages to check kafka consumer
    Then message should not be handled by kafka handler of unsubscribed consumers

  Scenario: Checking unsubscribing from topic if messagingProvider eq nats
    When create nats consumers
    When publish messages to check nats consumer
    Then message should be handled by nats handlers of all consumers
    When unsubscribe nats topics
    When publish messages to check nats consumer
    Then message should not be handled by nats handler of unsubscribed consumers
