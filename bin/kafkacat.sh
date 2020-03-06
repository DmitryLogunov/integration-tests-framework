#!/bin/bash

# The script helps to consume and produce messages to kafka topics with using 'kafkacat' package.
# Need to install 'kafkacat' pakage. See: https://github.com/sgerrand/alpine-pkg-kafkacat

action=$1
topic=$2

kafkacat $1 -b ${KAFKA_BROKERS} -t $2
