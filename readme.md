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

## OpenReview search example
```

Workflow (with OpenReview API integration)
Given a pdf
You find this reference:
[16] Matthew Henderson, Rami Al-Rfou, Brian Strope, Yun-Hsuan Sung, László Lukács, Ruiqi Guo,
Sanjiv Kumar, Balint Miklos, and Ray Kurzweil. Efficient natural language response suggestion
for smart reply. arXiv preprint arXiv:1705.00652, 2017.
You extract the title:
Efficient natural language response suggestion for smart reply
You search the title in OpenReview:
https://api.openreview.net/notes/search?term=%22Efficient+natural+language+response+suggestion+for+smart+reply%22&group=all&content=all&source=all
You found a result:
https://api.openreview.net/notes?id=TRUP16KqFNf
You check the author list:
"Matthew Henderson, Rami Al-Rfou, Brian Strope, Yun-Hsuan Sung, László Lukács, Ruiqi Guo,
Sanjiv Kumar, Balint Miklos, and Ray Kurzweil" == [
"Matthew L. Henderson",
"Rami Al-Rfou",
"Brian Strope",
"Yun-Hsuan Sung",
"László Lukács",
"Ruiqi Guo",
"Sanjiv Kumar",
"Balint Miklos",
"Ray Kurzweil"
]
It matched then return the result:
https://openreview.net/pdf?id=pnSyqRXx73, reference_text, TRUP16KqFNf

```