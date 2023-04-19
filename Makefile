wd := grobid-root.d
grobid_ver := 0.7.2

# grobid_zip := $(wd)/$(grobid_zipfile)
#grobid_src := $(wd)/grobid-$(grobid_ver)

grobid_zipfile := $(grobid_ver).zip
grobid_src := grobid-$(grobid_ver)
service_dist := $(grobid_src)/grobid-service/build/distributions
home_dist := $(grobid_src)/grobid-home/build/distributions
gradlew := $(grobid_src)/gradlew

service_zip := $(service_dist)/grobid-service-0.7.2.zip
home_zip := $(home_dist)/grobid-home-0.7.2.zip

deploy := grobid-deploy
deploy_service := $(deploy)/grobid-service-0.7.2
deploy_home := $(deploy)/grobid-home
launcher := $(deploy_service)/bin/grobid-service

.ONESHELL:

install: grobid/fetch 
.PHONY: install 

grobid/fetch: 
	[[ -d $(wd) ]] || mkdir $(wd)
	cd $(wd)
	if [[ ! -f $(grobid_zipfile) ]]; then
		@echo Fetching Zipfile
		wget "https://github.com/kermitt2/grobid/archive/"$(grobid_zipfile)
	fi

	if [[ ! -f $(gradlew) ]]; then
		@echo Unzipping... 
		unzip $(grobid_zipfile) 
	fi
.PHONY: grobid/fetch

grobid/start: 
	@echo Starting Grobid
	cd $(wd)
	cd $(deploy)
	./grobid-service-0.7.2/bin/grobid-service

grobid/build: grobid/fetch
	cd $(wd)
	cd $(grobid_src)
	./gradlew clean assemble
	unzip grobid-service/build/distributions/grobid-service-0.7.2.zip -d ../grobid-deploy 
	unzip grobid-home/build/distributions/grobid-home-0.7.2.zip -d ../grobid-deploy 
.PHONY: grobid/build


cli_src := modules/extraction-broker

cli/build:
	cd $(cli_src) 
	npm install
	npm run build 

cli/install:
	cd $(cli_src) 
	npm i -g ./

cli/clean:
	cd $(cli_src) 
