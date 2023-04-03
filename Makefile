wd := grobid-root.d
grobid_ver := 0.7.2

grobid_zipfile := $(grobid_ver).zip
grobid_zip := $(wd)/$(grobid_zipfile)
grobid_src := $(wd)/grobid-$(grobid_ver)
service_dist := $(grobid_src)/grobid-service/build/distributions
home_dist := $(grobid_src)/grobid-home/build/distributions

service_zip := $(service_dist)/grobid-service-0.7.2.zip
home_zip := $(home_dist)/grobid-home-0.7.2.zip

deploy := $(wd)/grobid-deploy
deploy_service := $(deploy)/grobid-service-0.7.2
deploy_home := $(deploy)/grobid-home
launcher := $(deploy_service)/bin/grobid-service

.ONESHELL:

.PHONY: all grobid fetch

all: grobid/deploy 

grobid/fetch: $(grobid_zip)
	@echo Fetching 

grobid/deploy: $(deploy)
	@echo Deploying 

grobid/start: $(deploy)
	cd $(deploy)
	@echo Starting Grobid
	./grobid-service-0.7.2/bin/grobid-service

$(deploy): | $(grobid_src) 
	cd $(grobid_src)
	./gradlew clean assemble
	unzip grobid-service/build/distributions/grobid-service-0.7.2.zip -d ../grobid-deploy 
	unzip grobid-home/build/distributions/grobid-home-0.7.2.zip -d ../grobid-deploy 

$(grobid_src): | $(grobid_zip) 
	@echo Unzipping 
	cd $(wd)
	unzip $(grobid_zipfile) 

$(grobid_zip): 
	[[ -d $(wd) ]] || mkdir $(wd)
	cd $(wd)
	@echo Fetching Zipfile
	wget "https://github.com/kermitt2/grobid/archive/"$(grobid_zipfile)
