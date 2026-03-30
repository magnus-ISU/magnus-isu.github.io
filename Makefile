.PHONY: all build publish

all: build publish

build:
	bun run build

publish: build
	bun run deploy
