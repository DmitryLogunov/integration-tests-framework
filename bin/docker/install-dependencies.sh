#!/usr/bin/env bash

function parse_yaml {
   local prefix=$2
   local s='[[:space:]]*' w='[a-zA-Z0-9_]*' fs=$(echo @|tr @ '\034')
   sed -ne "s|^\($s\):|\1|" \
        -e "s|^\($s\)\($w\)$s:$s[\"']\(.*\)[\"']$s\$|\1$fs\2$fs\3|p" \
        -e "s|^\($s\)\($w\)$s:$s\(.*\)$s\$|\1$fs\2$fs\3|p"  $1 |
   awk -F$fs '{
      indent = length($1)/2;
      vname[indent] = $2;
      for (i in vname) {if (i > indent) {delete vname[i]}}
      if (length($3) > 0) {
         vn=""; for (i=0; i<indent; i++) {vn=(vn)(vname[i])("_")}
         printf("%s%s%s=\"%s\"\n", "'$prefix'",vn, $2, $3);
      }
   }'
}

declare -x -f parse_yaml
########################

function get_build_params {
  serviceName=$1
  sourceFile=./dev-dependencies.yml

  serviceBranchPair=$( parse_yaml ${sourceFile} | grep "${serviceName}_branch" )
  serviceGitPathPair=$( parse_yaml ${sourceFile} | grep "${serviceName}_github_path" )

  if [[ "$serviceBranchPair" != "" ]]; then
    envName=${serviceBranchPair%%=*}
    envValue=${serviceBranchPair#*=}
    if [[ "$envValue" != "" ]]; then
      serviceBranch=$( echo $envValue | tr -d \" )
    fi
  else
    serviceBranch="master"
  fi

  if [[ "$serviceGitPathPair" != "" ]]; then
    envName=${serviceGitPathPair%%=*}
    envValue=${serviceGitPathPair#*=}
    if [[ "$envValue" != "" ]]; then
      serviceGitPath=$( echo $envValue |  tr -d \"  )
    fi
  else
    serviceGitPath=$( echo "${serviceName}.git" | tr "_" "-" )
  fi

  echo "${serviceBranch} ${serviceGitPath}"
}

declare -x -f get_build_params
##############################

function install_childs_dependencies {
 serviceBranch=$1

 if [[ "$serviceBranch" = "" ]]; then
   serviceBranch=master
 fi

 if [[ -f ./dev-dependencies.yml ]]; then
   listDependenciesServicesArr=( $( parse_yaml ./dev-dependencies.yml | grep "_name" ) )
   for pair in ${listDependenciesServicesArr[@]} ; do
     envName=${pair%%=*}
     envValue=${pair#*=}
     if [[ "$envValue" != "" ]]; then
       serviceDevName=$( echo $envValue | tr -d \" )
       serviceDevNameDelimited=$( echo ${serviceDevName} | tr '_' '-' )

       if [[ -d ./node_modules/${serviceDevNameDelimited} && "${serviceBranch}" != "master" ]]; then
         # add dev branch if main service branch is not 'master'
         buildParams=( $( get_build_params ${serviceDevName} ) )
         serviceDevBranch=${buildParams[0]}

         ( cd ./node_modules/${serviceDevNameDelimited} && /root/build/install-dependencies.sh ${serviceDevBranch} )

         # copy child dependency's folder to root node_modules
         currentDir=$( pwd )
         if [[ -d "/usr/src/app/node_modules/${serviceDevNameDelimited}" && -d ./node_modules/${serviceDevNameDelimited} &&  "${currentDir}" != "/usr/src/app" ]]; then
            rm -rf /usr/src/app/node_modules/${serviceDevNameDelimited}
            cp -R ./node_modules/${serviceDevNameDelimited} /usr/src/app/node_modules/${serviceDevNameDelimited}
         fi
       fi
     fi
   done
 fi
}


#########################################################################
#########################################################################

SERVICE_BRANCH=$1
if [[ "$SERVICE_BRANCH" = "" ]]; then
  eval $( cat /root/build/.build.config )
fi

if [[ -d ./node_modules ]]; then
 rm -rf ./node_modules
fi

if [[ "$SERVICE_BRANCH" = "master" ]]; then
  npm i -g yarn-recursive
  yarn
  yarn-recursive --cmd upgrade
  exit
fi

if [[ -f ./dev-dependencies.yml ]]; then
  if [[ "${SERVICE_BRANCH}" != "" && "${SERVICE_BRANCH}" != "master" ]]; then
    listDependenciesServicesArr=( $( parse_yaml ./dev-dependencies.yml | grep "_name" ) )
    cp ./package.json ./package.dependencies-set.json
    cp ./package.json ./package.original.json

    for pair in ${listDependenciesServicesArr[@]} ; do
      envName=${pair%%=*}
      envValue=${pair#*=}

      if [[ "$envValue" != "" ]]; then
        serviceDevName=$( echo $envValue | tr -d \" )

        if [[ "${SERVICE_BRANCH}" != "" && "${SERVICE_BRANCH}" != "master" ]]; then
          # add dev branch if main service branch is not 'master'
          buildParams=( $( get_build_params ${serviceDevName} ) )
          serviceDevBranch=${buildParams[0]}
          serviceDevGitPath=${buildParams[1]}

          if [[ "${serviceDevBranch}" != "" && "${serviceDevBranch}" != "master" ]]; then
             sed -i "s/${serviceDevGitPath}/${serviceDevGitPath}#${serviceDevBranch}/" ./package.dependencies-set.json

             # remove from yarn.lock
             serviceDevNameDelimited=$( echo ${serviceDevName} | tr '_' '-' )
             yarn remove ${serviceDevNameDelimited}
          fi
        fi
      fi
    done

    rm ./package.json && cp ./package.dependencies-set.json ./package.json  &&  rm ./package.dependencies-set.json

    yarn install
    install_childs_dependencies ${SERVICE_BRANCH}

    rm ./package.json && cp ./package.original.json ./package.json  &&  rm ./package.original.json
  else
    yarn install
    install_childs_dependencies
  fi
else
  yarn install
  install_childs_dependencies
fi
