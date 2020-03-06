#!/bin/bash

 # The Nats cli client. See http://github.com/starkandwayne/nats
 # Format:
 # nats pub [-s server] [--ssl]  <subject> <msg>
 #     or
 # nats sub [-s server] [--ssl] [-t] [-r] <subject>
 #     or
 # nats req [-s server] [--ssl] [-t] [-r] [-w] <subject> <msg>

action=$1
subject=$2
msg=$3
server=$4

if [[ "${action}" = "" ]]; then
  echo "Error: The 'action' should be defined (pub, sup or req)!"
  exit
fi

if [[ "${subject}" = "" ]]; then
  echo "Error: The 'subject' should be defined!"
  exit
fi

if [[ "${action}" = "pub" && "${msg}" = "" ]]; then
  echo "Error: The 'message' should be defined if 'action' = 'pub'!"
  exit
fi

if [[ "${server}" = "" ]]; then
  server="${NATS_SERVER}"
fi

if [[ "${server}" = "nats://" ]]; then
  echo "Couldn't connect to Nats server. The nats url undefined!"
  exit;
fi

token=''
if [[ "${NATS_TOKEN}" != "" ]]; then
 token="${NATS_TOKEN}@"
fi

echo "(cd ./bin && ./tools/nats ${action} -s ${server} ${token_option} ${subject} ${msg})"

(cd ./bin && ./tools/nats ${action} -s nats://${token}${server} ${subject} ${msg})
