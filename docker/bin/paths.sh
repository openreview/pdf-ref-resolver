#!/bin/bash

SCRIPT=$(readlink -f "$0")
BIN=$(dirname "$SCRIPT")

export DOCKER=$(cd "$BIN/.." && pwd)
export CONFIG="$DOCKER/config"
export IMAGES="$DOCKER/images"
export COMPOSE="$DOCKER/compose"
export SHARED="$DOCKER/shared"
# export DOCKER_DATA=$($BIN/get-docker-data-path.sh)
export PWD=$(pwd)

# echo "DOCKER          $DOCKER"
# echo "CONFIG          $CONFIG"
# echo "IMAGES          $IMAGES"
# echo "COMPOSE         $COMPOSE"
# echo "DOCKER_DATA     $DOCKER_DATA"
# echo "PWD             $PWD"
