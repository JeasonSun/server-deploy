# 前端部署

## simple-deploy

### docker cli
使用 `docker` 命令行工具去构建及运行容器

``` bash
# 构建一个名为 simple-app 的镜像
$ docker build -f node.Dockerfile -t simple-node-app .

# 根据该镜像运行容器
$ docker run -d --rm -p 3000:3000 simple-node-app
```

### nginx版
使用 `docker` 命令行工具去构建及运行容器

``` bash
# 构建一个名为 simple-nginx-app 的镜像
$ docker build -f nginx.Dockerfile -t simple-nginx-app .

# 根据该镜像运行容器
$ docker run -d --rm -p 3000:80 simple-nginx-app
```

### docker-compose
使用 `docker-compose` 运行容器，同时部署 node 版与 nginx 版

``` bash
# up: 创建并启动容器
# --build: 每次启动容器前构建镜像
$ docker-compose up --build
```

### Nginx学习版
通过该配置文件可以在容器中学习 nginx ，不再受限于宿主环境。

``` bash
$ docker-compose -f learn-nginx.docker-compose.yaml up

# 或者，已经封装在 npm scripts 中
$ npm run nginx:learn
```

## CRA-deploy

``` bash
$ docker-compose up --build simple
```

