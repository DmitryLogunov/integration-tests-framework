#!/bin/bash

# Possible variants to start script:
#
#  1. ./start-tests.sh
#    starts all features and saves report in ./data/reports/<reportID> folder where
#    <reportID>=YYYY-MM-DD_hh:mm:ss (the date-time of start tests)
#
#  2. ./start-tests.sh <feature>
#    starts feature <feature>  and saves report in ./data/reports/<reportID> folder where
#    <reportID>=YYYY-MM-DD_hh:mm:ss (the date-time of start tests)
#
#  3. ./start-tests.sh <feature> <reportID>
#     starts feature <feature>  and saves report in ./data/reports/<reportID>
#
#  4. ./start-tests.sh '<feature1> <feature2> ...' <reportID>
#     starts features <feature1> <feature2>  and saves report in ./data/reports/<reportID>
#
#  4. ./start-tests.sh '<feature1> <feature2> ...'
#     starts features <feature1> <feature2>  and saves report in ./data/reports/<reportID> where
#    <reportID>=YYYY-MM-DD_hh:mm:ss (the date-time of start tests)
#
#  Note: <feature> should be equal one of folder's name in /tests/features (the short name of feature)



# set testsFilter and reportID
if [[ "$1" != "" && "$2" != "" ]]; then
  testsFilter="$1"
  reportID=$2
elif [[ "$1" != "" && "$2" = "" ]]; then
  testsFilter="$1"
  reportID=$(date  +%Y-%m-%d_%H-%M-%S)
else
  testsFilter="all"
  reportID=$(date  +%Y-%m-%d_%H-%M-%S)
fi

testsPathes=""
if [[ "${testsFilter}" != "all" ]]; then
  listFeatures=(${testsFilter})
  echo "listFeatures: ${listFeatures[@]}"

  for feature in ${listFeatures[@]} ; do
    if [[ -d ./tests/features/${feature}/ ]]; then
      testsPathes="${testsPathes} ./tests/features/${feature}/"
    else
      echo -e "\e[31m
  The folder ./tests/features/${feature}/ does not exist. Feature '${feature}' will not be added to tests list. \e[0m"
    fi
  done
fi

# create reportID if it's not exist
if [[ ! -d ./data ]]; then
  mkdir ./data
fi

if [[ ! -d ./data/reports ]]; then
  mkdir ./data/reports
fi

if [[ ! -d ./data/reports/${reportID} ]]; then
  mkdir ./data/reports/${reportID}
fi

    echo -e "\x1b[32m $message \x1b[0m"
# start tests and generate json-report
if [[ "${testsPathes}" != "" ]]; then
      echo -e "\x1b[32m
  Next tests will be run: ${testsPathes}. \x1b[0m"

    ./node_modules/.bin/cucumber-js --format json:./data/reports/${reportID}/report.json ${testsPathes}
else
      echo -e "\x1b[32m
  All tests will be run \x1b[0m"

   ./node_modules/.bin/cucumber-js --format json:./data/reports/${reportID}/report.json ./tests/
fi

# generate html-report
if [[ -f ./data/reports/${reportID}/report.json ]]; then
  node ./tests/lib/helpers/createReport.js ./data/reports/${reportID}/report.json ./data/reports/${reportID}/report.html
fi
