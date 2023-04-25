# PDF Reference Resolver
Extract references from PDF bibliographies and find the corresponding papers in OpenReview

# Installation
## Prerequisites
    - Docker (For pre-packaged Grobid containers)
    - node >= 16

## Install Grobid
    > docker pull lfoppiano/grobid:0.7.2
    > docker run --rm -p 8070:8070 lfoppiano/grobid:0.7.2

Note: The first time Grobid is run after starting the container, it will load up a bunch of model files, which takes
a long time (~15-20 seconds or more, depending on the machine). The command line app might timeout  on the
first usage.

## Build and install node app (installs to system node/node_modules location)
    > npm install
    > npm run build

Install with sudo if node is installed as root:
    > npm i -g ./


## (Optional) Install Biblio-Glutton
Grobid can use Biblio-Glutton to improve performance if necessary.

# Running
## Help options
```
    > pdf-ref-resolver extract-references --help

    Extract PDF references using Grobid service, match with OpenReview papers

    Options:
      --version               Show version number                          [boolean]
      --help                  Show help                                    [boolean]
      --pdf                   Input pdf file                     [string] [required]
      --to-file               Write output to file; Filename is
                              `input.pdf.refs.json` [boolean] [default: false]
      --output-path           Specify a directory to write output (if
                              --to-file=true). Defaults to same as input PDF[string]
      --config                Path to config file                [string] [required]
      --overwrite             Overwrite any existing output file
                                                          [boolean] [default: false]
      --with-matched          only output references that match an OpenReview note
                                                          [boolean] [default: false]
      --with-unmatched        only output references that *do not* match an
                              OpenReview note             [boolean] [default: false]
      --with-partial-matched  only output references with match < 100% to an
                              OpenReview note             [boolean] [default: false]
      --with-source           include the raw Grobid data in the output (verbose,
                              for debugging)              [boolean] [default: false]
```


## Config file Format
Configuration to specify REST endpoints and credentials
```
    {
        "openreview": {
            "restApi": "https://api.openreview.net",
            "restUser": "my-username",
            "restPassword": "my-password"
        },
    }
```

## Examples
### Write JSON-formatted output file to current directory
    > pdf-ref-resolver extract-references --pdf ./path/to/input.pdf --config ~/my-config.json --to-file --output-path .

### Write JSON-formatted output to same directory as input pdf
    > pdf-ref-resolver extract-references --pdf ./path/to/input.pdf --config ~/my-config.json --to-file

# TODO
- Search openreview using alternate rest api (in addition to current api)

## Sample Output
Summary
```
{
  "summary": {
    "references": 25,
    "withTitles": 25,
    "withNoteMatches": 13
  },
  "references": [
```

Reference Entry:
```
    {
      "refNumber": 5,
```

Title / Author fields as extracted by Grobid
```
      "title": "Expectation Propagation in Gaussian process dynamical systems",
      "authors": [
        "M P Deisenroth",
        "S Mohamed"
      ],
      "isValid": true,
```

Any warning messages.
```
      "warnings": [],
      "openreviewMatches": [
```

A  note from  OpenReview  that matched.  Notes are  matched  by first  searching
OpenReview,  using Grobid-extracted  title  as keywords,  then  filtered with  a
string similarity function. Fields titleMatch/nameMatch are numbers 0-100, 100 being
a perfect match. Name matching uses a string similarity function that doesn't penalize
deletions from the longer version of the name to the shorter, to allow matching between
full and abbreviated names, so, e.g.,  "Marc Peter Deisenroth" -> "M P Deisenroth" is a 100% match.

```
        {
          "id": "HkNwk_ZObS",
          "authors": [
            {
              "name": "Marc Peter Deisenroth",
              "id": "~Marc_Deisenroth1",
              "nameMatch": 100
            },
            {
              "name": "Shakir Mohamed",
              "id": "~Shakir_Mohamed1",
              "nameMatch": 100
            }
          ],
          "titleMatch": 100
        }
      ]
    },

]
```
