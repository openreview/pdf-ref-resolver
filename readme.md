# PDF Reference Resolver
Extract references from PDF bibliographies and find the corresponding papers in OpenReview

# Installation
## Prerequisites
    - unzip, java, node, make

## Build and install Grobid Server
    > make grobid/fetch
    > make grobid/build

## Build and install node app (installs to system node/node_modules location)
    > make cli/build
    > make cli/install

## (Optional) Install Biblio-Glutton
    > Grobid can use Biblio-Glutton to improve performance if necessary


# Running
## Help options
    > pdf-ref-resolver extract-references --help
    
    Extract PDF references using Grobid service, match with OpenReview papers
    
    Options:
      --version      Show version number                                   [boolean]
      --help         Show help                                             [boolean]
      --pdf          Input pdf file                              [string] [required]
      --to-file      Write output to file; Filename is `input.pdf.refs.(txt|json)`
                                                          [boolean] [default: false]
      --output-path  Specify a directory to write output (if --to-file=true).
                     Defaults to same as input PDF                          [string]
      --format       Specify JSon or plain text output
                                 [string] [choices: "txt", "json"] [default: "json"]
      --config       Path to config file                         [string] [required]
      --overwrite    Overwrite any existing output file   [boolean] [default: false]

## Config file Format
    {
        "openreview": {
            "restApi": "https://api.openreview.net",
            "restUser": "my-username",
            "restPassword": "my-password"
        },
    }

## Examples
### Write JSON-formatted output file to current directory
    > pdf-ref-resolver extract-references --pdf ./path/to/input.pdf --config ~/my-config.json --format json --to-file --output-path .

### Write JSON-formatted output to same directory as input pdf 
    > pdf-ref-resolver extract-references --pdf ./path/to/input.pdf --config ~/my-config.json --format json --to-file 

### Write text-formatted output to stdout
    > pdf-ref-resolver extract-references --pdf ./path/to/input.pdf --config ~/my-config.json --format txt 

