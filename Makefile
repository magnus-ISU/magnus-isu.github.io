.PHONY: all build publish localhost

all: build publish

build:
	bun run build

publish: build
	bun run deploy

localhost:
	bun run dev
