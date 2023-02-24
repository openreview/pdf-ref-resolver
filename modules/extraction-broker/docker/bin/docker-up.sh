#!/bin/sh

SCRIPT=$(readlink -f "$0")
BIN=$(dirname "$SCRIPT")

export USER_ID=${UID}
export GROUP_ID=${GID}

$BIN/docker-compose.sh up -d
