deploy:
	eval $(ssh-agent)
	ssh-add -K ~/.ssh/id_rsa_home
	ssh-add -l
	git add .
	git commit -m x
	git push
	bun run build
	bun gh-pages -d build
