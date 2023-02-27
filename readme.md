# PDF Reference Resolver
Extract references from PDF bibliographies and find the corresponding papers in OpenReview

# Installation
## Build and install Grobid Server
## (Optional) Install Biblio-Glutton
## Prerequisites
    - unzip
    - mongodb
    - java
    - node

# System Components

## Grobid REST Service
Runs extraction

## Extraction Broker
Call Grobid Service with PDFs, write results into MongoDB
Construct and run OpenReview queries based on titles/author
Write OpenReview queries to MongodB

## MongoDB
Store results of extraction

## Webserver
Display results of extraction
