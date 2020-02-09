.PHONY: deps clean build

deps:
	nmp i

clean:
	rm -rf ./node_modules

run-api:
	sam local start-api

run:
	sam local invoke -e event.json GeneratePDF

deploy:
	./deploy.sh