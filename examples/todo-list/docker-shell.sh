#!/bin/sh
docker build -t retold-todo . && docker run --rm -it -p 8086:8086 --name retold-todo retold-todo /bin/bash --login
