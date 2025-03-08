deploy:
	git add .
	git commit -m x
	bun run build
	eval $(ssh-agent) && ssh-add -K ~/.ssh/id_rsa_home && ssh-add -l && git push
	eval $(ssh-agent) && ssh-add -K ~/.ssh/id_rsa_home && ssh-add -l && bun gh-pages -d build
