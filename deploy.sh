#!/bin/sh
git add -u
git diff HEAD
git status -uno
printf "Commit these files? [commit message, or blank to cancel]\n > " | lolcat
read commitmsg
[ -z "$commitmsg" ] && exit 1
git commit -m "$commitmsg"

pnpm run deploy
