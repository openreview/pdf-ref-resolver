#!/bin/sh

SCRIPT=$(readlink -f "$0")
BIN=$(dirname "$SCRIPT")
. $BIN/paths.sh

export USER_ID=${UID}
export GROUP_ID=${GID}

docker-compose \
    -f $COMPOSE/volumes.yml \
    -f $COMPOSE/network.yml \
    -f $COMPOSE/mongo.yml \
    "$@" "--remove-orphans"

