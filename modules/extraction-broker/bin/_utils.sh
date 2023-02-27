#!/bin/bash
# shellcheck disable=2154


is_array() {
    # Expect 1 argument
    [[ $# -ne 1 ]] && echo 'Supply a variable name as an argument'>&2 && return 2
    local var=$1
    # use a variable to avoid having to escape spaces
    local regex="^declare -[aA] ${var}(=|$)"
    if [[ $(declare -p "$var" 2> /dev/null) =~ $regex ]]; then
        echo 'true'
    else
        echo 'false'
    fi
}

####
##
arg() {
    local argname="${1:-unspecified}"
    test "$argname" == "unspecified" && die "Error: no argument name passed to arg()"

    local argloc="_arg_$argname"
    test -z ${!argloc+x} && die "Error: arg $argname (expected in \$$argloc) is unset"

    local argval=${!argloc}

    # echo "arg $argname (expected in \$$argloc) = $argval"
    eval "$argname"="$argval"

    # arg_is_array="$(is_array $argloc)"

    # if [ "$arg_is_array" == "true" ]; then
    #     ## 'return' the value of the parsed argument in the passed in string
    #     eval "$argname"="${argval[@]}"
    # else
    #     ## 'return' the value of the parsed argument in the passed in string
    #     eval "$argname"="$argval"
    # fi
}

####
## Run the given command, allowing for --dry-run option to just print the command
do_or_dry() {
    arg dry_run
    arg env
    test "$env" == "unspecified" && _PRINT_HELP=yes die "Error: must specify --env=..."
    export NODE_ENV="$env"

    local cmds=("$@")
    if [ "$dry_run" = on ]; then
        echo "dry> ${cmds[*]}"
    else
        echo "run> ${cmds[*]}"
        "${cmds[@]}"
    fi

    echo ""
}

####
## Run the given command, allowing for --dry-run option to just print the command
doit() {
    arg env
    test "$env" == "unspecified" && _PRINT_HELP=yes die "Error: must specify --env=..."
    export NODE_ENV="$env"

    local cmds=("$@")
    echo "run> ${cmds[*]}"
    "${cmds[@]}"

    echo ""
}

####
## CD into dirs, verbosely failing on first non-existent dir
with_dirs() {
    local dirnames=("$@")
    for d in "${dirnames[@]}"; do
        if [ ! -d "$d" ]; then
            #   test -f "$_arg_infile" || _PRINT_HELP=yes die "Can't continue, have to supply file as an argument, got '$_arg_infile'" 4
            echo "could not cd to '$d' in ${dirnames[*]}"
            exit 1
        fi
        cd "$d" || exit 1
    done
    echo "pwd> $(pwd)"
}

run_parser() {
    # Call the function that assigns passed optional arguments to variables:
    parse_commandline "$@"
    # Then, call the function that checks that the amount of passed arguments is correct
    # followed by the function that assigns passed positional arguments to variables:
    handle_passed_args_count
    assign_positional_args 1 "${_positionals[@]}"
}
