#!/bin/sh
docker build -t retold-todo . && docker run --rm -it -p 28086:28086 --name retold-todo retold-todo /bin/bash --login
