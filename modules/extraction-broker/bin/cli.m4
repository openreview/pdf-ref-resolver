#!/bin/bash
# shellcheck disable=2154
#
# ARGBASH_SET_INDENT([  ])
# DEFINE_SCRIPT_DIR([_script_dir])
#
# ARG_OPTIONAL_SINGLE([env], [], [Env Mode], [dev])
# ARG_TYPE_GROUP_SET([envmode], [ENVMODE], [env], [dev,test,prod], [])
# ARG_LEFTOVERS()
#
# ARGBASH_GO()
#
# [ <-- needed because of Argbash
readonly script_dir="$_script_dir"
source "$script_dir/_utils.sh"

readonly climain="./dist/main"

arg env

export NODE_ENV="$env"
doit node "$climain" "${_arg_leftovers[@]}"

# ] <-- needed because of Argbash
