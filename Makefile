install: install-deps

develop:
	npm start

install-deps:
	npm install

build:
	npm run build

test:
	npm test

test-ci:
	npm run test:ci

lint:
	npx eslint

prettier:
	npx prettier --check **/*.ts

check-types:
	npx tsc

.PHONY: test
