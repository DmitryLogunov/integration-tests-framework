#!/bin/bash

if [[ ! -d ./node_modules ]]; then
  yarn install
fi

# Run typescript compiller to build:
# ./src/server.ts => ./server.js
# ./src/app/controllers => ./app/controllers
# ./src/app/models => ./app/models
# ./src/app/index.ts => ./app/index.js
# ./src/lib => ./lib
# ./src/app/tests/helpers => ./app/tests/helpers
# TODO: ./src/tests/features => ./tests/features (refactoring ./src/tests/features: js => ts)

./node_modules/typescript/bin/tsc


# Copy ejs views, assets and js modules
cp -R ./src/app/views/ ./app/views/
cp -R ./src/tests/config/ ./tests/config/

# Copy features
listFeatures=( $(echo $(find src -name '*.feature') | sed "s|src/||g") )

for feature in ${listFeatures[@]} ; do
 cp src/${feature} ${feature}
done

# Copy 'data' tests folders
listDataFolders=( $(echo $(find src -name 'data') | sed "s|src/||g") )

for dataFolder in ${listDataFolders[@]} ; do
 cp -R src/${dataFolder} ${dataFolder}
done


