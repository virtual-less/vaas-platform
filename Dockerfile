# 如果是intel则直接使用ubuntu，如果为mac M系列芯片则使用amd64/ubuntu
FROM ubuntu:latest

# 安装依赖
RUN apt-get -y update
RUN apt-get -y install wget gcc

# 安装node环境
ENV NODE_VERSION v18.17.1
RUN mkdir -p /node/$NODE_VERSION
RUN wget https://nodejs.org/dist/$NODE_VERSION/node-$NODE_VERSION-linux-x64.tar.gz
RUN tar xzf node-$NODE_VERSION-linux-x64.tar.gz -C /node/
ENV PATH  /node/node-$NODE_VERSION-linux-x64/bin:$PATH

# 设置工作区间
WORKDIR /vaas-platform

# 复制文件到工作区间
COPY . /vaas-platform
RUN npm install
RUN npm run copy
RUN npm run build

# 暴露端口 需要跟server的port一致
EXPOSE 9080

CMD ["npx","vaas"]

# 镜像构建
# docker build . -t vaas-platform-image
# 运行docker-compose
# docker-compose up